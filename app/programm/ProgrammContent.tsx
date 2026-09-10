'use client'

import { useEffect, useMemo, useState } from 'react'

type EventCategory = 'sonntag' | 'gastauftritt'

interface EventItem {
  id: string
  date: string // YYYY-MM-DD
  time: string // HH:MM
  title: string
  description: string
  category: EventCategory
}

// Hardcoded for now. Future: pull from a CMS / Google Calendar / Redis.
// Categories: sonntag (Sonntags-Meditation 20:30) + gastauftritt (Gastauftritt).
const EVENTS: EventItem[] = [
  // Sonntags-Meditationen (jeden Sonntag 20:30)
  { id: 'so-2026-09-13', date: '2026-09-13', time: '20:30', title: 'Sonntags-Meditation', description: 'Geführte Meditation am Sonntagabend — lass die Woche still ausklingen und finde zurück zu dir.', category: 'sonntag' },
  { id: 'so-2026-09-20', date: '2026-09-20', time: '20:30', title: 'Sonntags-Meditation', description: 'Geführte Meditation am Sonntagabend — lass die Woche still ausklingen und finde zurück zu dir.', category: 'sonntag' },
  { id: 'so-2026-09-27', date: '2026-09-27', time: '20:30', title: 'Sonntags-Meditation', description: 'Geführte Meditation am Sonntagabend — lass die Woche still ausklingen und finde zurück zu dir.', category: 'sonntag' },
  { id: 'so-2026-10-04', date: '2026-10-04', time: '20:30', title: 'Sonntags-Meditation', description: 'Geführte Meditation am Sonntagabend — lass die Woche still ausklingen und finde zurück zu dir.', category: 'sonntag' },
  { id: 'so-2026-10-11', date: '2026-10-11', time: '20:30', title: 'Sonntags-Meditation', description: 'Geführte Meditation am Sonntagabend — lass die Woche still ausklingen und finde zurück zu dir.', category: 'sonntag' },
  { id: 'so-2026-10-18', date: '2026-10-18', time: '20:30', title: 'Sonntags-Meditation', description: 'Geführte Meditation am Sonntagabend — lass die Woche still ausklingen und finde zurück zu dir.', category: 'sonntag' },
  { id: 'so-2026-10-25', date: '2026-10-25', time: '20:30', title: 'Sonntags-Meditation', description: 'Geführte Meditation am Sonntagabend — lass die Woche still ausklingen und finde zurück zu dir.', category: 'sonntag' },
  // Gastauftritte (Platzhalter — Catherine füllt die Themen später)
  { id: 'ga-2026-10-10', date: '2026-10-10', time: '19:00', title: 'Gastauftritt: Anand Singh', description: 'Internationaler Kundalini-Yoga-Lehrer zu Gast im Tribe. Thema wird noch bekanntgegeben.', category: 'gastauftritt' },
  { id: 'ga-2026-10-17', date: '2026-10-17', time: '19:00', title: 'Gastauftritt: Maya Devi', description: 'Lehrerin für transformative Kriyas zu Gast im Tribe. Thema wird noch bekanntgegeben.', category: 'gastauftritt' },
  { id: 'ga-2026-10-24', date: '2026-10-24', time: '19:00', title: 'Gastauftritt: Guru Prem Singh', description: 'Mantra- und Meditations-Lehrer zu Gast im Tribe. Thema wird noch bekanntgegeben.', category: 'gastauftritt' },
]

const C = {
  bg: '#FAF7F2',
  bgWarm: '#F3EDE4',
  card: '#FFFDF8',
  text: '#2C2416',
  textSoft: '#6B5D4F',
  textMuted: '#9B8E7E',
  accent: '#D3BC76',
  accentDeep: '#B89A4A',
  accentSoft: 'rgba(211, 188, 118, 0.18)',
  border: '#DDD5C8',
  borderStrong: '#C5B89E',
}

function getCategoryColor(c: EventCategory): string {
  return c === 'sonntag' ? C.accent : C.accentDeep
}

function getCategoryLabel(c: EventCategory): string {
  return c === 'sonntag' ? 'Sonntagabend' : 'Gastauftritt'
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function parseISODate(s: string): Date {
  const [y, m, day] = s.split('-').map(Number)
  return new Date(y, m - 1, day)
}

function formatDateDE(iso: string): string {
  const d = parseISODate(iso)
  return d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })
}

function formatFullDateDE(iso: string): string {
  const d = parseISODate(iso)
  return d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function formatTime(time: string): string {
  return `${time} Uhr`
}

function combineDateTime(iso: string, time: string): Date {
  const d = parseISODate(iso)
  const [h, m] = time.split(':').map(Number)
  d.setHours(h, m, 0, 0)
  return d
}

function diffToCountdown(target: Date, now: Date): { days: number; hours: number; minutes: number; seconds: number; isPast: boolean } {
  const totalMs = target.getTime() - now.getTime()
  const isPast = totalMs < 0
  const abs = Math.abs(totalMs)
  const days = Math.floor(abs / (1000 * 60 * 60 * 24))
  const hours = Math.floor((abs / (1000 * 60 * 60)) % 24)
  const minutes = Math.floor((abs / (1000 * 60)) % 60)
  const seconds = Math.floor((abs / 1000) % 60)
  return { days, hours, minutes, seconds, isPast }
}

const MONTH_NAMES_DE = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
]
const WEEKDAYS_DE_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

export default function ProgrammContent() {
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const [cursor, setCursor] = useState<{ year: number; month: number }>({
    year: today.getFullYear(),
    month: today.getMonth(),
  })
  const [selected, setSelected] = useState<EventItem | null>(null)
  const [now, setNow] = useState<Date>(new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  // Events grouped by ISO date for the current month view
  const eventsByDate = useMemo(() => {
    const map = new Map<string, EventItem[]>()
    for (const ev of EVENTS) {
      const arr = map.get(ev.date) ?? []
      arr.push(ev)
      map.set(ev.date, arr)
    }
    // Sort events within a day by time
    for (const arr of map.values()) {
      arr.sort((a, b) => a.time.localeCompare(b.time))
    }
    return map
  }, [])

  // Upcoming events sorted by absolute datetime
  const upcoming = useMemo(() => {
    const nowD = new Date()
    return [...EVENTS]
      .map((ev) => ({ ev, dt: combineDateTime(ev.date, ev.time) }))
      .filter((x) => x.dt.getTime() >= nowD.getTime() - 1000)
      .sort((a, b) => a.dt.getTime() - b.dt.getTime())
  }, [])

  const nextEvent = upcoming[0] ?? null

  // Build calendar grid (Mon-start)
  const grid = useMemo(() => {
    const firstOfMonth = new Date(cursor.year, cursor.month, 1)
    const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate()
    // Mon = 0 ... Sun = 6 (shift from JS Sun=0)
    const firstWeekdayShifted = (firstOfMonth.getDay() + 6) % 7
    const cells: Array<{ kind: 'pad'; key: string } | { kind: 'day'; key: string; day: number; iso: string }> = []
    for (let i = 0; i < firstWeekdayShifted; i++) {
      cells.push({ kind: 'pad', key: `pad-pre-${i}` })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${cursor.year}-${pad(cursor.month + 1)}-${pad(d)}`
      cells.push({ kind: 'day', key: iso, day: d, iso })
    }
    // Pad end to full weeks
    while (cells.length % 7 !== 0) {
      cells.push({ kind: 'pad', key: `pad-post-${cells.length}` })
    }
    return cells
  }, [cursor])

  const goPrevMonth = () => {
    setCursor((c) => {
      const m = c.month - 1
      if (m < 0) return { year: c.year - 1, month: 11 }
      return { year: c.year, month: m }
    })
    setSelected(null)
  }
  const goNextMonth = () => {
    setCursor((c) => {
      const m = c.month + 1
      if (m > 11) return { year: c.year + 1, month: 0 }
      return { year: c.year, month: m }
    })
    setSelected(null)
  }

  const cd = nextEvent ? diffToCountdown(nextEvent.dt, now) : null

  return (
    <main
      style={{
        minHeight: '100vh',
        background: C.bg,
        color: C.text,
        fontFamily: "'DM Sans', sans-serif",
        padding: '48px 24px 96px',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; background: ${C.bg}; }
        .programm-page { max-width: 980px; margin: 0 auto; }
        .programm-header { margin-bottom: 28px; }
        .programm-eyebrow {
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: ${C.textMuted};
          font-size: 12px;
          margin: 0 0 10px;
        }
        .programm-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(2.4rem, 5vw, 3.4rem);
          font-weight: 400;
          letter-spacing: 0.02em;
          margin: 0 0 12px;
          color: ${C.text};
        }
        .programm-sub {
          margin: 0;
          max-width: 640px;
          line-height: 1.75;
          font-size: 16px;
          color: ${C.textSoft};
        }

        .countdown-banner {
          background: linear-gradient(135deg, rgba(211,188,118,0.20), rgba(184,154,74,0.18));
          border: 1px solid rgba(184,154,74,0.40);
          border-radius: 16px;
          padding: 22px 24px;
          margin-bottom: 32px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 18px 28px;
        }
        .countdown-banner__eyebrow {
          font-size: 11px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: ${C.textMuted};
          margin: 0 0 6px;
        }
        .countdown-banner__title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 22px;
          font-weight: 500;
          color: ${C.text};
          margin: 0;
          line-height: 1.2;
        }
        .countdown-banner__meta {
          font-size: 13px;
          color: ${C.textSoft};
          margin: 6px 0 0;
        }
        .countdown-banner__ticker {
          margin-left: auto;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .countdown-cell {
          min-width: 64px;
          text-align: center;
          background: ${C.card};
          border: 1px solid ${C.border};
          border-radius: 10px;
          padding: 8px 10px;
        }
        .countdown-cell__num {
          font-family: 'Cormorant Garamond', serif;
          font-size: 28px;
          font-weight: 500;
          color: ${C.accentDeep};
          line-height: 1;
          font-variant-numeric: tabular-nums;
        }
        .countdown-cell__label {
          font-size: 10px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: ${C.textMuted};
          margin-top: 4px;
        }

        .calendar {
          background: ${C.card};
          border: 1px solid ${C.border};
          border-radius: 16px;
          padding: 18px;
          box-shadow: 0 14px 40px rgba(44,36,22,0.06);
        }
        .calendar__top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
          padding: 0 4px;
        }
        .calendar__month {
          font-family: 'Cormorant Garamond', serif;
          font-size: 24px;
          font-weight: 500;
          color: ${C.text};
          margin: 0;
          letter-spacing: 0.02em;
        }
        .calendar__nav-btn {
          background: transparent;
          border: 1px solid ${C.border};
          color: ${C.textSoft};
          width: 36px;
          height: 36px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: border-color 0.18s, color 0.18s;
        }
        .calendar__nav-btn:hover {
          border-color: ${C.accent};
          color: ${C.accentDeep};
        }
        .calendar__weekdays {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 6px;
          margin-bottom: 6px;
        }
        .calendar__weekday {
          text-align: center;
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: ${C.textMuted};
          padding: 4px 0;
        }
        .calendar__grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 6px;
        }
        .calendar__cell {
          aspect-ratio: 1 / 1;
          border-radius: 10px;
          border: 1px solid transparent;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          justify-content: stretch;
          background: transparent;
          position: relative;
          padding: 0;
          overflow: hidden;
        }
        .calendar__cell--pad { background: transparent; }
        .calendar__cell--day {
          background: #FFFCF7;
          border: 1px solid ${C.border};
          cursor: default;
        }
        .calendar__cell--today {
          border-color: ${C.accent};
          box-shadow: inset 0 0 0 1px ${C.accent};
        }
        .calendar__cell--has-event {
          background: ${C.accentSoft};
          border-color: ${C.accent};
          cursor: pointer;
        }
        .calendar__cell--has-event:hover {
          background: rgba(211,188,118,0.32);
        }
        .calendar__cell--selected {
          background: ${C.accent};
          border-color: ${C.accentDeep};
          box-shadow: 0 4px 14px rgba(184,154,74,0.30);
        }
        .calendar__cell-num {
          font-family: 'Cormorant Garamond', serif;
          font-size: 18px;
          font-weight: 500;
          color: ${C.text};
          padding: 6px 8px 0;
          line-height: 1;
        }
        .calendar__cell--selected .calendar__cell-num { color: ${C.text}; }
        .calendar__dots {
          margin-top: auto;
          padding: 6px 8px 8px;
          display: flex;
          gap: 4px;
        }
        .calendar__dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: ${C.accentDeep};
        }
        .calendar__dot--gast { background: ${C.accentDeep}; }

        .event-detail {
          margin-top: 24px;
          background: ${C.card};
          border: 1px solid ${C.border};
          border-radius: 14px;
          padding: 22px 24px;
          box-shadow: 0 10px 28px rgba(44,36,22,0.05);
          animation: fadeIn 0.22s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .event-detail__category {
          display: inline-block;
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: ${C.accentDeep};
          border: 1px solid ${C.accent};
          border-radius: 999px;
          padding: 4px 10px;
          margin-bottom: 12px;
        }
        .event-detail__title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 28px;
          font-weight: 500;
          color: ${C.text};
          margin: 0 0 6px;
          line-height: 1.15;
        }
        .event-detail__when {
          font-size: 14px;
          color: ${C.textSoft};
          margin: 0 0 16px;
        }
        .event-detail__body {
          font-size: 16px;
          line-height: 1.75;
          color: ${C.text};
          margin: 0 0 18px;
        }
        .event-detail__close {
          background: transparent;
          border: 1px solid ${C.border};
          color: ${C.textSoft};
          border-radius: 999px;
          padding: 8px 18px;
          font-size: 13px;
          cursor: pointer;
          font-family: inherit;
        }
        .event-detail__close:hover { border-color: ${C.accent}; color: ${C.accentDeep}; }

        .upcoming-list {
          margin-top: 36px;
        }
        .upcoming-list__heading {
          font-family: 'Cormorant Garamond', serif;
          font-size: 22px;
          font-weight: 500;
          color: ${C.text};
          margin: 0 0 14px;
        }
        .upcoming-list__item {
          display: flex;
          gap: 14px;
          padding: 14px 16px;
          border: 1px solid ${C.border};
          border-radius: 12px;
          background: ${C.card};
          margin-bottom: 10px;
          align-items: center;
          cursor: pointer;
          transition: border-color 0.18s, transform 0.18s;
        }
        .upcoming-list__item:hover {
          border-color: ${C.accent};
          transform: translateY(-1px);
        }
        .upcoming-list__date {
          min-width: 70px;
          text-align: center;
          background: ${C.accentSoft};
          border: 1px solid ${C.accent};
          border-radius: 10px;
          padding: 8px 6px;
          font-family: 'Cormorant Garamond', serif;
        }
        .upcoming-list__date-day {
          font-size: 22px;
          font-weight: 500;
          color: ${C.accentDeep};
          line-height: 1;
        }
        .upcoming-list__date-mon {
          font-size: 10px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: ${C.textMuted};
          margin-top: 4px;
        }
        .upcoming-list__body { flex: 1; }
        .upcoming-list__cat {
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: ${C.accentDeep};
          margin: 0 0 4px;
        }
        .upcoming-list__title {
          font-size: 16px;
          font-weight: 500;
          color: ${C.text};
          margin: 0 0 2px;
        }
        .upcoming-list__when {
          font-size: 13px;
          color: ${C.textSoft};
          margin: 0;
        }

        @media (max-width: 600px) {
          .countdown-banner { padding: 18px; }
          .countdown-banner__ticker { margin-left: 0; width: 100%; }
          .countdown-cell { flex: 1; min-width: 0; }
        }
      `}</style>

      <div className="programm-page">
        <header className="programm-header">
          <p className="programm-eyebrow">Tribe Programm</p>
          <h1 className="programm-title">Was im Tribe stattfindet</h1>
          <p className="programm-sub">
            Sonntags-Meditationen und Gastauftritte — neben den täglichen
            Live-Streams. Wähle einen Tag im Kalender, um mehr zu erfahren.
          </p>
        </header>

        {nextEvent && cd && (
          <div className="countdown-banner" aria-live="polite">
            <div>
              <p className="countdown-banner__eyebrow">
                Nächstes Event · {getCategoryLabel(nextEvent.ev.category)}
              </p>
              <p className="countdown-banner__title">{nextEvent.ev.title}</p>
              <p className="countdown-banner__meta">
                {formatFullDateDE(nextEvent.ev.date)} · {formatTime(nextEvent.ev.time)}
              </p>
            </div>
            <div className="countdown-banner__ticker">
              <div className="countdown-cell">
                <div className="countdown-cell__num">{cd.days}</div>
                <div className="countdown-cell__label">Tage</div>
              </div>
              <div className="countdown-cell">
                <div className="countdown-cell__num">{pad(cd.hours)}</div>
                <div className="countdown-cell__label">Std</div>
              </div>
              <div className="countdown-cell">
                <div className="countdown-cell__num">{pad(cd.minutes)}</div>
                <div className="countdown-cell__label">Min</div>
              </div>
              <div className="countdown-cell">
                <div className="countdown-cell__num">{pad(cd.seconds)}</div>
                <div className="countdown-cell__label">Sek</div>
              </div>
            </div>
          </div>
        )}

        <section className="calendar" aria-label="Programm-Kalender">
          <div className="calendar__top">
            <button type="button" className="calendar__nav-btn" onClick={goPrevMonth} aria-label="Vorheriger Monat">
              ‹
            </button>
            <h2 className="calendar__month">
              {MONTH_NAMES_DE[cursor.month]} {cursor.year}
            </h2>
            <button type="button" className="calendar__nav-btn" onClick={goNextMonth} aria-label="Nächster Monat">
              ›
            </button>
          </div>

          <div className="calendar__weekdays">
            {WEEKDAYS_DE_SHORT.map((w) => (
              <div key={w} className="calendar__weekday">{w}</div>
            ))}
          </div>

          <div className="calendar__grid">
            {grid.map((cell) => {
              if (cell.kind === 'pad') {
                return <div key={cell.key} className="calendar__cell calendar__cell--pad" aria-hidden="true" />
              }
              const evs = eventsByDate.get(cell.iso) ?? []
              const isToday = cell.iso === toISODate(today)
              const hasEvent = evs.length > 0
              const isSelected = selected !== null && selected.date === cell.iso
              const className = [
                'calendar__cell',
                'calendar__cell--day',
                isToday ? 'calendar__cell--today' : '',
                hasEvent ? 'calendar__cell--has-event' : '',
                isSelected ? 'calendar__cell--selected' : '',
              ].filter(Boolean).join(' ')
              return (
                <button
                  key={cell.key}
                  type="button"
                  className={className}
                  onClick={() => {
                    if (hasEvent) setSelected(evs[0] ?? null)
                  }}
                  disabled={!hasEvent}
                  aria-label={
                    hasEvent
                      ? `${formatFullDateDE(cell.iso)}, ${evs.length} Event${evs.length > 1 ? 's' : ''}`
                      : formatFullDateDE(cell.iso)
                  }
                >
                  <span className="calendar__cell-num">{cell.day}</span>
                  {hasEvent && (
                    <span className="calendar__dots" aria-hidden="true">
                      {evs.slice(0, 3).map((e) => (
                        <span
                          key={e.id}
                          className={`calendar__dot${e.category === 'gastauftritt' ? ' calendar__dot--gast' : ''}`}
                        />
                      ))}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </section>

        {selected && (
          <article className="event-detail" aria-live="polite">
            <span className="event-detail__category">{getCategoryLabel(selected.category)}</span>
            <h3 className="event-detail__title">{selected.title}</h3>
            <p className="event-detail__when">
              {formatFullDateDE(selected.date)} · {formatTime(selected.time)}
            </p>
            <p className="event-detail__body">{selected.description}</p>
            <button type="button" className="event-detail__close" onClick={() => setSelected(null)}>
              Schließen
            </button>
          </article>
        )}

        <section className="upcoming-list" aria-label="Kommende Events">
          <h2 className="upcoming-list__heading">Kommende Termine</h2>
          {upcoming.length === 0 && (
            <p style={{ color: C.textMuted, fontSize: 14 }}>Aktuell keine weiteren Termine geplant.</p>
          )}
          {upcoming.slice(0, 8).map(({ ev, dt }) => {
            const dayNum = dt.getDate()
            const monShort = MONTH_NAMES_DE[dt.getMonth()].slice(0, 3)
            return (
              <button
                key={ev.id}
                type="button"
                className="upcoming-list__item"
                onClick={() => setSelected(ev)}
              >
                <div className="upcoming-list__date" aria-hidden="true">
                  <div className="upcoming-list__date-day">{dayNum}</div>
                  <div className="upcoming-list__date-mon">{monShort}</div>
                </div>
                <div className="upcoming-list__body">
                  <p className="upcoming-list__cat">{getCategoryLabel(ev.category)}</p>
                  <p className="upcoming-list__title">{ev.title}</p>
                  <p className="upcoming-list__when">
                    {formatDateDE(ev.date)} · {formatTime(ev.time)}
                  </p>
                </div>
              </button>
            )
          })}
        </section>
      </div>
    </main>
  )
}
