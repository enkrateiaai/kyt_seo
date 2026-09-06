import { NextResponse } from 'next/server'
import { history } from '@/lib/viewerTracker'

const STUDIO_BASE  = process.env.STUDIO_API_URL   ?? 'http://100.117.19.15:3500'
const STUDIO_TOKEN = process.env.STUDIO_API_TOKEN  ?? ''

export const dynamic = 'force-dynamic'

export async function GET() {
  // Merge in-process history with Flask-persisted history
  let persisted: unknown[] = []
  try {
    const r = await fetch(`${STUDIO_BASE}/api/stream-stats`, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${STUDIO_TOKEN}` },
      signal: AbortSignal.timeout(4000),
    })
    if (r.ok) {
      const d = await r.json() as { records?: unknown[] }
      persisted = d.records ?? []
    }
  } catch { /* Flask unreachable — return in-process history only */ }

  // Merge: persisted is the ground truth; in-process adds any not yet flushed
  const allStartTimes = new Set((persisted as Array<{ startedAt: number }>).map(r => r.startedAt))
  const merged = [
    ...persisted,
    ...history.filter(r => !allStartTimes.has(r.startedAt)),
  ].sort((a, b) => (b as { startedAt: number }).startedAt - (a as { startedAt: number }).startedAt)

  return NextResponse.json(
    { records: merged },
    { headers: { 'cache-control': 'no-store, max-age=0' } },
  )
}
