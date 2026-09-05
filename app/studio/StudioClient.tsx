'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

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
type ScheduledJob = { id: string; filename: string; streamKey: string; datetime: string }
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

export default function StudioClient() {
  const [files, setFiles] = useState<FileEntry[]>([])
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
  const [statusError, setStatusError] = useState(false)
  const [streamLog, setStreamLog] = useState<string[]>([])
  const [srsStreams, setSrsStreams] = useState<SrsStream[]>([])
  const [srsClients, setSrsClients] = useState<SrsClient[]>([])
  const [showDiag, setShowDiag] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [switching, setSwitching] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const slots = buildSlots()

  const getSlotTime = useCallback((s: SlotDef) =>
    slotTimes[slotKey(s)] ?? defaultSlotTime(s.date, s.slot), [slotTimes])

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }

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

  useEffect(() => {
    if (!showDiag) return
    loadDiag()
    const id = setInterval(loadDiag, 3000)
    return () => clearInterval(id)
  }, [showDiag, loadDiag])

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
    try {
      for (let i = 0; i < total; i++) {
        const fd = new FormData()
        fd.append('file', file.slice(i * CHUNK, (i + 1) * CHUNK), file.name)
        fd.append('filename', file.name)
        fd.append('chunk_index', String(i))
        fd.append('total_chunks', String(total))
        if (overwrite) fd.append('overwrite', 'true')
        const res = await fetch(uploadUrl, { method: 'POST', body: fd, headers: authHeader })
        if (res.status === 409) {
          const data = await res.json()
          if (data.conflict) { setConflictFile({ file, name: data.name }); return }
        }
        if (!res.ok) { flash(`Fehler: ${res.status}`); return }
        setUploadPct(Math.round((i + 1) / total * 100))
      }
      flash(`Hochgeladen: ${file.name}`); loadFiles()
    } catch {
      flash('Upload fehlgeschlagen')
    } finally {
      setUploading(false)
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
      const r = await fetch(`${API}/stream/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, streamKey: 'live', seekSeconds }),
      })
      if (!r.ok) {
        flash(`Fehler ${r.status}`)
        return
      }
      const d = await r.json().catch(() => ({} as any))
      const killed = d?.killedCount ?? 0
      if (wasRunning && d?.switched) {
        const tail = killed > 0 ? ` (${killed} ffmpeg beendet)` : ''
        flash(`Gewechselt zu: ${filename}${tail}`)
      } else {
        flash(`Gestartet: ${filename}`)
      }
    } finally {
      setSwitching(false)
      setSeekDraft(null)
      loadStatus()
    }
  }

  async function stopStream() {
    const r = await fetch(`${API}/stream/stop`, { method: 'POST' })
    flash(r.ok ? 'Pausiert' : `Fehler ${r.status}`)
    loadStatus()
  }

  async function fullStop() {
    const r = await fetch(`${API}/stream/stop`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ full: true }) })
    flash(r.ok ? 'Stream beendet' : `Fehler ${r.status}`)
    loadStatus()
  }

  async function forceReset() {
    setResetting(true)
    flash('SRS zurücksetzen…')
    const r = await fetch(`${API}/srs/force-reset`, { method: 'POST' })
    const d = r.ok ? await r.json() : null
    const n = d?.killed_count ?? (Array.isArray(d?.killed) ? d.killed.length : 0)
    if (n > 0) flash(`${n} ffmpeg${n === 1 ? '' : 's'} gekillt — SRS-Slot wird in ~30s frei`)
    else if (d?.slot_will_free) flash('SRS-Slot freigegeben ✓')
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
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: C.orange, background: '#FDF4EE', border: `1px solid ${C.orange}`, borderRadius: 3, padding: '2px 7px' }}>
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
            <span style={label}>Video auswählen</span>
            <p style={{ color: C.muted, fontSize: 12, marginBottom: 16 }}>{assigning.label} · Slot {assigning.slot} · {getSlotTime(assigning)}</p>
            {files.length === 0 && <div style={{ color: C.faint }}>Keine Dateien vorhanden</div>}
            {files.map((f, i) => (
              <div key={f.name} onClick={() => assignSlot(assigning, f.name)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px', borderRadius: 5, border: `1px solid ${C.border}`, marginBottom: 6, cursor: 'pointer', background: C.bg }}
                onMouseEnter={e => (e.currentTarget.style.background = '#F5EDD8')}
                onMouseLeave={e => (e.currentTarget.style.background = C.bg)}>
                <span style={{ fontSize: 10, fontWeight: 700, color: C.faint, minWidth: 20 }}>#{i+1}</span>
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
                    <span style={{ position: 'absolute', top: 6, left: 8, background: 'rgba(44,36,22,.75)', color: '#FAF7F2', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 3 }}>#{idx + 1}</span>
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
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <ThumbnailImg name={job.filename} size={36} />
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: C.green }}>{formatJobTime(job.datetime)}</div>
                                    <div style={{ fontSize: 11, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{job.filename}</div>
                                  </div>
                                  <button onClick={() => cancelSlot(job.id)} style={btnSmall('danger')}>×</button>
                                </div>
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
                    const localTime = new Date(j.datetime).toLocaleString('de-DE', { timeZone: 'Europe/Berlin', weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                    const minutesLeft = Math.round((new Date(j.datetime).getTime() - Date.now()) / 60000)
                    const fileIdx = files.findIndex(f => f.name === j.filename)
                    return (
                      <div key={j.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                        <ThumbnailImg name={j.filename} size={48} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 2 }}>
                            {fileIdx >= 0 ? <span style={{ color: C.faint, marginRight: 6 }}>#{fileIdx + 1}</span> : null}
                            {j.filename}
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
      </div>
    </div>
  )
}
