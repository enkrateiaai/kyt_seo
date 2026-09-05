import { NextResponse } from 'next/server'

const STUDIO_BASE = process.env.STUDIO_API_URL ?? 'http://100.117.19.15:3500'
const STUDIO_TOKEN = process.env.STUDIO_API_TOKEN ?? ''

export async function GET() {
  // Primary: ask the Flask streamer if ffmpeg is actively running
  try {
    const r = await fetch(`${STUDIO_BASE}/api/stream/status`, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${STUDIO_TOKEN}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(4000),
    })
    if (r.ok) {
      const data = (await r.json()) as { running?: boolean }
      return NextResponse.json({ live: !!data.running }, { headers: { 'cache-control': 'no-store, max-age=0' } })
    }
  } catch {
    // Fallback below
  }

  // Fallback: check SRS directly (works only if caller is on Tailscale / same LAN)
  try {
    const r = await fetch(`${STUDIO_BASE.replace(':3500', ':1985')}/api/v1/streams/`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(3000),
    })
    if (r.ok) {
      const payload = (await r.json()) as { streams?: Array<{ app?: string; name?: string; publish?: { active?: boolean } }> }
      const streams = Array.isArray(payload.streams) ? payload.streams : []
      const live = streams.some(
        (s) => s.app === 'live' && (s.name === 'live' || s.name === 'stream') && Boolean(s.publish?.active),
      )
      return NextResponse.json({ live }, { headers: { 'cache-control': 'no-store, max-age=0' } })
    }
  } catch {
    // ignored
  }

  return NextResponse.json({ live: false, error: 'upstream_unreachable' }, { status: 502 })
}
