import Link from 'next/link'
import './webinar-soul-business-ui.css'
import SoulBusinessVideo from './SoulBusinessVideo'
import SoulPathPhoto from '@/app/webinar/SoulPathPhoto'
import { fetchWebinarSnapshot } from '@/lib/webinar'

export const metadata = {
  title: 'Soul Business live – Die KI-Plattform für Coaches & Heiler | Soul Path',
  description:
    'Live-Webinar für Coaches, Yogalehrer und Heiler: Wie du mit der Soul-Path-KI-Plattform dein Soul Business aufbaust – Angebote, Inhalte und Kundengewinnung ohne Technik-Stress.',
  keywords:
    'Soul Business, KI Plattform Coaching, Coaches, Yogalehrer, Heiler, Soul Path, Live-Webinar',
  alternates: { canonical: 'https://kundaliniyogatribe.de/webinar-soul-business' },
  openGraph: {
    title: 'Soul Business live – Die KI-Plattform für Coaches & Heiler',
    description:
      'Live-Webinar für Coaches, Yogalehrer und Heiler: Angebote, Inhalte und Kundengewinnung ohne Technik-Stress.',
    url: 'https://kundaliniyogatribe.de/webinar-soul-business',
    type: 'website',
    locale: 'de_DE',
  },
  robots: { index: false, follow: false },
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
    title: 'Klarer positionieren statt breit verstreut arbeiten.',
    text: 'Du findest die eine Aussage, die aus dir eine feste Ansprechpartnerin macht – und nicht austauschbar wirkt.',
  },
  {
    n: '02',
    title: 'Ein Angebot, das man kaufen kann.',
    text: 'Aus „ich biete Sessions an" wird ein Paket mit Namen, Umfang und Ergebnis. Ohne Preiskampf nach unten.',
  },
  {
    n: '03',
    title: 'Inhalte, die zu deiner Arbeit passen.',
    text: 'Die KI-Plattform erzeugt Reels, Texte und Angebotsseiten in deiner Tonalität – nicht in irgendeinem Standard-Ton.',
  },
  {
    n: '04',
    title: 'Sichtbar werden, ohne dich zu verbiegen.',
    text: 'Ein System für deine Sichtbarkeit, das Energie lässt – auch wenn du nicht jeden Tag posten willst.',
  },
  {
    n: '05',
    title: 'Technik und Business-Prozesse vereinfachen.',
    text: 'Admin, Terminmanagement und Nachfassen laufen im Hintergrund. Dein Fokus bleibt bei den Menschen.',
  },
]

const expectations = [
  'Warum die meisten Coaches und Heiler mitten im eigenen Business stecken bleiben.',
  'Wie du dich in einem Satz positionierst, der wirklich Kunden anzieht.',
  'Wie ein klares Paket aussieht – mit Inhalt, Umfang und Ergebnis.',
  'Wie die Soul-Path-KI-Plattform Inhalte, Angebotsseiten und Mails in deiner Stimme erstellt.',
  'Welche vier Automationen im Alltag die meiste Zeit zurückbringen.',
  'Wie du Preise verteidigst, ohne dich rechtfertigen zu müssen.',
  'Live im Webinar: dein erstes Angebot und dein erster Post werden gebaut.',
]

const audiences = [
  {
    title: 'Für Coaches',
    text: 'Du begleitest Menschen in Veränderung – und brauchst ein System, das zu deiner Tiefe passt.',
  },
  {
    title: 'Für Yogalehrer',
    text: 'Deine Praxis lebt von Atmosphäre und Wiedererkennung. Soul Path bringt beides in dein Online-Business.',
  },
  {
    title: 'Für Heiler und energetische Arbeiten',
    text: 'Du arbeitest mit Feingefühl. Die Plattform hält deine Sprache und deine Grenzen zusammen.',
  },
]

export default async function SoulBusinessPage({
  slotId,
  token,
}: {
  slotId?: string
  token?: string
}) {
  const { webinars, cta, serverNow } = await fetchWebinarSnapshot()

  const ctaUrl =
    cta?.url ||
    process.env.NEXT_PUBLIC_SOULPATH_CTA_URL ||
    'https://calendly.com/soulpathai/soul-path-coaching-kostenloses-kennenlerngesprach'

  return (
    <div style={{ fontFamily: "'Jost', system-ui, sans-serif", color: C.deepBrown, background: C.warmWhite }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600&family=Jost:wght@300;400;500;600&display=swap');
      `}</style>

      <a
        href="#main"
        style={{
          position: 'absolute', left: -9999, top: 0, background: C.deepBrown, color: C.warmWhite,
          padding: '12px 18px', zIndex: 200, borderRadius: 4,
        }}
      >
        Zum Inhalt springen
      </a>

      {/* HERO */}
      <section id="main" style={{ background: `linear-gradient(180deg, ${C.cream} 0%, ${C.warmWhite} 100%)`, padding: '72px 20px 56px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', textAlign: 'center' }}>
          <p
            style={{
              fontSize: 12, letterSpacing: '0.22em', textTransform: 'uppercase',
              color: C.warmBrown, margin: '0 0 22px', fontWeight: 500,
            }}
          >
            Live-Webinar für Coaches · Yogalehrer · Heiler
          </p>
          <h1
            style={{
              fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(36px, 5.6vw, 60px)',
              fontWeight: 400, lineHeight: 1.14, letterSpacing: '0.01em',
              margin: '0 auto 26px', maxWidth: 880,
            }}
          >
            Soul Business ohne Technik-Stress.
          </h1>
          <p
            style={{
              fontSize: 'clamp(16px, 2.2vw, 19px)', color: C.warmBrown, lineHeight: 1.75,
              maxWidth: 720, margin: '0 auto 44px', fontWeight: 300,
            }}
          >
            Klarere Positionierung, ein Angebot, das man kaufen kann, und Inhalte, die zu deiner
            Art zu arbeiten passen. Die Soul-Path-KI-Plattform baut dir das – live im Webinar.
          </p>

          <SoulBusinessVideo
            webinars={webinars}
            serverNow={serverNow}
            ctaUrl={ctaUrl}
            slotId={slotId}
            token={token}
          />

          <p style={{ fontSize: 13, color: C.muted, margin: '18px 0 0', lineHeight: 1.7 }}>
            Das Video ist ausschließlich während des geplanten Termins abrufbar.
          </p>
        </div>
      </section>

      {/* FUER WEN */}
      <section style={{ background: C.white, padding: '80px 20px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <h2
            style={{
              fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(30px, 4vw, 42px)',
              fontWeight: 400, lineHeight: 1.2, margin: '0 0 16px', textAlign: 'center',
            }}
          >
            Für wen dieses Webinar ist
          </h2>
          <p
            style={{
              textAlign: 'center', color: C.muted, fontSize: 16, lineHeight: 1.7,
              margin: '0 auto 50px', maxWidth: 620,
            }}
          >
            Wenn du mit Kopf, Herz und Soul arbeitest und dein Business endlich auf deine Art
            tragen soll.
          </p>
          <div style={{ display: 'grid', gap: 26, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            {audiences.map((a) => (
              <div
                key={a.title}
                style={{
                  background: C.warmWhite, border: `1px solid ${C.sand}`, borderRadius: 10,
                  padding: '30px 26px', display: 'flex', flexDirection: 'column', gap: 12,
                }}
              >
                <h3
                  style={{
                    fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 600,
                    margin: 0, lineHeight: 1.3,
                  }}
                >
                  {a.title}
                </h3>
                <p style={{ margin: 0, fontSize: 15, lineHeight: 1.75, color: C.warmBrown, fontWeight: 300 }}>
                  {a.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WAS DICH ERWARTET */}
      <section style={{ background: C.cream, padding: '84px 20px' }}>
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
                <span aria-hidden="true" style={{ color: C.gold, fontSize: 18, lineHeight: 1.6, flexShrink: 0 }}>
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

      {/* 5 SAULEN */}
      <section style={{ background: C.white, padding: '80px 20px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <h2
            style={{
              fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(30px, 4vw, 44px)',
              fontWeight: 400, lineHeight: 1.2, margin: '0 0 14px', textAlign: 'center',
            }}
          >
            Dein Soul Business auf fünf Wegen leichter.
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
          <div style={{ display: 'grid', gap: 28, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
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

      {/* UEBER MICH */}
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
              den Möglichkeiten neuer Zeit, um unser Wirken zu vereinfachen und wachsen zu lassen.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: C.deepBrown, padding: '84px 20px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
          <h2
            style={{
              fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(30px, 4vw, 44px)',
              fontWeight: 400, lineHeight: 1.2, margin: '0 0 24px', color: C.warmWhite,
            }}
          >
            Bereit für dein nächstes Kapitel?
          </h2>
          <p
            style={{ fontSize: 17, lineHeight: 1.85, color: '#E8DDD0', margin: '0 0 38px', fontWeight: 300 }}
          >
            Lass uns gemeinsam entdecken, wo du mit deinem Soul Business stehst und wie Soul Path
            dich auf deinem Weg unterstützen kann.
          </p>
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
          <p style={{ color: '#B9A995', fontSize: 14, margin: '16px 0 0', lineHeight: 1.8 }}>
            Wenn du noch nicht gebucht hast, dann{' '}
            <a href="/webinar-soul-business-anmeldung" style={{ color: '#E2C898', textDecoration: 'underline' }}>
              Bitte hier zum Webinar anmelden
            </a>
            .
          </p>
          <p style={{ color: '#B9A995', fontSize: 14, margin: '16px 0 0', lineHeight: 1.7 }}>
            Live · 30 Minuten · Unverbindlich
          </p>
        </div>
      </section>

      <footer style={{ background: '#241A15', padding: '40px 20px', textAlign: 'center' }}>
        <nav
          aria-label="Rechtliches"
          style={{ display: 'flex', gap: 26, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}
        >
          <Link href="/impressum" style={{ color: '#C9BCAC', fontSize: 14, textDecoration: 'none' }}>
            Impressum
          </Link>
          <Link href="/datenschutz" style={{ color: '#C9BCAC', fontSize: 14, textDecoration: 'none' }}>
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
