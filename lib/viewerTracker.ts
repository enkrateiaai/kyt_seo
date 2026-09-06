// Module-level viewer tracking — shared across all route handlers in the same process.
// hls_ctx is SRS's per-session ID, present in every segment request URL.

export interface StreamRecord {
  startedAt: number
  endedAt: number
  durationSeconds: number
  viewerCount: number
  avgViewSeconds: number
  maxViewSeconds: number
  peakConcurrent: number
}

interface Session {
  firstSeen: number
  lastSeen: number
}

// Current stream state
let streamStart: number | null = null
const sessions = new Map<string, Session>()
let peakConcurrent = 0
let watcherStarted = false
let wasLive = false

export const history: StreamRecord[] = []

const SRS_API  = (process.env.SRS_HLS_URL ?? 'http://100.117.19.15:8080').replace(':8080', ':1985')
const STUDIO   = process.env.STUDIO_API_URL  ?? 'http://100.117.19.15:3500'
const TOKEN    = process.env.STUDIO_API_TOKEN ?? ''
const SESSION_TTL = 90_000   // 90s without a segment → viewer gone
const FINALIZE_DELAY = 60_000 // wait 60s after stream end before finalizing

async function srsIsLive(): Promise<boolean> {
  try {
    const r = await fetch(`${SRS_API}/api/v1/streams/?_tracker=${Date.now()}`, {
      cache: 'no-store', signal: AbortSignal.timeout(3000),
    })
    if (!r.ok) return false
    const d = await r.json() as { streams?: Array<{ app?: string; publish?: { active?: boolean } }> }
    return (d.streams ?? []).some(s => s.app === 'live' && Boolean(s.publish?.active))
  } catch { return false }
}

function activeSessions(): number {
  const cutoff = Date.now() - SESSION_TTL
  let n = 0
  for (const s of sessions.values()) if (s.lastSeen >= cutoff) n++
  return n
}

function finalize() {
  if (!streamStart) return
  const cutoff = Date.now() - SESSION_TTL
  const valid = [...sessions.values()].filter(s => s.lastSeen >= cutoff || s.lastSeen >= (streamStart ?? 0))
  if (valid.length > 0) {
    const viewTimes = valid.map(s => Math.max(0, (s.lastSeen - s.firstSeen) / 1000))
    const total = viewTimes.reduce((a, b) => a + b, 0)
    const rec: StreamRecord = {
      startedAt:      streamStart,
      endedAt:        Date.now(),
      durationSeconds: Math.round((Date.now() - streamStart) / 1000),
      viewerCount:    valid.length,
      avgViewSeconds: Math.round(total / viewTimes.length),
      maxViewSeconds: Math.round(Math.max(...viewTimes)),
      peakConcurrent,
    }
    history.push(rec)
    if (history.length > 100) history.shift()
    fetch(`${STUDIO}/api/stream-stats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify(rec),
    }).catch(() => {})
  }
  streamStart = null
  sessions.clear()
  peakConcurrent = 0
}

function startWatcher() {
  if (watcherStarted) return
  watcherStarted = true
  setInterval(async () => {
    const live = await srsIsLive()
    if (live && !wasLive) { wasLive = true; if (!streamStart) streamStart = Date.now() }
    if (!live && wasLive) { wasLive = false; setTimeout(finalize, FINALIZE_DELAY) }
    // Evict stale sessions
    const cutoff = Date.now() - SESSION_TTL
    for (const [id, s] of sessions) if (s.lastSeen < cutoff) sessions.delete(id)
  }, 20_000)
}

export function noteViewer(hlsCtx: string) {
  if (!hlsCtx) return
  const now = Date.now()
  const s = sessions.get(hlsCtx)
  if (s) {
    s.lastSeen = now
  } else {
    sessions.set(hlsCtx, { firstSeen: now, lastSeen: now })
    if (!streamStart) streamStart = now
    const n = activeSessions()
    if (n > peakConcurrent) peakConcurrent = n
  }
  startWatcher()
}

export function liveViewerCount(): number {
  return activeSessions()
}
