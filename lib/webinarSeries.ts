// Recurring daily webinar series.
//
// A series is one video that plays at several fixed times every day. The
// series itself is stored in the Redis of this app; every single slot is a
// normal webinar entry in the studio schedule with its own id and its own
// time window - so the playback rules stay exactly the same as for a
// one-off webinar.
//
// The helpers here are pure (no env vars, no network) so the same logic runs
// on the server and in the browser.

export const SERIES_TIME_ZONE = 'Europe/Berlin'

export type SeriesConfig = {
  filename: string
  title: string
  description: string
  /** Start times per day as 'HH:MM' in Europe/Berlin. */
  times: string[]
  /** How many days are planned from today. */
  days: number
  /** How long the video stays available after the start. */
  windowMinutes: number
}

export type SeriesSlot = {
  /** ISO timestamp of the start. */
  startsAt: string
  /** ISO timestamp of the end of the window. */
  endsAt: string
  /** 'HH:MM' in Europe/Berlin - the label shown on the buttons. */
  label: string
  /** 'YYYY-MM-DD' in Europe/Berlin - the day the slot belongs to. */
  dayKey: string
}

// ── Time zone helpers ───────────────────────────────────────────────────────

// The offset of Europe/Berlin against UTC in milliseconds at the given
// instant (so it accounts for summer and winter time).
function zoneOffsetMs(instantMs: number, timeZone = SERIES_TIME_ZONE): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(instantMs))

  const values: Record<string, number> = {}
  for (const part of parts) {
    if (part.type !== 'literal') values[part.type] = Number(part.value)
  }

  const asUtc = Date.UTC(
    values.year,
    values.month - 1,
    values.day,
    values.hour % 24,
    values.minute,
    values.second,
  )
  return asUtc - instantMs
}

// A wall-clock time in Europe/Berlin as a real UTC instant.
export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute, 0)
  // Two passes: the first offset is taken at the guessed instant, the second
  // at the corrected one. That keeps the DST switch days correct.
  const firstOffset = zoneOffsetMs(guess)
  const corrected = guess - firstOffset
  const secondOffset = zoneOffsetMs(corrected)
  return new Date(guess - secondOffset)
}

// The calendar values of an instant in Europe/Berlin.
export function zonedParts(
  instantMs: number,
): { year: number; month: number; day: number; hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SERIES_TIME_ZONE,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date(instantMs))

  const values: Record<string, number> = {}
  for (const part of parts) {
    if (part.type !== 'literal') values[part.type] = Number(part.value)
  }

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour % 24,
    minute: values.minute,
  }
}

// 'YYYY-MM-DD' of an instant in Europe/Berlin.
export function zonedDayKey(instantMs: number): string {
  const { year, month, day } = zonedParts(instantMs)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// 'HH:MM' of an instant in Europe/Berlin.
export function zonedTimeLabel(instantMs: number): string {
  const { hour, minute } = zonedParts(instantMs)
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

// ── Slot generation ─────────────────────────────────────────────────────────

export function parseTimeLabel(value: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value || '').trim())
  if (!match) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
  return { hour, minute }
}

export function normalizeTimes(times: unknown): string[] {
  if (!Array.isArray(times)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of times) {
    const parsed = parseTimeLabel(String(raw ?? ''))
    if (!parsed) continue
    const label = `${String(parsed.hour).padStart(2, '0')}:${String(parsed.minute).padStart(2, '0')}`
    if (seen.has(label)) continue
    seen.add(label)
    out.push(label)
  }
  return out.sort()
}

// All slots of the series for the next `config.days` days, starting today.
// Slots whose start is already in the past are left out - they can not be
// booked any more.
export function buildSeriesSlots(config: SeriesConfig, nowMs: number): SeriesSlot[] {
  const times = normalizeTimes(config.times)
  const days = Math.max(1, Math.min(60, Math.floor(config.days) || 14))
  const windowMinutes = Math.max(1, Math.min(600, Math.floor(config.windowMinutes) || 60))
  if (!config.filename || times.length === 0) return []

  const slots: SeriesSlot[] = []
  const today = zonedParts(nowMs)

  for (let dayOffset = 0; dayOffset < days; dayOffset++) {
    // Start from today in Berlin and walk forward day by day.
    const base = new Date(Date.UTC(today.year, today.month - 1, today.day + dayOffset))
    const { year, month, day } = {
      year: base.getUTCFullYear(),
      month: base.getUTCMonth() + 1,
      day: base.getUTCDate(),
    }

    for (const label of times) {
      const parsed = parseTimeLabel(label)
      if (!parsed) continue
      const start = zonedTimeToUtc(year, month, day, parsed.hour, parsed.minute)
      const startMs = start.getTime()
      if (startMs <= nowMs) continue
      const end = new Date(startMs + windowMinutes * 60_000)
      slots.push({
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        label,
        dayKey: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      })
    }
  }

  return slots.sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
}

// The Berlin days that the given slots belong to, soonest first.
export function slotDayKeys(slots: { startsAt: string | null }[]): string[] {
  const keys: string[] = []
  for (const slot of slots) {
    if (!slot.startsAt) continue
    const ms = Date.parse(slot.startsAt)
    if (!Number.isFinite(ms)) continue
    const key = zonedDayKey(ms)
    if (!keys.includes(key)) keys.push(key)
  }
  return keys.sort()
}
