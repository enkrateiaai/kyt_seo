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

// State of the player for one webinar.
type PlayerState = {
  // Autoplay is only allowed without sound.
  muted?: boolean
  // The browser refused to start playback.
  blocked?: boolean
  // The video reached its end.
  ended?: boolean
}

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

// The schedule is refreshed in the background so the video appears when the
// window opens and disappears when it closes - without a page reload.
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

export default function SoulPathVideo({
  webinars: initialWebinars,
  serverNow,
  ctaUrl,
  ctaLabel,
  slotId,
  token,
}: {
  webinars: WebinarConfig[]
  serverNow: number
  ctaUrl: string
  ctaLabel: string
  slotId?: string
  token?: string
}) {
  const [webinars, setWebinars] = useState<WebinarConfig[]>(initialWebinars)
  // Starts at the server timestamp so the first render matches the HTML the
  // server sent (no hydration mismatch) and the clock is right from the start.
  const [nowMs, setNowMs] = useState(serverNow)
  const [failedId, setFailedId] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  // Offset between the browser clock and the server clock. A ref, because it
  // is not rendered - changing it must not trigger a render.
  // Offset between the browser clock and the server clock. A ref, because it
  // is not rendered - changing it must not trigger a render.
  const clockOffset = useRef(0)

  // ── Player: the webinar runs by itself ────────────────────────────────────
  // The video starts on its own at the scheduled start time. The viewer cannot
  // pause it, cannot jump ahead and cannot rewind.
  const videoRef = useRef<HTMLVideoElement | null>(null)
  // The position the viewer is allowed to be at - every jump is undone.
  const allowedTime = useRef(0)
  // True while we move the video ourselves, so our own seek is not undone.
  const seekingByUs = useRef(false)
  // Player state per webinar, so a new webinar always starts fresh.
  const [playerById, setPlayerById] = useState<Record<string, PlayerState>>({})

  // The server clock is the reference, so a wrong client clock cannot open
  // the window early or late.
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

  // With a slot id the page is pinned to exactly that slot. Without one it
  // shows whatever is currently running.
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
  // The player failed for this webinar id - a new id starts fresh.
  const videoFailed = live !== null && failedId === live.id

  // ── Playback: starts itself, keeps running, no jumping ────────────────────
  const liveId = live?.id ?? null
  const player: PlayerState = liveId ? (playerById[liveId] ?? {}) : {}
  const updatePlayer = (patch: Partial<PlayerState>) => {
    if (!liveId) return
    setPlayerById((previous) => ({
      ...previous,
      [liveId]: { ...(previous[liveId] ?? {}), ...patch },
    }))
  }

  const startPlayback = (element: HTMLVideoElement) => {
    const result = element.play()
    if (result && typeof result.then === 'function') {
      result
        .then(() => updatePlayer({ blocked: false }))
        .catch(() => updatePlayer({ blocked: true }))
    }
  }

  // Where the webinar is running right now, in seconds. Someone who opens the
  // page late joins at the current position instead of at the beginning.
  const liveOffsetSeconds = () => {
    if (liveWindow.startsAt === null) return 0
    const elapsed = (Date.now() + clockOffset.current - liveWindow.startsAt) / 1000
    return elapsed > 0 ? elapsed : 0
  }

  const handleLoadedMetadata = () => {
    const element = videoRef.current
    if (!element) return
    const offset = liveOffsetSeconds()
    if (offset > 1 && Number.isFinite(element.duration) && offset < element.duration - 1) {
      seekingByUs.current = true
      try {
        element.currentTime = offset
      } catch {
        // Some browsers refuse a seek before the data is there.
      }
      seekingByUs.current = false
      allowedTime.current = offset
    }
    startPlayback(element)
  }

  // Jumping ahead or back is not allowed - the webinar plays on.
  const handleSeeking = () => {
    const element = videoRef.current
    if (!element || seekingByUs.current) return
    if (Math.abs(element.currentTime - allowedTime.current) > 2) {
      seekingByUs.current = true
      try {
        element.currentTime = allowedTime.current
      } catch {
        // ignore
      }
      seekingByUs.current = false
    }
  }

  const handleTimeUpdate = () => {
    const element = videoRef.current
    if (!element) return
    allowedTime.current = element.currentTime
  }

  // Pausing is not allowed either.
  const handlePause = () => {
    const element = videoRef.current
    if (!element || element.ended || document.hidden) return
    startPlayback(element)
  }

  const handleRateChange = () => {
    const element = videoRef.current
    if (element && element.playbackRate !== 1) element.playbackRate = 1
  }

  // Watchdog: the webinar runs by itself. If the browser paused it - tab in
  // the background, autoplay block, a hiccup - it simply goes on.
  useEffect(() => {
    if (phase !== 'live' || !live) return
    const timer = setInterval(() => {
      const element = videoRef.current
      if (!element || element.ended || document.hidden) return
      if (!element.paused) return
      const result = element.play()
      if (result && typeof result.then === 'function') result.catch(() => {})
    }, 1000)
    return () => clearInterval(timer)
  }, [phase, live])

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
          /* ── Video: nur im geplanten Zeitfenster, direkt aus dem Studio ── */
          videoFailed ? (
            <div className="kyt-webinar-notice" style={noticeStyle}>
              <span className="kyt-webinar-notice-eyebrow">
                Ladefehler
              </span>
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
            <>
              <video
                key={`${live.id}-${attempt}`}
                ref={videoRef}
                autoPlay
                muted={player.muted ?? true}
                playsInline
                preload="metadata"
                disablePictureInPicture
                controlsList="nodownload noplaybackrate noremoteplayback"
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
                onSeeking={handleSeeking}
                onPause={handlePause}
                onRateChange={handleRateChange}
                onEnded={() => updatePlayer({ ended: true })}
                onError={() => setFailedId(live.id)}
                onContextMenu={(event) => event.preventDefault()}
                src={`/api/webinar/video?id=${encodeURIComponent(live.id)}${
                  token ? `&token=${encodeURIComponent(token)}` : ''
                }`}
                title={live.title || 'Webinar'}
                style={{ width: '100%', height: '100%', display: 'block', background: '#000' }}
              />
              {player.muted ?? true ? (
                <button
                  type="button"
                  onClick={() => updatePlayer({ muted: false })}
                  style={{
                    position: 'absolute', top: 12, right: 12, zIndex: 3,
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '7px 13px', borderRadius: 999,
                    border: '1px solid rgba(250,247,242,.35)',
                    background: 'rgba(42,31,26,.72)',
                    color: C.warmWhite, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  🔊 Ton einschalten
                </button>
              ) : null}
              {player.blocked ? (
                <div
                  style={{
                    position: 'absolute', inset: 0, zIndex: 4,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(42,31,26,.78)',
                  }}
                >
                  <button
                    type="button"
                    className="kyt-btn kyt-btn--primary"
                    onClick={() => {
                      const element = videoRef.current
                      if (element) startPlayback(element)
                    }}
                  >
                    Webinar starten
                  </button>
                </div>
              ) : null}
              {player.ended ? (
                <div
                  style={{
                    position: 'absolute', inset: 0, zIndex: 4,
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', gap: 10, textAlign: 'center',
                    background: 'rgba(42,31,26,.86)', color: C.warmWhite,
                  }}
                >
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26 }}>
                    Das Webinar ist vorbei
                  </span>
                  <span style={{ fontSize: 13, opacity: 0.75, maxWidth: 420, lineHeight: 1.7 }}>
                    Danke, dass du da warst. Sprich mich gern an - unten kannst du ein
                    Kennenlerngespräch buchen.
                  </span>
                </div>
              ) : null}
            </>
          )
        ) : phase === 'before' && next ? (
          /* ── Noch nicht gestartet ── */
          <div className="kyt-webinar-notice" style={noticeStyle}>
            <span className="kyt-webinar-notice-eyebrow">
              Startet bald
            </span>
            <span
              style={{
                fontFamily: "'Cormorant Garamond', serif",
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
            <span className="kyt-webinar-notice-text" style={{ opacity: 0.72, maxWidth: 440 }}>
              Das Webinar startet von allein, sobald der Termin beginnt. Den Ton
              schaltest du oben ein.
            </span>
          </div>
        ) : phase === 'after' ? (
          /* ── Beendet ── */
          <div className="kyt-webinar-notice" style={noticeStyle}>
            <span className="kyt-webinar-notice-eyebrow">
              Beendet
            </span>
            <span
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 400, lineHeight: 1.3, maxWidth: 520,
              }}
            >
              Dieses Webinar ist vorbei.
            </span>
            <span className="kyt-webinar-notice-text" style={{ opacity: 0.72, maxWidth: 440 }}>
              Das Video stand nur während des Termins zur Verfügung. Sprich mich gern an -
              unten kannst du ein Kennenlerngespräch buchen.
            </span>
          </div>
        ) : slotMissing ? (
          /* ── Der verlinkte Termin existiert nicht (mehr) ── */
          <div className="kyt-webinar-notice" style={noticeStyle}>
            <span className="kyt-webinar-notice-eyebrow">
              Termin nicht verfügbar
            </span>
            <span
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 400, lineHeight: 1.3, maxWidth: 520,
              }}
            >
              Dieser Termin gibt es nicht (mehr)
            </span>
            <span className="kyt-webinar-notice-text" style={{ opacity: 0.72, maxWidth: 440 }}>
              Der Link ist abgelaufen oder der Termin wurde verschoben. Hol dir unter
              /webinar einfach einen neuen Zugang.
            </span>
            <a href="/webinar" className="kyt-btn kyt-btn--primary">
              Jetzt anmelden
            </a>
          </div>
        ) : (
          /* ── Kein Webinar geplant ── */
          <div className="kyt-webinar-notice" style={noticeStyle}>
            <span className="kyt-webinar-notice-eyebrow">
              Kein Termin
            </span>
            <span
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 400, lineHeight: 1.3, maxWidth: 520,
              }}
            >
              Hier wird dein Webinar erscheinen
            </span>
            <span className="kyt-webinar-notice-text" style={{ opacity: 0.72, maxWidth: 440 }}>
              Sobald ein Termin mit Video im Studio geplant ist, erscheint der Player hier -
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
        {/* Die Slot-Anmeldung ist die Hauptaktion: hier waehlt man den Termin
            (11:00 / 15:00 / 20:00) und traegt sich ein. Calendly ist das
            persoenliche Kennenlerngespraech und bleibt ein eigener Weg. */}
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
            href="/webinar"
            style={{ color: C.warmBrown, textDecoration: 'underline' }}
          >
            Hier zum Webinar anmelden
          </a>
          .
        </p>
        <p style={{ color: C.muted, fontSize: 13, margin: '14px 0 0', lineHeight: 1.7 }}>
          30 Minuten · Persönlich · Unverbindlich
        </p>
      </div>
    </div>
  )
}
