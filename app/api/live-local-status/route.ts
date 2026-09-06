import { NextResponse } from 'next/server'

const STUDIO_BASE = process.env.STUDIO_API_URL ?? 'http://100.117.19.15:3500'
const STUDIO_TOKEN = process.env.STUDIO_API_TOKEN ?? ''

type ScheduledJob = { datetime: string; filename: string }

export async function GET() {
  // Run Flask + SRS checks in parallel — Flask for scheduled jobs, SRS for active publishers
  // OBS streams bypass Flask entirely, so SRS is the authoritative live source
  const srsBase = STUDIO_BASE.replace(':3500', ':1985')

  const [flaskResult, srsResult] = await Promise.allSettled([
    fetch(`${STUDIO_BASE}/api/stream/status`, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${STUDIO_TOKEN}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(4000),
    }),
    fetch(`${srsBase}/api/v1/streams/`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(3000),
    }),
  ])

  let flaskRunning = false
  let jobs: ScheduledJob[] = []
  if (flaskResult.status === 'fulfilled' && flaskResult.value.ok) {
    const data = (await flaskResult.value.json()) as { running?: boolean; scheduled?: ScheduledJob[] }
    flaskRunning = !!data.running
    jobs = Array.isArray(data.scheduled) ? data.scheduled : []
  }

  let srsLive = false
  if (srsResult.status === 'fulfilled' && srsResult.value.ok) {
    const payload = (await srsResult.value.json()) as {
      streams?: Array<{ app?: string; publish?: { active?: boolean } }>
    }
    srsLive = (payload.streams ?? []).some(
      (s) => s.app === 'live' && Boolean(s.publish?.active),
    )
  }

  const live = flaskRunning || srsLive
  const now = Date.now()
  const next =
    jobs
      .map((j) => ({ at: j.datetime, filename: j.filename }))
      .filter((j) => {
        const t = new Date(j.at).getTime()
        return Number.isFinite(t) && t > now
      })
      .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())[0] ?? null

  if (!live && !next && flaskResult.status === 'rejected' && srsResult.status === 'rejected') {
    return NextResponse.json(
      { live: false, next: null, error: 'upstream_unreachable' },
      { status: 502 },
    )
  }

  return NextResponse.json(
    { live, next },
    { headers: { 'cache-control': 'no-store, max-age=0' } },
  )
}
