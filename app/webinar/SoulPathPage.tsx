import Link from 'next/link'
import './webinar-ui.css'
import SoulPathVideo from './SoulPathVideo'
import SoulPathPhoto from './SoulPathPhoto'
import { fetchWebinarSnapshot } from '@/lib/webinar'

export const metadata = {
  title: 'Soul Path Webinar – Kundalini Yoga Tribe',
  description:
    'Die Welt verändert sich. Dein Soul Business darf mitwachsen. 30-minütiges Webinar über Berufung, deine Gabe und wie KI dir mehr Zeit für deine eigentliche Berufung schenkt.',
  keywords:
    'Soul Path, Soul Business, KI Plattform Coaching, Kundalini Yoga Coaching, Webinar',
  alternates: { canonical: 'https://kundaliniyogatribe.de/webinar' },
  openGraph: {
    title: 'Soul Path – Die neue Ära des Soul Business',
    description:
      'Entdecke, wie du Berufung, deine einzigartige Gabe und die Möglichkeiten künstlicher Intelligenz verbindest.',
    url: 'https://kundaliniyogatribe.de/webinar',
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
  goldLight: '#E2C898',
  terracotta: '#D3BC76',
  deepBrown: '#2A1F1A',
  warmBrown: '#4A3728',
  sage: '#7A8C72',
  muted: '#8A7B72',
  white: '#FFFFFF',
}

const pillars = [
  {
    n: '01',
    title: 'Vision und Berufung entdecken.',
    text: 'Du findest heraus, was dich wirklich antreibt – jenseits von To-do-Listen und Marktlogik.',
  },
  {
    n: '02',
    title: 'Energetisches Fundament und innere Ausrichtung stärken.',
    text: 'Ein stabiles inneres Fundament trägt dich durch Phasen der Veränderung.',
  },
  {
    n: '03',
    title: 'Eine eigene KI-Soul Path-Plattform speziell für Lichtarbeiter, Coaches und Heiler nutzen.',
    text: 'Werkzeuge, die zu deiner Art zu arbeiten passen – nicht zu irgendeinem Standard-Workflow.',
  },
  {
    n: '04',
    title: 'Authentische Sichtbarkeit und effektives Kundengewinnung entwickeln.',
    text: 'Du wirst sichtbar, ohne dich verbiegen zu müssen.',
  },
  {
    n: '05',
    title: 'Marketing, Technik und Business-Prozesse intelligent vereinfachen und automatisieren.',
    text: 'Mehr Fokus auf deine eigentliche Berufung, weniger Zeit für Technik-Stress.',
  },
]

const expectations = [
  'Meine persönliche Geschichte aus 11 Jahren Selbstständigkeit.',
  'Wie wir vor drei bis vier Jahren unser Online-Business aufgebaut haben.',
  'Welche Ausreden, Ängste und technischen Hürden uns zurückgehalten haben.',
  'Wie künstliche Intelligenz unsere Arbeitsweise revolutioniert.',
  'Warum energetische, spirituelle und zwischenmenschliche Arbeit in Zukunft noch wichtiger wird.',
  'Wie du KI nutzen kannst, um mehr Zeit für deine eigentliche Berufung zu gewinnen.',
  'Meine Vision hinter Soul Path.',
]

export default async function SoulPathPage({ slotId }: { slotId?: string }) {
  // The schedule is the single source of truth: the page shows the video of
  // the webinar that is currently scheduled and playable, and nothing else.
  // With a slot id the page is pinned to exactly that slot.
  const { webinars, cta, serverNow } = await fetchWebinarSnapshot()

  const ctaUrl =
    cta?.url ||
    process.env.NEXT_PUBLIC_SOULPATH_CTA_URL ||
    'https://calendly.com/soulpathai/soul-path-coaching-kostenloses-kennenlerngesprach'
  const ctaLabel = cta?.label || 'Kostenloses Kennenlerngespräch buchen'

  return (
    <div style={{ fontFamily: "'Jost', system-ui, sans-serif", color: C.deepBrown, background: C.warmWhite }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600&family=Jost:wght@300;400;500;600&display=swap');
      `}</style>

      {/* ── Skip link (a11y) ── */}
      <a
        href="#main"
        style={{
          position: 'absolute', left: -9999, top: 0, background: C.deepBrown, color: C.warmWhite,
          padding: '12px 18px', zIndex: 200, borderRadius: 4,
        }}
      >
        Zum Inhalt springen
      </a>

      {/* ── HERO ── */}
      <section style={{ background: `linear-gradient(180deg, ${C.cream} 0%, ${C.warmWhite} 100%)`, padding: '72px 20px 56px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', textAlign: 'center' }}>
          <p
            style={{
              fontSize: 12, letterSpacing: '0.22em', textTransform: 'uppercase',
              color: C.warmBrown, margin: '0 0 22px', fontWeight: 500,
            }}
          >
            Soul Path – Die neue Ära des Soul Business
          </p>
          <h1
            style={{
              fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(38px, 6vw, 64px)',
              fontWeight: 400, lineHeight: 1.14, letterSpacing: '0.01em',
              margin: '0 auto 26px', maxWidth: 900,
            }}
          >
            Die Welt verändert sich. Dein Soul Business darf mitwachsen.
          </h1>
          <p
            style={{
              fontSize: 'clamp(16px, 2.2vw, 19px)', color: C.warmBrown, lineHeight: 1.75,
              maxWidth: 720, margin: '0 auto 44px', fontWeight: 300,
            }}
          >
            Entdecke, wie du deine Berufung, deine einzigartige Gabe und die Möglichkeiten
            künstlicher Intelligenz verbindest, um ein erfüllendes und erfolgreiches Soul Business
            aufzubauen.
          </p>

          {/* Video + CTA direkt darunter - Video nur im geplanten Zeitfenster */}
          <SoulPathVideo
            webinars={webinars}
            serverNow={serverNow}
            ctaUrl={ctaUrl}
            ctaLabel={ctaLabel}
            slotId={slotId}
          />

          <p style={{ fontSize: 13, color: C.muted, margin: '18px 0 0', lineHeight: 1.7 }}>
            Das Video ist ausschließlich während des geplanten Termins abrufbar.
          </p>
        </div>
      </section>

      {/* ── 2. WAS DICH ERWARTET ── */}
      <section style={{ background: C.white, padding: '80px 20px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <h2
            style={{
              fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(30px, 4vw, 42px)',
              fontWeight: 400, lineHeight: 1.2, margin: '0 0 40px', textAlign: 'center',
            }}
          >
            Was dich im Webinar erwartet
          </h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {expectations.map((item) => (
              <li
                key={item}
                style={{
                  display: 'flex', gap: 18, alignItems: 'flex-start',
                  padding: '18px 0', borderBottom: `1px solid ${C.sand}`,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{ color: C.gold, fontSize: 18, lineHeight: 1.6, flexShrink: 0 }}
                >
                  ✦
                </span>
                <span style={{ fontSize: 17, lineHeight: 1.7, color: C.warmBrown, fontWeight: 300 }}>
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── 3. EMOTIONALE VERBINDUNG ── */}
      <section style={{ background: C.cream, padding: '84px 20px' }}>
        <div style={{ maxWidth: 820, margin: '0 auto', textAlign: 'center' }}>
          <h2
            style={{
              fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(28px, 4vw, 40px)',
              fontWeight: 400, lineHeight: 1.25, margin: '0 0 28px',
            }}
          >
            Du bist nicht hier, um deine Tage mit Technik, Marketing und endlosen To-dos zu
            verbringen.
          </h2>
          <p style={{ fontSize: 18, lineHeight: 1.85, color: C.warmBrown, margin: 0, fontWeight: 300 }}>
            Du bist hier, um Menschen zu begleiten, Räume für Transformation zu öffnen und deine
            einzigartige Gabe in die Welt zu bringen. Die neuen Möglichkeiten der KI können dich
            dabei unterstützen, dein Business einfacher, authentischer und wirkungsvoller zu
            gestalten.
          </p>
        </div>
      </section>

      {/* ── 4. SOUL PATH / 5 SÄULEN ── */}
      <section style={{ background: C.white, padding: '80px 20px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <h2
            style={{
              fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(30px, 4vw, 44px)',
              fontWeight: 400, lineHeight: 1.2, margin: '0 0 14px', textAlign: 'center',
            }}
          >
            Deine Vision. Deine Berufung. Dein Soul Path.
          </h2>
          <p
            style={{
              textAlign: 'center', color: C.muted, fontSize: 16, lineHeight: 1.7,
              margin: '0 auto 54px', maxWidth: 620,
            }}
          >
            Soul Path ist kein weiteres Kursprogramm. Es ist eine KI-gestützte Plattform und ein
            Coaching-Raum für Menschen, die mit Kopf, Herz und Soul arbeiten.
          </p>
          <div
            style={{
              display: 'grid', gap: 28,
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            }}
          >
            {pillars.map((p) => (
              <div
                key={p.n}
                style={{
                  background: C.warmWhite, border: `1px solid ${C.sand}`, borderRadius: 10,
                  padding: '30px 26px', display: 'flex', flexDirection: 'column', gap: 12,
                }}
              >
                <span
                  style={{
                    fontFamily: "'Cormorant Garamond', serif", fontSize: 34, color: C.gold,
                    lineHeight: 1, fontWeight: 400,
                  }}
                >
                  {p.n}
                </span>
                <h3
                  style={{
                    fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 600,
                    margin: 0, lineHeight: 1.35,
                  }}
                >
                  {p.title}
                </h3>
                <p style={{ margin: 0, fontSize: 15, lineHeight: 1.75, color: C.warmBrown, fontWeight: 300 }}>
                  {p.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. ÜBER MICH ── */}
      <section style={{ background: C.cream, padding: '84px 20px' }}>
        <div
          style={{
            maxWidth: 1000, margin: '0 auto',
            display: 'grid', gap: 48, alignItems: 'center',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          }}
        >
          <SoulPathPhoto />

          <div>
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(30px, 4vw, 42px)',
                fontWeight: 400, lineHeight: 1.2, margin: '0 0 24px',
              }}
            >
              Über mich
            </h2>
            <p style={{ fontSize: 17, lineHeight: 1.85, color: C.warmBrown, margin: '0 0 18px', fontWeight: 300 }}>
              Ich bin seit 11 Jahren selbstständig Kundalini-Yoga-Lehrerin, Unternehmerin und
              Mutter von zwei wundervollen Mädchen. Ich habe große geschäftliche Erfolge erlebt,
              aber auch Phasen der Veränderung und Neuorientierung.
            </p>
            <p style={{ fontSize: 17, lineHeight: 1.85, color: C.warmBrown, margin: 0, fontWeight: 300 }}>
              Heute verbinde ich meine langjährige Erfahrung im spirituellen Online-Business mit
              den Möglichkeiten neuer Zeit, um unser Wirken zu vereinfachen und wachsen zu
              lassen.
            </p>
          </div>
        </div>
      </section>

      {/* ── 6. CTA ── */}
      <section style={{ background: C.deepBrown, padding: '84px 20px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
          <h2
            style={{
              fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(30px, 4vw, 44px)',
              fontWeight: 400, lineHeight: 1.2, margin: '0 0 24px', color: C.warmWhite,
            }}
          >
            Bist du bereit für dein nächstes Kapitel?
          </h2>
          <p
            style={{
              fontSize: 17, lineHeight: 1.85, color: '#E8DDD0', margin: '0 0 38px', fontWeight: 300,
            }}
          >
            Lass uns gemeinsam entdecken, wo du mit deinem Soul Business stehst, welche Vision in
            dir steckt und wie Soul Path oder die Soul-Path-KI-Plattform dich auf deinem Weg
            unterstützen kann.
          </p>
          <div className="kyt-btn-row">
            <a
              href={ctaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="kyt-btn kyt-btn--primary"
            >
              {ctaLabel}
            </a>
          </div>
          <p style={{ color: '#B9A995', fontSize: 14, margin: '16px 0 0', lineHeight: 1.8 }}>
            Wenn du noch nicht gebucht hast, dann{' '}
            <a
              href="/webinar-anmeldung"
              style={{ color: '#E2C898', textDecoration: 'underline' }}
            >
              hier anmelden
            </a>
            .
          </p>
          <p style={{ color: '#B9A995', fontSize: 14, margin: '16px 0 0', lineHeight: 1.7 }}>
            30 Minuten · Persönlich · Unverbindlich – mit mir persönlich
          </p>
        </div>
      </section>

      {/* ── Footer / Legal ── */}
      <footer style={{ background: '#241A15', padding: '40px 20px', textAlign: 'center' }}>
        <nav
          aria-label="Rechtliches"
          style={{ display: 'flex', gap: 26, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}
        >
          <Link
            href="/impressum"
            style={{ color: '#C9BCAC', fontSize: 14, textDecoration: 'none' }}
          >
            Impressum
          </Link>
          <Link
            href="/datenschutz"
            style={{ color: '#C9BCAC', fontSize: 14, textDecoration: 'none' }}
          >
            Datenschutzerklärung
          </Link>
        </nav>
        <p style={{ color: '#8A7B72', fontSize: 13, margin: 0, lineHeight: 1.7 }}>
          © {new Date().getFullYear()} Soul Path · Kundalini Yoga Tribe
        </p>
      </footer>
    </div>
  )
}
