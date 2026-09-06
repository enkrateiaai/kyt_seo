'use client'

import { useEffect, useState } from 'react'

const STATUS_URL = '/api/live-local-status'

type StatusPayload = {
  live?: boolean
  next?: { at: string; filename: string } | null
  error?: string
}

function formatBerlinTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('de-DE', {
    timeZone: 'Europe/Berlin',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatBerlinWeekday(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', {
    timeZone: 'Europe/Berlin',
    weekday: 'long',
  })
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Jetzt'
  const totalSec = Math.floor(ms / 1000)
  const days = Math.floor(totalSec / 86400)
  const hours = Math.floor((totalSec % 86400) / 3600)
  const minutes = Math.floor((totalSec % 3600) / 60)
  const seconds = totalSec % 60
  if (days > 0) return `in ${days} Tag${days === 1 ? '' : 'en'}`
  if (hours > 0) return minutes > 0 ? `in ${hours} Std ${minutes} Min` : `in ${hours} Std`
  if (minutes > 0) return seconds >= 30 ? `in ${minutes} Min` : `in ${minutes} Min`
  return `in ${seconds} Sek`
}

function stripExt(name: string): string {
  return name.replace(/\.[^.]+$/, '')
}

export default function LocalLivePlayer() {
  const [streamState, setStreamState] = useState<'checking' | 'live' | 'offline'>('checking')
  const [statusText, setStatusText] = useState('Prüfe den lokalen Stream...')
  const [iframeKey, setIframeKey] = useState(() => Date.now())
  const [nextStream, setNextStream] = useState<{ at: string; filename: string } | null>(null)
  const [now, setNow] = useState(() => Date.now())

  // Poll backend for stream status + next scheduled job
  useEffect(() => {
    let cancelled = false
    let timer: number | null = null

    const poll = async () => {
      try {
        const response = await fetch(`${STATUS_URL}?_ts=${Date.now()}`, { cache: 'no-store' })
        if (!response.ok) throw new Error(`status ${response.status}`)

        const payload = (await response.json()) as StatusPayload
        if (cancelled) return

        if (payload.live) {
          setStreamState((prev) => {
            if (prev !== 'live') setIframeKey(Date.now())
            return 'live'
          })
          setStatusText('Lokaler Stream live')
          setNextStream(null)
        } else {
          setStreamState('offline')
          setStatusText(payload.next ? 'Es geht gleich los' : 'Gerade läuft kein lokaler Livestream.')
          setNextStream(payload.next ?? null)
        }
      } catch {
        if (!cancelled) {
          setStreamState('offline')
          setStatusText('Der Streamstatus konnte gerade nicht geladen werden.')
          setNextStream(null)
        }
      }
    }

    void poll()
    timer = window.setInterval(() => void poll(), 5000)
    return () => {
      cancelled = true
      if (timer) window.clearInterval(timer)
    }
  }, [])

  // Tick "now" once per second so the countdown refreshes
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const nextAt = nextStream ? new Date(nextStream.at).getTime() : null
  const msUntil = nextAt !== null ? nextAt - now : null
  const isImminent = msUntil !== null && msUntil <= 5 * 60 * 1000 && msUntil > 0
  const hasCountdown = nextStream && msUntil !== null && msUntil > 0

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
          <h2 style={{ margin: 0, color: '#2C2416', fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 500 }}>
            Kundalini Yoga Live
          </h2>
        </div>
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 999,
            background:
              streamState === 'live'
                ? 'rgba(122, 140, 114, 0.18)'
                : streamState === 'checking'
                  ? 'rgba(211,188,118,0.22)'
                  : isImminent
                    ? 'rgba(211,188,118,0.32)'
                    : 'rgba(196,113,74,0.14)',
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
          ) : hasCountdown ? (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 24,
                background:
                  'radial-gradient(circle at top, rgba(211,188,118,0.20), transparent 40%), linear-gradient(180deg, #F7F2EA 0%, #E7D9CA 100%)',
                textAlign: 'center',
              }}
            >
              <div style={{ maxWidth: 580, width: '100%' }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 14px',
                    borderRadius: 999,
                    border: '1px solid rgba(185, 130, 60, 0.25)',
                    background: 'rgba(255,255,255,0.78)',
                    color: '#7A5A4B',
                    fontSize: 11,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    marginBottom: 22,
                  }}
                >
                  {isImminent ? (
                    <>
                      <span
                        style={{
                          display: 'inline-block',
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: '#C8834E',
                          boxShadow: '0 0 0 0 rgba(200,131,78,0.6)',
                          animation: 'kyt-pulse 1.4s ease-out infinite',
                        }}
                      />
                      Startet bald
                    </>
                  ) : (
                    'Geplant'
                  )}
                </div>

                <h3
                  style={{
                    margin: 0,
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: 'clamp(2.2rem, 4.6vw, 3.6rem)',
                    fontWeight: 500,
                    color: '#2C2416',
                    lineHeight: 1.1,
                  }}
                >
                  Es geht gleich los
                </h3>

                <div
                  style={{
                    marginTop: 18,
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: 'clamp(2.4rem, 5.4vw, 4rem)',
                    fontWeight: 600,
                    color: '#B8A15F',
                    letterSpacing: '-0.02em',
                    fontVariantNumeric: 'tabular-nums',
                    lineHeight: 1.05,
                  }}
                >
                  {formatCountdown(msUntil!)}
                </div>

                <div
                  style={{
                    marginTop: 6,
                    fontSize: 15,
                    color: '#6B5D4F',
                    letterSpacing: 0.2,
                  }}
                >
                  {formatBerlinWeekday(nextStream!.at)} · {formatBerlinTime(nextStream!.at)} Uhr
                </div>

                {nextStream?.filename && (
                  <div
                    style={{
                      marginTop: 18,
                      padding: '10px 16px',
                      borderRadius: 12,
                      background: 'rgba(255,255,255,0.55)',
                      border: '1px solid rgba(221,213,200,0.85)',
                      display: 'inline-block',
                      maxWidth: '100%',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        letterSpacing: '0.16em',
                        textTransform: 'uppercase',
                        color: '#9B8E7E',
                        marginBottom: 2,
                      }}
                    >
                      Nächste Sendung
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        color: '#2C2416',
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: 360,
                      }}
                      title={nextStream.filename}
                    >
                      {stripExt(nextStream.filename)}
                    </div>
                  </div>
                )}

                <p
                  style={{
                    margin: '22px auto 0',
                    maxWidth: 460,
                    color: '#6B5D4F',
                    fontSize: 14,
                    lineHeight: 1.7,
                  }}
                >
                  Der Stream beginnt automatisch. Du musst die Seite nicht neu laden.
                </p>
              </div>
            </div>
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
                  {streamState === 'checking'
                    ? 'Der Livestream wird gerade geprüft'
                    : 'Im Moment läuft kein lokaler Livestream'}
                </h3>
                <p style={{ margin: '14px auto 0', maxWidth: 460, color: '#6B5D4F', fontSize: 15, lineHeight: 1.8 }}>
                  {streamState === 'checking'
                    ? 'Sobald das Signal auf dem Server verfügbar ist, wird der Stream hier automatisch eingeblendet.'
                    : 'Sobald der Stream wieder startet, beginnt die Wiedergabe hier automatisch. Du musst die Seite nicht neu laden.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes kyt-pulse {
          0%   { box-shadow: 0 0 0 0   rgba(200,131,78,0.55); }
          70%  { box-shadow: 0 0 0 10px rgba(200,131,78,0);   }
          100% { box-shadow: 0 0 0 0   rgba(200,131,78,0);    }
        }
      `}</style>
    </section>
  )
}
