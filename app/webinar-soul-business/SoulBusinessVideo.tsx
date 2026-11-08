'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  WebinarConfig,
  findSlotById,
  pickLatestWebinar,
  pickLiveWebinar,
  pickNextWebinar,
  webinarPhase,
  webinarWindow,
} from '@/lib/webinarSchedule'

const C = {
  warmWhite: '#FAF7F2',
  sand: '#E8DDD0',
  gold: '#C9A96E',
  goldLight: '#E2C898',
  terracotta: '#D3BC76',
  deepBrown: '#2A1F1A',
  warmBrown: '#4A3728',
  muted: '#8A7B72',
  white: '#FFFFFF',
}

const REFRESH_MS = 30_000
const TIME_ZONE = 'Europe/Berlin'

const dateFormatter = new Intl.DateTimeFormat('de-DE', {
  timeZone: TIME_ZONE,
  dateStyle: 'full',
  timeStyle: 'short',
})

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'jetzt'
  const totalMinutes = Math.floor(ms / 60_000)
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
  const minutes = totalMinutes % 60
  const parts: string[] = []
  if (days > 0) parts.push(`${days} ${days === 1 ? 'Tag' : 'Tage'}`)
  if (hours > 0) parts.push(`${hours} Std`)
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes} Min`)
  return `in ${parts.join(', ')}`
}

export default function SoulBusinessVideo({
  webinars: initialWebinars,
  serverNow,
  ctaUrl,
  slotId,
  token,
}: {
  webinars: WebinarConfig[]
  serverNow: number
  ctaUrl: string
  slotId?: string
  token?: string
}) {
  const [webinars, setWebinars] = useState<WebinarConfig[]>(initialWebinars)
  const [nowMs, setNowMs] = useState(serverNow)
  const [failedId, setFailedId] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const clockOffset = useRef(0)

  useEffect(() => {
    clockOffset.current = serverNow - Date.now()
    const timer = setInterval(() => setNowMs(Date.now() + clockOffset.current), 1000)
    return () => clearInterval(timer)
  }, [serverNow])

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/webinar', { cache: 'no-store' })
      if (!res.ok) return
      const data = (await res.json()) as { webinars?: WebinarConfig[]; serverNow?: number }
      if (Array.isArray(data?.webinars)) setWebinars(data.webinars)
      if (typeof data?.serverNow === 'number') {
        clockOffset.current = data.serverNow - Date.now()
        setNowMs(Date.now() + clockOffset.current)
      }
    } catch {
      // Keep the last known state.
    }
  }, [])

  useEffect(() => {
    const timer = setInterval(refresh, REFRESH_MS)
    return () => clearInterval(timer)
  }, [refresh])

  const slot = slotId ? findSlotById(webinars, slotId) : null
  const slotMissing = Boolean(slotId) && !slot

  const live = slot
    ? webinarPhase(slot, nowMs) === 'live'
      ? slot
      : null
    : pickLiveWebinar(webinars, nowMs)
  const next = slot
    ? webinarPhase(slot, nowMs) === 'before'
      ? slot
      : null
    : pickNextWebinar(webinars, nowMs)
  const latest = slot
    ? webinarPhase(slot, nowMs) === 'after'
      ? slot
      : null
    : pickLatestWebinar(webinars, nowMs)

  const phase: 'live' | 'before' | 'after' | 'none' = slotMissing
    ? 'none'
    : live
      ? 'live'
      : next
        ? 'before'
        : latest
          ? 'after'
          : 'none'

  const liveWindow = webinarWindow(live)
  const nextWindow = webinarWindow(next)
  const videoFailed = live !== null && failedId === live.id

  const frameStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    aspectRatio: '16 / 9',
    background: `linear-gradient(150deg, #2A1F1A 0%, #4A3728 55%, #7A8C72 100%)`,
    borderRadius: 12,
    overflow: 'hidden',
    border: `1px solid ${C.sand}`,
    boxShadow: '0 24px 60px rgba(42,31,26,0.18)',
  }

  const noticeStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: C.warmWhite,
    textAlign: 'center',
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={frameStyle}>
        {phase === 'live' && live ? (
          videoFailed ? (
            <div className="kyt-webinar-notice" style={noticeStyle}>
              <span className="kyt-webinar-notice-eyebrow">Ladefehler</span>
              <span
                style={{
                  fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(20px, 3vw, 28px)',
                  fontWeight: 400, lineHeight: 1.3, maxWidth: 480,
                }}
              >
                Das Video konnte nicht geladen werden.
              </span>
              <span className="kyt-webinar-notice-text" style={{ opacity: 0.75, maxWidth: 440 }}>
                Bitte versuche es gleich noch einmal.
              </span>
              <button
                type="button"
                className="kyt-btn kyt-btn--primary"
                onClick={() => {
                  setFailedId(null)
                  setAttempt((value) => value + 1)
                }}
              >
                Erneut versuchen
              </button>
            </div>
          ) : (
            <video
              key={`${live.id}-${attempt}`}
              controls
              preload="metadata"
              playsInline
              onError={() => setFailedId(live.id)}
              src={`/api/webinar/video?id=${encodeURIComponent(live.id)}${
                token ? `&token=${encodeURIComponent(token)}` : ''
              }`}
              title={live.title || 'Webinar'}
              style={{ width: '100%', height: '100%', display: 'block', background: '#000' }}
            />
          )
        ) : phase === 'before' && next ? (
          <div className="kyt-webinar-notice" style={noticeStyle}>
            <span className="kyt-webinar-notice-eyebrow">Startet bald</span>
            <span
              style={{
                fontFamily: "'Cormorant Garamond', serif',
                fontWeight: 400, lineHeight: 1.3, maxWidth: 520,
              }}
            >
              {next.title || 'Dein Webinar'}
            </span>
            {nextWindow.startsAt !== null ? (
              <span style={{ fontSize: 15, opacity: 0.9, lineHeight: 1.7 }}>
                {dateFormatter.format(new Date(nextWindow.startsAt))}
                {nextWindow.startsAt > nowMs ? (
                  <> · {formatCountdown(nextWindow.startsAt - nowMs)}</>
                ) : null}
              </span>
            ) : null}
          </div>
        ) : phase === 'after' ? (
          <div className="kyt-webinar-notice" style={noticeStyle}>
            <span className="kyt-webinar-notice-eyebrow">Beendet</span>
            <span
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 400, lineHeight: 1.3, maxWidth: 520,
              }}
            >
              Dieses Webinar ist vorbei.
            </span>
            <span className="kyt-webinar-notice-text" style={{ opacity: 0.72, maxWidth: 440 }}>
              Das Video stand nur während des Termins zur Verfügung. Sprich mich gern an –
              unten kannst du ein Kennenlerngespräch buchen.
            </span>
          </div>
        ) : slotMissing ? (
          <div className="kyt-webinar-notice" style={noticeStyle}>
            <span className="kyt-webinar-notice-eyebrow">Termin nicht verfügbar</span>
            <span
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 400, lineHeight: 1.3, maxWidth: 520,
              }}
            >
              Dieser Termin gibt es nicht (mehr)
            </span>
            <span className="kyt-webinar-notice-text" style={{ opacity: 0.72, maxWidth: 440 }}>
              Der Link ist abgelaufen oder der Termin wurde verschoben. Wähle auf der
              Anmeldeseite einfach einen neuen Termin.
            </span>
            <a href="/webinar-soul-business-anmeldung" className="kyt-btn kyt-btn--primary">
              Termin wählen
            </a>
          </div>
        ) : (
          <div className="kyt-webinar-notice" style={noticeStyle}>
            <span className="kyt-webinar-notice-eyebrow">Kein Termin</span>
            <span
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 400, lineHeight: 1.3, maxWidth: 520,
              }}
            >
              Hier wird dein Webinar erscheinen
            </span>
            <span className="kyt-webinar-notice-text" style={{ opacity: 0.72, maxWidth: 440 }}>
              Sobald ein Termin mit Video im Studio geplant ist, erscheint der Player hier –
              ausserhalb der Spielzeit nicht.
            </span>
          </div>
        )}
      </div>

      {phase === 'live' && live ? (
        <p style={{ color: C.muted, fontSize: 13, margin: '16px 0 0', lineHeight: 1.7 }}>
          Das Webinar läuft gerade
          {liveWindow.endsAt !== null
            ? ` · noch bis ${dateFormatter.format(new Date(liveWindow.endsAt))}`
            : ''}
        </p>
      ) : null}

      <div style={{ textAlign: 'center', marginTop: 26 }}>
        <div className="kyt-btn-row">
          <a
            href={ctaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="kyt-btn kyt-btn--primary"
          >
            1x1 Gespräch buchen
          </a>
        </div>
        <p style={{ color: C.muted, fontSize: 14, margin: '16px 0 0', lineHeight: 1.8 }}>
          Wenn du noch nicht gebucht hast, dann{' '}
          <a
            href="/webinar-soul-business-anmeldung"
            style={{ color: C.warmBrown, textDecoration: 'underline' }}
          >
            Bitte hier zum Webinar anmelden
          </a>
          .
        </p>
        <p style={{ color: C.muted, fontSize: 13, margin: '14px 0 0', lineHeight: 1.7 }}>
          Live · 30 Minuten · Unverbindlich
        </p>
      </div>
    </div>
  )
}
