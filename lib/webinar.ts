// Shared helpers for the webinar feature.
// The webinar is a single pre-uploaded video in the studio media library that
// is only playable inside a defined time window.

export const STUDIO_BASE = process.env.STUDIO_API_URL ?? 'http://100.117.19.15:3500'
export const STUDIO_TOKEN = process.env.STUDIO_API_TOKEN ?? ''

export type WebinarConfig = {
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

export async function fetchWebinarConfig(): Promise<WebinarConfig | null> {
  try {
    const res = await fetch(`${STUDIO_BASE}/api/webinar`, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${STUDIO_TOKEN}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { webinar?: WebinarConfig | null }
    return data?.webinar ?? null
  } catch {
    return null
  }
}
