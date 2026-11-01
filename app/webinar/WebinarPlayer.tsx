'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { WebinarConfig, WebinarPhase } from '@/lib/webinar'

const C = {
  surface: '#FDFBF8',
  border: '#DDD5C8',
  text: '#2C2416',
  muted: '#6B5D4F',
  faint: '#9B8E7E',
  gold: '#D3BC76',
  goldDark: '#B89A4A',
  green: '#4A7C59',
  greenLight: '#EDF5F0',
  red: '#A35050',
  redLight: '#FAF0F0',
}

const DATE_FMT = new Intl.DateTimeFormat('de-DE', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Berlin',
})

const TIME_FMT = new Intl.DateTimeFormat('de-DE', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Berlin',
})

function fmtCountdown(ms: number) {
  if (ms <= 0) return '00:00:00'
  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':')
}

function phaseOf(cfg: WebinarConfig | null, nowMs: number): WebinarPhase {
  if (!cfg || !cfg.filename) return 'none'
  const starts = cfg.startsAt ? Date.parse(cfg.startsAt) : NaN
  if (!Number.isFinite(starts)) return 'live'
  if (nowMs < starts) return 'before'
  const ends = cfg.endsAt ? Date.parse(cfg.endsAt) : NaN
  if (Number.isFinite(ends) && nowMs > ends) return 'after'
  return 'live'
}

export default function WebinarPlayer({
  initialWebinar,
  initialPhase,
}: {
  initialWebinar: WebinarConfig | null
  initialPhase: WebinarPhase
}) {
  const [webinar, setWebinar] = useState<WebinarConfig | null>(initialWebinar)
  const [phase, setPhase] = useState<WebinarPhase>(initialPhase)
  const [now, setNow] = useState(() => Date.now())
  const [muted, setMuted] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Keep the clock in sync so the window opens and closes on time.
  useEffect(() => {
    const t = setInterval(() => {
      const current = Date.now()
      setNow(current)
      setPhase((prev) => {
        const next = phaseOf(webinar, current)
        return next === prev ? prev : next
      })
    }, 1000)
    return () => clearInterval(t)
  }, [webinar])

  // Pick up config changes made in the studio without a reload.
  useEffect(() => {
    let cancelled = false
    const poll = async () => {
      try {
        const res = await fetch('/api/webinar', { cache: 'no-store' })
        if (!res.ok) return
        const data = (await res.json()) as { webinar?: WebinarConfig | null; phase?: WebinarPhase }
        if (cancelled) return
        if (data.webinar) setWebinar(data.webinar)
        setPhase((prev) => (data.phase && data.phase !== prev ? data.phase : prev))
      } catch {
        /* keep the last known state */
      }
    }
    const id = setInterval(poll, 30000)
    poll()
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  // Hard stop: the video must not keep playing past the end of the window.
  useEffect(() => {
    if (phase !== 'live' && videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause()
    }
  }, [phase])

  const startsAt = webinar?.startsAt ? Date.parse(webinar.startsAt) : NaN
  const endsAt = webinar?.endsAt ? Date.parse(webinar.endsAt) : NaN

  const stopVideo = useCallback(() => {
    const el = videoRef.current
    if (el) {
      el.pause()
      el.currentTime = 0
    }
  }, [])

  const panelStyle: React.CSSProperties = {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    padding: 28,
    textAlign: 'center',
  }

  if (phase === 'none' || !webinar) {
    return (
      <div style={panelStyle}>
        <div style={{ fontSize: 30, marginBottom: 12 }}>◷</div>
        <h2
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 26,
            fontWeight: 400,
            margin: '0 0 10px',
            color: C.text,
          }}
        >
          Aktuell kein Webinar geplant
        </h2>
        <p style={{ color: C.muted, fontSize: 14, margin: 0, lineHeight: 1.7 }}>
          Sobald ein Webinar angesetzt ist, erscheint hier der Stream mit Start- und Endzeit.
        </p>
      </div>
    )
  }

  if (phase === 'before') {
    const remaining = startsAt - now
    return (
      <div style={panelStyle}>
        <div style={{ fontSize: 30, marginBottom: 12 }}>◷</div>
        <h2
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 26,
            fontWeight: 400,
            margin: '0 0 8px',
            color: C.text,
          }}
        >
          {webinar.title}
        </h2>
        <p style={{ color: C.muted, fontSize: 14, margin: '0 0 22px', lineHeight: 1.7 }}>
          Das Webinar startet am{' '}
          <strong style={{ color: C.text, fontWeight: 600 }}>
            {Number.isFinite(startsAt) ? DATE_FMT.format(new Date(startsAt)) : '—'}
          </strong>
          {Number.isFinite(endsAt) ? (
            <>
              {' '}
              und endet um <strong style={{ color: C.text, fontWeight: 600 }}>{TIME_FMT.format(new Date(endsAt))}</strong>.
            </>
          ) : null}
        </p>
        <div
          style={{
            fontFamily: "'DM Mono', ui-monospace, monospace",
            fontSize: 34,
            letterSpacing: '0.08em',
            color: C.goldDark,
            fontWeight: 600,
          }}
        >
          {fmtCountdown(remaining)}
        </div>
        <p style={{ color: C.faint, fontSize: 12, marginTop: 10, marginBottom: 0 }}>
          Die Seite bleibt offen – der Stream startet automatisch.
        </p>
      </div>
    )
  }

  if (phase === 'after') {
    return (
      <div style={panelStyle}>
        <div style={{ fontSize: 30, marginBottom: 12 }}>✓</div>
        <h2
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 26,
            fontWeight: 400,
            margin: '0 0 8px',
            color: C.text,
          }}
        >
          {webinar.title}
        </h2>
        <p style={{ color: C.muted, fontSize: 14, margin: 0, lineHeight: 1.7 }}>
          Das Webinar ist beendet
          {Number.isFinite(endsAt) ? (
            <>
              {' '}
              – es lief am {DATE_FMT.format(new Date(endsAt))} bis {TIME_FMT.format(new Date(endsAt))}.
            </>
          ) : null}
          .
        </p>
      </div>
    )
  }

  // phase === 'live'
  return (
    <div
      style={{
        background: '#000',
        borderRadius: 10,
        overflow: 'hidden',
        border: `1px solid ${C.border}`,
        position: 'relative',
      }}
    >
      <video
        ref={videoRef}
        key={webinar.filename}
        src="/api/webinar/video"
        controls
        autoPlay
        playsInline
        muted={muted}
        onEnded={stopVideo}
        style={{ width: '100%', display: 'block', aspectRatio: '16 / 9', background: '#000' }}
      />
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          pointerEvents: 'none',
        }}
      >
        <span
          style={{
            background: C.red,
            color: '#fff',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 1.4,
            padding: '4px 9px',
            borderRadius: 3,
          }}
        >
          WEBINAR
        </span>
        {Number.isFinite(endsAt) && (
          <span
            style={{
              background: 'rgba(17,14,12,.78)',
              color: '#F4F6F8',
              fontSize: 11,
              padding: '4px 9px',
              borderRadius: 3,
            }}
          >
            bis {TIME_FMT.format(new Date(endsAt))} Uhr
          </span>
        )}
      </div>
      {muted && (
        <button
          type="button"
          onClick={() => {
            setMuted(false)
            const el = videoRef.current
            if (el) {
              el.muted = false
              void el.play().catch(() => undefined)
            }
          }}
          style={{
            position: 'absolute',
            bottom: 56,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(17,14,12,.82)',
            color: '#F4F6F8',
            border: '1px solid rgba(244,246,248,.35)',
            borderRadius: 999,
            padding: '8px 18px',
            fontSize: 12,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          Ton einschalten
        </button>
      )}
      <div
        style={{
          background: C.surface,
          borderTop: `1px solid ${C.border}`,
          padding: '14px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{webinar.title}</div>
          {webinar.description ? (
            <div style={{ fontSize: 13, color: C.muted, marginTop: 3 }}>{webinar.description}</div>
          ) : null}
        </div>
        <div style={{ fontSize: 12, color: C.faint, textAlign: 'right' }}>
          {Number.isFinite(startsAt) ? `Seit ${DATE_FMT.format(new Date(startsAt))}` : null}
        </div>
      </div>
    </div>
  )
}
