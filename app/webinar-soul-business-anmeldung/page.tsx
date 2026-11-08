import Link from 'next/link'
import '../webinar-anmeldung/webinar-anmeldung.css'
import AnmeldungClient from '../webinar-anmeldung/AnmeldungClient'
import { fetchWebinarSnapshot, pickUpcomingSlots } from '@/lib/webinar'
import { SERIES_TIME_ZONE, zonedDayKey, zonedTimeLabel } from '@/lib/webinarSeries'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Soul Business Webinar anmelden – Soul Path | Kundalini Yoga Tribe',
  description:
    'Wähle deinen Termin für das Soul Business Live-Webinar. Nach der Anmeldung bekommst du deinen persönlichen Link per Mail - das Video ist nur während des Termins verfügbar.',
  keywords: 'Soul Business, Webinar anmelden, Coaches, Yogalehrer, Heiler, KI Plattform',
  alternates: { canonical: 'https://kundaliniyogatribe.de/webinar-soul-business-anmeldung' },
  openGraph: {
    title: 'Soul Business Webinar – Termin wählen',
    description: 'Wähle deinen Termin und erhalte deinen persönlichen Zugangslink.',
    url: 'https://kundaliniyogatribe.de/webinar-soul-business-anmeldung',
    type: 'website',
    locale: 'de_DE',
  },
  robots: { index: false, follow: false },
}

// How many days of appointments are shown.
const VISIBLE_DAYS = 7

const dayFormatter = new Intl.DateTimeFormat('de-DE', {
  timeZone: SERIES_TIME_ZONE,
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})

const fullFormatter = new Intl.DateTimeFormat('de-DE', {
  timeZone: SERIES_TIME_ZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

// 'Mi., 4. Nov.' -> 'Mi 4. Nov'
function compactDay(date: Date): string {
  const formatted = dayFormatter.format(date)
  const [weekday, rest] = formatted.split(', ')
  if (!rest) return formatted
  return `${weekday.replace(/\.$/, '')} ${rest.replace(/\.$/, '')}`
}

export default async function SoulBusinessAnmeldungPage() {
  const { webinars, serverNow } = await fetchWebinarSnapshot()
  const upcoming = pickUpcomingSlots(webinars, serverNow)

  const dayKeys: string[] = []
  for (const slot of upcoming) {
    if (!slot.startsAt) continue
    const key = zonedDayKey(Date.parse(slot.startsAt))
    if (!dayKeys.includes(key)) dayKeys.push(key)
  }
  const visibleKeys = dayKeys.slice(0, VISIBLE_DAYS)

  const todayKey = zonedDayKey(serverNow)
  const tomorrowKey = zonedDayKey(serverNow + 24 * 60 * 60 * 1000)

  const days = visibleKeys.map((key) => {
    const slots = upcoming
      .filter((slot) => slot.startsAt && zonedDayKey(Date.parse(slot.startsAt)) === key)
      .map((slot) => ({
        id: slot.id,
        title: slot.title || 'Soul Business Webinar',
        time: slot.startsAt ? zonedTimeLabel(Date.parse(slot.startsAt)) : '--:--',
        startsAt: slot.startsAt,
      }))
    const representative = slots.find((slot) => slot.startsAt)?.startsAt ?? null
    return {
      key,
      label: representative ? compactDay(new Date(representative)) : key,
      full: representative ? fullFormatter.format(new Date(representative)) : key,
      relative: key === todayKey ? 'Heute' : key === tomorrowKey ? 'Morgen' : '',
      slots,
    }
  })

  const slotCount = days.reduce((sum, day) => sum + day.slots.length, 0)
  const hasSlots = slotCount > 0

  const durationSeconds = upcoming.reduce(
    (max, slot) => (slot.duration > max ? slot.duration : max),
    0,
  )
  const durationMinutes = durationSeconds > 0 ? Math.round(durationSeconds / 60) : 0

  const facts: string[] = []
  if (durationMinutes > 0) {
    facts.push(`Dauer: rund ${durationMinutes} Minuten`)
  }
  facts.push('Alle Zeiten in Berliner Zeit')
  facts.push('Live – nur während der geplanten Spielzeit')

  return (
    <div className="anm">
      <div className="anm-top">
        <span className="anm-top-brand">Kundalini Yoga Tribe</span>
        <span className="anm-top-page">Soul Business Webinar</span>
      </div>

      <main className="anm-main">
        <div className="anm-left">
          <div className="anm-intro">
            <h1 className="anm-title">
              {hasSlots ? 'Wähle deinen Termin' : 'Webinar anmelden'}
            </h1>
            <p className="anm-lead">
              {hasSlots ? (
                <>
                  Das Soul Business Webinar läuft live und nur während der geplanten Spielzeit.
                  Wähle eine Uhrzeit und trag deine E-Mail ein – den Zugangslink bekommst du per
                  Mail.
                </>
              ) : (
                <>
                  Das Soul Business Webinar läuft live und nur während der geplanten Spielzeit.
                  Sobald der nächste Termin feststeht, kannst du dich hier anmelden.
                </>
              )}
            </p>
          </div>

          <div className="anm-notes">
            <ul className="anm-facts">
              {facts.map((fact) => (
                <li key={fact}>{fact}</li>
              ))}
            </ul>

            <p className="anm-more">
              Noch Fragen? <Link href="/webinar-soul-business">Zur Webinar-Seite</Link>
            </p>
          </div>
        </div>

        <div className="anm-form-wrap">
          {days.length === 0 ? (
            <div className="anm-empty">
              <h2 className="anm-empty-title">Aktuell ist kein Termin geplant</h2>
              <p className="anm-empty-text">
                Schau bald wieder vorbei – neue Termine werden hier angekündigt.
              </p>
              <p className="anm-more">
                <Link href="/webinar-soul-business">Zur Webinar-Seite</Link>
              </p>
            </div>
          ) : (
            <AnmeldungClient days={days} />
          )}
        </div>
      </main>

      <footer className="anm-foot">
        <div className="anm-foot-in">
          <span>© {new Date().getFullYear()} Soul Path · Kundalini Yoga Tribe</span>
          <nav aria-label="Rechtliches">
            <Link href="/impressum">Impressum</Link>
            <Link href="/datenschutz">Datenschutz</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
