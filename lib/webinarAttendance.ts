// Attendance tracking for the webinar video.
//
// Every registration gets a personal token. The token rides along in the
// personal link, so the video proxy can tell WHO is watching and SINCE WHEN.
// Without a token (direct page visit) the viewer is only counted, not named.
//
// Everything is best-effort: if Redis is unreachable the video still plays.

import { randomBytes } from 'crypto'
import redis from '@/lib/redis'

const REG_TTL_SECONDS = 60 * 60 * 24 * 90
const VIEW_TTL_SECONDS = 60 * 60 * 24 * 30
// A viewer counts as "watching right now" while a request arrived recently.
const LIVE_TTL_SECONDS = 90
// A longer gap counts as a pause, not as watching time.
const MAX_GAP_MS = 60_000

export type WebinarRegistration = {
  email: string
  name: string
  slotId: string
  title?: string
  startsAt?: string | null
  registeredAt?: string
  token?: string
}

export type WebinarAttendee = {
  email: string
  name: string
  registeredAt: string
  joinedAt: string | null
  lastSeenAt: string | null
  watchedMinutes: number
  live: boolean
}

export type WebinarViewRecord = {
  slotId: string
  token: string
  firstSeenAt: number
  lastSeenAt: number
  watchedMs: number
  requests: number
}

export function mintToken(): string {
  return randomBytes(16).toString('hex')
}

export function registrationKey(slotId: string, email: string): string {
  return `webinar:reg:${slotId}:${email}`
}

export function tokenKey(token: string): string {
  return `webinar:token:${token}`
}

export function viewKey(slotId: string, token: string): string {
  return `webinar:view:${slotId}:${token}`
}

export function liveKey(slotId: string, token: string): string {
  return `webinar:live:${slotId}:${token}`
}

export function liveIpPrefix(slotId: string): string {
  return `webinar:live:${slotId}:ip:`
}

// Reads the registration of one person for one slot.
export async function getRegistration(
  slotId: string,
  email: string,
): Promise<WebinarRegistration | null> {
  try {
    const raw = await redis.get(registrationKey(slotId, email))
    if (!raw) return null
    const parsed = JSON.parse(raw) as WebinarRegistration
    return parsed && parsed.email ? parsed : null
  } catch {
    return null
  }
}

// Makes sure the registration has a token and that the token can be resolved
// back to the person. Older registrations get their token here.
export async function ensureToken(
  slotId: string,
  email: string,
  registration: WebinarRegistration,
): Promise<string> {
  const token = registration.token?.trim() || mintToken()
  const next: WebinarRegistration = { ...registration, token }
  try {
    await redis.setex(registrationKey(slotId, email), REG_TTL_SECONDS, JSON.stringify(next))
    await redis.setex(
      tokenKey(token),
      REG_TTL_SECONDS,
      JSON.stringify({ email: next.email, name: next.name, slotId, startsAt: next.startsAt ?? null }),
    )
  } catch {
    // Without Redis the link still works - it just cannot be attributed.
  }
  return token
}

// Resolves a token from a personal link back to the person.
export async function resolveToken(token: string): Promise<{ email: string; slotId: string } | null> {
  try {
    const raw = await redis.get(tokenKey(token))
    if (!raw) return null
    const parsed = JSON.parse(raw) as { email?: string; slotId?: string }
    if (!parsed?.email || !parsed?.slotId) return null
    return { email: parsed.email, slotId: parsed.slotId }
  } catch {
    return null
  }
}

// Records that a request for the video came in: the first call is the join,
// every following call refreshes the last seen time and the watch time.
export async function recordView(
  slotId: string,
  token: string | null,
  ip: string | null,
): Promise<void> {
  const now = Date.now()
  try {
    if (token) {
      const key = viewKey(slotId, token)
      const raw = await redis.get(key)
      const previous = raw ? (JSON.parse(raw) as WebinarViewRecord) : null
      const gap = previous ? Math.max(0, Math.min(now - previous.lastSeenAt, MAX_GAP_MS)) : 0
      const record: WebinarViewRecord = {
        slotId,
        token,
        firstSeenAt: previous?.firstSeenAt ?? now,
        lastSeenAt: now,
        watchedMs: (previous?.watchedMs ?? 0) + gap,
        requests: (previous?.requests ?? 0) + 1,
      }
      await redis.setex(key, VIEW_TTL_SECONDS, JSON.stringify(record))
      await redis.setex(liveKey(slotId, token), LIVE_TTL_SECONDS, '1')
    } else if (ip) {
      // Direct visitors without a personal link: only counted, never named.
      await redis.setex(`${liveIpPrefix(slotId)}${ip}`, LIVE_TTL_SECONDS, '1')
    }
  } catch {
    // Tracking is optional - it must never block the video.
  }
}

export async function getView(slotId: string, token: string): Promise<WebinarViewRecord | null> {
  try {
    const raw = await redis.get(viewKey(slotId, token))
    if (!raw) return null
    return JSON.parse(raw) as WebinarViewRecord
  } catch {
    return null
  }
}

async function countKeys(pattern: string): Promise<number> {
  try {
    let cursor = '0'
    let count = 0
    do {
      const [next, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 200)
      cursor = next
      count += keys.length
    } while (cursor !== '0')
    return count
  } catch {
    return 0
  }
}

// Everyone who booked the slot, plus when they came in and whether they are
// watching right now.
export async function listAttendees(slotId: string): Promise<{
  attendees: WebinarAttendee[]
  liveViewers: number
}> {
  let emails: string[] = []
  try {
    emails = await redis.smembers(`webinar:reg:slots:${slotId}`)
  } catch {
    emails = []
  }

  const attendees: WebinarAttendee[] = []
  let liveViewers = 0

  for (const raw of emails) {
    const email = raw.trim().toLowerCase()
    if (!email) continue
    const registration = await getRegistration(slotId, email)
    let view: WebinarViewRecord | null = null
    let live = false
    if (registration?.token) {
      view = await getView(slotId, registration.token)
      try {
        live = (await redis.exists(liveKey(slotId, registration.token))) === 1
      } catch {
        live = false
      }
    }
    if (live) liveViewers += 1
    attendees.push({
      email,
      name: registration?.name || '',
      registeredAt: registration?.registeredAt || '',
      joinedAt: view ? new Date(view.firstSeenAt).toISOString() : null,
      lastSeenAt: view ? new Date(view.lastSeenAt).toISOString() : null,
      watchedMinutes: view ? Math.round((view.watchedMs / 60_000) * 10) / 10 : 0,
      live,
    })
  }

  // Visitors without a personal link are counted as well, but stay unnamed.
  liveViewers += await countKeys(`${liveIpPrefix(slotId)}*`)

  return { attendees, liveViewers }
}
