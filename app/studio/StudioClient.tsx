'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'

const API = '/api/studio-proxy/api'

// Site color palette — warm parchment / gold
const C = {
  bg: '#FAF7F2',
  surface: '#FDFBF8',
  border: '#DDD5C8',
  borderStrong: '#C4B49A',
  text: '#2C2416',
  muted: '#6B5D4F',
  faint: '#9B8E7E',
  gold: '#D3BC76',
  goldDark: '#B8A15F',
  green: '#4A7C59',
  greenLight: '#EDF5F0',
  red: '#A35050',
  redLight: '#FAF0F0',
  orange: '#C8834E',
}

type FileEntry = { name: string; size: number; mtime: number; duration?: number }
type StreamStatus = { running: boolean; info?: { filename?: string; started?: string; seekSeconds?: number }; progress?: string; progressSecs?: number; resumeAt?: number; lastInfo?: { filename?: string; seekSeconds?: number }; scheduled: ScheduledJob[] }
type ScheduledJob = { id: string; filename?: string | null; streamKey: string; datetime: string; mode?: 'video' | 'live' }
type SrsStream = { app?: string; name?: string; publish?: { active?: boolean }; clients?: number; video?: { width?: number; height?: number }; recv_bytes?: number; kbps?: { recv_30s?: number; send_30s?: number } }
type SrsClient = {
  id?: string
  ip?: string
  type?: string          // 'hls-play', 'fmle-publish', etc.
  stream?: string
  url?: string
  tcUrl?: string
  pageUrl?: string
  alive?: number         // seconds connected
  send_kbps?: number
  recv_kbps?: number
}
type UploadSession = {
  sessionId: string
  filename: string
  percent: number
  chunksReceived: number
  totalChunks: number
  bytesReceived: number
  totalBytes: number
  speedBps: number
  etaSeconds: number | null
  phase: 'uploading' | 'assembling' | 'converting'
}
type FlaskStatus = {
  pid: number
  uptimeSeconds: number
  ffmpegCount: number
  streamRunning: boolean
  activeUploads: number
  scheduledCount: number
  diskTotal: number
  diskFree: number
  diskUsed: number
  diskUsedPct: number
  lastInfo: { filename?: string }
}
type SlotDef = { date: string; label: string; slot: 1 | 2 }

function fmt(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function fmtDuration(s: number): string {
  if (!s) return ''
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60)
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
  return `${m}:${String(sec).padStart(2,'0')}`
}

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function defaultSlotTime(date: string, slot: 1 | 2): string {
  const dow = new Date(date + 'T12:00:00').getDay()
  const isWeekend = dow === 0 || dow === 6
  return slot === 1 ? (isWeekend ? '07:00' : '06:30') : '10:00'
}

function formatJobTime(utcStr: string): string {
  return new Date(utcStr).toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' })
}

function slotKey(s: SlotDef): string { return `${s.date}:${s.slot}` }

function isBerlinDST(year: number, month: number, day: number) {
  if (month < 2 || month > 9) return false
  if (month > 2 && month < 9) return true
  const lastDay = new Date(year, month + 1, 0)
  const lastSun = lastDay.getDate() - lastDay.getDay()
  if (month === 2) return day >= lastSun
  return day < lastSun
}

function berlinToUTC(dateStr: string, hour: number, minute: number): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dst = isBerlinDST(y, m - 1, d)
  return new Date(Date.UTC(y, m - 1, d, hour - (dst ? 2 : 1), minute, 0))
}

function buildSlots(): SlotDef[] {
  const slots: SlotDef[] = []
  const now = new Date()
  const DAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
  const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
  for (let i = 0; i < 14; i++) {
    const d = new Date(now); d.setDate(now.getDate() + i); d.setHours(0, 0, 0, 0)
    const dateStr = localDateStr(d)
    const dow = d.getDay()
    const label = `${DAYS[dow]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
    slots.push({ date: dateStr, label, slot: 1 })
    slots.push({ date: dateStr, label, slot: 2 })
  }
  return slots
}

function matchJob(slot: SlotDef, slotTime: string, jobs: ScheduledJob[]): ScheduledJob | undefined {
  const [hh, mm] = slotTime.split(':').map(Number)
  const slotUtc = berlinToUTC(slot.date, hh, mm)
  return jobs.find(j => Math.abs(new Date(j.datetime).getTime() - slotUtc.getTime()) < 1.75 * 3_600_000)
}

function ThumbnailImg({ name, size = 48 }: { name: string; size?: number }) {
  return (
    <img src={`${API}/files/${encodeURIComponent(name)}/thumbnail`} alt=""
      style={{ width: size, height: size * 0.56, objectFit: 'cover', borderRadius: 3, flexShrink: 0, background: C.border }}
      onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden' }} />
  )
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`
}
function fmtSpeed(bps: number): string {
  if (bps < 1024) return `${Math.round(bps)} B/s`
  if (bps < 1024 * 1024) return `${(bps / 1024).toFixed(0)} KB/s`
  return `${(bps / 1024 / 1024).toFixed(1)} MB/s`
}
function fmtEta(s: number | null): string {
  if (s == null) return ''
  if (s < 60) return `${Math.round(s)}s`
  const m = Math.floor(s / 60); const r = Math.round(s % 60)
  if (m < 60) return `${m}m ${r}s`
  const h = Math.floor(m / 60); return `${h}h ${m % 60}m`
}

function UploadBanner({ uploads }: { uploads: UploadSession[] }) {
  const first = uploads[0]
  const phaseLabel: Record<string, string> = {
    uploading: 'lädt hoch',
    assembling: 'baut Datei zusammen',
    converting: 'konvertiert Video',
  }
  const phaseText = phaseLabel[first.phase] || first.phase
  const totalPct = Math.round(uploads.reduce((s, u) => s + u.percent, 0) / uploads.length)
  return (
    <div style={{ background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#92400E', display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 18 }}>⏫</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600 }}>
          Upload läuft: <span style={{ fontFamily: 'monospace' }}>{first.filename}</span> {phaseText} ({first.percent}%)
          {uploads.length > 1 && <span style={{ color: '#B45309' }}> · {uploads.length} Uploads gesamt</span>}
        </div>
        <div style={{ fontSize: 11, color: '#B45309', marginTop: 2 }}>
          {first.phase === 'uploading' && (
            <>
              {fmtBytes(first.bytesReceived)}{first.totalBytes > 0 ? ` / ${fmtBytes(first.totalBytes)}` : ''}
              {' · '}{fmtSpeed(first.speedBps)}
              {first.etaSeconds != null && first.etaSeconds > 0 && <> · ETA {fmtEta(first.etaSeconds)}</>}
            </>
          )}
          {first.phase === 'assembling' && 'Chunks werden zusammengefügt …'}
          {first.phase === 'converting' && 'Video wird für Streaming konvertiert (ffmpeg) …'}
          {' · Video-Wiedergabe kann währenddessen eingeschränkt sein'}
        </div>
        {uploads.length > 1 && (
          <div style={{ height: 4, background: '#FCD34D', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#B45309', width: `${Math.min(100, totalPct)}%`, transition: 'width .5s' }} />
          </div>
        )}
      </div>
    </div>
  )
}

function fmtUptime(s: number): string {
  if (!s || s < 0) return '—'
  if (s < 60) return `${Math.round(s)}s`
  if (s < 3600) return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`
  const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60)
  if (h < 24) return `${h}h ${m}m`
  const d = Math.floor(h / 24); return `${d}d ${h % 24}h`
}
function Stat({ label, value, sub, accent, truncate }: {
  label: string; value: string; sub?: string; accent?: string; truncate?: boolean
}) {
  return (
    <div style={{ padding: '8px 10px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 5 }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase' as const, color: C.faint, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: accent || C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: truncate ? 'nowrap' : 'normal' }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: C.faint, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function ActionBtn({ label, busy, disabled, danger, onClick }: {
  label: string; busy?: boolean; disabled?: boolean; danger?: boolean; onClick: () => void
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{
        padding: '7px 12px', fontSize: 12, fontWeight: 600,
        background: busy ? C.faint : danger ? C.redLight : C.bg,
        color: busy ? C.surface : danger ? C.red : C.text,
        border: `1px solid ${busy ? C.faint : danger ? C.red : C.border}`,
        borderRadius: 4, cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled && !busy ? 0.5 : 1,
      }}>
      {busy ? '…' : label}
    </button>
  )
}

function LiveMonitorIframe({ liveKey }: { liveKey: number }) {
  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', borderRadius: 5, overflow: 'hidden', background: '#000' }}>
      <iframe
        key={liveKey}
        src={`/live-local/widget?_ts=${liveKey}`}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
        allow="autoplay; fullscreen"
        allowFullScreen
      />
    </div>
  )
}

export default function StudioClient() {
  const [files, setFiles] = useState<FileEntry[]>([])
  // Stable per-video number: #1 = oldest (by mtime), #N = newest.
  // Computed once per files change so adding a new video only gives the new
  // video a new number; existing videos keep their existing numbers.
  const stableNumber = useMemo(() => {
    const sorted = [...files].sort((a, b) => a.mtime - b.mtime)
    const m = new Map<string, number>()
    sorted.forEach((f, i) => m.set(f.name, i + 1))
    return m
  }, [files])
  const [status, setStatus] = useState<StreamStatus>({ running: false, scheduled: [] })
  const [uploading, setUploading] = useState(false)
  const [uploadPct, setUploadPct] = useState(0)
  const [msg, setMsg] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [drag, setDrag] = useState(false)
  const [assigning, setAssigning] = useState<SlotDef | null>(null)
  const [conflictFile, setConflictFile] = useState<{ file: File; name: string } | null>(null)
  const [directApi, setDirectApi] = useState<{ url: string; token: string } | null>(null)
  const [slotTimes, setSlotTimes] = useState<Record<string, string>>({})
  const [seekDraft, setSeekDraft] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [videoKey, setVideoKey] = useState(0)
  const [liveKey, setLiveKey] = useState(() => Date.now())
  const [statusError, setStatusError] = useState(false)
  const [streamLog, setStreamLog] = useState<string[]>([])
  const [srsStreams, setSrsStreams] = useState<SrsStream[]>([])
  const [srsClients, setSrsClients] = useState<SrsClient[]>([])
  const srsLive = useMemo(() => srsStreams.some(s => s.publish?.active), [srsStreams])
  const [showDiag, setShowDiag] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [otherUploads, setOtherUploads] = useState<UploadSession[]>([])
  const [flaskStatus, setFlaskStatus] = useState<FlaskStatus | null>(null)
  const [flaskBusy, setFlaskBusy] = useState<string | null>(null)
  const ownSessionIdRef = useRef<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const slots = buildSlots()

  const getSlotTime = useCallback((s: SlotDef) =>
    slotTimes[slotKey(s)] ?? defaultSlotTime(s.date, s.slot), [slotTimes])

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }
  const flashPersist = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 12000) }

  // Centralized API helper. Returns { ok, data, status, error } so callers can
  // decide what to do. NEVER throws: both network errors and non-OK responses
  // are captured and exposed via .error + console.error so users can copy them
  // from DevTools when something goes wrong.
  async function apiCall(
    path: string,
    init: RequestInit = {},
  ): Promise<{ ok: boolean; data: any; status: number; error: string }> {
    const url = path.startsWith('http') ? path : `${API}${path}`
    const method = init.method || 'GET'
    let r: Response
    try {
      r = await fetch(url, init)
    } catch (e: any) {
      const msg = (e && e.message) || String(e) || 'Unbekannter Netzwerkfehler'
      console.error(`[apiCall ${method} ${path}] Netzwerkfehler: ${msg}`, e)
      return { ok: false, data: null, status: 0, error: `Netzwerkfehler: ${msg}` }
    }
    let text = ''
    try { text = await r.text() } catch { /* ignore body read errors */ }
    let data: any = null
    if (text) {
      try { data = JSON.parse(text) } catch { /* not JSON, leave data null and keep raw text */ }
    }
    if (!r.ok) {
      // Try to extract a useful error message from common shapes
      const serverMsg =
        (data && (data.error || data.message || data.detail)) ||
        (text && text.length < 300 ? text : '') ||
        r.statusText || 'Unbekannt'
      const error = `${r.status} ${serverMsg}`.trim()
      console.error(`[apiCall ${method} ${path}] ${error}`, { status: r.status, body: text, data })
      return { ok: false, data, status: r.status, error }
    }
    return { ok: true, data, status: r.status, error: '' }
  }

  const loadFiles = useCallback(async () => {
    const r = await fetch(`${API}/files`); if (r.ok) setFiles(await r.json())
  }, [])

  const loadStatus = useCallback(async () => {
    try {
      const r = await fetch(`${API}/stream/status`)
      if (r.ok) { setStatus(await r.json()); setStatusError(false) } else setStatusError(true)
    } catch { setStatusError(true) }
  }, [])

  const loadDiag = useCallback(async () => {
    const [logR, srsR] = await Promise.allSettled([
      fetch(`${API}/stream/log`),
      fetch(`${API}/srs/info`),
    ])
    if (logR.status === 'fulfilled' && logR.value.ok) {
      const d = await logR.value.json()
      setStreamLog(d.lines ?? [])
    }
    if (srsR.status === 'fulfilled' && srsR.value.ok) {
      const d = await srsR.value.json()
      setSrsStreams(d.streams ?? [])
      setSrsClients(d.clients ?? [])
    }
  }, [])

  useEffect(() => {
    loadFiles(); loadStatus()
    const id = setInterval(loadStatus, 5000)
    return () => clearInterval(id)
  }, [loadFiles, loadStatus])

  // Always poll SRS info for live player — faster when diag panel open
  useEffect(() => {
    loadDiag()
    const id = setInterval(loadDiag, showDiag ? 3000 : 5000)
    return () => clearInterval(id)
  }, [showDiag, loadDiag])

  const loadUploads = useCallback(async () => {
    try {
      const url = directApi ? `${directApi.url}/api/upload/status` : `${API}/upload/status`
      const headers: Record<string, string> = directApi ? { Authorization: `Bearer ${directApi.token}` } : {}
      const r = await fetch(url, { headers })
      if (!r.ok) return
      const d = await r.json()
      const own = ownSessionIdRef.current
      const others = (d.uploads ?? []).filter((u: UploadSession) => u.sessionId !== own)
      setOtherUploads(others)
    } catch {
      /* swallow; transient errors are fine */
    }
  }, [directApi])

  useEffect(() => {
    loadUploads()
    const id = setInterval(loadUploads, 3000)
    return () => clearInterval(id)
  }, [loadUploads])

  const loadFlaskStatus = useCallback(async () => {
    const res = await apiCall('/flask/status')
    if (res.ok) setFlaskStatus(res.data)
  }, [])

  useEffect(() => {
    loadFlaskStatus()
    const id = setInterval(loadFlaskStatus, 5000)
    return () => clearInterval(id)
  }, [loadFlaskStatus])

  useEffect(() => {
    fetch('/api/studio/direct')
      .then(r => r.ok ? r.json() : null)
      .then(async (cfg: { url: string; token: string } | null) => {
        if (!cfg?.url || !cfg?.token) return
        try {
          const r = await fetch(`${cfg.url}/api/health`, {
            headers: { Authorization: `Bearer ${cfg.token}` },
            signal: AbortSignal.timeout(3000),
          })
          if (r.ok) setDirectApi(cfg)
        } catch { /* not on Tailscale */ }
      })
      .catch(() => {})
  }, [])

  async function doUpload(file: File, overwrite = false) {
    setUploading(true); setUploadPct(0)
    const CHUNK = 5 * 1024 * 1024
    const total = Math.max(1, Math.ceil(file.size / CHUNK))
    const uploadUrl = directApi ? `${directApi.url}/api/upload/chunk` : `${API}/upload/chunk`
    const authHeader: Record<string, string> = directApi ? { Authorization: `Bearer ${directApi.token}` } : {}
    // Generate a fresh session id so other viewers can identify (and filter out)
    // this upload when polling /api/upload/status. Reused across all chunks of
    // this file; cleared when upload finishes.
    const sessionId = (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2))
    ownSessionIdRef.current = sessionId
    try {
      for (let i = 0; i < total; i++) {
        const fd = new FormData()
        fd.append('file', file.slice(i * CHUNK, (i + 1) * CHUNK), file.name)
        fd.append('filename', file.name)
        fd.append('chunk_index', String(i))
        fd.append('total_chunks', String(total))
        fd.append('file_size', String(file.size))
        fd.append('session_id', sessionId)
        if (overwrite) fd.append('overwrite', 'true')
        const res = await fetch(uploadUrl, { method: 'POST', body: fd, headers: authHeader })
        if (res.status === 409) {
          const data = await res.json()
          if (data.conflict) { setConflictFile({ file, name: data.name }); return }
        }
        if (!res.ok) { flash(`Fehler: ${res.status}`); return }
        setUploadPct(Math.round((i + 1) / total * 100))
      }
      flash(`Hochgeladen: ${file.name}`); loadFiles(); loadUploads()
    } catch {
      flash('Upload fehlgeschlagen')
    } finally {
      setUploading(false)
      ownSessionIdRef.current = ''
      // Force an immediate refresh so the just-finished session disappears
      // from broadcasts (server removes it on the final chunk but a 3s tick
      // would otherwise still see it briefly).
      setTimeout(loadUploads, 300)
    }
  }

  function handleUploadCopy() {
    if (!conflictFile) return
    const { file } = conflictFile
    const parts = file.name.split('.')
    const ext = parts.length > 1 ? '.' + parts.pop() : ''
    const base = parts.join('.')
    let n = 1
    let newName = `${base} (${n})${ext}`
    while (files.some(f => f.name === newName)) { n++; newName = `${base} (${n})${ext}` }
    const renamed = new File([file], newName, { type: file.type })
    setConflictFile(null)
    doUpload(renamed, false)
  }

  async function startStream(filename: string, seekSeconds = 0) {
    // Single endpoint: backend always kills any running ffmpeg, clears orphan
    // procs in the container, and resets resume state if switching videos.
    // Response includes { wasRunning, killedCount, clearedResume } so we can
    // give precise feedback about what happened on the server.
    const wasRunning = !!status?.running
    setSwitching(true)
    flash(wasRunning ? `Wechselt zu: ${filename}…` : `Gestartet: ${filename}…`)
    try {
      const res = await apiCall('/stream/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, streamKey: 'live', seekSeconds }),
      })
      if (!res.ok) {
        console.error('[startStream] failed', { filename, seekSeconds, error: res.error, status: res.status, data: res.data })
        flashPersist(`Live fehlgeschlagen: ${res.error}`)
        return
      }
      const d = res.data || {}
      const killed = d.killedCount ?? 0
      if (wasRunning && d.switched) {
        const tail = killed > 0 ? ` (${killed} ffmpeg beendet)` : ''
        flash(`Gewechselt zu: ${filename}${tail}`)
      } else {
        flash(`Gestartet: ${filename}`)
      }
    } catch (e: any) {
      // Should not happen since apiCall swallows errors, but defend anyway
      const msg = e?.message || String(e)
      console.error('[startStream] uncaught exception', e)
      flashPersist(`Live fehlgeschlagen: ${msg}`)
    } finally {
      setSwitching(false)
      setSeekDraft(null)
      loadStatus()
    }
  }

  async function stopStream() {
    const res = await apiCall('/stream/stop', { method: 'POST' })
    if (res.ok) flash('Pausiert')
    else flashPersist(`Pause fehlgeschlagen: ${res.error}`)
    loadStatus()
  }

  async function fullStop() {
    const res = await apiCall('/stream/stop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full: true }),
    })
    if (res.ok) flash('Stream beendet')
    else flashPersist(`Stopp fehlgeschlagen: ${res.error}`)
    loadStatus()
  }

  async function forceReset() {
    setResetting(true)
    flash('SRS zurücksetzen…')
    const res = await apiCall('/srs/force-reset', { method: 'POST' })
    if (!res.ok) {
      flashPersist(`Force-Reset fehlgeschlagen: ${res.error}`)
      setResetting(false)
      return
    }
    const d = res.data || {}
    const n = d.killed_count ?? (Array.isArray(d.killed) ? d.killed.length : 0)
    if (n > 0) flash(`${n} ffmpeg${n === 1 ? '' : 's'} gekillt — SRS-Slot wird in ~30s frei`)
    else if (d.slot_will_free) flash('SRS-Slot freigegeben ✓')
    else flash('Nichts zu killen')
    setResetting(false)
    loadStatus()
    if (showDiag) loadDiag()
  }

  async function assignSlot(slot: SlotDef, filename: string) {
    const t = getSlotTime(slot)
    const [hh, mm] = t.split(':').map(Number)
    const utcDate = berlinToUTC(slot.date, hh, mm)
    const r = await fetch(`${API}/stream/schedule`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, streamKey: 'live', datetime: utcDate.toISOString() }),
    })
    flash(r.ok ? `Eingeplant: ${filename} um ${t}` : `Fehler ${r.status}`)
    setAssigning(null); loadStatus()
  }

  async function assignLiveSlot(slot: SlotDef) {
    const t = getSlotTime(slot)
    const [hh, mm] = t.split(':').map(Number)
    const utcDate = berlinToUTC(slot.date, hh, mm)
    const r = await fetch(`${API}/stream/schedule`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'live', streamKey: 'live', datetime: utcDate.toISOString() }),
    })
    flash(r.ok ? `🔴 Live-Slot gesetzt: ${t} (manuell via OBS starten)` : `Fehler ${r.status}`)
    setAssigning(null); loadStatus()
  }

  async function cancelSlot(jobId: string) {
    await fetch(`${API}/stream/schedule/${jobId}`, { method: 'DELETE' })
    loadStatus()
  }

  async function deleteFile(name: string) {
    if (preview === name) setPreview(null)
    await fetch(`${API}/files/${encodeURIComponent(name)}`, { method: 'DELETE' })
    loadFiles()
  }

  async function confirmAndDelete() {
    if (!confirmDelete) return
    setConfirmDelete(null)
    await deleteFile(confirmDelete)
  }

  function openPreview(name: string) {
    const next = preview === name ? null : name
    setPreview(next)
    if (next !== null) setVideoKey(k => k + 1)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDrag(false)
    const f = e.dataTransfer.files[0]; if (f) doUpload(f)
  }

  // --- Shared styles ---
  const card: React.CSSProperties = {
    background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20,
  }
  const label: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const,
    color: C.faint, marginBottom: 14, display: 'block',
  }
  const btnPrimary = (danger?: boolean): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '7px 14px', borderRadius: 5, border: 'none', cursor: 'pointer', fontSize: 12,
    fontWeight: 600, letterSpacing: 0.3,
    background: danger ? C.redLight : C.goldDark,
    color: danger ? C.red : C.surface,
  })
  const btnSmall = (variant: 'gold' | 'danger' | 'ghost' = 'ghost'): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '4px 10px', borderRadius: 4, border: `1px solid ${variant === 'danger' ? C.red : variant === 'gold' ? C.goldDark : C.border}`,
    cursor: 'pointer', fontSize: 11, fontWeight: 600,
    background: variant === 'danger' ? C.redLight : variant === 'gold' ? C.gold : 'transparent',
    color: variant === 'danger' ? C.red : variant === 'gold' ? C.text : C.muted,
  })
  const inputStyle: React.CSSProperties = {
    background: C.bg, border: `1px solid ${C.border}`, color: C.text,
    borderRadius: 4, padding: '5px 8px', fontSize: 12, outline: 'none',
  }

  const groupedSlots: Record<string, SlotDef[]> = {}
  slots.forEach(sl => { if (!groupedSlots[sl.date]) groupedSlots[sl.date] = []; groupedSlots[sl.date].push(sl) })

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: 14 }}>

      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 28px', background: C.surface, borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, zIndex: 20 }}>
        <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: 0.3, color: C.text }}>Video Steuerung</span>
        {directApi && (
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: C.green, background: C.greenLight, border: `1px solid ${C.green}`, borderRadius: 3, padding: '2px 7px' }}>
            DIRECT
          </span>
        )}
        {statusError && (
          <span title="Verbindung zur API fehlgeschlagen. Letzte Aktionen könnten fehlgeschlagen sein — Details in der Browser-Konsole."
            style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: C.orange, background: '#FDF4EE', border: `1px solid ${C.orange}`, borderRadius: 3, padding: '2px 7px', cursor: 'help' }}>
            KEINE VERBINDUNG
          </span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setShowDiag(v => !v)}
            style={{ ...btnSmall(showDiag ? 'gold' : 'ghost'), fontSize: 10 }}>
            {showDiag ? 'Diagnose ▲' : 'Diagnose'}
          </button>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: status.running ? C.green : C.faint, display: 'inline-block' }} />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, color: status.running ? C.green : C.faint }}>
            {status.running ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>
      </header>

      {/* Flash */}
      {msg && (
        <div style={{ background: C.gold, color: C.text, padding: '9px 28px', fontSize: 12, fontWeight: 600, borderBottom: `1px solid ${C.goldDark}` }}>
          {msg}
        </div>
      )}

      {/* Conflict dialog */}
      {conflictFile && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(44,36,22,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ ...card, maxWidth: 380, width: '100%', boxShadow: '0 12px 32px rgba(44,36,22,.15)' }}>
            <span style={label}>Datei existiert</span>
            <p style={{ color: C.muted, marginBottom: 20, fontSize: 13 }}>„{conflictFile.name}" ist bereits vorhanden. Überschreiben oder Kopie erstellen?</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={btnPrimary(true)} onClick={() => { const f = conflictFile; setConflictFile(null); doUpload(f.file, true) }}>Überschreiben</button>
              <button style={btnPrimary()} onClick={handleUploadCopy}>Kopie</button>
              <button style={btnSmall('ghost')} onClick={() => setConflictFile(null)}>Abbrechen</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(44,36,22,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ ...card, maxWidth: 380, width: '100%', boxShadow: '0 12px 32px rgba(44,36,22,.15)' }}>
            <span style={label}>Datei löschen?</span>
            <p style={{ color: C.muted, marginBottom: 20, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>„{confirmDelete}"</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={btnPrimary(true)} onClick={confirmAndDelete}>Ja, löschen</button>
              <button style={btnSmall('ghost')} onClick={() => setConfirmDelete(null)}>Abbrechen</button>
            </div>
          </div>
        </div>
      )}

      {/* Assign modal */}
      {assigning && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(44,36,22,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ ...card, maxWidth: 420, width: '100%', maxHeight: '80vh', overflow: 'auto', boxShadow: '0 12px 32px rgba(44,36,22,.15)' }}>
            <span style={label}>Slot zuweisen</span>
            <p style={{ color: C.muted, fontSize: 12, marginBottom: 12 }}>{assigning.label} · Slot {assigning.slot} · {getSlotTime(assigning)}</p>
            <div onClick={() => assignLiveSlot(assigning)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 5, border: `1px solid ${C.red}`, marginBottom: 12, cursor: 'pointer', background: C.redLight }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F5E0E0')}
              onMouseLeave={e => (e.currentTarget.style.background = C.redLight)}>
              <span style={{ fontSize: 16, lineHeight: 1 }}>🔴</span>
              <span style={{ flex: 1, fontWeight: 700, fontSize: 13, color: C.red }}>I stream live</span>
              <span style={{ fontSize: 10, color: C.muted }}>kein Auto-Start</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ flex: 1, height: 1, background: C.border }} />
              <span style={{ fontSize: 10, color: C.faint, letterSpacing: 1, textTransform: 'uppercase' }}>oder Video</span>
              <div style={{ flex: 1, height: 1, background: C.border }} />
            </div>
            {files.length === 0 && <div style={{ color: C.faint }}>Keine Dateien vorhanden</div>}
            {files.map((f, i) => (
              <div key={f.name} onClick={() => assignSlot(assigning, f.name)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px', borderRadius: 5, border: `1px solid ${C.border}`, marginBottom: 6, cursor: 'pointer', background: C.bg }}
                onMouseEnter={e => (e.currentTarget.style.background = '#F5EDD8')}
                onMouseLeave={e => (e.currentTarget.style.background = C.bg)}>
                <span style={{ fontSize: 10, fontWeight: 700, color: C.faint, minWidth: 20 }}>#{stableNumber.get(f.name) ?? (i+1)}</span>
                <ThumbnailImg name={f.name} size={40} />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }}>{f.name}</span>
                {f.duration ? <span style={{ color: C.faint, fontSize: 11 }}>{fmtDuration(f.duration)}</span> : null}
              </div>
            ))}
            <button style={{ ...btnSmall('ghost'), marginTop: 12 }} onClick={() => setAssigning(null)}>Abbrechen</button>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '20px 20px', display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20 }}>

        {otherUploads.length > 0 && !uploading && (
          <div style={{ gridColumn: '1 / -1' }}>
            <UploadBanner uploads={otherUploads} />
          </div>
        )}

        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Now streaming / resume panel */}
          {(status.running || (status.resumeAt && status.resumeAt > 0)) && (() => {
            const filename = status.running ? status.info?.filename : status.lastInfo?.filename
            const dur = files.find(f => f.name === filename)?.duration ?? 0
            const posSecs = seekDraft ?? status.progressSecs ?? 0
            const pct = dur > 0 ? Math.min(100, (posSecs / dur) * 100) : 0
            const remaining = dur > 0 ? fmtDuration(Math.max(0, dur - posSecs)) : ''
            return (
              <div style={{ ...card, borderColor: status.running ? C.green : C.border, borderLeftWidth: 3, borderLeftColor: status.running ? C.green : C.faint }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: C.faint }}>
                    {status.running ? 'Jetzt live' : 'Pausiert'}
                  </span>
                  {status.running && status.info?.started && (() => {
                    const t = new Date(status.info.started).toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' })
                    return <span style={{ fontSize: 10, color: C.faint }}>· gestartet {t}</span>
                  })()}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  {filename && <ThumbnailImg name={filename} size={40} />}
                  <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }}>{filename}</span>
                </div>
                {dur > 0 && (
                  <>
                    <div style={{ height: 3, background: C.border, borderRadius: 2, overflow: 'hidden', marginBottom: 6 }}>
                      <div style={{ height: '100%', background: status.running ? C.green : C.faint, width: `${pct}%`, transition: seekDraft !== null ? 'none' : 'width 1s linear' }} />
                    </div>
                    <input type="range" min={0} max={Math.round(dur)} value={Math.round(posSecs)} disabled={switching}
                      onInput={e => setSeekDraft(parseInt((e.target as HTMLInputElement).value))}
                      onMouseUp={e => { if (switching) return; const s = parseInt((e.target as HTMLInputElement).value); startStream(filename!, s) }}
                      onTouchEnd={e => { if (switching) return; const s = parseInt((e.target as HTMLInputElement).value); startStream(filename!, s) }}
                      style={{ width: '100%', marginBottom: 6, accentColor: C.goldDark }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.faint, marginBottom: 14 }}>
                      <span>{fmtDuration(posSecs)}</span>
                      <span>{remaining ? `−${remaining}` : fmtDuration(dur)}</span>
                    </div>
                  </>
                )}
                {!dur && status.running && <div style={{ color: C.faint, fontSize: 12, marginBottom: 14 }}>Position: {status.progress || '—'}</div>}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                  {status.running ? (
                    <>
                      <button style={btnPrimary()} onClick={stopStream} disabled={switching}>Pause</button>
                      <button style={btnPrimary(true)} onClick={fullStop} disabled={switching}>Stopp</button>
                      <button style={btnSmall()} onClick={() => startStream(filename!, 0)} disabled={switching}>Von Anfang</button>
                    </>
                  ) : (
                    <>
                      <button style={btnPrimary()} onClick={() => startStream(filename!, status.resumeAt ?? 0)} disabled={switching}>Fortsetzen {fmtDuration(status.resumeAt ?? 0)}</button>
                      <button style={btnSmall('danger')} onClick={fullStop}>Verwerfen</button>
                    </>
                  )}
                </div>
              </div>
            )
          })()}

          {/* Upload */}
          <div style={card}>
            <span style={label}>Upload</span>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDrag(true) }}
              onDragLeave={() => setDrag(false)} onDrop={onDrop}
              style={{ border: `2px dashed ${drag ? C.goldDark : C.border}`, borderRadius: 6, padding: '18px 16px', textAlign: 'center' as const, cursor: 'pointer', background: drag ? '#F5EDD8' : 'transparent', marginBottom: uploading ? 10 : 0 }}>
              <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>
                <span style={{ color: C.goldDark, fontWeight: 600 }}>Datei wählen</span> oder hierher ziehen
              </p>
              <input ref={fileInputRef} type="file" accept="video/*" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) doUpload(f); e.target.value = '' }} />
            </div>
            {uploading && (
              <div style={{ marginTop: 10 }}>
                <div style={{ height: 3, background: C.border, borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: C.goldDark, width: `${uploadPct}%`, transition: 'width .3s' }} />
                </div>
                <span style={{ fontSize: 11, color: C.muted, marginTop: 4, display: 'block' }}>{uploadPct}% hochgeladen</span>
              </div>
            )}
          </div>

          {/* Preview player */}
          {preview && (
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={label}>Vorschau</span>
                <button onClick={() => setPreview(null)} style={{ background: 'none', border: 'none', color: C.faint, cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
              </div>
              <div style={{ fontSize: 11, color: C.faint, marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{preview}</div>
              <video key={videoKey} controls preload="metadata" style={{ width: '100%', borderRadius: 5, background: '#1a1509', display: 'block' }}
                src={`${API}/files/${encodeURIComponent(preview)}/stream?v=${videoKey}`} />
              {!status.running && (
                <button style={{ ...btnPrimary(), width: '100%', marginTop: 10, justifyContent: 'center' }} onClick={() => startStream(preview)}>
                  Jetzt streamen
                </button>
              )}
            </div>
          )}

          {/* Video library */}
          <div style={card}>
            <span style={label}>Mediathek ({files.length})</span>
            {files.length === 0 && <div style={{ color: C.faint, fontSize: 13 }}>Noch keine Dateien hochgeladen</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {files.map((f, idx) => (
                <div key={f.name} style={{ borderRadius: 6, border: `1px solid ${C.border}`, overflow: 'hidden', background: C.bg }}>
                  <div style={{ position: 'relative', width: '100%', paddingBottom: '40%', background: '#1a1509', overflow: 'hidden' }}>
                    <img src={`${API}/files/${encodeURIComponent(f.name)}/thumbnail`}
                      alt="" loading="lazy"
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    <button onClick={() => openPreview(f.name)}
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', background: preview === f.name ? 'rgba(211,188,118,.25)' : 'rgba(44,36,22,.25)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(253,251,248,.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill={C.text}><polygon points="5,3 19,12 5,21" /></svg>
                      </div>
                    </button>
                    <span style={{ position: 'absolute', top: 6, left: 8, background: 'rgba(44,36,22,.75)', color: '#FAF7F2', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 3 }}>#{stableNumber.get(f.name) ?? (idx + 1)}</span>
                  </div>
                  <div style={{ padding: '7px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>{f.name}</span>
                    {f.duration ? <span style={{ color: C.faint, fontSize: 11, flexShrink: 0 }}>{fmtDuration(f.duration)}</span> : null}
                    <span style={{ color: C.faint, fontSize: 11, flexShrink: 0 }}>{fmt(f.size)}</span>
                    <button onClick={() => startStream(f.name)} disabled={switching}
                      style={btnSmall(status.running && status.info?.filename === f.name ? 'ghost' : 'gold')}
                      title={status.running ? 'Anderen Stream starten (aktueller wird gestoppt)' : 'Jetzt streamen'}>
                      {status.running && status.info?.filename === f.name ? '▶ Live' : 'Live'}
                    </button>
                    <button onClick={() => setConfirmDelete(f.name)} style={{ background: 'none', border: 'none', color: C.faint, cursor: 'pointer', fontSize: 16, padding: '0 2px', lineHeight: 1 }}>×</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Live monitor — shows whenever SRS has an active publisher (OBS or file stream) */}
          {(status.running || srsLive) && (
            <div style={{ ...card, borderTop: `3px solid ${C.green}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={label}>Live-Monitor</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button onClick={() => setLiveKey(Date.now())} style={btnSmall('ghost')} title="Player neu laden">↻</button>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, color: C.green }}>● LIVE</span>
                </div>
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>
                {status.running
                  ? `${status.info?.filename ?? ''}${status.progress ? ' · ' + status.progress : ''}`
                  : 'OBS-Stream aktiv'}
              </div>
              <LiveMonitorIframe liveKey={liveKey} />
            </div>
          )}

          {/* Schedule table */}
          <div style={card}>
            <span style={label}>Zeitplan — nächste 14 Tage</span>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                    <th style={{ textAlign: 'left', padding: '6px 12px', color: C.faint, fontWeight: 600, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase' as const, width: 110 }}>Datum</th>
                    <th style={{ textAlign: 'left', padding: '6px 12px', color: C.faint, fontWeight: 600, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase' as const }}>Slot 1</th>
                    <th style={{ textAlign: 'left', padding: '6px 12px', color: C.faint, fontWeight: 600, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase' as const }}>Slot 2</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(groupedSlots).map(([date, daySlots], rowIdx) => {
                    const slot1 = daySlots.find(s => s.slot === 1)!
                    const slot2 = daySlots.find(s => s.slot === 2)!
                    return (
                      <tr key={date} style={{ borderBottom: `1px solid ${C.border}`, background: rowIdx % 2 === 0 ? 'transparent' : 'rgba(221,213,200,.15)' }}>
                        <td style={{ padding: '10px 12px', color: C.muted, whiteSpace: 'nowrap', fontSize: 12, fontWeight: 500 }}>{slot1.label}</td>
                        {[slot1, slot2].map(slot => {
                          const t = getSlotTime(slot)
                          const job = matchJob(slot, t, status.scheduled)
                          const isPast = berlinToUTC(slot.date, 23, 59) < new Date()
                          return (
                            <td key={slot.slot} style={{ padding: '8px 12px' }}>
                              {job ? (
                                job.mode === 'live' ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: C.redLight, border: `1px solid ${C.red}`, borderRadius: 5 }}>
                                    <span style={{ fontSize: 16, lineHeight: 1 }}>🔴</span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontSize: 11, fontWeight: 700, color: C.red }}>{formatJobTime(job.datetime)}</div>
                                      <div style={{ fontSize: 11, color: C.red, fontWeight: 600 }}>Live — manuell via OBS starten</div>
                                    </div>
                                    <button onClick={() => cancelSlot(job.id)} style={btnSmall('danger')}>×</button>
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ position: 'relative', flexShrink: 0 }}>
                                      <ThumbnailImg name={job.filename ?? ''} size={36} />
                                      {job.filename && stableNumber.get(job.filename) && (
                                        <span style={{ position: 'absolute', top: 2, left: 2, background: 'rgba(44,36,22,.8)', color: '#FAF7F2', fontSize: 9, fontWeight: 700, padding: '1px 4px', borderRadius: 2, lineHeight: 1.4 }}>
                                          #{stableNumber.get(job.filename)}
                                        </span>
                                      )}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontSize: 11, fontWeight: 700, color: C.green }}>{formatJobTime(job.datetime)}</div>
                                      <div style={{ fontSize: 11, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{job.filename}</div>
                                    </div>
                                    <button onClick={() => cancelSlot(job.id)} style={btnSmall('danger')}>×</button>
                                  </div>
                                )
                              ) : isPast ? (
                                <span style={{ color: C.faint, fontSize: 11 }}>—</span>
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <input type="time" value={t}
                                    onChange={e => setSlotTimes(prev => ({ ...prev, [slotKey(slot)]: e.target.value }))}
                                    style={inputStyle} />
                                  <button onClick={() => setAssigning(slot)} style={btnSmall('gold')}>+ Zuweisen</button>
                                </div>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Diagnostic panel */}
          {showDiag && (
            <div style={{ ...card, borderColor: C.orange }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <span style={{ ...label, marginBottom: 0 }}>Diagnose &amp; Reset</span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                  <button onClick={loadDiag} style={btnSmall('ghost')} title="Aktualisieren">↻</button>
                  <button onClick={forceReset} disabled={resetting}
                    style={{ ...btnPrimary(true), opacity: resetting ? 0.6 : 1 }}>
                    {resetting ? 'Warte…' : 'SRS Force-Reset'}
                  </button>
                </div>
              </div>

              {/* SRS active streams */}
              <span style={{ ...label, marginBottom: 8 }}>SRS Streams</span>
              {srsStreams.length === 0
                ? <div style={{ fontSize: 12, color: C.faint, marginBottom: 12 }}>Keine Streams / SRS nicht erreichbar</div>
                : srsStreams.map((s, i) => {
                    const w = s.video?.width, h = s.video?.height
                    const inKbps = s.kbps?.recv_30s ?? 0
                    const outKbps = s.kbps?.send_30s ?? 0
                    return (
                      <div key={i} style={{ fontSize: 12, fontFamily: 'monospace', padding: '6px 8px', background: C.bg, borderRadius: 4, marginBottom: 4, color: s.publish?.active ? C.green : C.muted }}>
                        <div>{s.app}/{s.name} — publisher: {s.publish?.active ? 'AKTIV' : 'inaktiv'} — clients: {s.clients ?? 0}</div>
                        {(w && h) ? <div style={{ color: C.faint, fontSize: 11 }}>  {w}×{h} • {inKbps}↓ kbps / {outKbps}↑ kbps</div> : null}
                      </div>
                    )
                  })
              }

              {/* Connected clients (IPs) */}
              <span style={{ ...label, marginBottom: 8, marginTop: 12 }}>Clients ({srsClients.length})</span>
              {srsClients.length === 0
                ? <div style={{ fontSize: 12, color: C.faint, marginBottom: 12 }}>Keine Zuschauer verbunden</div>
                : (
                  <div style={{ background: C.bg, borderRadius: 4, marginBottom: 12, overflow: 'hidden' }}>
                    {srsClients.map((cl, i) => {
                      const isPub = (cl.type || '').includes('publish')
                      const kindColor = isPub ? C.orange : C.green
                      const kindLabel = isPub ? 'PUBLISH' : (cl.type || '?').toUpperCase()
                      const sec = Math.round(cl.alive ?? 0)
                      return (
                        <div key={cl.id || i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', borderBottom: i < srsClients.length - 1 ? `1px solid ${C.border}` : 'none', fontSize: 12, fontFamily: 'monospace' }}>
                          <span style={{ minWidth: 56, fontSize: 9, fontWeight: 700, letterSpacing: 0.8, color: kindColor, background: cl.type?.includes('hls') ? C.greenLight : '#FDF4EE', border: `1px solid ${kindColor}`, borderRadius: 3, padding: '1px 5px', textAlign: 'center' }}>{kindLabel}</span>
                          <span style={{ minWidth: 130, color: C.text, fontWeight: 600 }}>{cl.ip || '—'}</span>
                          <span style={{ color: C.muted, fontSize: 11, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={cl.pageUrl || ''}>
                            {cl.pageUrl ? cl.pageUrl.replace(/^https?:\/\//, '').split('?')[0] : (cl.url || '')}
                          </span>
                          <span style={{ color: C.faint, fontSize: 11, flexShrink: 0 }}>{sec}s</span>
                          <span style={{ color: C.faint, fontSize: 11, flexShrink: 0, minWidth: 50, textAlign: 'right' }}>
                            {(cl.send_kbps ?? 0) > 0 ? `${cl.send_kbps}↓` : ''}{(cl.recv_kbps ?? 0) > 0 ? ` ${cl.recv_kbps}↑` : ''}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )
              }

              {/* ffmpeg stderr log */}
              <span style={{ ...label, marginBottom: 8, marginTop: 12 }}>ffmpeg Log (letzte 100 Zeilen)</span>
              <div style={{ background: '#1a1509', borderRadius: 5, padding: '10px 12px', maxHeight: 260, overflowY: 'auto', fontFamily: 'monospace', fontSize: 11, color: '#c8f064', lineHeight: 1.6 }}>
                {streamLog.length === 0
                  ? <span style={{ color: '#6B5D4F' }}>Kein Log</span>
                  : streamLog.slice().reverse().map((l, i) => (
                      <div key={i} style={{ color: l.startsWith('[studio]') ? '#D3BC76' : l.toLowerCase().includes('error') || l.includes('failed') ? '#f06464' : '#c8f064' }}>{l}</div>
                    ))
                }
              </div>
            </div>
          )}

          {/* Active timers */}
          <div style={card}>
            <span style={label}>Aktive Timer ({status.scheduled.length})</span>
            {status.scheduled.length === 0
              ? <div style={{ color: C.faint, fontSize: 12 }}>Keine geplanten Streams</div>
              : status.scheduled
                  .slice()
                  .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime())
                  .map((j, i, arr) => {
                    const isLive = j.mode === 'live'
                    const localTime = new Date(j.datetime).toLocaleString('de-DE', { timeZone: 'Europe/Berlin', weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                    const minutesLeft = Math.round((new Date(j.datetime).getTime() - Date.now()) / 60000)
                    const fileIdx = files.findIndex(f => f.name === j.filename)
                    return (
                      <div key={j.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                        {isLive ? (
                          <div style={{ width: 48, height: 48, borderRadius: 4, background: C.redLight, border: `1px solid ${C.red}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🔴</div>
                        ) : (
                          <ThumbnailImg name={j.filename ?? ''} size={48} />
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: isLive ? C.red : C.text, marginBottom: 2 }}>
                            {isLive ? 'Live — manuell via OBS starten' : (
                              <>
                                {fileIdx >= 0 ? <span style={{ color: C.faint, marginRight: 6 }}>#{fileIdx + 1}</span> : null}
                                {j.filename}
                              </>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: C.green, fontWeight: 600 }}>{localTime}</div>
                        </div>
                        <div style={{ textAlign: 'right' as const, flexShrink: 0 }}>
                          <div style={{ fontSize: 11, color: C.faint, marginBottom: 4 }}>{minutesLeft > 0 ? `in ${minutesLeft} min` : 'gleich'}</div>
                          <button onClick={() => cancelSlot(j.id)} style={btnSmall('danger')}>Löschen</button>
                        </div>
                      </div>
                    )
                  })
            }
          </div>
        </div>
        {/* Flask Console */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={label}>Flask Konsole</span>
            <span style={{ fontSize: 10, color: C.faint }}>
              auto-refresh 5s
            </span>
          </div>

          {!flaskStatus ? (
            <div style={{ color: C.faint, fontSize: 12 }}>Wird geladen …</div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 14 }}>
                <Stat label="Status" value={flaskStatus.streamRunning ? 'Streamt' : 'Bereit'}
                  accent={flaskStatus.streamRunning ? C.green : C.faint} />
                <Stat label="PID" value={String(flaskStatus.pid)} />
                <Stat label="Uptime" value={fmtUptime(flaskStatus.uptimeSeconds)} />
                <Stat label="ffmpeg-Prozesse" value={String(flaskStatus.ffmpegCount)}
                  accent={flaskStatus.ffmpegCount > 0 ? C.orange : C.faint} />
                <Stat label="Aktive Uploads" value={String(flaskStatus.activeUploads)}
                  accent={flaskStatus.activeUploads > 0 ? C.goldDark : C.faint} />
                <Stat label="Geplant" value={String(flaskStatus.scheduledCount)} />
                <Stat label="Disk belegt" value={`${flaskStatus.diskUsedPct}%`}
                  sub={fmtBytes(flaskStatus.diskUsed) + ' / ' + fmtBytes(flaskStatus.diskTotal)}
                  accent={flaskStatus.diskUsedPct > 90 ? C.red : flaskStatus.diskUsedPct > 75 ? C.orange : C.faint} />
                <Stat label="Letzter Stream" value={flaskStatus.lastInfo?.filename || '—'}
                  sub={flaskStatus.lastInfo?.filename ? '' : ''} truncate />
              </div>

              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12, display: 'flex', flexWrap: 'wrap' as const, gap: 8 }}>
                <ActionBtn label="SRS resetten" busy={flaskBusy === 'srs'} disabled={!!flaskBusy}
                  onClick={async () => {
                    if (!confirm('Alle Publisher im SRS-Container kicken?')) return
                    setFlaskBusy('srs')
                    const res = await apiCall('/srs/force-reset', { method: 'POST' })
                    if (res.ok) {
                      const d = res.data || {}
                      const n = d.killed_count ?? (Array.isArray(d.killed) ? d.killed.length : 0)
                      flashPersist(n > 0 ? `SRS reset: ${n} ffmpeg beendet` : 'SRS reset (nichts zu killen)')
                    } else {
                      flashPersist(`SRS reset fehlgeschlagen: ${res.error}`)
                    }
                    setFlaskBusy(null); loadFlaskStatus(); loadStatus()
                  }} />
                <ActionBtn label="Uploads zurücksetzen" busy={flaskBusy === 'uploads'} disabled={!!flaskBusy}
                  onClick={async () => {
                    if (flaskStatus.activeUploads === 0) { flash('Keine aktiven Uploads'); return }
                    if (!confirm(`${flaskStatus.activeUploads} Upload-Session(s) verwerfen?`)) return
                    setFlaskBusy('uploads')
                    const res = await apiCall('/flask/clear-uploads', { method: 'POST' })
                    if (res.ok) flashPersist(`${res.data.cleared} Upload-Session(s) verworfen`)
                    else flashPersist(`Uploads zurücksetzen fehlgeschlagen: ${res.error}`)
                    setFlaskBusy(null); loadFlaskStatus(); loadUploads()
                  }} />
                <ActionBtn label="Alle Pläne löschen" busy={flaskBusy === 'schedules'} disabled={!!flaskBusy}
                  danger
                  onClick={async () => {
                    if (flaskStatus.scheduledCount === 0) { flash('Keine Pläne'); return }
                    if (!confirm(`Alle ${flaskStatus.scheduledCount} geplanten Streams abbrechen? Dies lässt sich nicht rückgängig machen.`)) return
                    setFlaskBusy('schedules')
                    const res = await apiCall('/flask/clear-schedules', { method: 'POST' })
                    if (res.ok) flashPersist(`${res.data.cancelled} Plan(s) abgebrochen`)
                    else flashPersist(`Pläne löschen fehlgeschlagen: ${res.error}`)
                    setFlaskBusy(null); loadFlaskStatus(); loadStatus()
                  }} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
