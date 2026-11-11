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
  pickUpcomingSlots,
  findSlotById,
} from './webinarSchedule'

export type { WebinarConfig, WebinarCta, WebinarPhase, WebinarWindow }
export {
  webinarPhase,
  webinarWindow,
  pickLiveWebinar,
  pickNextWebinar,
  pickLatestWebinar,
  pickUpcomingSlots,
  findSlotById,
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

export const SITE_URL = (process.env.SITE_URL?.trim() || 'https://kundaliniyogatribe.de').replace(/\/+$/, '')

// The webinar page for one specific slot. The slot id decides what happens,
// the start time rides along as a readable hint.
export function buildSlotLink(slot: WebinarConfig): string {
  const url = new URL(`${SITE_URL}/webinar`)
  url.searchParams.set('slot', slot.id)
  if (slot.startsAt) url.searchParams.set('t', slot.startsAt)
  return url.toString()
}

// The personal link of one booking. The token identifies the person, so the
// studio can show who came in and since when.
export function buildPersonalSlotLink(slot: WebinarConfig, token: string): string {
  const url = new URL(`${SITE_URL}/webinar`)
  url.searchParams.set('slot', slot.id)
  if (slot.startsAt) url.searchParams.set('t', slot.startsAt)
  if (token) url.searchParams.set('token', token)
  return url.toString()
}

// The public page of the paid webinar (checkout).
export function buildRegistrationLink(): string {
  return `${SITE_URL}/webinar`
}
