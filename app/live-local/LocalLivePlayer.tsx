'use client'

import { useEffect, useState } from 'react'

const STATUS_URL = '/api/live-local-status'

export default function LocalLivePlayer() {
  const [streamState, setStreamState] = useState<'checking' | 'live' | 'offline'>('checking')
  const [statusText, setStatusText] = useState('Prufe den lokalen Stream...')
  const [iframeKey, setIframeKey] = useState(() => Date.now())

  useEffect(() => {
    let cancelled = false
    let timer: number | null = null

    const poll = async () => {
      try {
        const response = await fetch(`${STATUS_URL}?_ts=${Date.now()}`, { cache: 'no-store' })
        if (!response.ok) {
          throw new Error(`status ${response.status}`)
        }

        const payload = (await response.json()) as { live?: boolean }
        if (cancelled) {
          return
        }

        if (payload.live) {
          setStreamState((prev) => {
            if (prev !== 'live') {
              setIframeKey(Date.now())
            }
            return 'live'
          })
          setStatusText('Lokaler Stream live')
        } else {
          setStreamState('offline')
          setStatusText('Gerade lauft kein lokaler Livestream.')
        }
      } catch {
        if (!cancelled) {
          setStreamState('offline')
          setStatusText('Der Streamstatus konnte gerade nicht geladen werden.')
        }
      }
    }

    void poll()
    timer = window.setInterval(() => {
      void poll()
    }, 5000)

    return () => {
      cancelled = true
      if (timer) {
        window.clearInterval(timer)
      }
    }
  }, [])

  return (
    <section
      style={{
        background: 'rgba(255, 252, 247, 0.82)',
        border: '1px solid #DDD5C8',
        borderRadius: 28,
        padding: 22,
        boxShadow: '0 20px 60px rgba(44, 36, 22, 0.08)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 18,
          alignItems: 'center',
          marginBottom: 18,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <p style={{ margin: 0, color: '#9B8E7E', fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
            Lokaler Stream
          </p>
          <h2 style={{ margin: '6px 0 0', color: '#2C2416', fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 500 }}>
            Direkt vom Studio-Server
          </h2>
        </div>
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 999,
            background:
              streamState === 'live' ? 'rgba(122, 140, 114, 0.18)' : streamState === 'checking' ? 'rgba(211,188,118,0.22)' : 'rgba(196,113,74,0.14)',
            color: '#6B5D4F',
            fontSize: 13,
          }}
        >
          {statusText}
        </div>
      </div>

      <div
        style={{
          position: 'relative',
          borderRadius: 22,
          overflow: 'hidden',
          border: '1px solid rgba(221, 213, 200, 0.85)',
          background: 'linear-gradient(180deg, rgba(240, 231, 219, 0.95) 0%, rgba(233, 221, 208, 0.92) 100%)',
        }}
      >
        <div style={{ aspectRatio: '16 / 9', position: 'relative' }}>
          {streamState === 'live' ? (
            <iframe
              key={iframeKey}
              src={`/live-local/widget?_ts=${iframeKey}`}
              title="Lokaler Livestream"
              allow="autoplay; fullscreen"
              allowFullScreen
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                border: 'none',
                background: '#000',
              }}
            />
          ) : (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 24,
                background:
                  'radial-gradient(circle at top, rgba(211,188,118,0.16), transparent 35%), linear-gradient(180deg, #F7F2EA 0%, #E7D9CA 100%)',
                textAlign: 'center',
              }}
            >
              <div style={{ maxWidth: 520 }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 14px',
                    borderRadius: 999,
                    border: '1px solid rgba(185, 69, 60, 0.14)',
                    background: 'rgba(255,255,255,0.7)',
                    color: '#7A5A4B',
                    fontSize: 11,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    marginBottom: 20,
                  }}
                >
                  {streamState === 'checking' ? 'Verbinde' : 'Offline'}
                </div>
                <h3
                  style={{
                    margin: 0,
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: 'clamp(2rem, 4vw, 3.4rem)',
                    fontWeight: 500,
                    color: '#2C2416',
                  }}
                >
                  {streamState === 'checking' ? 'Der Livestream wird gerade gepruft' : 'Im Moment lauft kein lokaler Livestream'}
                </h3>
                <p style={{ margin: '14px auto 0', maxWidth: 460, color: '#6B5D4F', fontSize: 15, lineHeight: 1.8 }}>
                  {streamState === 'checking'
                    ? 'Sobald das Signal auf dem Server verfugbar ist, wird der Stream hier automatisch eingeblendet.'
                    : 'Sobald der Stream wieder startet, beginnt die Wiedergabe hier automatisch. Du musst die Seite nicht neu laden.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
