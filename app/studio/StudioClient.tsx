'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

const API = '/api/studio-proxy/api'

const C = {
  bg: '#0f1117', surface: '#1a1d27', border: '#2a2d3a',
  text: '#e2e8f0', muted: '#7c8394', accent: '#6366f1',
  green: '#22c55e', red: '#ef4444', orange: '#f97316',
}

type FileEntry = { name: string; size: number; mtime: number; duration?: number }
type StreamStatus = { running: boolean; info?: { filename?: string; started?: string; seekSeconds?: number }; progress?: string; progressSecs?: number; resumeAt?: number; lastInfo?: { filename?: string; seekSeconds?: number }; scheduled: ScheduledJob[] }
type ScheduledJob = { id: string; filename: string; streamKey: string; datetime: string }
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
    const dateStr = localDateStr(d) // use LOCAL date to avoid UTC offset shifting the day
    const dow = d.getDay()
    const label = `${DAYS[dow]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
    slots.push({ date: dateStr, label, slot: 1 })
    slots.push({ date: dateStr, label, slot: 2 })
  }
  return slots
}

// Match a job to a slot: job datetime must be within 1h45m of the slot's (editable) time
function matchJob(slot: SlotDef, slotTime: string, jobs: ScheduledJob[]): ScheduledJob | undefined {
  const [hh, mm] = slotTime.split(':').map(Number)
  const slotUtc = berlinToUTC(slot.date, hh, mm)
  return jobs.find(j => Math.abs(new Date(j.datetime).getTime() - slotUtc.getTime()) < 1.75 * 3_600_000)
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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const slots = buildSlots()

  const getSlotTime = useCallback((s: SlotDef) =>
    slotTimes[slotKey(s)] ?? defaultSlotTime(s.date, s.slot), [slotTimes])

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  const loadFiles = useCallback(async () => {
    const r = await fetch(`${API}/files`); if (r.ok) setFiles(await r.json())
  }, [])

  const loadStatus = useCallback(async () => {
    const r = await fetch(`${API}/stream/status`); if (r.ok) setStatus(await r.json())
  }, [])

  useEffect(() => {
    loadFiles(); loadStatus()
    const id = setInterval(loadStatus, 5000)
    return () => clearInterval(id)
  }, [loadFiles, loadStatus])

  // Try to establish direct Tailscale connection for fast uploads
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
        } catch { /* not on Tailscale, proxy will be used */ }
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
    const r = await fetch(`${API}/stream/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename, streamKey: 'live', seekSeconds }) })
    flash(r.ok ? `Stream gestartet: ${filename}` : `Fehler ${r.status}`)
    setSeekDraft(null); loadStatus()
  }

  async function stopStream() {
    const r = await fetch(`${API}/stream/stop`, { method: 'POST' })
    flash(r.ok ? 'Stream gestoppt' : `Fehler ${r.status}`)
    loadStatus()
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

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDrag(false)
    const f = e.dataTransfer.files[0]; if (f) doUpload(f)
  }

  const btn = (bg: string, sm?: boolean): React.CSSProperties => ({ padding: sm ? '4px 10px' : '7px 14px', borderRadius: 6, border: 'none', background: bg, color: '#fff', cursor: 'pointer', fontSize: sm ? 11 : 13, fontWeight: 500 })

  const s: Record<string, React.CSSProperties> = {
    page: { minHeight: '100vh', background: C.bg, color: C.text, fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', fontSize: 14 },
    header: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 24px', background: C.surface, borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, zIndex: 20 },
    badge: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, background: C.bg, border: `1px solid ${C.border}`, fontSize: 12, fontWeight: 600 },
    dot: { width: 8, height: 8, borderRadius: '50%', background: status.running ? C.green : C.muted, boxShadow: status.running ? `0 0 8px ${C.green}` : 'none' },
    panel: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16 },
    title: { fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 1, color: C.muted, marginBottom: 12 },
    dropZone: { border: `2px dashed ${drag ? C.accent : C.border}`, borderRadius: 8, padding: '20px', textAlign: 'center' as const, cursor: 'pointer', background: drag ? 'rgba(99,102,241,.05)' : 'transparent', marginBottom: 16 },
  }

  const groupedSlots: Record<string, SlotDef[]> = {}
  slots.forEach(sl => { if (!groupedSlots[sl.date]) groupedSlots[sl.date] = []; groupedSlots[sl.date].push(sl) })

  return (
    <div style={s.page}>
      {/* Header */}
      <header style={s.header}>
        <span style={{ fontSize: 17, fontWeight: 600 }}>Enkra Studio</span>
        {directApi && <span style={{ fontSize: 11, color: C.green, background: 'rgba(34,197,94,.1)', border: `1px solid ${C.green}`, borderRadius: 4, padding: '2px 7px' }}>⚡ Direct</span>}
        <div style={s.badge}>
          <span style={s.dot} />
          <span style={{ color: status.running ? C.green : C.muted }}>{status.running ? 'LIVE' : 'OFFLINE'}</span>
        </div>
      </header>

      {/* Flash message */}
      {msg && <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '8px 24px', fontSize: 13, color: C.accent }}>{msg}</div>}

      {/* Conflict dialog */}
      {conflictFile && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ ...s.panel, maxWidth: 360, width: '100%' }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Datei existiert bereits</div>
            <div style={{ color: C.muted, marginBottom: 16, fontSize: 13 }}>„{conflictFile.name}" existiert schon. Überschreiben oder Kopie erstellen?</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={btn(C.red)} onClick={() => { const f = conflictFile; setConflictFile(null); doUpload(f.file, true) }}>Überschreiben</button>
              <button style={btn(C.accent)} onClick={handleUploadCopy}>Kopie erstellen</button>
              <button style={btn(C.muted)} onClick={() => setConflictFile(null)}>Abbrechen</button>
            </div>
          </div>
        </div>
      )}

      {/* Assign modal */}
      {assigning && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ ...s.panel, maxWidth: 400, width: '100%', maxHeight: '80vh', overflow: 'auto' }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Video auswählen</div>
            <div style={{ color: C.muted, fontSize: 12, marginBottom: 16 }}>{assigning.label} · Slot {assigning.slot} · {getSlotTime(assigning)}</div>
            {files.length === 0 && <div style={{ color: C.muted }}>Keine Dateien vorhanden</div>}
            {files.map(f => (
              <div key={f.name} onClick={() => assignSlot(assigning, f.name)}
                style={{ padding: '10px 12px', borderRadius: 6, border: `1px solid ${C.border}`, marginBottom: 6, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,.08)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: 8 }}>{f.name}</span>
                <span style={{ color: C.muted, fontSize: 11, flexShrink: 0 }}>{fmt(f.size)}</span>
              </div>
            ))}
            <button style={{ ...btn(C.muted), marginTop: 12 }} onClick={() => setAssigning(null)}>Abbrechen</button>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: 16, display: 'grid', gridTemplateColumns: '380px 1fr', gap: 16 }}>

        {/* Left column: upload + library */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Now streaming / resume panel */}
          {(status.running || (status.resumeAt && status.resumeAt > 0)) && (() => {
            const filename = status.running ? status.info?.filename : status.lastInfo?.filename
            const dur = files.find(f => f.name === filename)?.duration ?? 0
            const posSecs = seekDraft ?? status.progressSecs ?? 0
            const pct = dur > 0 ? Math.min(100, (posSecs / dur) * 100) : 0
            const remaining = dur > 0 ? fmtDuration(Math.max(0, dur - posSecs)) : ''
            return (
              <div style={{ ...s.panel, borderColor: status.running ? C.green : C.border }}>
                <div style={s.title}>{status.running ? 'Jetzt live' : 'Pausiert'}</div>
                <div style={{ fontWeight: 500, marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{filename}</div>
                {dur > 0 && (
                  <>
                    <div style={{ height: 4, background: C.border, borderRadius: 2, overflow: 'hidden', marginBottom: 4 }}>
                      <div style={{ height: '100%', background: status.running ? C.green : C.muted, width: `${pct}%`, transition: seekDraft !== null ? 'none' : 'width 1s linear' }} />
                    </div>
                    <input type="range" min={0} max={Math.round(dur)} value={Math.round(posSecs)}
                      onInput={e => setSeekDraft(parseInt((e.target as HTMLInputElement).value))}
                      onMouseUp={e => { const s = parseInt((e.target as HTMLInputElement).value); startStream(filename!, s) }}
                      onTouchEnd={e => { const s = parseInt((e.target as HTMLInputElement).value); startStream(filename!, s) }}
                      style={{ width: '100%', marginBottom: 4, accentColor: C.green }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.muted, marginBottom: 12 }}>
                      <span>{fmtDuration(posSecs)}</span>
                      <span>{remaining ? `-${remaining}` : fmtDuration(dur)}</span>
                    </div>
                  </>
                )}
                {!dur && status.running && <div style={{ color: C.muted, fontSize: 12, marginBottom: 12 }}>Position: {status.progress}</div>}
                <div style={{ display: 'flex', gap: 8 }}>
                  {status.running
                    ? <button style={btn(C.red)} onClick={stopStream}>⏹ Stoppen</button>
                    : <button style={btn(C.green)} onClick={() => startStream(filename!, status.resumeAt ?? 0)}>▶ Fortsetzen von {fmtDuration(status.resumeAt ?? 0)}</button>
                  }
                  {status.running && <button style={btn('#2a2d3a')} onClick={() => startStream(filename!, 0)}>⏮ Von Anfang</button>}
                </div>
              </div>
            )
          })()}

          {/* Upload */}
          <div style={s.panel}>
            <div style={s.title}>Upload</div>
            <div style={s.dropZone} onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDrag(true) }}
              onDragLeave={() => setDrag(false)} onDrop={onDrop}>
              <p style={{ color: C.muted, fontSize: 13 }}><strong style={{ color: C.accent }}>Datei auswählen</strong> oder hierher ziehen</p>
              {uploading && <div style={{ color: C.orange, fontSize: 12, marginTop: 8 }}>{uploadPct}% hochgeladen…</div>}
              <input ref={fileInputRef} type="file" accept="video/*" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) doUpload(f); e.target.value = '' }} />
            </div>
          </div>

          {/* Preview player */}
          {preview && (
            <div style={s.panel}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ ...s.title, margin: 0 }}>Vorschau</div>
                <button onClick={() => setPreview(null)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 16 }}>✕</button>
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{preview}</div>
              <video key={preview} controls style={{ width: '100%', borderRadius: 6, background: '#000' }}
                src={`${API}/files/${encodeURIComponent(preview)}/stream`} />
              {!status.running && (
                <button style={{ ...btn(C.green), width: '100%', marginTop: 10 }} onClick={() => startStream(preview)}>
                  Dieses Video streamen ▶
                </button>
              )}
            </div>
          )}

          {/* Video library */}
          <div style={s.panel}>
            <div style={s.title}>Mediathek ({files.length})</div>
            {files.length === 0 && <div style={{ color: C.muted, fontSize: 13 }}>Noch keine Dateien hochgeladen</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {files.map(f => (
                <div key={f.name} style={{ borderRadius: 8, border: `1px solid ${C.border}`, overflow: 'hidden', background: C.bg }}>
                  {/* Thumbnail */}
                  <div style={{ position: 'relative', width: '100%', paddingBottom: '42%', background: '#000', overflow: 'hidden' }}>
                    <img src={`${API}/files/${encodeURIComponent(f.name)}/thumbnail`}
                      alt="" loading="lazy"
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    <button onClick={() => setPreview(preview === f.name ? null : f.name)}
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', background: preview === f.name ? 'rgba(99,102,241,.3)' : 'rgba(0,0,0,.3)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,.2)', border: '2px solid rgba(255,255,255,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21" /></svg>
                      </div>
                    </button>
                  </div>
                  {/* Info row */}
                  <div style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }}>{f.name}</span>
                    {f.duration ? <span style={{ color: C.muted, fontSize: 11, flexShrink: 0 }}>{fmtDuration(f.duration)}</span> : null}
                    <span style={{ color: C.muted, fontSize: 11, flexShrink: 0 }}>{fmt(f.size)}</span>
                    {!status.running && (
                      <button onClick={() => startStream(f.name)} style={btn(C.green, true)}>▶ Live</button>
                    )}
                    <button onClick={() => deleteFile(f.name)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 14, padding: '2px 4px' }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: schedule */}
        <div style={s.panel}>
          <div style={s.title}>Zeitplan — nächste 14 Tage</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '8px 12px', color: C.muted, fontWeight: 500, borderBottom: `1px solid ${C.border}`, width: 110 }}>Datum</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', color: C.muted, fontWeight: 500, borderBottom: `1px solid ${C.border}` }}>Slot 1</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', color: C.muted, fontWeight: 500, borderBottom: `1px solid ${C.border}` }}>Slot 2</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(groupedSlots).map(([date, daySlots]) => {
                  const slot1 = daySlots.find(s => s.slot === 1)!
                  const slot2 = daySlots.find(s => s.slot === 2)!
                  return (
                    <tr key={date} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: '10px 12px', color: C.muted, whiteSpace: 'nowrap' }}>{slot1.label}</td>
                      {[slot1, slot2].map(slot => {
                        const t = getSlotTime(slot)
                        const job = matchJob(slot, t, status.scheduled)
                        const [hh, mm] = t.split(':').map(Number)
                        const isPast = berlinToUTC(slot.date, hh, mm) < new Date()
                        return (
                          <td key={slot.slot} style={{ padding: '8px 12px' }}>
                            {job ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ color: C.muted, fontSize: 11, minWidth: 38 }}>{formatJobTime(job.datetime)}</span>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200, color: C.accent }}>{job.filename}</span>
                                <button onClick={() => cancelSlot(job.id)} style={btn(C.red, true)}>✕</button>
                              </div>
                            ) : isPast ? (
                              <span style={{ color: C.muted, fontSize: 11 }}>—</span>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <input type="time" value={t}
                                  onChange={e => setSlotTimes(prev => ({ ...prev, [slotKey(slot)]: e.target.value }))}
                                  style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text, borderRadius: 4, padding: '3px 6px', fontSize: 12 }} />
                                <button onClick={() => setAssigning(slot)} style={btn('#2a2d3a', true)}>+ Zuweisen</button>
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
      </div>
    </div>
  )
}
