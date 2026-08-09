import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { getViewerUser, isAdminUser } from '@/lib/memberAccess'

// TEST_MODE = true → skip time gate, show last 2h of logins always
const TEST_MODE = true

// Returns Berlin wall-clock {h, m, dowSun0} for a given UTC Date
function berlinTime(d: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Berlin',
    hour: 'numeric', minute: 'numeric', weekday: 'narrow',
    hour12: false,
  }).formatToParts(d)
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? ''
  const h = parseInt(get('hour'))   // 0-23
  const m = parseInt(get('minute')) // 0-59
  // narrow weekday in en-US: M T W T F S S (Sat and Sun both 'S')
  // Use a numeric day-of-week instead
  const numParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Berlin', weekday: 'short',
  }).formatToParts(d)
  const dow = numParts.find(p => p.type === 'weekday')?.value ?? '' // Mon Tue Wed Thu Fri Sat Sun
  const isWeekend = dow === 'Sat' || dow === 'Sun'
  return { h, m, isWeekend }
}

// Returns the UTC timestamp for HH:MM in Europe/Berlin on the same Berlin calendar day as `ref`
function berlinHHMMtoUTC(ref: Date, hh: number, mm: number): number {
  // Format the Berlin date of ref, then combine with desired HH:MM
  const dateParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(ref) // → "YYYY-MM-DD"

  // Parse as Berlin midnight, then add offset
  const naive = `${dateParts}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`
  // Use Temporal-style trick: parse as UTC and correct for Berlin offset
  const utcGuess = new Date(naive + 'Z')
  // Get what Berlin thinks UTC midnight is
  const berlinWall = new Date(utcGuess.toLocaleString('en-US', { timeZone: 'Europe/Berlin' }))
  const offsetMs = utcGuess.getTime() - berlinWall.getTime()
  return new Date(naive + 'Z').getTime() + offsetMs
}

function streamSinceMs(now: Date): number | null {
  const { h, m, isWeekend } = berlinTime(now)
  const [startH, startM] = isWeekend ? [7, 0] : [6, 30]
  const [endH, endM]     = isWeekend ? [8, 0] : [7, 30]

  const nowMin   = h * 60 + m
  const startMin = startH * 60 + startM
  const endMin   = endH * 60 + endM

  if (nowMin < startMin || nowMin >= endMin) return null
  return berlinHHMMtoUTC(now, startH, startM)
}

// ── WooCommerce name cache ───────────────────────────────────────────────────
const WC_BASE = 'https://www.charan-amrit-kaur.de/wp-json/wc/v3'
const WC_AUTH = 'Basic ' + Buffer.from('ViktorG:6JJC XXhp WdUS dyOo 1D8m i2h2').toString('base64')

const nameCache = new Map<string, string>()

async function resolveDisplayName(
  email: string,
  clerkFirst?: string | null,
  clerkLast?: string | null,
): Promise<string> {
  const clerkName = [clerkFirst, clerkLast].filter(Boolean).join(' ').trim()
  if (clerkName) return clerkName
  if (nameCache.has(email)) return nameCache.get(email)!

  try {
    const res = await fetch(
      `${WC_BASE}/customers?email=${encodeURIComponent(email)}&per_page=1`,
      { headers: { Authorization: WC_AUTH } },
    )
    if (res.ok) {
      const [customer] = await res.json()
      if (customer) {
        const name = [customer.first_name, customer.last_name].filter(Boolean).join(' ').trim()
        if (name) { nameCache.set(email, name); return name }
      }
    }
  } catch { /* ignore */ }

  const fallback = email.split('@')[0]
  nameCache.set(email, fallback)
  return fallback
}

// ── Route ────────────────────────────────────────────────────────────────────
export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await getViewerUser()
  if (!isAdminUser(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const now = new Date()
  const streamSince = streamSinceMs(now)
  const inStream = streamSince !== null

  // TEST_MODE: no time cutoff — show all users always (for QA)
  // Prod: only during stream window
  const sinceMs: number | null = TEST_MODE
    ? null
    : inStream ? streamSince : null

  if (!TEST_MODE && !inStream) {
    return NextResponse.json({ testMode: false, inStream: false, viewers: [] })
  }

  const client = await clerkClient()
  const result = await client.users.getUserList({ limit: 500, orderBy: '-last_sign_in_at' })

  const viewers = await Promise.all(
    result.data
      .filter(u => sinceMs === null || (u.lastSignInAt ?? 0) >= sinceMs)
      .map(async u => {
        const email = u.emailAddresses?.[0]?.emailAddress ?? ''
        const name = await resolveDisplayName(email, u.firstName, u.lastName)
        return { name, email, lastSignInAt: u.lastSignInAt }
      })
  )

  return NextResponse.json({
    testMode: TEST_MODE,
    inStream,
    streamWindow: inStream ? {
      startMs: streamSince,
    } : null,
    viewers,
  })
}
