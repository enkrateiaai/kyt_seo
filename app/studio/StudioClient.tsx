'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

const API = '/api/studio-proxy/api'

const C = {
  bg: '#0f1117', surface: '#1a1d27', border: '#2a2d3a',
  text: '#e2e8f0', muted: '#7c8394', accent: '#6366f1',
  green: '#22c55e', red: '#ef4444', orange: '#f97316',
}

type FileEntry = { name: string; size: number; mtime: number }
type StreamStatus = { running: boolean; info?: { filename?: string; started?: string }; progress?: string; scheduled: ScheduledJob[] }
type ScheduledJob = { id: string; filename: string; streamKey: string; datetime: string }
type SlotDef = { date: string; label: string; slot: 1 | 2; utc: Date }

function fmt(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

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
    const dateStr = d.toISOString().slice(0, 10)
    const dow = d.getDay()
    const isWeekend = dow === 0 || dow === 6
    const label = `${DAYS[dow]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
    slots.push({ date: dateStr, label, slot: 1, utc: berlinToUTC(dateStr, isWeekend ? 7 : 6, isWeekend ? 0 : 30) })
    slots.push({ date: dateStr, label, slot: 2, utc: berlinToUTC(dateStr, 10, 0) })
  }
  return slots
}

function slotLabel(s: SlotDef) {
  const d = new Date(s.date); const dow = d.getDay()
  const isWeekend = dow === 0 || dow === 6
  return s.slot === 1 ? (isWeekend ? '07:00' : '06:30') : '10:00'
}

function matchJob(slot: SlotDef, jobs: ScheduledJob[]): ScheduledJob | undefined {
  return jobs.find(j => Math.abs(new Date(j.datetime).getTime() - slot.utc.getTime()) < 90_000)
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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const slots = buildSlots()

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

  async function doUpload(file: File, overwrite = false) {
    setUploading(true); setUploadPct(0)
    const CHUNK = 5 * 1024 * 1024
    const total = Math.max(1, Math.ceil(file.size / CHUNK))
    try {
      for (let i = 0; i < total; i++) {
        const fd = new FormData()
        fd.append('file', file.slice(i * CHUNK, (i + 1) * CHUNK), file.name)
        fd.append('filename', file.name)
        fd.append('chunk_index', String(i))
        fd.append('total_chunks', String(total))
        if (overwrite) fd.append('overwrite', 'true')
        const res = await fetch(`${API}/upload/chunk`, { method: 'POST', body: fd })
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

  async function startStream(filename: string) {
    const r = await fetch(`${API}/stream/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename, streamKey: 'live' }) })
    flash(r.ok ? `Stream gestartet: ${filename}` : `Fehler ${r.status}`)
    loadStatus()
  }

  async function stopStream() {
    const r = await fetch(`${API}/stream/stop`, { method: 'POST' })
    flash(r.ok ? 'Stream gestoppt' : `Fehler ${r.status}`)
    loadStatus()
  }

  async function assignSlot(slot: SlotDef, filename: string) {
    const r = await fetch(`${API}/stream/schedule`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, streamKey: 'live', datetime: slot.utc.toISOString() }),
    })
    flash(r.ok ? `Eingeplant: ${filename} um ${slotLabel(slot)}` : `Fehler ${r.status}`)
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
            <div style={{ color: C.muted, fontSize: 12, marginBottom: 16 }}>{assigning.label} · Slot {assigning.slot} · {slotLabel(assigning)}</div>
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

          {/* Now streaming panel */}
          {status.running && (
            <div style={{ ...s.panel, borderColor: C.green }}>
              <div style={s.title}>Jetzt live</div>
              <div style={{ fontWeight: 500, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{status.info?.filename}</div>
              {status.progress && <div style={{ color: C.muted, fontSize: 12, marginBottom: 12 }}>Position: {status.progress}</div>}
              <button style={btn(C.red)} onClick={stopStream}>Stream stoppen</button>
            </div>
          )}

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
              <video controls style={{ width: '100%', borderRadius: 6, background: '#000' }}
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
                  <th style={{ textAlign: 'left', padding: '8px 12px', color: C.muted, fontWeight: 500, borderBottom: `1px solid ${C.border}`, width: 120 }}>Datum</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', color: C.muted, fontWeight: 500, borderBottom: `1px solid ${C.border}` }}>Slot 1 (06:30 / 07:00)</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', color: C.muted, fontWeight: 500, borderBottom: `1px solid ${C.border}` }}>Slot 2 (10:00)</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(groupedSlots).map(([date, daySlots]) => {
                  const slot1 = daySlots.find(s => s.slot === 1)!
                  const slot2 = daySlots.find(s => s.slot === 2)!
                  const job1 = matchJob(slot1, status.scheduled)
                  const job2 = matchJob(slot2, status.scheduled)
                  const isPast1 = slot1.utc < new Date()
                  const isPast2 = slot2.utc < new Date()
                  return (
                    <tr key={date} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: '10px 12px', color: C.muted, whiteSpace: 'nowrap' }}>{slot1.label}</td>
                      {[{ slot: slot1, job: job1, past: isPast1 }, { slot: slot2, job: job2, past: isPast2 }].map(({ slot, job, past }) => (
                        <td key={slot.slot} style={{ padding: '8px 12px' }}>
                          {job ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200, color: C.accent }}>{job.filename}</span>
                              <button onClick={() => cancelSlot(job.id)} style={btn(C.red, true)}>✕</button>
                            </div>
                          ) : past ? (
                            <span style={{ color: C.muted, fontSize: 11 }}>—</span>
                          ) : (
                            <button onClick={() => setAssigning(slot)} style={btn(C.border.replace('#', '') ? '#2a2d3a' : C.surface, true)}>+ Zuweisen</button>
                          )}
                        </td>
                      ))}
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
