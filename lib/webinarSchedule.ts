// Pure helpers for the webinar schedule. No env vars and no network access
// here, so the exact same logic runs on the server and in the browser.
//
// A webinar is a pre-uploaded video in the studio media library. It is only
// playable inside its own time window; the window comes from the schedule
// (startsAt / endsAt), never from a hardcoded video id.

export type WebinarConfig = {
  id: string
  filename: string
  title: string
  description: string
  startsAt: string | null
  endsAt: string | null
  duration: number
  updatedAt: string | null
}

export type WebinarPhase = 'none' | 'before' | 'live' | 'after'

// Optional call-to-action below the video (e.g. a Calendly booking link).
export type WebinarCta = {
  url: string
  label: string
}

export type WebinarWindow = {
  startsAt: number | null
  endsAt: number | null
}

// Fallback if neither an end time nor a video duration is known: the window
// still closes, so a video can never stay available forever.
const MAX_WINDOW_MS = 4 * 60 * 60 * 1000

// The playable window of a webinar.
// If no explicit end time was scheduled, the window ends after the video
// duration, so a video never stays available forever.
export function webinarWindow(cfg: WebinarConfig | null): WebinarWindow {
  if (!cfg) return { startsAt: null, endsAt: null }

  const starts = cfg.startsAt ? Date.parse(cfg.startsAt) : NaN
  const startsAt = Number.isFinite(starts) ? starts : null

  const ends = cfg.endsAt ? Date.parse(cfg.endsAt) : NaN
  if (Number.isFinite(ends)) return { startsAt, endsAt: ends }

  const durationMs =
    typeof cfg.duration === 'number' && Number.isFinite(cfg.duration) && cfg.duration > 0
      ? cfg.duration * 1000
      : null

  if (startsAt !== null) {
    return { startsAt, endsAt: startsAt + (durationMs ?? MAX_WINDOW_MS) }
  }

  return { startsAt, endsAt: null }
}

export function webinarPhase(cfg: WebinarConfig | null, nowMs: number): WebinarPhase {
  if (!cfg || !cfg.filename) return 'none'
  const { startsAt, endsAt } = webinarWindow(cfg)
  // Without a start time there is no window to check - treat as live.
  if (startsAt === null) return 'live'
  if (nowMs < startsAt) return 'before'
  if (endsAt !== null && nowMs > endsAt) return 'after'
  return 'live'
}

// The webinar that is playable right now (if any).
export function pickLiveWebinar(list: WebinarConfig[], nowMs: number): WebinarConfig | null {
  const live = list.filter((w) => webinarPhase(w, nowMs) === 'live')
  if (live.length === 0) return null
  // If several overlap, the one that started most recently wins.
  live.sort((a, b) => (Date.parse(b.startsAt ?? '') || 0) - (Date.parse(a.startsAt ?? '') || 0))
  return live[0]
}

// The next webinar that has not started yet.
export function pickNextWebinar(list: WebinarConfig[], nowMs: number): WebinarConfig | null {
  const upcoming = list
    .filter((w) => webinarPhase(w, nowMs) === 'before')
    .sort((a, b) => (Date.parse(a.startsAt ?? '') || 0) - (Date.parse(b.startsAt ?? '') || 0))
  return upcoming[0] ?? null
}

// The most recent webinar that has already started (used for the "ended" state).
export function pickLatestWebinar(list: WebinarConfig[], nowMs: number): WebinarConfig | null {
  const past = list
    .filter((w) => {
      const { startsAt } = webinarWindow(w)
      return startsAt !== null && startsAt <= nowMs
    })
    .sort((a, b) => (Date.parse(b.startsAt ?? '') || 0) - (Date.parse(a.startsAt ?? '') || 0))
  return past[0] ?? null
}
