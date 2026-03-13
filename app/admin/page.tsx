'use client'

import { useEffect, useState } from 'react'

interface Playlist {
  id: number
  title: string
  playlistId: string
}

interface YTPlaylist {
  id: string
  title: string
  thumbnail: string
  itemCount: number
}

export default function AdminPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [title, setTitle] = useState('')
  const [playlistId, setPlaylistId] = useState('')
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editPlaylistId, setEditPlaylistId] = useState('')
  const [ytPlaylists, setYtPlaylists] = useState<YTPlaylist[]>([])
  const [ytLoading, setYtLoading] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [pickerFor, setPickerFor] = useState<'new' | number | null>(null)

  const CHANNEL_ID = 'UCzwnk2edclACo1lTwhp5VMQ'

  const load = () =>
    fetch('/api/playlists').then(r => r.json()).then(setPlaylists)

  useEffect(() => { load() }, [])

  const loadYTPlaylists = async () => {
    setYtLoading(true)
    const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&channelId=${CHANNEL_ID}&maxResults=50&key=${apiKey}`
      )
      const data = await res.json()
      const items: YTPlaylist[] = (data.items || []).map((item: any) => ({
        id: item.id,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails?.medium?.url || '',
        itemCount: item.contentDetails?.itemCount || 0
      }))
      setYtPlaylists(items)
    } catch {
      console.error('Fehler beim Laden der YouTube Playlisten')
    }
    setYtLoading(false)
  }

  const openPicker = (forWhat: 'new' | number) => {
    setPickerFor(forWhat)
    setShowPicker(true)
    if (ytPlaylists.length === 0) loadYTPlaylists()
  }

  const selectPlaylist = (yt: YTPlaylist) => {
    if (pickerFor === 'new') {
      setPlaylistId(yt.id)
      if (!title) setTitle(yt.title)
    } else if (typeof pickerFor === 'number') {
      setEditPlaylistId(yt.id)
      if (!editTitle) setEditTitle(yt.title)
    }
    setShowPicker(false)
  }

  const add = async () => {
    if (!title || !playlistId) return
    setLoading(true)
    await fetch('/api/playlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, playlistId })
    })
    setTitle('')
    setPlaylistId('')
    await load()
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

  return (
    <div style={{ minHeight: '100vh', background: '#06060a', color: '#e0e0e0', fontFamily: 'monospace', padding: '40px 24px' }}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>

        <p style={{ fontSize: 10, letterSpacing: '0.25em', textTransform: 'uppercase', color: '#c8f064', marginBottom: 8 }}>
          // Admin
        </p>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginBottom: 40 }}>
          Playlisten verwalten
        </h1>

        {/* Add form */}
        <div style={{ background: '#0d0d14', border: '1px solid #1a1a2e', borderRadius: 12, padding: 24, marginBottom: 32 }}>
          <p style={{ fontSize: 11, color: '#c8f064', letterSpacing: '0.15em', marginBottom: 16 }}>// Neue Playlist</p>

          {/* YouTube Picker Button */}
          <button
            onClick={() => openPicker('new')}
            style={{ ...btnStyle('#1a1a2e', '#c8f064'), marginBottom: 16, width: '100%', padding: '10px 14px', fontSize: 13 }}
          >
            📺 Aus YouTube Channel auswählen
          </button>

          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Titel"
            style={{ ...inputStyle, marginBottom: 12 }}
          />
          <input
            value={playlistId}
            onChange={e => setPlaylistId(e.target.value)}
            placeholder="YouTube Playlist ID"
            style={{ ...inputStyle, marginBottom: 16 }}
          />
          <button
            onClick={add}
            disabled={loading || !title || !playlistId}
            style={{ ...btnStyle(), opacity: loading || !title || !playlistId ? 0.5 : 1 }}
          >
            {loading ? 'Speichern...' : '+ Hinzufügen'}
          </button>
        </div>

        {/* Playlist List */}
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
                <button
                  onClick={() => openPicker(p.id)}
                  style={{ ...btnStyle('#1a1a2e', '#c8f064'), marginBottom: 12, width: '100%', padding: '8px 14px' }}
                >
                  📺 Aus YouTube Channel auswählen
                </button>
                <input value={editTitle} onChange={e => setEditTitle(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }} />
                <input value={editPlaylistId} onChange={e => setEditPlaylistId(e.target.value)} style={{ ...inputStyle, marginBottom: 14 }} />
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
      </div>

      {/* YouTube Picker Modal */}
      {showPicker && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24
        }}>
          <div style={{
            background: '#0d0d14', border: '1px solid #1a1a2e', borderRadius: 16,
            width: '100%', maxWidth: 600, maxHeight: '80vh', overflow: 'hidden',
            display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #1a1a2e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: 13, color: '#c8f064', letterSpacing: '0.15em' }}>// YouTube Playlisten</p>
              <button onClick={() => setShowPicker(false)} style={{ ...btnStyle('#1a1a2e', '#888'), padding: '4px 10px' }}>✕</button>
            </div>

            <div style={{ overflow: 'auto', padding: 16, flex: 1 }}>
              {ytLoading && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200, gap: 12, color: '#444' }}>
                  <div style={{ width: 24, height: 24, border: '2px solid #1a1a2e', borderTopColor: '#c8f064', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  Lade Playlisten...
                </div>
              )}

              {!ytLoading && ytPlaylists.map(yt => (
                <div
                  key={yt.id}
                  onClick={() => selectPlaylist(yt)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '12px', borderRadius: 8, cursor: 'pointer',
                    border: '1px solid transparent', marginBottom: 8,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#1a1a2e')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {yt.thumbnail && (
                    <img src={yt.thumbnail} alt={yt.title} style={{ width: 80, height: 45, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <p style={{ fontSize: 13, color: '#e0e0e0', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{yt.title}</p>
                    <p style={{ fontSize: 11, color: '#444' }}>{yt.itemCount} Videos</p>
                  </div>
                  <span style={{ color: '#c8f064', fontSize: 16, flexShrink: 0 }}>→</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
