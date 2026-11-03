'use client'

import React, { useMemo, useState } from 'react'

type Slot = {
  id: string
  title: string
  /** 'HH:MM' in Europe/Berlin */
  time: string
  startsAt: string | null
}

type Day = {
  /** 'YYYY-MM-DD' in Europe/Berlin */
  key: string
  /** 'Mittwoch, 4. November' */
  label: string
  /** 'Heute' / 'Morgen' / '' */
  relative: string
  slots: Slot[]
}

const C = {
  warmWhite: '#FAF7F2',
  sand: '#E8DDD0',
  gold: '#C9A96E',
  terracotta: '#D3BC76',
  deepBrown: '#2A1F1A',
  warmBrown: '#4A3728',
  muted: '#8A7B72',
  white: '#FFFFFF',
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function AnmeldungClient({ days }: { days: Day[] }) {
  const [email, setEmail] = useState('')
  const [slotId, setSlotId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [link, setLink] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const allSlots = useMemo(() => days.flatMap((day) => day.slots), [days])
  const chosen = allSlots.find((slot) => slot.id === slotId) ?? null
  const chosenDay = days.find((day) => day.slots.some((slot) => slot.id === slotId)) ?? null

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const value = email.trim()
    if (!EMAIL_RE.test(value)) {
      setError('Bitte gib eine gültige E-Mail-Adresse ein.')
      return
    }
    if (!slotId) {
      setError('Bitte wähle einen Termin aus.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/webinar/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: value, slotId }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        link?: string
        error?: string
      }
      if (!res.ok || !data.ok) {
        setError(data.error || 'Die Anmeldung hat nicht geklappt. Bitte versuche es erneut.')
        return
      }
      setLink(data.link ?? null)
      setDone(true)
    } catch {
      setError('Die Anmeldung hat nicht geklappt. Bitte versuche es erneut.')
    } finally {
      setBusy(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    border: `1px solid ${C.sand}`,
    borderRadius: 10,
    background: C.white,
    padding: '15px 16px',
    fontSize: 16,
    fontFamily: 'inherit',
    color: C.deepBrown,
    outline: 'none',
  }

  return (
    <div style={{ maxWidth: 980, margin: '0 auto' }}>
      {done ? (
        <div style={{ textAlign: 'center', maxWidth: 560, margin: '0 auto' }}>
          <p
            style={{
              fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(24px, 4vw, 32px)',
              color: C.deepBrown, margin: '0 0 14px', lineHeight: 1.3,
            }}
          >
            Du bist angemeldet.
          </p>
          {chosen && chosenDay ? (
            <p style={{ fontSize: 16, lineHeight: 1.8, color: C.warmBrown, margin: '0 0 8px' }}>
              {chosen.title} · {chosenDay.label} um {chosen.time} Uhr
            </p>
          ) : null}
          <p style={{ fontSize: 15, lineHeight: 1.8, color: C.muted, margin: '0 0 26px' }}>
            Die Bestätigung ist unterwegs an {email.trim()}. Dein persönlicher Link öffnet
            genau diesen Termin - das Video ist nur während der Spielzeit abrufbar.
          </p>
          {link ? (
            <div className="kyt-btn-row">
              <a href={link} className="kyt-btn kyt-btn--primary">
                Termin öffnen
              </a>
              <button
                type="button"
                className="kyt-btn kyt-btn--secondary"
                onClick={() => {
                  setDone(false)
                  setLink(null)
                }}
              >
                Weiteren Termin wählen
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          <div
            style={{
              background: C.white,
              border: `1px solid ${C.sand}`,
              borderRadius: 14,
              padding: '22px 22px 24px',
              marginBottom: 30,
            }}
          >
            <label
              htmlFor="webinar-email"
              style={{
                display: 'block', fontSize: 12, fontWeight: 700, letterSpacing: '0.14em',
                textTransform: 'uppercase', color: C.warmBrown, marginBottom: 10,
              }}
            >
              Deine E-Mail-Adresse
            </label>
            <input
              id="webinar-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="deine@email.de"
              style={inputStyle}
            />
            <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.7, margin: '12px 0 0' }}>
              Wir schicken dir deinen Termin-Link per Mail. Der Link gilt genau für den
              Termin, den du auswählst.
            </p>
          </div>

          <div
            style={{
              display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
              gap: 12, flexWrap: 'wrap', marginBottom: 16,
            }}
          >
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(24px, 3.5vw, 32px)',
                fontWeight: 400, color: C.deepBrown, margin: 0,
              }}
            >
              Wähle deinen Termin
            </h2>
            <span style={{ fontSize: 13, color: C.muted }}>
              {days.length} {days.length === 1 ? 'Tag' : 'Tage'} ·{' '}
              {allSlots.length} Termine
            </span>
          </div>

          <div className="kyt-slot-days">
            {days.map((day) => (
              <div key={day.key} className="kyt-slot-day">
                <div className="kyt-slot-day-head">
                  <span className="kyt-slot-day-label">{day.label}</span>
                  {day.relative ? (
                    <span className="kyt-slot-day-relative">{day.relative}</span>
                  ) : null}
                </div>
                <div className="kyt-slot-list">
                  {day.slots.map((slot) => {
                    const active = slot.id === slotId
                    return (
                      <label
                        key={slot.id}
                        className={`kyt-slot${active ? ' is-selected' : ''}`}
                      >
                        <input
                          type="radio"
                          name="webinar-slot"
                          value={slot.id}
                          checked={active}
                          onChange={() => setSlotId(slot.id)}
                        />
                        <span className="kyt-slot-time">{slot.time}</span>
                        <span className="kyt-slot-title">{slot.title}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {error ? (
            <p role="alert" style={{ color: '#A4402F', fontSize: 14, margin: '20px 0 0' }}>
              {error}
            </p>
          ) : null}

          <div className="kyt-btn-row" style={{ justifyContent: 'flex-start', marginTop: 26 }}>
            <button type="submit" className="kyt-btn kyt-btn--primary" disabled={busy || !slotId}>
              {busy ? 'Wird angemeldet…' : 'Termin anmelden'}
            </button>
          </div>
          <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.7, margin: '14px 0 0' }}>
            {chosen
              ? `Dein Termin: ${chosenDay?.label} um ${chosen.time} Uhr`
              : 'Wähle oben einen Termin aus, dann geht die Anmeldung raus.'}
          </p>
        </form>
      )}
    </div>
  )
}
