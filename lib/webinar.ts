// Shared helpers for the webinar feature.
// A webinar is a pre-uploaded video in the studio media library that is only
// playable inside a defined time window. Several webinars can be scheduled at
// the same time; each one has its own id and window.
//
// The schedule logic itself lives in lib/webinarSchedule.ts (pure, no env
// vars) so the server and the browser can share it.

import {
  WebinarConfig,
  WebinarCta,
  WebinarPhase,
  WebinarWindow,
  webinarPhase,
  webinarWindow,
  pickLiveWebinar,
  pickNextWebinar,
  pickLatestWebinar,
} from './webinarSchedule'

export type { WebinarConfig, WebinarCta, WebinarPhase, WebinarWindow }
export {
  webinarPhase,
  webinarWindow,
  pickLiveWebinar,
  pickNextWebinar,
  pickLatestWebinar,
}

export const STUDIO_BASE = process.env.STUDIO_API_URL ?? 'http://100.117.19.15:3500'
export const STUDIO_TOKEN = process.env.STUDIO_API_TOKEN ?? ''

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

export async function fetchWebinarCta(): Promise<WebinarCta | null> {
  try {
    const res = await fetch(`${STUDIO_BASE}/api/webinar`, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${STUDIO_TOKEN}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { cta?: WebinarCta | null }
    const cta = data?.cta
    if (!cta || typeof cta.url !== 'string' || !cta.url) return null
    return { url: cta.url, label: typeof cta.label === 'string' ? cta.label : '' }
  } catch {
    return null
  }
}

export type WebinarSnapshot = {
  webinars: WebinarConfig[]
  cta: WebinarCta | null
  serverNow: number
}

// Alles fuer die Seite in einem Rutsch: Liste, CTA und ein Referenzzeitpunkt
// aus derselben Server-Sicht.
export async function fetchWebinarSnapshot(): Promise<WebinarSnapshot> {
  const [webinars, cta] = await Promise.all([fetchWebinars(), fetchWebinarCta()])
  const serverNow = Date.now()
  return { webinars, cta, serverNow }
}
