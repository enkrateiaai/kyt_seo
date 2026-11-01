// Shared helpers for the webinar feature.
// A webinar is a pre-uploaded video in the studio media library that is only
// playable inside a defined time window. Several webinars can be scheduled at
// the same time; each one has its own id and window.

export const STUDIO_BASE = process.env.STUDIO_API_URL ?? 'http://100.117.19.15:3500'
export const STUDIO_TOKEN = process.env.STUDIO_API_TOKEN ?? ''

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

export function webinarPhase(cfg: WebinarConfig | null, nowMs: number): WebinarPhase {
  if (!cfg || !cfg.filename) return 'none'
  const starts = cfg.startsAt ? Date.parse(cfg.startsAt) : NaN
  if (!Number.isFinite(starts)) return 'live'
  if (nowMs < starts) return 'before'
  const ends = cfg.endsAt ? Date.parse(cfg.endsAt) : NaN
  if (Number.isFinite(ends) && nowMs > ends) return 'after'
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

export async function fetchWebinars(): Promise<WebinarConfig[]> {
  try {
    const res = await fetch(`${STUDIO_BASE}/api/webinar`, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${STUDIO_TOKEN}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return []
    const data = (await res.json()) as { webinars?: WebinarConfig[] }
    return Array.isArray(data?.webinars) ? data.webinars : []
  } catch {
    return []
  }
}
