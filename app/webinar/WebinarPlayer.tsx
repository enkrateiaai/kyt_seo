'use client'

import React, { useEffect, useRef, useState } from 'react'
import type { WebinarConfig, WebinarCta } from '@/lib/webinar'

const C = {
  surface: '#FDFBF8',
  border: '#DDD5C8',
  text: '#2C2416',
  muted: '#6B5D4F',
  faint: '#9B8E7E',
  goldDark: '#B89A4A',
  red: '#A35050',
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

function isLive(w: WebinarConfig, nowMs: number) {
  const starts = w.startsAt ? Date.parse(w.startsAt) : NaN
  if (!Number.isFinite(starts)) return true
  if (nowMs < starts) return false
  const ends = w.endsAt ? Date.parse(w.endsAt) : NaN
  if (Number.isFinite(ends) && nowMs > ends) return false
  return true
}

function isUpcoming(w: WebinarConfig, nowMs: number) {
  const starts = w.startsAt ? Date.parse(w.startsAt) : NaN
  return Number.isFinite(starts) && nowMs < starts
}

// Call-to-action below the video (e.g. "Termin buchen" -> Calendly).
function CtaBox({ cta }: { cta: WebinarCta }) {
  return (
    <div style={{ marginTop: 18, textAlign: 'center' }}>
      <a
        href={cta.url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-block',
          background: '#B89A4A',
          color: '#2C2416',
          fontSize: 15,
          fontWeight: 600,
          letterSpacing: '0.04em',
          padding: '13px 30px',
          borderRadius: 999,
          textDecoration: 'none',
        }}
      >
        {cta.label || 'Termin buchen'}
      </a>
    </div>
  )
}

export default function WebinarPlayer({
  initialWebinars,
  initialActive,
  initialNext,
  initialCta,
}: {
  initialWebinars: WebinarConfig[]
  initialActive: WebinarConfig | null
  initialNext: WebinarConfig | null
  initialCta?: WebinarCta | null
}) {
  const [webinars, setWebinars] = useState<WebinarConfig[]>(initialWebinars)
  const [active, setActive] = useState<WebinarConfig | null>(initialActive)
  const [next, setNext] = useState<WebinarConfig | null>(initialNext)
  const [now, setNow] = useState(() => Date.now())
  const [muted, setMuted] = useState(true)
  const [cta, setCta] = useState<WebinarCta | null>(initialCta ?? null)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Clock: the window opens and closes on time, even without a reload.
  useEffect(() => {
    const t = setInterval(() => {
      const current = Date.now()
      setNow(current)
      setActive((prev) => {
        const live = webinars.filter((w) => isLive(w, current))
        if (live.length === 0) return null
        live.sort(
          (a, b) => (Date.parse(b.startsAt ?? '') || 0) - (Date.parse(a.startsAt ?? '') || 0),
        )
        return live[0]
      })
      setNext((prev) => {
        const upcoming = webinars
          .filter((w) => isUpcoming(w, current))
          .sort((a, b) => (Date.parse(a.startsAt ?? '') || 0) - (Date.parse(b.startsAt ?? '') || 0))
        return upcoming[0] ?? null
      })
    }, 1000)
    return () => clearInterval(t)
  }, [webinars])

  // Pick up config changes made in the studio without a reload.
  useEffect(() => {
    let cancelled = false
    const poll = async () => {
      try {
        const res = await fetch('/api/webinar', { cache: 'no-store' })
        if (!res.ok) return
        const data = (await res.json()) as {
          webinars?: WebinarConfig[]
          active?: WebinarConfig | null
          next?: WebinarConfig | null
          cta?: WebinarCta | null
        }
        if (cancelled) return
        if (Array.isArray(data.webinars)) setWebinars(data.webinars)
        if (data.active !== undefined) setActive(data.active)
        if (data.next !== undefined) setNext(data.next)
        if (data.cta !== undefined) setCta(data.cta)
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
    if (!active && videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause()
    }
  }, [active])

  const panelStyle: React.CSSProperties = {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    padding: 28,
    textAlign: 'center',
  }

  const others = webinars.filter((w) => w.id !== active?.id && w.id !== next?.id)

  if (!active && !next) {
    return (
      <>
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
        {others.length > 0 ? (
          <p style={{ color: C.faint, fontSize: 12, margin: '14px 0 0' }}>
            {others.length} weitere(s) Webinar(s) geplant.
          </p>
        ) : null}
      </div>
      {cta ? <CtaBox cta={cta} /> : null}
      </>
    )
  }

  if (!active && next) {
    const startsAt = next.startsAt ? Date.parse(next.startsAt) : NaN
    const endsAt = next.endsAt ? Date.parse(next.endsAt) : NaN
    return (
      <>
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
          {next.title}
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
          {fmtCountdown(startsAt - now)}
        </div>
        <p style={{ color: C.faint, fontSize: 12, marginTop: 10, marginBottom: 0 }}>
          Die Seite bleibt offen – der Stream startet automatisch.
        </p>
        {others.length > 0 ? (
          <p style={{ color: C.faint, fontSize: 12, margin: '14px 0 0' }}>
            {others.length} weitere(s) Webinar(s) geplant.
          </p>
        ) : null}
      </div>
      {cta ? <CtaBox cta={cta} /> : null}
      </>
    )
  }

  // A webinar is live.
  const startsAt = active?.startsAt ? Date.parse(active.startsAt) : NaN
  const endsAt = active?.endsAt ? Date.parse(active.endsAt) : NaN

  return (
    <>
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
        key={active?.id}
        src={`/api/webinar/video?id=${encodeURIComponent(active?.id ?? '')}`}
        controls
        autoPlay
        playsInline
        muted={muted}
        onEnded={() => {
          const el = videoRef.current
          if (el) {
            el.pause()
            el.currentTime = 0
          }
        }}
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
          <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{active?.title}</div>
          {active?.description ? (
            <div style={{ fontSize: 13, color: C.muted, marginTop: 3 }}>{active.description}</div>
          ) : null}
        </div>
        <div style={{ fontSize: 12, color: C.faint, textAlign: 'right' }}>
          {Number.isFinite(startsAt) ? `Seit ${DATE_FMT.format(new Date(startsAt))}` : null}
        </div>
      </div>
      {next ? (
        <div
          style={{
            background: C.surface,
            borderTop: `1px solid ${C.border}`,
            padding: '10px 18px',
            fontSize: 12,
            color: C.muted,
          }}
        >
          Nächstes Webinar: <strong style={{ color: C.text }}>{next.title}</strong> am{' '}
          {DATE_FMT.format(new Date(Date.parse(next.startsAt ?? '')))}
        </div>
      ) : null}
    </div>
    {cta ? <CtaBox cta={cta} /> : null}
    </>
  )
}
