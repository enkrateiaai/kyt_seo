import WebinarCheckout from './WebinarCheckout'
import './webinar-ui.css'

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

const learnings = [
  'Warum KI für Lichtarbeiter, Coaches und Heiler ein Gamechanger ist – und was das konkret bedeutet.',
  'Wie du mit KI-Tools 10–15 Stunden pro Woche zurückgewinnst, ohne deine Authentizität zu verlieren.',
  'Welche einfachen Automatisierungen dein Marketing, deine Kommunikation und dein Business sofort entlasten.',
  'Wie du eine eigene KI-Plattform aufbaust, die zu deiner Arbeitsweise passt – ganz ohne Programmierkenntnisse.',
  'Meine persönlichen Erfahrungen: Was hat funktioniert, was nicht – und was ich heute anders machen würde.',
]

const isFor = [
  'Spirituelle UnternehmerInnen, die ihr Business skalieren wollen, ohne sich zu verbiegen',
  'Coaches, Heilerinnen und Yogalehrerinnen, die von Technik-Stress genervt sind',
  'Menschen, die KI bisher skeptisch betrachten und endlich einen klaren Einstieg wollen',
  'Alle, die mehr Zeit für das haben wollen, was wirklich zählt: die eigentliche Berufung',
]

export default function AIWebinarLanding({ invalidToken = false }: { invalidToken?: boolean }) {
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

      {/* ── HERO ── */}
      <section
        id="main"
        style={{ background: `linear-gradient(180deg, ${C.cream} 0%, ${C.warmWhite} 100%)`, padding: '72px 20px 64px' }}
      >
        <div style={{ maxWidth: 1080, margin: '0 auto', textAlign: 'center' }}>
          <p style={{
            fontSize: 12, letterSpacing: '0.22em', textTransform: 'uppercase',
            color: C.warmBrown, margin: '0 0 20px', fontWeight: 500,
          }}>
            Kundalini Yoga Tribe · AI Webinar
          </p>
          <h1 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 'clamp(36px, 6vw, 62px)',
            fontWeight: 400, lineHeight: 1.14, letterSpacing: '0.01em',
            margin: '0 auto 24px', maxWidth: 860,
          }}>
            KI für dein Soul Business – konkret, praxisnah und ohne Technik-Stress.
          </h1>
          <p style={{
            fontSize: 'clamp(16px, 2.2vw, 19px)', color: C.warmBrown, lineHeight: 1.75,
            maxWidth: 680, margin: '0 auto 16px', fontWeight: 300,
          }}>
            In diesem 60-minütigen Webinar zeige ich dir, wie du KI-Tools sinnvoll in dein spirituelles
            Business integrierst – und mehr Zeit für das gewinnst, was dir wirklich wichtig ist.
          </p>
          <p style={{
            fontSize: 15, color: C.muted, lineHeight: 1.6, margin: '0 auto 44px',
          }}>
            Einmaliger Zugang · 29&nbsp;€ · Link sofort per E-Mail
          </p>

          {/* Price pill */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            background: C.deepBrown, color: C.warmWhite,
            padding: '10px 24px', borderRadius: 999, marginBottom: 48,
          }}>
            <span style={{ fontSize: 24, fontWeight: 600 }}>29 €</span>
            <span style={{ fontSize: 14, opacity: 0.75 }}>einmalig</span>
          </div>

          {invalidToken && (
            <p style={{
              background: '#FDF0EE', border: '1px solid #E8C0BB', borderRadius: 8,
              padding: '12px 20px', color: '#8B3030', fontSize: 14, maxWidth: 480, margin: '0 auto 32px',
            }}>
              Dieser Zugangslink ist ungültig oder abgelaufen. Melde dich neu an, um einen frischen Link zu erhalten.
            </p>
          )}

          {/* Scroll anchor button */}
          <div>
            <a
              href="#anmeldung"
              style={{
                display: 'inline-block',
                background: C.terracotta, color: C.deepBrown,
                textDecoration: 'none', padding: '16px 44px',
                borderRadius: 999, fontSize: 16, fontWeight: 600,
                letterSpacing: '0.03em',
              }}
            >
              Jetzt anmelden · 29&nbsp;€
            </a>
          </div>
        </div>
      </section>

      {/* ── WAS DICH ERWARTET ── */}
      <section style={{ background: C.white, padding: '80px 20px' }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          <h2 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 'clamp(28px, 4vw, 42px)',
            fontWeight: 400, lineHeight: 1.2, margin: '0 0 40px', textAlign: 'center',
          }}>
            Das lernst du im Webinar
          </h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {learnings.map((item) => (
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

      {/* ── FÜR WEN ── */}
      <section style={{ background: C.cream, padding: '80px 20px' }}>
        <div style={{ maxWidth: 820, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 'clamp(28px, 4vw, 40px)',
            fontWeight: 400, lineHeight: 1.25, margin: '0 0 40px',
          }}>
            Für wen ist dieses Webinar?
          </h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, textAlign: 'left', display: 'inline-block' }}>
            {isFor.map((item) => (
              <li key={item} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 18 }}>
                <span style={{ color: C.gold, fontSize: 18, lineHeight: 1.6, flexShrink: 0 }}>✦</span>
                <span style={{ fontSize: 17, lineHeight: 1.7, color: C.warmBrown, fontWeight: 300 }}>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── ÜBER MICH ── */}
      <section style={{ background: C.white, padding: '80px 20px' }}>
        <div style={{ maxWidth: 820, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 'clamp(28px, 4vw, 40px)',
            fontWeight: 400, lineHeight: 1.2, margin: '0 0 24px',
          }}>
            Über mich
          </h2>
          <p style={{ fontSize: 17, lineHeight: 1.85, color: C.warmBrown, maxWidth: 640, margin: '0 auto 18px', fontWeight: 300 }}>
            Ich bin Charan Amrit Kaur – Kundalini-Yoga-Lehrerin, Unternehmerin und Mutter von zwei
            Mädchen. Seit 11 Jahren bin ich selbstständig und habe in dieser Zeit erlebt, wie
            transformierend es ist, wenn man Technik als Verbündete statt als Feind begreift.
          </p>
          <p style={{ fontSize: 17, lineHeight: 1.85, color: C.warmBrown, maxWidth: 640, margin: '0 auto', fontWeight: 300 }}>
            Heute teile ich mein Wissen über KI mit spirituellen Unternehmern – praxisnah,
            ehrlich und mit Blick auf das, was wirklich zählt.
          </p>
        </div>
      </section>

      {/* ── ANMELDUNG / CHECKOUT ── */}
      <section
        id="anmeldung"
        style={{ background: C.deepBrown, padding: '84px 20px' }}
      >
        <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 'clamp(28px, 4vw, 40px)',
            fontWeight: 400, lineHeight: 1.2,
            margin: '0 0 12px', color: C.warmWhite,
          }}>
            Jetzt Zugang sichern
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.75, color: '#E8DDD0', margin: '0 0 10px', fontWeight: 300 }}>
            60 Minuten · Einmalzahlung · Link sofort per E-Mail
          </p>
          <p style={{ fontSize: 28, fontWeight: 600, color: C.goldLight, margin: '0 0 36px' }}>
            29&nbsp;€
          </p>

          <div style={{
            background: C.warmWhite, borderRadius: 16, padding: '36px 32px',
          }}>
            <WebinarCheckout />
          </div>

          <p style={{ color: '#8A7B72', fontSize: 13, margin: '20px 0 0', lineHeight: 1.7 }}>
            Bezahlung über PayPal · Du bekommst sofort deinen persönlichen Zugangslink per E-Mail.
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: '#241A15', padding: '40px 20px', textAlign: 'center' }}>
        <nav
          aria-label="Rechtliches"
          style={{ display: 'flex', gap: 26, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}
        >
          <a href="/impressum" style={{ color: '#C9BCAC', fontSize: 14, textDecoration: 'none' }}>
            Impressum
          </a>
          <a href="/datenschutz" style={{ color: '#C9BCAC', fontSize: 14, textDecoration: 'none' }}>
            Datenschutzerklärung
          </a>
        </nav>
        <p style={{ color: '#8A7B72', fontSize: 13, margin: 0, lineHeight: 1.7 }}>
          © {new Date().getFullYear()} Kundalini Yoga Tribe
        </p>
      </footer>
    </div>
  )
}
