export const metadata = {
  title: 'Hilfe zur Anmeldung – Kundalini Yoga Tribe',
  description: 'Erklärung zu Einladung, Passwort, Google-Login, Reset und Profil beim Kundalini Yoga Tribe.',
  robots: 'noindex',
}

const C = {
  bg: '#FAF7F2',
  card: '#FFFDF8',
  text: '#2C2416',
  textSoft: '#6B5D4F',
  textMuted: '#9B8E7E',
  accent: '#D3BC76',
  border: '#DDD5C8',
}

const sectionStyle = {
  marginTop: '32px',
  paddingTop: '24px',
  borderTop: `1px solid ${C.border}`,
}

export default function HilfeAnmeldungPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: C.bg,
        color: C.text,
        fontFamily: "'DM Sans', sans-serif",
        padding: '48px 24px 80px',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=DM+Sans:wght@300;400;500&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        a { color: inherit; }
      `}</style>

      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <a
          href="/anmeldung"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            color: C.textSoft,
            textDecoration: 'none',
            fontSize: 14,
            marginBottom: 28,
          }}
        >
          ← Zurück zur Anmeldung
        </a>

        <section
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 18,
            padding: '36px 28px',
            boxShadow: '0 18px 60px rgba(44,36,22,0.08)',
          }}
        >
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: '50%',
              border: `1px solid ${C.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              marginBottom: 20,
            }}
          >
            ◯
          </div>

          <p
            style={{
              margin: '0 0 10px',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: C.textMuted,
              fontSize: 12,
            }}
          >
            Hilfe zur Anmeldung
          </p>

          <h1
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 'clamp(2.2rem, 5vw, 3.2rem)',
              fontWeight: 400,
              lineHeight: 1.05,
              margin: '0 0 18px',
            }}
          >
            So funktionieren Einladung, Passwort und Login
          </h1>

          <p
            style={{
              margin: 0,
              maxWidth: 700,
              lineHeight: 1.8,
              fontSize: 17,
              color: C.textSoft,
            }}
          >
            Diese Seite erklärt den Anmeldeprozess beim Kundalini Yoga Tribe in einfachen
            Schritten. Besonders wichtig: Passwörter werden aus Sicherheitsgründen nie per
            E-Mail verschickt.
          </p>

          <div style={sectionStyle}>
            <h2 style={headingStyle}>1. Anmeldung immer mit der eingeladenen E-Mail-Adresse</h2>
            <p style={paragraphStyle}>
              Wenn du eine Einladung erhalten hast, melde dich bitte mit genau der
              E-Mail-Adresse an, an die diese Einladung geschickt wurde. Nur so kann dein
              Zugang korrekt erkannt und dem richtigen Mitgliederstatus zugeordnet werden.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={headingStyle}>2. Du kannst dich auf zwei Arten anmelden</h2>
            <p style={paragraphStyle}>
              Du kannst entweder den Google-Login nutzen oder dich direkt mit E-Mail und
              Passwort anmelden.
            </p>
            <div style={gridStyle}>
              <div style={infoCardStyle}>
                <h3 style={subheadingStyle}>Mit Google</h3>
                <p style={paragraphStyle}>
                  Wenn du dich über Google anmeldest, wird dein Google-Konto für die
                  Anmeldung verwendet. In diesem Fall vergibst du auf der Website kein
                  separates Passwort.
                </p>
              </div>
              <div style={infoCardStyle}>
                <h3 style={subheadingStyle}>Direkt mit E-Mail</h3>
                <p style={paragraphStyle}>
                  Wenn du dich direkt mit E-Mail anmeldest, legst du dein gewünschtes
                  Passwort selbst fest. Dieses Passwort kennst nur du.
                </p>
              </div>
            </div>
          </div>

          <div style={sectionStyle}>
            <h2 style={headingStyle}>3. Passwörter werden nie per E-Mail verschickt</h2>
            <p style={paragraphStyle}>
              Das ist normal und entspricht dem üblichen Sicherheitsstandard. Ein seriöses
              System schickt kein Passwort offen per Mail. Deshalb ist es korrekt, wenn du
              in Einladungs- oder Willkommensmails kein Passwort findest.
            </p>
            <div
              style={{
                marginTop: 18,
                padding: '16px 18px',
                borderRadius: 12,
                background: 'rgba(211,188,118,0.16)',
                border: `1px solid rgba(211,188,118,0.38)`,
                color: C.text,
                lineHeight: 1.7,
              }}
            >
              Merksatz: Kein Passwort in der E-Mail ist ein Sicherheitsmerkmal, kein Fehler.
            </div>
          </div>

          <div style={sectionStyle}>
            <h2 style={headingStyle}>4. Passwort vergessen?</h2>
            <p style={paragraphStyle}>
              Wenn du dein Passwort vergessen hast, kannst du jederzeit einen sicheren
              Rückweg nutzen. In der Regel gibt es dafür zwei Möglichkeiten:
            </p>
            <ul style={listStyle}>
              <li>Du setzt dein Passwort zurück und vergibst ein neues.</li>
              <li>Du lässt dir einen Einmal-Code schicken, ohne dein Passwort dauerhaft zu ändern.</li>
            </ul>
            <p style={paragraphStyle}>
              Auch in diesem Fall wird dir nie das alte Passwort zugesendet.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={headingStyle}>5. Willkommensmail</h2>
            <p style={paragraphStyle}>
              Nach der Registrierung solltest du eine Willkommensmail erhalten. Diese dient
              zur Begrüßung und Orientierung. Auch dort wird kein Passwort enthalten sein.
            </p>
            <p style={{ ...paragraphStyle, marginBottom: 0 }}>
              Hinweis: Die Willkommensmail ist aktuell technisch noch nicht zuverlässig
              aktiv, aber auch in Zukunft wird sie kein Passwort verschicken.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={headingStyle}>6. Passwort später im Profil ändern</h2>
            <p style={paragraphStyle}>
              Sobald du eingeloggt bist, kannst du dein Passwort jederzeit selbst in deinem
              Profil ändern. Damit bleibt dein Zugang vollständig unter deiner eigenen
              Kontrolle.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={headingStyle}>Kurzfassung</h2>
            <ul style={listStyle}>
              <li>Bitte immer mit der eingeladenen E-Mail-Adresse anmelden.</li>
              <li>Google-Login nutzt dein Google-Konto.</li>
              <li>Direkter Login nutzt ein Passwort, das du selbst festlegst.</li>
              <li>Passwörter werden nie per E-Mail verschickt.</li>
              <li>Bei Passwortverlust nutzt du Reset oder einen Einmal-Code.</li>
              <li>Im Profil kannst du dein Passwort jederzeit ändern.</li>
            </ul>
          </div>

          <div
            style={{
              ...sectionStyle,
              display: 'flex',
              gap: 12,
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <a href="/anmeldung" style={primaryButtonStyle}>
              Zur Anmeldung
            </a>
            <a href="https://kundaliniyogatribe.de/" style={secondaryButtonStyle}>
              Zur Website
            </a>
          </div>
        </section>
      </div>
    </main>
  )
}

const headingStyle = {
  fontFamily: "'Cormorant Garamond', serif",
  fontSize: 30,
  fontWeight: 400,
  lineHeight: 1.15,
  margin: '0 0 10px',
}

const subheadingStyle = {
  fontFamily: "'Cormorant Garamond', serif",
  fontSize: 24,
  fontWeight: 400,
  margin: '0 0 8px',
}

const paragraphStyle = {
  margin: '0 0 14px',
  lineHeight: 1.8,
  fontSize: 16,
  color: C.textSoft,
}

const listStyle = {
  margin: '10px 0 0 0',
  paddingLeft: 22,
  color: C.textSoft,
  lineHeight: 1.9,
}

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: 16,
  marginTop: 14,
}

const infoCardStyle = {
  padding: '18px 18px 16px',
  border: `1px solid ${C.border}`,
  borderRadius: 14,
  background: '#FFFEFB',
}

const primaryButtonStyle = {
  display: 'inline-block',
  padding: '12px 24px',
  borderRadius: 999,
  background: C.accent,
  color: C.text,
  textDecoration: 'none',
  fontWeight: 500,
}

const secondaryButtonStyle = {
  display: 'inline-block',
  padding: '12px 24px',
  borderRadius: 999,
  border: `1px solid ${C.border}`,
  color: C.textSoft,
  textDecoration: 'none',
  fontWeight: 500,
}
