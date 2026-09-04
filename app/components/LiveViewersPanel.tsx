'use client'

import { useEffect, useState } from 'react'

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

const C = {
  text: '#2C2416',
  textSoft: '#6B5D4F',
  textMuted: '#9B8E7E',
  border: '#DDD5C8',
  bg: 'rgba(255, 252, 247, 0.82)',
  live: '#B9453C',
}

export default function LiveViewersPanel() {
  const [data, setData] = useState<LiveViewersData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    try {
      const res = await fetch('/api/admin/live-viewers')
      if (!res.ok) { setError(`${res.status}`); return }
      setData(await res.json())
      setError(null)
    } catch {
      setError('Netzwerkfehler')
    }
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 60_000)
    return () => clearInterval(id)
  }, [])

  // During prod, don't show the section outside stream window
  if (!data) return null
  if (!data.testMode && !data.inStream) return null

  return (
    <div style={{
      maxWidth: 480,
      margin: '0 auto 40px',
      padding: '0 24px',
    }}>
      <div style={{
        background: C.bg,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: '18px 20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: C.live, display: 'inline-block',
            animation: 'pulse 1.5s infinite',
          }} />
          <span style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 15, fontWeight: 500,
            color: C.textSoft, letterSpacing: '0.04em',
          }}>
            {data.viewers.length === 0
              ? 'Niemand eingeloggt'
              : data.viewers.length === 1
                ? '1 Zuschauer dabei'
                : `${data.viewers.length} Zuschauer dabei`}
          </span>
          {data.testMode && (
            <span style={{ fontSize: 10, color: C.textMuted, marginLeft: 'auto' }}>TEST</span>
          )}
        </div>

        {error && (
          <p style={{ fontSize: 12, color: '#B9453C', margin: 0 }}>Fehler: {error}</p>
        )}

        {data.viewers.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {data.viewers.map((v, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px',
                background: 'rgba(211,188,118,0.08)',
                borderRadius: 8,
              }}>
                <span style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'rgba(211,188,118,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, color: C.textSoft, fontWeight: 600, flexShrink: 0,
                }}>
                  {v.name.charAt(0).toUpperCase()}
                </span>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, color: C.text, fontWeight: 500 }}>{v.name}</p>
                  {v.lastSignInAt && (
                    <p style={{ margin: 0, fontSize: 11, color: C.textMuted }}>
                      seit {new Date(v.lastSignInAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
