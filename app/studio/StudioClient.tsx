'use client'

import { useEffect, useRef, useState } from 'react'

const C = {
  bg: '#06060a', panel: '#0d0d14', text: '#e0e0e0',
  textSoft: '#888', textMuted: '#444', accent: '#c8f064',
  border: '#1a1a2e', red: '#ff6b6b', green: '#4ade80',
}

interface FileEntry { name: string; size: number; mtime: number }
interface ScheduledJob { id: string; filename: string; streamKey: string; datetime: string }
interface StreamStatus { running: boolean; info: { filename?: string; streamKey?: string; started?: string }; scheduled: ScheduledJob[] }

const fmt = {
  size: (b: number) => b >= 1e9 ? `${(b / 1e9).toFixed(1)} GB` : b >= 1e6 ? `${(b / 1e6).toFixed(0)} MB` : `${(b / 1e3).toFixed(0)} KB`,
  dt: (iso: string) => new Date(iso).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' }),
  age: (mtime: number) => {
    const d = (Date.now() / 1000 - mtime) / 86400
    return d < 1 ? 'Heute' : d < 2 ? 'Gestern' : `${Math.floor(d)} Tage`
  },
}

const btn = (bg = C.accent, color = '#000', extra = {}) => ({
  background: bg, color, border: 'none', borderRadius: 6, padding: '6px 14px',
  fontFamily: 'monospace', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 as const,
  ...extra,
})

const input = {
  background: '#111', border: `1px solid ${C.border}`, borderRadius: 6,
  padding: '8px 12px', color: C.text, fontSize: 13, fontFamily: 'monospace',
  outline: 'none', boxSizing: 'border-box' as const,
}

export default function StudioClient() {
  const [files, setFiles] = useState<FileEntry[]>([])
  const [status, setStatus] = useState<StreamStatus | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadName, setUploadName] = useState('')
  const [scheduleFor, setScheduleFor] = useState<string | null>(null)
  const [schedDate, setSchedDate] = useState('')
  const [schedTime, setSchedTime] = useState('')
  const [schedKey, setSchedKey] = useState('live')
  const [streamKey, setStreamKey] = useState('live')
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [obsOpen, setObsOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const flash = (text: string, ok = true) => {
    setMsg({ text, ok })
    setTimeout(() => setMsg(null), 4000)
  }

  const loadFiles = () =>
    fetch('/api/studio/files').then(r => r.json()).then(setFiles).catch(() => {})

  const loadStatus = () =>
    fetch('/api/studio/stream').then(r => r.json()).then(setStatus).catch(() => {})

  useEffect(() => {
    loadFiles()
    loadStatus()
    const t = setInterval(loadStatus, 5000)
    return () => clearInterval(t)
  }, [])

  const handleUpload = (file: File) => {
    setUploading(true)
    setUploadName(file.name)
    setUploadProgress(0)
    const xhr = new XMLHttpRequest()
    const fd = new FormData()
    fd.append('file', file)
    xhr.upload.onprogress = e => { if (e.lengthComputable) setUploadProgress(Math.round(e.loaded / e.total * 100)) }
    xhr.onload = () => {
      setUploading(false)
      setUploadName('')
      if (xhr.status === 200) { flash('Upload fertig!'); loadFiles() }
      else flash('Upload fehlgeschlagen', false)
    }
    xhr.onerror = () => { setUploading(false); flash('Upload fehlgeschlagen', false) }
    xhr.open('POST', '/api/studio/upload')
    xhr.send(fd)
  }

  const deleteFile = async (name: string) => {
    if (!confirm(`${name} löschen?`)) return
    const res = await fetch(`/api/studio/files?name=${encodeURIComponent(name)}`, { method: 'DELETE' })
    if (res.ok) { flash('Gelöscht'); loadFiles() } else flash('Fehler beim Löschen', false)
  }

  const startStream = async (filename: string) => {
    const res = await fetch('/api/studio/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start', filename, streamKey }),
    })
    if (res.ok) { flash(`Stream gestartet: ${filename}`); loadStatus() }
    else flash('Fehler beim Starten', false)
  }

  const stopStream = async () => {
    const res = await fetch('/api/studio/stream', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stop' }),
    })
    if (res.ok) { flash('Stream gestoppt'); loadStatus() }
  }

  const scheduleStream = async (filename: string) => {
    if (!schedDate || !schedTime) { flash('Datum und Uhrzeit eingeben', false); return }
    const datetime = new Date(`${schedDate}T${schedTime}`).toISOString()
    const res = await fetch('/api/studio/stream', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'schedule', filename, streamKey: schedKey, datetime }),
    })
    if (res.ok) { flash('Geplant!'); setScheduleFor(null); loadStatus() }
    else { const d = await res.json(); flash(d.error ?? 'Fehler', false) }
  }

  const cancelSchedule = async (jobId: string) => {
    await fetch('/api/studio/stream', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel', jobId }),
    })
    loadStatus()
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'monospace', padding: '40px 24px' }}>
      <div style={{ maxWidth: 780, margin: '0 auto' }}>
        <p style={{ fontSize: 10, letterSpacing: '0.25em', textTransform: 'uppercase', color: C.accent, marginBottom: 8 }}>
          // Studio
        </p>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginBottom: 32 }}>
          Stream Control
        </h1>

        {/* Status bar */}
        <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' as const }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: status?.running ? C.green : '#444', display: 'inline-block', flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: status?.running ? C.green : C.textSoft }}>
            {status?.running ? `Live — ${status.info.filename} [${status.info.streamKey}]` : 'Offline'}
          </span>
          <span style={{ flex: 1 }} />
          {status?.running && (
            <button onClick={stopStream} style={btn('#1a1a2e', C.red)}>■ Stopp</button>
          )}
          {msg && (
            <span style={{ fontSize: 12, color: msg.ok ? C.accent : C.red }}>{msg.text}</span>
          )}
        </div>

        {/* Scheduled jobs */}
        {(status?.scheduled?.length ?? 0) > 0 && (
          <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 20px', marginBottom: 16 }}>
            <p style={{ fontSize: 11, color: C.accent, letterSpacing: '0.15em', marginBottom: 12 }}>// Geplante Streams</p>
            {status!.scheduled.map(j => (
              <div key={j.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' as const }}>
                <span style={{ fontSize: 12, color: C.text, flex: 1 }}>{j.filename}</span>
                <span style={{ fontSize: 11, color: C.textSoft }}>{fmt.dt(j.datetime)}</span>
                <span style={{ fontSize: 11, color: C.textMuted }}>[{j.streamKey}]</span>
                <button onClick={() => cancelSchedule(j.id)} style={btn('#1a1a2e', C.red, { padding: '4px 10px' })}>Abbrechen</button>
              </div>
            ))}
          </div>
        )}

        {/* Stream key + OBS info */}
        <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 20px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: obsOpen ? 16 : 0, flexWrap: 'wrap' as const }}>
            <p style={{ fontSize: 11, color: C.accent, letterSpacing: '0.15em', margin: 0 }}>// Stream Key</p>
            <input
              value={streamKey}
              onChange={e => setStreamKey(e.target.value)}
              style={{ ...input, width: 160 }}
              placeholder="live"
            />
            <button onClick={() => setObsOpen(o => !o)} style={btn('#1a1a2e', C.textSoft, { padding: '4px 10px', fontSize: 11 })}>
              {obsOpen ? 'OBS ▲' : 'OBS ▼'}
            </button>
          </div>
          {obsOpen && (
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14, display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
              <p style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>OBS → Einstellungen → Stream → Dienst: Benutzerdefiniert</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 10, color: C.textMuted, marginBottom: 4 }}>Server</p>
                  <code style={{ fontSize: 12, color: C.accent, background: '#111', padding: '6px 10px', borderRadius: 4, display: 'block' }}>
                    rtmp://enkra.tail1049ba.ts.net:1935/live
                  </code>
                </div>
                <div>
                  <p style={{ fontSize: 10, color: C.textMuted, marginBottom: 4 }}>Stream-Key</p>
                  <code style={{ fontSize: 12, color: C.accent, background: '#111', padding: '6px 10px', borderRadius: 4, display: 'block' }}>
                    {streamKey || 'live'}
                  </code>
                </div>
              </div>
              <p style={{ fontSize: 10, color: C.textMuted, marginTop: 4 }}>
                HLS: /api/studio/hls/{streamKey || 'live'}.m3u8 · 720p · 2500 kbps
              </p>
            </div>
          )}
        </div>

        {/* Upload */}
        <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 20px', marginBottom: 16 }}>
          <p style={{ fontSize: 11, color: C.accent, letterSpacing: '0.15em', marginBottom: 12 }}>// Datei hochladen</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f) }}
          />
          {uploading ? (
            <div>
              <p style={{ fontSize: 12, color: C.textSoft, marginBottom: 8 }}>⬆ {uploadName} — {uploadProgress}%</p>
              <div style={{ height: 6, background: '#1a1a2e', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${uploadProgress}%`, background: C.accent, transition: 'width 0.2s' }} />
              </div>
            </div>
          ) : (
            <button onClick={() => fileInputRef.current?.click()} style={btn()}>+ Datei wählen</button>
          )}
        </div>

        {/* File list */}
        <p style={{ fontSize: 11, color: C.textMuted, letterSpacing: '0.15em', marginBottom: 12 }}>
          {files.length} Datei{files.length !== 1 ? 'en' : ''} auf Enkra
        </p>
        {files.map(f => (
          <div key={f.name} style={{ background: C.panel, border: `1px solid ${scheduleFor === f.name ? C.accent : C.border}`, borderRadius: 10, padding: '14px 18px', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' as const }}>
              <span style={{ flex: 1, fontSize: 13, color: C.text, wordBreak: 'break-all' as const }}>{f.name}</span>
              <span style={{ fontSize: 11, color: C.textMuted, flexShrink: 0 }}>{fmt.size(f.size)}</span>
              <span style={{ fontSize: 11, color: C.textMuted, flexShrink: 0 }}>{fmt.age(f.mtime)}</span>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button onClick={() => startStream(f.name)} style={btn()}>▶ Jetzt</button>
                <button
                  onClick={() => setScheduleFor(sf => sf === f.name ? null : f.name)}
                  style={btn('#1a1a2e', C.accent)}
                >
                  {scheduleFor === f.name ? '▲ Plan' : '⏱ Plan'}
                </button>
                <button onClick={() => deleteFile(f.name)} style={btn('#1a1a2e', C.red)}>Löschen</button>
              </div>
            </div>

            {scheduleFor === f.name && (
              <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 12, paddingTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' as const, alignItems: 'center' }}>
                <input type="date" value={schedDate} onChange={e => setSchedDate(e.target.value)} style={{ ...input, colorScheme: 'dark' }} />
                <input type="time" value={schedTime} onChange={e => setSchedTime(e.target.value)} style={{ ...input, colorScheme: 'dark' }} />
                <input value={schedKey} onChange={e => setSchedKey(e.target.value)} placeholder="Key" style={{ ...input, width: 100 }} />
                <button onClick={() => scheduleStream(f.name)} style={btn()}>Planen</button>
                <button onClick={() => setScheduleFor(null)} style={btn('#1a1a2e', C.textSoft)}>Abbrechen</button>
              </div>
            )}
          </div>
        ))}

        {files.length === 0 && !uploading && (
          <p style={{ color: C.textMuted, fontSize: 13, textAlign: 'center', padding: '40px 0' }}>
            Noch keine Dateien hochgeladen.
          </p>
        )}
      </div>
    </div>
  )
}
