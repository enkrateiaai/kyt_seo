import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { hasClerkServerConfig } from '@/lib/authConfig'
import { getViewerUser, isAdminUser } from '@/lib/memberAccess'
import { STUDIO_BASE, STUDIO_TOKEN, fetchWebinars } from '@/lib/webinar'
import { WebinarConfig } from '@/lib/webinarSchedule'
import redis from '@/lib/redis'
import {
  SeriesConfig,
  buildSeriesSlots,
  normalizeTimes,
  planSeriesSlots,
  zonedDayKey,
} from '@/lib/webinarSeries'

export const dynamic = 'force-dynamic'

const CONFIG_KEY = 'webinar:series:config'
const SLOTS_KEY = 'webinar:series:slots'

const MAX_TIMES = 6
const MAX_DAYS = 60

async function requireAdmin(): Promise<NextResponse | null> {
  if (!hasClerkServerConfig()) {
    return NextResponse.json({ error: 'Auth nicht konfiguriert' }, { status: 503 })
  }
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await getViewerUser()
  if (!isAdminUser(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return null
}

// The stored series config (the slots themselves live in the studio schedule).
async function readConfig(): Promise<SeriesConfig | null> {
  try {
    const raw = await redis.get(CONFIG_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SeriesConfig
    if (!parsed || typeof parsed.filename !== 'string') return null
    return parsed
  } catch {
    return null
  }
}

// Ids of the slots that this app created for the series.
async function readSlotIds(): Promise<string[]> {
  try {
    const raw = await redis.get(SLOTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : []
  } catch {
    return []
  }
}

async function writeSeries(config: SeriesConfig | null, slotIds: string[]) {
  try {
    if (config) await redis.set(CONFIG_KEY, JSON.stringify(config))
    else await redis.del(CONFIG_KEY)
    await redis.set(SLOTS_KEY, JSON.stringify(slotIds))
  } catch {
    // The series can still work without the bookkeeping.
  }
}

async function studioDelete(id: string) {
  await fetch(`${STUDIO_BASE}/api/webinar/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${STUDIO_TOKEN}` },
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  })
}

async function studioCreate(payload: {
  filename: string
  title: string
  description: string
  startsAt: string
  endsAt: string
}): Promise<WebinarConfig | null> {
  const res = await fetch(`${STUDIO_BASE}/api/webinar`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${STUDIO_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) return null
  const data = (await res.json().catch(() => ({}))) as { webinar?: WebinarConfig }
  return data?.webinar ?? null
}

// Admin: how the series looks right now.
export async function GET() {
  const denied = await requireAdmin()
  if (denied) return denied

  const [config, slotIds, webinars] = await Promise.all([
    readConfig(),
    readSlotIds(),
    fetchWebinars(),
  ])

  const tracked = webinars.filter((w) => slotIds.includes(w.id))
  const horizon = tracked.reduce<string | null>((latest, w) => {
    if (!w.startsAt) return latest
    if (!latest || Date.parse(w.startsAt) > Date.parse(latest)) return w.startsAt
    return latest
  }, null)

  return NextResponse.json(
    {
      config,
      slotIds,
      count: tracked.length,
      horizon,
      days: config ? [...new Set(tracked.map((w) => (w.startsAt ? zonedDayKey(Date.parse(w.startsAt)) : '')))].length : 0,
    },
    { headers: { 'cache-control': 'no-store, max-age=0' } },
  )
}

// Admin: plan the series. Without a body the stored config is reused, so the
// studio can simply refill the upcoming days.
export async function POST(request: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied

  let body: Record<string, unknown> = {}
  try {
    const text = await request.text()
    if (text) body = (JSON.parse(text) as Record<string, unknown>) ?? {}
  } catch {
    return NextResponse.json({ error: 'Ungültiger JSON-Body' }, { status: 400 })
  }

  const stored = await readConfig()

  const filename = typeof body.filename === 'string' && body.filename.trim()
    ? body.filename.trim()
    : stored?.filename
  const title = typeof body.title === 'string' ? body.title.trim() : stored?.title ?? ''
  const description = typeof body.description === 'string' ? body.description.trim() : stored?.description ?? ''
  const times = normalizeTimes(body.times ?? stored?.times ?? [])
  const days = Math.max(1, Math.min(MAX_DAYS, Number(body.days ?? stored?.days ?? 14) || 14))
  const windowMinutes = Math.max(
    1,
    Math.min(600, Number(body.windowMinutes ?? stored?.windowMinutes ?? 60) || 60),
  )

  if (!filename) {
    return NextResponse.json({ error: 'Bitte ein Video auswählen.' }, { status: 400 })
  }
  if (times.length === 0) {
    return NextResponse.json({ error: 'Bitte mindestens eine Uhrzeit angeben.' }, { status: 400 })
  }
  if (times.length > MAX_TIMES) {
    return NextResponse.json({ error: `Maximal ${MAX_TIMES} Uhrzeiten pro Tag.` }, { status: 400 })
  }

  const config: SeriesConfig = { filename, title, description, times, days, windowMinutes }
  const now = Date.now()
  const desired = buildSeriesSlots(config, now)

  const existing = await fetchWebinars()
  const plan = planSeriesSlots(desired, existing, filename, now)

  const keepIds: string[] = plan.keep.map((item) => item.id)
  const created: string[] = []
  const removed: string[] = []
  const errors: string[] = []

  // All future slots with the same video that are not part of the series are
  // replaced - that is how a single manual slot becomes part of the series.
  for (const item of plan.remove) {
    try {
      await studioDelete(item.id)
      removed.push(item.id)
    } catch {
      errors.push(`Löschen fehlgeschlagen: ${item.title || item.id}`)
    }
  }

  // Create what is missing.
  for (const slot of plan.create) {
    try {
      const createdItem = await studioCreate({
        filename,
        title: title || filename,
        description,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
      })
      if (createdItem) {
        keepIds.push(createdItem.id)
        created.push(createdItem.id)
      } else {
        errors.push(`Slot ${slot.label} konnte nicht angelegt werden.`)
      }
    } catch {
      errors.push(`Slot ${slot.label} konnte nicht angelegt werden.`)
    }
  }

  await writeSeries(config, keepIds)

  return NextResponse.json(
    {
      ok: errors.length === 0,
      config,
      created: created.length,
      removed: removed.length,
      total: keepIds.length,
      errors,
    },
    { headers: { 'cache-control': 'no-store, max-age=0' } },
  )
}

// Admin: remove the series again (the slots and the stored config).
export async function DELETE() {
  const denied = await requireAdmin()
  if (denied) return denied

  const slotIds = await readSlotIds()
  let removed = 0
  for (const id of slotIds) {
    try {
      await studioDelete(id)
      removed += 1
    } catch {
      // ignore - the slot may already be gone
    }
  }
  await writeSeries(null, [])

  return NextResponse.json(
    { ok: true, removed },
    { headers: { 'cache-control': 'no-store, max-age=0' } },
  )
}
