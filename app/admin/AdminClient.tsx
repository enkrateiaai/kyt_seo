'use client'

import { useEffect, useState } from 'react'

interface Playlist {
  id: number
  title: string
  playlistId: string
}

interface PendingInvitation {
  id: string
  emailAddress: string
  createdAt: number
  role: string | null
}

interface LiveViewer {
  name: string
  email: string
  lastSignInAt: number | null
}

interface LiveViewersData {
  testMode: boolean
  inStream: boolean
  viewers: LiveViewer[]
}

export default function AdminClient() {
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [title, setTitle] = useState('')
  const [playlistId, setPlaylistId] = useState('')
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editPlaylistId, setEditPlaylistId] = useState('')
  const [addSuccess, setAddSuccess] = useState(false)
  const [addError, setAddError] = useState('')

  const [invitations, setInvitations] = useState<PendingInvitation[]>([])
  const [invitationsLoading, setInvitationsLoading] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const [liveViewers, setLiveViewers] = useState<LiveViewersData | null>(null)
  const [liveLoading, setLiveLoading] = useState(false)

  const load = () =>
    fetch('/api/playlists').then(r => r.json()).then(setPlaylists)

  const loadInvitations = async () => {
    setInvitationsLoading(true)
    try {
      const data = await fetch('/api/admin/invitations').then(r => r.json())
      setInvitations(Array.isArray(data) ? data : [])
    } finally {
      setInvitationsLoading(false)
    }
  }

  const loadLiveViewers = async () => {
    setLiveLoading(true)
    try {
      const data = await fetch('/api/admin/live-viewers').then(r => r.json())
      setLiveViewers(data)
    } catch { /* ignore */ } finally {
      setLiveLoading(false)
    }
  }

  const revokeInvitation = async (id: string) => {
    setRevokingId(id)
    try {
      await fetch('/api/admin/invitations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      setInvitations(prev => prev.filter(inv => inv.id !== id))
    } finally {
      setRevokingId(null)
    }
  }

  useEffect(() => {
    load()
    loadInvitations()
    loadLiveViewers()
    const interval = setInterval(loadLiveViewers, 60_000)
    return () => clearInterval(interval)
  }, [])

  const extractId = (v: string) => {
    const match = v.trim().match(/[?&]list=([A-Za-z0-9_-]+)/)
    return match ? match[1] : v.trim()
  }

  const add = async () => {
    setAddError('')
    if (!title.trim()) { setAddError('Bitte Titel eingeben'); return }
    if (!playlistId.trim()) { setAddError('Bitte Playlist ID eingeben'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, playlistId })
      })
      if (res.ok) {
        setTitle('')
        setPlaylistId('')
        await load()
        setAddSuccess(true)
        setTimeout(() => setAddSuccess(false), 3000)
      } else {
        setAddError('Fehler beim Speichern')
      }
    } catch (e) {
      console.error(e)
      setAddError('Fehler beim Speichern')
    }
    setLoading(false)
  }

  const remove = async (id: number) => {
    await fetch('/api/playlists', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    await load()
  }

  const startEdit = (p: Playlist) => {
    setEditingId(p.id)
    setEditTitle(p.title)
    setEditPlaylistId(p.playlistId)
  }

  const saveEdit = async (id: number) => {
    await fetch('/api/playlists', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, title: editTitle, playlistId: editPlaylistId })
    })
    setEditingId(null)
    await load()
  }

  const move = async (index: number, direction: 'up' | 'down') => {
    const newList = [...playlists]
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= newList.length) return
    ;[newList[index], newList[swapIndex]] = [newList[swapIndex], newList[index]]
    setPlaylists(newList)
    await fetch('/api/playlists', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newList)
    })
  }

  const inputStyle = {
    width: '100%', background: '#111', border: '1px solid #1a1a2e',
    borderRadius: 6, padding: '10px 14px', color: '#e0e0e0',
    fontSize: 13, fontFamily: 'monospace', outline: 'none',
    boxSizing: 'border-box' as const
  }

  const btnStyle = (color = '#c8f064', textColor = '#000') => ({
    background: color, color: textColor, border: 'none',
    borderRadius: 6, padding: '6px 14px', fontFamily: 'monospace',
    fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 as const
  })

  const navItems = [
    { label: 'Playlisten', href: '#playlisten' },
    { label: 'Nutzer', href: '#nutzer' },
    { label: 'Einladungen', href: '#einladungen' },
    { label: '🔴 Live', href: '#live' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#06060a', color: '#e0e0e0', fontFamily: 'monospace', padding: '40px 24px' }}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <p style={{ fontSize: 10, letterSpacing: '0.25em', textTransform: 'uppercase', color: '#c8f064', marginBottom: 8 }}>
          // Admin
        </p>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginBottom: 24 }}>
          Playlisten und Nutzer verwalten
        </h1>

        <div style={{ display: 'flex', gap: 8, marginBottom: 40, flexWrap: 'wrap' }}>
          {navItems.map(item => (
            <a
              key={item.href}
              href={item.href}
              style={{
                padding: '6px 16px', borderRadius: 6,
                background: '#0d0d14', border: '1px solid #1a1a2e',
                color: '#c8f064', fontSize: 12, fontFamily: 'monospace',
                fontWeight: 700, textDecoration: 'none', letterSpacing: '0.05em',
              }}
            >
              {item.label}
            </a>
          ))}
        </div>

        <div id="playlisten" style={{ background: '#0d0d14', border: '1px solid #1a1a2e', borderRadius: 12, padding: 24, marginBottom: 32 }}>
          <p style={{ fontSize: 11, color: '#c8f064', letterSpacing: '0.15em', marginBottom: 16 }}>// Neue Playlist</p>

          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Titel"
            style={{ ...inputStyle, marginBottom: 12 }}
          />
          <input
            value={playlistId}
            onChange={e => setPlaylistId(extractId(e.target.value))}
            placeholder="YouTube Playlist ID oder kompletter Link"
            style={{ ...inputStyle, marginBottom: 16 }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={add}
              disabled={loading}
              style={{ ...btnStyle(), opacity: loading ? 0.5 : 1 }}
            >
              {loading ? 'Speichern...' : '+ Hinzufügen'}
            </button>
            {addSuccess && <span style={{ color: '#c8f064', fontSize: 12 }}>✓ Gespeichert!</span>}
            {addError && <span style={{ color: '#ff6b6b', fontSize: 12 }}>{addError}</span>}
          </div>
        </div>

        <p style={{ fontSize: 11, color: '#444', letterSpacing: '0.15em', marginBottom: 16 }}>
          {playlists.length} Playlist{playlists.length !== 1 ? 'en' : ''}
        </p>

        {playlists.map((p, index) => (
          <div key={p.id} style={{
            background: '#0d0d14', border: `1px solid ${editingId === p.id ? '#c8f064' : '#1a1a2e'}`,
            borderRadius: 10, padding: '16px 20px', marginBottom: 12,
          }}>
            {editingId === p.id ? (
              <div>
                <input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Titel" style={{ ...inputStyle, marginBottom: 10 }} />
                <input
                  value={editPlaylistId}
                  onChange={e => setEditPlaylistId(extractId(e.target.value))}
                  placeholder="Playlist ID oder kompletter Link"
                  style={{ ...inputStyle, marginBottom: 14 }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => saveEdit(p.id)} style={btnStyle()}>Speichern</button>
                  <button onClick={() => setEditingId(null)} style={btnStyle('#1a1a2e', '#888')}>Abbrechen</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                  <button onClick={() => move(index, 'up')} disabled={index === 0} style={{ ...btnStyle('#1a1a2e', '#888'), padding: '2px 8px', opacity: index === 0 ? 0.3 : 1 }}>▲</button>
                  <button onClick={() => move(index, 'down')} disabled={index === playlists.length - 1} style={{ ...btnStyle('#1a1a2e', '#888'), padding: '2px 8px', opacity: index === playlists.length - 1 ? 0.3 : 1 }}>▼</button>
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <p style={{ fontSize: 14, color: '#e0e0e0', marginBottom: 4 }}>{p.title}</p>
                  <p style={{ fontSize: 11, color: '#444', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.playlistId}</p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button onClick={() => startEdit(p)} style={btnStyle('#1a1a2e', '#c8f064')}>Bearbeiten</button>
                  <button onClick={() => remove(p.id)} style={btnStyle('#1a1a1a', '#ff6b6b')}>Löschen</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {/* ── Live Zuschauer ─────────────────────────────────────── */}
        <div id="live" style={{ marginTop: 48, marginBottom: 48 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
            <p style={{ fontSize: 11, color: '#c8f064', letterSpacing: '0.15em', margin: 0 }}>
              // Live Zuschauer
            </p>
            {liveViewers?.testMode && (
              <span style={{ fontSize: 10, background: '#1a1a00', color: '#cc8800', border: '1px solid #cc8800', borderRadius: 4, padding: '2px 8px', letterSpacing: '0.1em' }}>
                TEST MODE — zeigt letzte 2h
              </span>
            )}
            <button
              onClick={loadLiveViewers}
              disabled={liveLoading}
              style={{ ...btnStyle('#1a1a2e', '#888'), fontSize: 11, opacity: liveLoading ? 0.5 : 1 }}
            >
              {liveLoading ? '...' : '↻ Aktualisieren'}
            </button>
          </div>

          {!liveViewers && liveLoading && (
            <p style={{ fontSize: 12, color: '#444' }}>Wird geladen...</p>
          )}

          {liveViewers && !liveViewers.inStream && !liveViewers.testMode && (
            <p style={{ fontSize: 12, color: '#444' }}>
              Kein Live Stream gerade aktiv.<br />
              <span style={{ color: '#333' }}>Werktags 06:30–07:30 · Wochenende 07:00–08:00 MESZ</span>
            </p>
          )}

          {liveViewers && liveViewers.viewers.length === 0 && (
            <p style={{ fontSize: 12, color: '#444' }}>Niemand eingeloggt im Zeitfenster.</p>
          )}

          {liveViewers && liveViewers.viewers.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={{ fontSize: 11, color: '#444', marginBottom: 4 }}>
                {liveViewers.viewers.length} Zuschauer
              </p>
              {liveViewers.viewers.map((v, i) => (
                <div key={i} style={{
                  background: '#0d0d14', border: '1px solid #1a1a2e',
                  borderRadius: 10, padding: '12px 18px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
                }}>
                  <div>
                    <p style={{ fontSize: 14, color: '#e0e0e0', margin: 0, fontWeight: 700 }}>{v.name}</p>
                    <p style={{ fontSize: 11, color: '#444', margin: '3px 0 0' }}>{v.email}</p>
                  </div>
                  <p style={{ fontSize: 11, color: '#555', margin: 0, flexShrink: 0 }}>
                    ⏱ {v.lastSignInAt
                      ? new Date(v.lastSignInAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
                      : '—'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div id="einladungen" style={{ marginTop: 48 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <p style={{ fontSize: 11, color: '#c8f064', letterSpacing: '0.15em', margin: 0 }}>// Ausstehende Einladungen</p>
            <button
              onClick={loadInvitations}
              disabled={invitationsLoading}
              style={{ ...btnStyle('#1a1a2e', '#888'), fontSize: 11, opacity: invitationsLoading ? 0.5 : 1 }}
            >
              {invitationsLoading ? '...' : '↻ Aktualisieren'}
            </button>
          </div>

          {invitations.length === 0 && !invitationsLoading && (
            <p style={{ fontSize: 12, color: '#444', marginBottom: 24 }}>Keine ausstehenden Einladungen.</p>
          )}

          {invitations.map(inv => (
            <div key={inv.id} style={{
              background: '#0d0d14', border: '1px solid #1a1a2e',
              borderRadius: 10, padding: '14px 18px', marginBottom: 10,
              display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, color: '#e0e0e0', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {inv.emailAddress}
                </p>
                <p style={{ fontSize: 11, color: '#444', margin: 0 }}>
                  {inv.role ?? '—'} · eingeladen {new Date(inv.createdAt).toLocaleDateString('de-DE')}
                </p>
              </div>
              <button
                onClick={() => revokeInvitation(inv.id)}
                disabled={revokingId === inv.id}
                style={{ ...btnStyle('#1a1a1a', '#ff6b6b'), opacity: revokingId === inv.id ? 0.5 : 1 }}
              >
                {revokingId === inv.id ? '...' : 'Widerrufen'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
