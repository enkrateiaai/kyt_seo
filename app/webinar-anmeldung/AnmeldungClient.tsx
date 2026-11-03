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
  /** 'Mi 4. Nov' */
  label: string
  /** 'Mittwoch, 4. November 2026' */
  full: string
  /** 'Heute' / 'Morgen' / '' */
  relative: string
  slots: Slot[]
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

  if (done) {
    return (
      <div className="anm-done">
        <h2 className="anm-done-title">Dein Termin steht</h2>
        {chosen && chosenDay ? (
          <p className="anm-done-slot">
            {chosen.title} · {chosenDay.label} um {chosen.time} Uhr
          </p>
        ) : null}
        <p className="anm-done-text">
          Der Link ist unterwegs an {email.trim()}. Er öffnet genau diesen Termin –
          vorher und danach gibt es nichts zu schauen.
        </p>
        {link ? (
          <div className="anm-actions">
            <a href={link} className="anm-submit">
              Termin öffnen
            </a>
            <button
              type="button"
              className="anm-btn-ghost"
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
    )
  }

  return (
    <form className="anm-form" onSubmit={submit} noValidate>
      <div className="anm-field">
        <label className="anm-label" htmlFor="webinar-email">
          Deine E-Mail-Adresse
        </label>
        <input
          id="webinar-email"
          className="anm-input"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="deine@email.de"
        />
        <p className="anm-hint">
          Dorthin schicken wir den Link zu deinem Termin. Mehr bekommst du nicht.
        </p>
      </div>

      <div className="anm-sched-head">
        <h2 className="anm-h2">Termin wählen</h2>
        <span className="anm-meta">
          {days.length} {days.length === 1 ? 'Tag' : 'Tage'} · {allSlots.length}{' '}
          {allSlots.length === 1 ? 'Termin' : 'Termine'}
        </span>
      </div>

      <div className="anm-days">
        {days.map((day) => (
          <div key={day.key} className="anm-day">
            <div>
              <span className="anm-day-date" title={day.full}>
                {day.label}
              </span>
              {day.relative ? <span className="anm-day-rel">{day.relative}</span> : null}
            </div>
            <div className="anm-day-slots">
              {day.slots.map((slot) => {
                const active = slot.id === slotId
                return (
                  <label
                    key={slot.id}
                    className={`anm-slot${active ? ' is-selected' : ''}`}
                    title={`${day.full} um ${slot.time} Uhr`}
                  >
                    <input
                      type="radio"
                      name="webinar-slot"
                      value={slot.id}
                      checked={active}
                      onChange={() => setSlotId(slot.id)}
                    />
                    <span className="anm-slot-time">{slot.time}</span>
                  </label>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {error ? (
        <p role="alert" className="anm-error">
          {error}
        </p>
      ) : null}

      <div className="anm-actions">
        <button type="submit" className="anm-submit" disabled={busy || !slotId}>
          {busy ? 'Wird angemeldet …' : 'Termin anmelden'}
        </button>
      </div>

      <p className="anm-summary">
        {chosen
          ? `Dein Termin: ${chosenDay?.label} um ${chosen.time} Uhr`
          : 'Wähle oben eine Uhrzeit, dann geht die Anmeldung raus.'}
      </p>
    </form>
  )
}
