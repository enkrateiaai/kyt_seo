'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

const API = '/api/studio-proxy/api'

const C = {
  bg: '#0f1117',
  surface: '#1a1d27',
  border: '#2a2d3a',
  text: '#e2e8f0',
  muted: '#7c8394',
  accent: '#6366f1',
  green: '#22c55e',
  red: '#ef4444',
  orange: '#f97316',
}

type FileEntry = { name: string; size: number; mtime: number }
type StreamStatus = { active: boolean; file?: string; started_at?: string }
type ScheduleJob = { id: string; file: string; run_at: string }

function fmt(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function StudioClient() {
  const [files, setFiles] = useState<FileEntry[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [status, setStatus] = useState<StreamStatus>({ active: false })
  const [schedule, setSchedule] = useState<ScheduleJob[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadPct, setUploadPct] = useState(0)
  const [scheduleAt, setScheduleAt] = useState('')
  const [drag, setDrag] = useState(false)
  const [msg, setMsg] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  const loadFiles = useCallback(async () => {
    const r = await fetch(`${API}/files`)
    if (r.ok) setFiles(await r.json())
  }, [])

  const loadStatus = useCallback(async () => {
    const r = await fetch(`${API}/stream/status`)
    if (r.ok) setStatus(await r.json())
  }, [])

  const loadSchedule = useCallback(async () => {
    const r = await fetch(`${API}/stream/schedule`)
    if (r.ok) setSchedule(await r.json())
  }, [])

  useEffect(() => {
    loadFiles(); loadStatus(); loadSchedule()
    const id = setInterval(() => { loadStatus(); loadSchedule() }, 5000)
    return () => clearInterval(id)
  }, [loadFiles, loadStatus, loadSchedule])

  async function upload(file: File) {
    setUploading(true); setUploadPct(0)
    const xhr = new XMLHttpRequest()
    xhr.upload.onprogress = (e) => e.lengthComputable && setUploadPct(Math.round(e.loaded / e.total * 100))
    xhr.onload = () => {
      setUploading(false)
      if (xhr.status < 300) { flash(`Hochgeladen: ${file.name}`); loadFiles() }
      else flash(`Fehler: ${xhr.status}`)
    }
    xhr.onerror = () => { setUploading(false); flash('Upload fehlgeschlagen') }
    const fd = new FormData(); fd.append('file', file)
    xhr.open('POST', `${API}/upload`); xhr.send(fd)
  }

  async function startStream() {
    if (!selected) return flash('Keine Datei ausgewählt')
    const r = await fetch(`${API}/stream/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file: selected }) })
    flash(r.ok ? `Stream gestartet: ${selected}` : `Fehler ${r.status}`)
    loadStatus()
  }

  async function stopStream() {
    const r = await fetch(`${API}/stream/stop`, { method: 'POST' })
    flash(r.ok ? 'Stream gestoppt' : `Fehler ${r.status}`)
    loadStatus()
  }

  async function addSchedule() {
    if (!selected) return flash('Keine Datei ausgewählt')
    if (!scheduleAt) return flash('Kein Zeitpunkt angegeben')
    const r = await fetch(`${API}/stream/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file: selected, run_at: new Date(scheduleAt).toISOString() }),
    })
    flash(r.ok ? 'Eingeplant' : `Fehler ${r.status}`)
    loadSchedule()
  }

  async function deleteSchedule(id: string) {
    await fetch(`${API}/stream/schedule/${id}`, { method: 'DELETE' })
    loadSchedule()
  }

  async function deleteFile(name: string) {
    await fetch(`${API}/files/${encodeURIComponent(name)}`, { method: 'DELETE' })
    if (selected === name) setSelected(null)
    loadFiles()
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDrag(false)
    const f = e.dataTransfer.files[0]; if (f) upload(f)
  }

  const btn = (color: string): React.CSSProperties => ({ padding: '8px 16px', borderRadius: 6, border: 'none', background: color, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500, width: '100%', marginBottom: 8 })
  const fileItem = (sel: boolean): React.CSSProperties => ({ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: sel ? 'rgba(99,102,241,.08)' : C.bg, borderRadius: 6, fontSize: 13, border: `1px solid ${sel ? C.accent : 'transparent'}`, cursor: 'pointer', marginBottom: 4 })

  const s: Record<string, React.CSSProperties> = {
    page: { minHeight: '100vh', background: C.bg, color: C.text, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
    header: { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 24px', background: C.surface, borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, zIndex: 10 },
    badge: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, background: C.bg, border: `1px solid ${C.border}`, fontSize: 12, fontWeight: 600 },
    dot: { width: 8, height: 8, borderRadius: '50%', background: status.active ? C.green : C.muted, boxShadow: status.active ? `0 0 8px ${C.green}` : 'none' },
    grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: '16px 24px', maxWidth: 1200, margin: '0 auto' },
    panel: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16 },
    title: { fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 1, color: C.muted, marginBottom: 14 },
    dropZone: { border: `2px dashed ${drag ? C.accent : C.border}`, borderRadius: 8, padding: '28px 20px', textAlign: 'center' as const, cursor: 'pointer', background: drag ? 'rgba(99,102,241,.05)' : 'transparent' },
  }

  return (
    <div style={s.page}>
      <header style={s.header}>
        <span style={{ fontSize: 18, fontWeight: 600 }}>Enkra Studio</span>
        <div style={s.badge}>
          <span style={s.dot} />
          <span style={{ color: status.active ? C.green : C.muted }}>{status.active ? 'LIVE' : 'OFFLINE'}</span>
        </div>
      </header>

      {msg && (
        <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '10px 24px', fontSize: 13, color: C.accent }}>{msg}</div>
      )}

      <div style={s.grid}>
        {/* Upload */}
        <div style={s.panel}>
          <div style={s.title}>Dateien</div>
          <div
            style={s.dropZone}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
          >
            <p style={{ color: C.muted, fontSize: 13 }}><strong style={{ color: C.accent }}>Datei auswählen</strong> oder hierher ziehen</p>
            {uploading && <div style={{ color: C.orange, fontSize: 12, marginTop: 8 }}>{uploadPct}% hochgeladen…</div>}
            <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f) }} />
          </div>

          <div style={{ marginTop: 12 }}>
            {files.length === 0 && <p style={{ color: C.muted, fontSize: 13 }}>Keine Dateien</p>}
            {files.map((f) => (
              <div key={f.name} style={fileItem(selected === f.name)} onClick={() => setSelected(f.name)}>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                <span style={{ color: C.muted, fontSize: 11 }}>{fmt(f.size)}</span>
                <button onClick={(e) => { e.stopPropagation(); deleteFile(f.name) }} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 13, padding: '2px 4px' }}>✕</button>
              </div>
            ))}
          </div>
        </div>

        {/* Stream controls */}
        <div style={s.panel}>
          <div style={s.title}>Stream</div>
          {selected && <div style={{ color: C.muted, fontSize: 12, marginBottom: 12 }}>Ausgewählt: <span style={{ color: C.text }}>{selected}</span></div>}

          {status.active ? (
            <>
              <div style={{ color: C.green, fontSize: 13, marginBottom: 12 }}>
                Live: {status.file}<br />
                <span style={{ color: C.muted, fontSize: 11 }}>seit {status.started_at ? new Date(status.started_at).toLocaleTimeString('de-DE') : '–'}</span>
              </div>
              <button style={btn(C.red)} onClick={stopStream}>Stream stoppen</button>
            </>
          ) : (
            <button style={btn(C.green)} onClick={startStream} disabled={!selected}>Stream starten</button>
          )}

          <div style={{ marginTop: 24 }}>
            <div style={s.title}>Zeitplan</div>
            <input
              type="datetime-local"
              value={scheduleAt}
              onChange={(e) => setScheduleAt(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 13, marginBottom: 8 }}
            />
            <button style={btn(C.accent)} onClick={addSchedule} disabled={!selected || !scheduleAt}>Einplanen</button>

            {schedule.length > 0 && (
              <div style={{ marginTop: 12 }}>
                {schedule.map((j) => (
                  <div key={j.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: C.bg, borderRadius: 6, fontSize: 12, marginBottom: 4 }}>
                    <span style={{ flex: 1 }}>{j.file}</span>
                    <span style={{ color: C.muted }}>{new Date(j.run_at).toLocaleString('de-DE')}</span>
                    <button onClick={() => deleteSchedule(j.id)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 13 }}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
