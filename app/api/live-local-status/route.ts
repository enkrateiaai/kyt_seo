import { NextResponse } from 'next/server'

const STUDIO_BASE = process.env.STUDIO_API_URL ?? 'http://100.117.19.15:3500'
const STUDIO_TOKEN = process.env.STUDIO_API_TOKEN ?? ''

type ScheduledJob = { datetime: string; filename: string }

export async function GET() {
  // Primary: ask the Flask streamer for status + scheduled jobs
  try {
    const r = await fetch(`${STUDIO_BASE}/api/stream/status`, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${STUDIO_TOKEN}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(4000),
    })
    if (r.ok) {
      const data = (await r.json()) as { running?: boolean; scheduled?: ScheduledJob[] }
      const jobs = Array.isArray(data.scheduled) ? data.scheduled : []
      const now = Date.now()
      const next =
        jobs
          .map((j) => ({ at: j.datetime, filename: j.filename }))
          .filter((j) => {
            const t = new Date(j.at).getTime()
            return Number.isFinite(t) && t > now
          })
          .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())[0] ?? null

      return NextResponse.json(
        { live: !!data.running, next },
        { headers: { 'cache-control': 'no-store, max-age=0' } },
      )
    }
  } catch {
    // Fallback below
  }

  // Fallback: SRS directly (only works if caller is on Tailscale / same LAN)
  try {
    const r = await fetch(`${STUDIO_BASE.replace(':3500', ':1985')}/api/v1/streams/`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(3000),
    })
    if (r.ok) {
      const payload = (await r.json()) as {
        streams?: Array<{ app?: string; name?: string; publish?: { active?: boolean } }>
      }
      const streams = Array.isArray(payload.streams) ? payload.streams : []
      const live = streams.some(
        (s) =>
          s.app === 'live' &&
          (s.name === 'live' || s.name === 'stream') &&
          Boolean(s.publish?.active),
      )
      return NextResponse.json(
        { live, next: null },
        { headers: { 'cache-control': 'no-store, max-age=0' } },
      )
    }
  } catch {
    // ignored
  }

  return NextResponse.json(
    { live: false, next: null, error: 'upstream_unreachable' },
    { status: 502 },
  )
}
