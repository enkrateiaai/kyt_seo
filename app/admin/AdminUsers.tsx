'use client'

import { useState } from 'react'

const C = {
  bg: '#06060a',
  panel: '#0d0d14',
  text: '#e0e0e0',
  textSoft: '#888',
  accent: '#c8f064',
  border: '#1a1a2e',
  danger: '#ff6b6b',
}

type Role = 'ohnelives' | 'mitlives' | 'admin'

interface UserRow {
  id: string
  name: string
  email: string
  role: string
  lastSeen: string
}

const ROLE_LABELS: Record<string, string> = {
  ohnelives: 'Ohne Lives',
  mitlives: 'Mit Lives',
  admin: 'Admin',
  member: 'Mitglied',
  '—': '—',
}

export default function AdminUsers({ initialUsers }: { initialUsers: UserRow[] }) {
  const [users, setUsers] = useState(initialUsers)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<Role>('ohnelives')
  const [inviting, setInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState('')
  const [changingRole, setChangingRole] = useState<string | null>(null)

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviting(true)
    setInviteMsg('')
    try {
      const r = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })
      const d = await r.json()
      if (d.ok) {
        setInviteMsg(`✓ Einladung gesendet an ${inviteEmail}`)
        setInviteEmail('')
      } else {
        setInviteMsg(`✗ Fehler: ${d.error}`)
      }
    } catch {
      setInviteMsg('✗ Netzwerkfehler')
    }
    setInviting(false)
  }

  async function handleRoleChange(userId: string, role: Role) {
    setChangingRole(userId)
    try {
      const r = await fetch('/api/admin/set-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: userId, role }),
      })
      const d = await r.json()
      if (d.ok) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u))
      }
    } catch {}
    setChangingRole(null)
  }

  const inputStyle: React.CSSProperties = {
    background: C.panel,
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    color: C.text,
    fontFamily: 'monospace',
    fontSize: 13,
    padding: '8px 12px',
  }

  return (
    <div style={{ maxWidth: 900, margin: '48px auto 0' }}>
      <p style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.accent, marginBottom: 16 }}>
        // Einladung senden
      </p>
      <form onSubmit={handleInvite} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
        <input
          type="email"
          required
          placeholder="E-Mail-Adresse"
          value={inviteEmail}
          onChange={e => setInviteEmail(e.target.value)}
          style={{ ...inputStyle, flex: '1 1 240px' }}
        />
        <select
          value={inviteRole}
          onChange={e => setInviteRole(e.target.value as Role)}
          style={{ ...inputStyle, cursor: 'pointer' }}
        >
          <option value="ohnelives">Ohne Lives</option>
          <option value="mitlives">Mit Lives</option>
          <option value="admin">Admin</option>
        </select>
        <button
          type="submit"
          disabled={inviting}
          style={{
            background: C.accent,
            color: '#000',
            border: 'none',
            borderRadius: 6,
            padding: '8px 18px',
            fontFamily: 'monospace',
            fontSize: 13,
            fontWeight: 700,
            cursor: inviting ? 'wait' : 'pointer',
          }}
        >
          {inviting ? 'Sende…' : 'Einladen'}
        </button>
      </form>
      {inviteMsg && (
        <p style={{ fontSize: 12, color: inviteMsg.startsWith('✓') ? C.accent : C.danger, marginBottom: 24 }}>
          {inviteMsg}
        </p>
      )}

      <p style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.accent, margin: '32px 0 12px' }}>
        // Mitglieder
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${C.border}` }}>
            {['Name', 'E-Mail', 'Abo', 'Rolle ändern', 'Zuletzt gesehen'].map(h => (
              <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: C.textSoft, fontWeight: 400 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id} style={{ borderBottom: `1px solid ${C.border}` }}>
              <td style={{ padding: '10px 12px' }}>{u.name}</td>
              <td style={{ padding: '10px 12px', color: C.textSoft }}>{u.email}</td>
              <td style={{ padding: '10px 12px', color: C.accent }}>{ROLE_LABELS[u.role] ?? u.role}</td>
              <td style={{ padding: '10px 12px' }}>
                <select
                  defaultValue={u.role}
                  disabled={changingRole === u.id}
                  onChange={e => handleRoleChange(u.id, e.target.value as Role)}
                  style={{ ...inputStyle, fontSize: 12, padding: '4px 8px', opacity: changingRole === u.id ? 0.5 : 1 }}
                >
                  <option value="ohnelives">Ohne Lives</option>
                  <option value="mitlives">Mit Lives</option>
                  <option value="admin">Admin</option>
                </select>
              </td>
              <td style={{ padding: '10px 12px', color: C.textSoft }}>{u.lastSeen}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
