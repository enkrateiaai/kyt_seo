'use client'

import Link from 'next/link'

const TELEGRAM_URL = process.env.NEXT_PUBLIC_TELEGRAM_URL || 'https://t.me/kundaliniyogatribe'
const TRIBE_URL = 'https://www.charan-amrit-kaur.de/yoga-tribe/'

export default function JoinPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#fbf8f1', color: '#2a2520', fontFamily: 'sans-serif' }}>
      {/* Header */}
      <header style={{ textAlign: 'center', padding: '56px 24px 40px' }}>
        <p style={{
          fontSize: '11px',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: '#b89654',
          marginBottom: '12px',
        }}>
          Kundalini Yoga Tribe
        </p>
        <h1 style={{
          fontFamily: 'Georgia, serif',
          fontSize: 'clamp(28px, 5vw, 44px)',
          fontWeight: 300,
          lineHeight: 1.2,
          color: '#2a2520',
          margin: '0 0 16px',
        }}>
          Wähle Deinen Weg in den Tribe
        </h1>
        <p style={{
          fontSize: '17px',
          lineHeight: 1.7,
          color: '#6b5d4f',
          maxWidth: '480px',
          margin: '0 auto',
        }}>
          Eine kurze Kundalini-Praxis für jeden Tag. Kriyas, Meditationen und Impulse für Dein Leben.
        </p>
      </header>

      {/* Two doors */}
      <main style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '24px',
        justifyContent: 'center',
        padding: '0 24px 64px',
        maxWidth: '960px',
        margin: '0 auto',
      }}>
        {/* Door 1 – Telegram */}
        <div style={{
          flex: '1 1 280px',
          maxWidth: '420px',
          background: '#fff',
          border: '1px solid #e8e0d0',
          borderRadius: '16px',
          padding: '40px 36px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: '#f0ebe0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
          }}>
            ✈️
          </div>
          <div>
            <p style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#b89654', marginBottom: '8px' }}>
              Sofort beitreten
            </p>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '24px', fontWeight: 300, margin: '0 0 12px', color: '#2a2520' }}>
              Telegram Community
            </h2>
            <p style={{ fontSize: '15px', lineHeight: 1.7, color: '#6b5d4f', margin: 0 }}>
              Tritt unserer Telegram-Community bei und erhalte tägliche Kriyas, kurze Impulse und Gemeinschaft — direkt auf Dein Handy.
            </p>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {['Tägliche Praxis-Impulse', 'Direkter Kontakt zur Community', 'Eine echte, lebendige Community'].map(item => (
              <li key={item} style={{ fontSize: '14px', color: '#6b5d4f', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#b89654', fontSize: '16px' }}>✓</span> {item}
              </li>
            ))}
          </ul>
          <a
            href={TELEGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block',
              textAlign: 'center',
              background: '#2a2520',
              color: '#fbf8f1',
              textDecoration: 'none',
              padding: '14px 28px',
              borderRadius: '100px',
              fontSize: '15px',
              fontWeight: 500,
              letterSpacing: '0.02em',
              marginTop: 'auto',
            }}
          >
            Jetzt beitreten →
          </a>
        </div>

        {/* Door 2 – Email */}
        <div style={{
          flex: '1 1 280px',
          maxWidth: '420px',
          background: '#fff',
          border: '1px solid #b89654',
          borderRadius: '16px',
          padding: '40px 36px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          position: 'relative',
        }}>
          {/* Badge */}
          <div style={{
            position: 'absolute',
            top: '-14px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#b89654',
            color: '#fbf8f1',
            fontSize: '11px',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            padding: '5px 16px',
            borderRadius: '100px',
            whiteSpace: 'nowrap',
          }}>
            Kostenloses Programm
          </div>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: '#f7f2e8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
          }}>
            🌙
          </div>
          <div>
            <p style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#b89654', marginBottom: '8px' }}>
              7-Tage-Kundalini-Reset
            </p>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '24px', fontWeight: 300, margin: '0 0 12px', color: '#2a2520' }}>
              Teste den Tribe 7 Tage kostenlos
            </h2>
            <p style={{ fontSize: '15px', lineHeight: 1.7, color: '#6b5d4f', margin: 0 }}>
              Eine kurze Kundalini-Praxis jeden Tag — dazu tägliche Live-Sessions und die ganze Community. Teste den Tribe eine Woche lang, ohne Verpflichtung.
            </p>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {['7 begleitete Kriyas (je ca. 15 Min.)', 'Tägliche Live-Session zum Mitmachen', 'Danach: monatlicher Newsletter'].map(item => (
              <li key={item} style={{ fontSize: '14px', color: '#6b5d4f', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#b89654', fontSize: '16px' }}>✓</span> {item}
              </li>
            ))}
          </ul>

          <a
            href={TRIBE_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block',
              textAlign: 'center',
              background: '#b89654',
              color: '#fff',
              textDecoration: 'none',
              padding: '14px 28px',
              borderRadius: '100px',
              fontSize: '15px',
              fontWeight: 500,
              letterSpacing: '0.02em',
              marginTop: 'auto',
            }}
          >
            7 Tage kostenlos testen →
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '24px',
        borderTop: '1px solid #e8e0d0',
        fontSize: '12px',
        color: '#9b8e7e',
      }}>
        <p style={{ margin: '0 0 8px' }}>© {new Date().getFullYear()} Kundalini Yoga Tribe · Sat Nam</p>
        <p style={{ margin: 0, display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/impressum" style={{ color: '#9b8e7e', textDecoration: 'underline' }}>Impressum</Link>
          <Link href="/datenschutz" style={{ color: '#9b8e7e', textDecoration: 'underline' }}>Datenschutz</Link>
        </p>
      </footer>
    </div>
  )
}
