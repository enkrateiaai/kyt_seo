import Link from 'next/link'
import '../webinar/webinar-ui.css'
import AnmeldungClient from './AnmeldungClient'
import { fetchWebinarSnapshot, pickUpcomingSlots } from '@/lib/webinar'
import { formatSlotDate } from '@/lib/webinarMail'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Webinar anmelden – Soul Path | Kundalini Yoga Tribe',
  description:
    'Wähle deinen Termin für das Soul Path Webinar. Nach der Anmeldung bekommst du deinen persönlichen Link - das Video ist nur während des Termins verfügbar.',
  keywords: 'Soul Path, Webinar anmelden, Soul Business, KI Plattform Coaching',
  alternates: { canonical: 'https://kundaliniyogatribe.de/webinar-anmeldung' },
  openGraph: {
    title: 'Soul Path Webinar – Termin wählen',
    description: 'Wähle deinen Termin und erhalte deinen persönlichen Zugangslink.',
    url: 'https://kundaliniyogatribe.de/webinar-anmeldung',
    type: 'website',
    locale: 'de_DE',
  },
  robots: { index: true, follow: true },
}

const C = {
  cream: '#F5F0E8',
  warmWhite: '#FAF7F2',
  sand: '#E8DDD0',
  gold: '#C9A96E',
  terracotta: '#D3BC76',
  deepBrown: '#2A1F1A',
  warmBrown: '#4A3728',
  muted: '#8A7B72',
  white: '#FFFFFF',
}

export default async function WebinarAnmeldungPage() {
  // The slots come from the same studio schedule the webinar page uses.
  const { webinars, serverNow } = await fetchWebinarSnapshot()
  const slots = pickUpcomingSlots(webinars, serverNow).map((slot) => ({
    id: slot.id,
    title: slot.title || 'Soul Path Webinar',
    when: formatSlotDate(slot.startsAt),
    startsAt: slot.startsAt,
  }))

  return (
    <div style={{ fontFamily: "'Jost', system-ui, sans-serif", color: C.deepBrown, background: C.warmWhite }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600&family=Jost:wght@300;400;500;600&display=swap');
      `}</style>

      <section style={{ background: `linear-gradient(180deg, ${C.cream} 0%, ${C.warmWhite} 100%)`, padding: '76px 20px 52px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
          <p
            style={{
              fontSize: 12, letterSpacing: '0.22em', textTransform: 'uppercase',
              color: C.warmBrown, margin: '0 0 20px', fontWeight: 500,
            }}
          >
            Soul Path Webinar
          </p>
          <h1
            style={{
              fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(32px, 5vw, 52px)',
              fontWeight: 400, lineHeight: 1.18, margin: '0 auto 22px', maxWidth: 700,
            }}
          >
            Sichere dir deinen Termin
          </h1>
          <p
            style={{
              fontSize: 'clamp(16px, 2.2vw, 18px)', color: C.warmBrown,
              maxWidth: 620, margin: '0 auto', fontWeight: 300, lineHeight: 1.8,
            }}
          >
            Gib deine E-Mail-Adresse ein, wähle deinen Termin und erhalte deinen
            persönlichen Link. Das Video ist ausschließlich während des geplanten Termins
            abrufbar.
          </p>
        </div>
      </section>

      <section style={{ background: C.white, padding: '64px 20px 76px' }}>
        {slots.length === 0 ? (
          <div style={{ maxWidth: 620, margin: '0 auto', textAlign: 'center' }}>
            <p
              style={{
                fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(24px, 4vw, 32px)',
                color: C.deepBrown, margin: '0 0 14px', lineHeight: 1.3,
              }}
            >
              Aktuell ist kein Termin geplant
            </p>
            <p style={{ fontSize: 16, lineHeight: 1.8, color: C.muted, margin: '0 0 26px' }}>
              Schau bald wieder vorbei - neue Termine werden hier angekündigt.
            </p>
            <Link href="/webinar" className="kyt-btn kyt-btn--secondary">
              Zur Webinar-Seite
            </Link>
          </div>
        ) : (
          <AnmeldungClient slots={slots} />
        )}
      </section>

      <section style={{ background: C.cream, padding: '56px 20px' }}>
        <div style={{ maxWidth: 620, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: 14, lineHeight: 1.8, color: C.muted, margin: '0 0 18px' }}>
            Du möchtest mehr über Soul Path erfahren?
          </p>
          <Link
            href="/webinar"
            style={{ color: C.warmBrown, fontSize: 14, textDecoration: 'underline' }}
          >
            Zur Webinar-Seite
          </Link>
        </div>
      </section>

      <footer style={{ background: '#241A15', padding: '34px 20px', textAlign: 'center' }}>
        <nav aria-label="Rechtliches" style={{ display: 'flex', gap: 26, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
          <Link href="/impressum" style={{ color: '#C9BCAC', fontSize: 14, textDecoration: 'none' }}>
            Impressum
          </Link>
          <Link href="/datenschutz" style={{ color: '#C9BCAC', fontSize: 14, textDecoration: 'none' }}>
            Datenschutz
          </Link>
        </nav>
        <p style={{ color: '#8A7B72', fontSize: 13, margin: 0, lineHeight: 1.7 }}>
          © {new Date().getFullYear()} Soul Path · Kundalini Yoga Tribe
        </p>
      </footer>
    </div>
  )
}
