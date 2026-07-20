'use client'

import { useEffect, useState } from 'react'

interface Invite {
  id: string
  email: string
  role: string
  type: 'clerk' | 'in-app'
  status: 'pending' | 'accepted' | 'revoked'
  invitedBy: string
  createdAt: string
  acceptedAt?: string
}

interface Playlist {
  id: number
  title: string
  playlistId: string
  visibleForCustomers: boolean
  visibleForNonCustomers: boolean
}

export default function AdminClient() {
  // ── Invite state ──────────────────────────────────────────────────────────
  const [invites, setInvites] = useState<Invite[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member')
  const [inviteGroup, setInviteGroup] = useState<'mit-lives' | 'ohne-lives'>('ohne-lives')
  const [inviteState, setInviteState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [inviteMsg, setInviteMsg] = useState('')

  const loadInvites = () =>
    fetch('/api/admin/invites').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setInvites(data)
    })

  useEffect(() => { loadInvites() }, [])

  const sendInvite = async () => {
    setInviteState('loading')
    setInviteMsg('')
    const res = await fetch('/api/admin/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole, group: inviteGroup }),
    })
    const data = await res.json()
    if (res.ok) {
      setInviteState('ok')
      setInviteMsg(data.flow === 'clerk'
        ? `Einladung per Clerk gesendet (neuer Account) → ${data.email}`
        : `Einladung per E-Mail gesendet (bestehender Account) → ${data.email}`)
      setInviteEmail('')
      loadInvites()
    } else {
      setInviteState('error')
      setInviteMsg(data.error || 'Fehler')
    }
  }

  const revokeInvite = async (id: string) => {
    await fetch('/api/admin/invites', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    loadInvites()
  }

  // ── Playlist state ────────────────────────────────────────────────────────
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [title, setTitle] = useState('')
  const [playlistId, setPlaylistId] = useState('')
  const [newVisCustomers, setNewVisCustomers] = useState(true)
  const [newVisNonCustomers, setNewVisNonCustomers] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editPlaylistId, setEditPlaylistId] = useState('')
  const [editVisCustomers, setEditVisCustomers] = useState(true)
  const [editVisNonCustomers, setEditVisNonCustomers] = useState(false)
  const [addSuccess, setAddSuccess] = useState(false)
  const [addError, setAddError] = useState('')

  const load = () =>
    fetch('/api/playlists').then(r => r.json()).then(setPlaylists)

  useEffect(() => { load() }, [])

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
        body: JSON.stringify({
          title,
          playlistId,
          visibleForCustomers: newVisCustomers,
          visibleForNonCustomers: newVisNonCustomers,
        })
      })
      if (res.ok) {
        setTitle('')
        setPlaylistId('')
        setNewVisCustomers(true)
        setNewVisNonCustomers(false)
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
    setEditVisCustomers(p.visibleForCustomers)
    setEditVisNonCustomers(p.visibleForNonCustomers)
  }

  const saveEdit = async (id: number) => {
    await fetch('/api/playlists', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        title: editTitle,
        playlistId: editPlaylistId,
        visibleForCustomers: editVisCustomers,
        visibleForNonCustomers: editVisNonCustomers,
      })
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

  const checkboxRow = (
    label: string,
    checked: boolean,
    onChange: (v: boolean) => void,
    description: string
  ) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 8 }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        style={{ width: 15, height: 15, accentColor: '#c8f064', cursor: 'pointer' }}
      />
      <span style={{ fontSize: 12, color: '#e0e0e0' }}>
        {label} <span style={{ color: '#555', fontSize: 11 }}>{description}</span>
      </span>
    </label>
  )

  const statusColor = (s: string) =>
    s === 'accepted' ? '#c8f064' : s === 'revoked' ? '#555' : '#d29922'

  return (
    <div style={{ minHeight: '100vh', background: '#06060a', color: '#e0e0e0', fontFamily: 'monospace', padding: '40px 24px' }}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <p style={{ fontSize: 10, letterSpacing: '0.25em', textTransform: 'uppercase', color: '#c8f064', marginBottom: 8 }}>
          // Admin
        </p>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginBottom: 40 }}>
          Admin
        </h1>

        {/* ── Invite section ── */}
        <p style={{ fontSize: 11, color: '#c8f064', letterSpacing: '0.2em', marginBottom: 16 }}>// Mitglieder einladen</p>
        <div style={{ background: '#0d0d14', border: '1px solid #1a1a2e', borderRadius: 12, padding: 24, marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <input
              value={inviteEmail}
              onChange={e => { setInviteEmail(e.target.value); setInviteState('idle') }}
              placeholder="email@beispiel.de"
              type="email"
              style={{ flex: '1 1 220px', background: '#111', border: '1px solid #1a1a2e', borderRadius: 6, padding: '10px 14px', color: '#e0e0e0', fontSize: 13, fontFamily: 'monospace', outline: 'none' }}
            />
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value as 'member' | 'admin')}
              style={{ background: '#111', border: '1px solid #1a1a2e', borderRadius: 6, padding: '10px 12px', color: '#e0e0e0', fontSize: 13, fontFamily: 'monospace', outline: 'none', cursor: 'pointer' }}
            >
              <option value="member">Mitglied</option>
              <option value="admin">Admin</option>
            </select>
            <select
              value={inviteGroup}
              onChange={e => setInviteGroup(e.target.value as 'mit-lives' | 'ohne-lives')}
              style={{ background: '#111', border: '1px solid #1a1a2e', borderRadius: 6, padding: '10px 12px', color: '#e0e0e0', fontSize: 13, fontFamily: 'monospace', outline: 'none', cursor: 'pointer' }}
            >
              <option value="ohne-lives">Ohne Lives</option>
              <option value="mit-lives">Mit Lives</option>
            </select>
            <button
              onClick={sendInvite}
              disabled={inviteState === 'loading' || !inviteEmail}
              style={{ background: inviteState === 'loading' ? '#555' : '#c8f064', color: '#000', border: 'none', borderRadius: 6, padding: '10px 18px', fontFamily: 'monospace', fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
            >
              {inviteState === 'loading' ? '…' : 'Einladen'}
            </button>
          </div>
          {inviteMsg && (
            <p style={{ fontSize: 12, color: inviteState === 'error' ? '#ff6b6b' : '#c8f064', margin: 0 }}>
              {inviteState === 'ok' ? '✓ ' : '✗ '}{inviteMsg}
            </p>
          )}
        </div>

        {/* Invite list */}
        {invites.length > 0 && (
          <div style={{ marginBottom: 40 }}>
            <p style={{ fontSize: 11, color: '#444', letterSpacing: '0.1em', marginBottom: 10 }}>
              {invites.length} Einladung{invites.length !== 1 ? 'en' : ''}
            </p>
            {invites.map(inv => (
              <div key={inv.id} style={{
                background: '#0d0d14', border: '1px solid #1a1a2e', borderRadius: 8,
                padding: '12px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <p style={{ fontSize: 13, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {inv.email}
                  </p>
                  <p style={{ fontSize: 11, color: '#555', margin: 0 }}>
                    {inv.role} · {inv.type === 'clerk' ? 'Clerk-Invite' : 'In-App-Link'} ·{' '}
                    <span style={{ color: statusColor(inv.status) }}>{inv.status}</span>
                  </p>
                </div>
                {inv.status === 'pending' && (
                  <button
                    onClick={() => revokeInvite(inv.id)}
                    style={{ background: '#1a1a1a', color: '#ff6b6b', border: 'none', borderRadius: 6, padding: '6px 12px', fontFamily: 'monospace', fontSize: 11, cursor: 'pointer', flexShrink: 0 }}
                  >
                    Widerrufen
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Playlist section ── */}
        <p style={{ fontSize: 11, color: '#c8f064', letterSpacing: '0.2em', marginBottom: 16 }}>// Playlisten verwalten</p>

        <div style={{ background: '#0d0d14', border: '1px solid #1a1a2e', borderRadius: 12, padding: 24, marginBottom: 32 }}>
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

          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 11, color: '#555', marginBottom: 8, letterSpacing: '0.1em' }}>// Sichtbarkeit</p>
            {checkboxRow('Sichtbar für Mitglieder', newVisCustomers, setNewVisCustomers, '(eingeloggt + Mitgliedschaft)')}
            {checkboxRow('Sichtbar für Gäste', newVisNonCustomers, setNewVisNonCustomers, '(nicht eingeloggt oder ohne Mitgliedschaft)')}
          </div>

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
                <div style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: 11, color: '#555', marginBottom: 8, letterSpacing: '0.1em' }}>// Sichtbarkeit</p>
                  {checkboxRow('Sichtbar für Mitglieder', editVisCustomers, setEditVisCustomers, '(eingeloggt + Mitgliedschaft)')}
                  {checkboxRow('Sichtbar für Gäste', editVisNonCustomers, setEditVisNonCustomers, '(nicht eingeloggt oder ohne Mitgliedschaft)')}
                </div>
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
                  <p style={{ fontSize: 11, color: '#444', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 6 }}>{p.playlistId}</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{
                      fontSize: 10, padding: '2px 8px', borderRadius: 4,
                      background: p.visibleForCustomers ? '#1a2e1a' : '#1a1a1a',
                      color: p.visibleForCustomers ? '#c8f064' : '#444',
                      border: `1px solid ${p.visibleForCustomers ? '#2a4a1a' : '#222'}`
                    }}>
                      {p.visibleForCustomers ? '✓' : '✗'} Mitglieder
                    </span>
                    <span style={{
                      fontSize: 10, padding: '2px 8px', borderRadius: 4,
                      background: p.visibleForNonCustomers ? '#1a2e1a' : '#1a1a1a',
                      color: p.visibleForNonCustomers ? '#c8f064' : '#444',
                      border: `1px solid ${p.visibleForNonCustomers ? '#2a4a1a' : '#222'}`
                    }}>
                      {p.visibleForNonCustomers ? '✓' : '✗'} Gäste
                    </span>
                  </div>
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
    </div>
  )
}
