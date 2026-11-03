'use client'

import React, { useState } from 'react'

type Slot = {
  id: string
  title: string
  when: string
  startsAt: string | null
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

export default function AnmeldungClient({ slots }: { slots: Slot[] }) {
  const [step, setStep] = useState<'email' | 'slot' | 'done'>('email')
  const [email, setEmail] = useState('')
  const [slotId, setSlotId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [link, setLink] = useState<string | null>(null)

  const chosen = slots.find((slot) => slot.id === slotId) ?? null

  const submitEmail = (event: React.FormEvent) => {
    event.preventDefault()
    const value = email.trim()
    if (!EMAIL_RE.test(value)) {
      setError('Bitte gib eine gültige E-Mail-Adresse ein.')
      return
    }
    setError(null)
    setSlotId(slots[0]?.id ?? '')
    setStep('slot')
  }

  const submitSlot = async (event: React.FormEvent) => {
    event.preventDefault()
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
        body: JSON.stringify({ email: email.trim(), slotId }),
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
      setStep('done')
    } catch {
      setError('Die Anmeldung hat nicht geklappt. Bitte versuche es erneut.')
    } finally {
      setBusy(false)
    }
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: C.warmBrown,
    marginBottom: 10,
    fontWeight: 500,
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    background: C.white,
    border: `1px solid ${C.sand}`,
    borderRadius: 8,
    padding: '15px 18px',
    fontSize: 16,
    color: C.deepBrown,
    fontFamily: "'Jost', system-ui, sans-serif",
    outline: 'none',
  }

  return (
    <div style={{ maxWidth: 620, margin: '0 auto' }}>
      {step === 'email' ? (
        <form onSubmit={submitEmail} noValidate>
          <label htmlFor="webinar-email" style={labelStyle}>
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
          <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.7, margin: '14px 0 26px' }}>
            Wir schicken dir deinen Termin-Link per Mail. Der Stream ist nur während des
            Termins abrufbar - dein Link gilt genau für den Slot, den du auswählst.
          </p>
          {error ? (
            <p role="alert" style={{ color: '#A4402F', fontSize: 14, margin: '0 0 20px' }}>
              {error}
            </p>
          ) : null}
          <button type="submit" className="kyt-btn kyt-btn--primary" disabled={slots.length === 0}>
            Weiter zu den Terminen
          </button>
        </form>
      ) : null}

      {step === 'slot' ? (
        <form onSubmit={submitSlot} noValidate>
          <p style={{ color: C.muted, fontSize: 13, margin: '0 0 22px', lineHeight: 1.7 }}>
            Angemeldet als <strong style={{ color: C.warmBrown }}>{email.trim()}</strong>
          </p>
          <label style={labelStyle}>Wähle deinen Termin</label>
          <div style={{ display: 'grid', gap: 12, marginBottom: 26 }}>
            {slots.map((slot) => {
              const active = slot.id === slotId
              return (
                <label
                  key={slot.id}
                  style={{
                    display: 'flex',
                    gap: 14,
                    alignItems: 'center',
                    background: active ? '#FBF4E4' : C.white,
                    border: `1px solid ${active ? C.terracotta : C.sand}`,
                    borderRadius: 10,
                    padding: '16px 18px',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="webinar-slot"
                    value={slot.id}
                    checked={active}
                    onChange={() => setSlotId(slot.id)}
                    style={{ accentColor: C.terracotta, width: 18, height: 18, flexShrink: 0 }}
                  />
                  <span style={{ minWidth: 0 }}>
                    <span
                      style={{
                        display: 'block',
                        fontFamily: "'Cormorant Garamond', serif",
                        fontSize: 21,
                        lineHeight: 1.35,
                        color: C.deepBrown,
                      }}
                    >
                      {slot.title}
                    </span>
                    <span style={{ display: 'block', fontSize: 14, color: C.warmBrown, marginTop: 3 }}>
                      {slot.when}
                    </span>
                  </span>
                </label>
              )
            })}
          </div>
          {error ? (
            <p role="alert" style={{ color: '#A4402F', fontSize: 14, margin: '0 0 20px' }}>
              {error}
            </p>
          ) : null}
          <div className="kyt-btn-row" style={{ justifyContent: 'flex-start' }}>
            <button type="submit" className="kyt-btn kyt-btn--primary" disabled={busy || !slotId}>
              {busy ? 'Wird angemeldet…' : 'Termin anmelden'}
            </button>
            <button
              type="button"
              className="kyt-btn kyt-btn--ghost"
              onClick={() => {
                setError(null)
                setStep('email')
              }}
            >
              E-Mail ändern
            </button>
          </div>
        </form>
      ) : null}

      {step === 'done' ? (
        <div>
          <p
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 'clamp(24px, 4vw, 32px)',
              lineHeight: 1.3,
              color: C.deepBrown,
              margin: '0 0 14px',
            }}
          >
            Du bist angemeldet.
          </p>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: C.warmBrown, margin: '0 0 8px' }}>
            {chosen ? `${chosen.title} · ${chosen.when}` : null}
          </p>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: C.muted, margin: '0 0 26px' }}>
            Die Bestätigung ist unterwegs an {email.trim()}. Der Link in der Mail öffnet deinen
            Termin - das Video ist nur während des Termins verfügbar.
          </p>
          {link ? (
            <a href={link} className="kyt-btn kyt-btn--primary">
              Termin öffnen
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
