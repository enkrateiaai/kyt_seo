import Link from 'next/link'

// Shown on the former free registration pages.
//
// The webinar is a paid product now (29 EUR, checkout on /webinar), so there
// is no free registration any more. The pages stay alive as a signpost, so
// old links and bookmarks do not dead-end.
export default function PaidWebinarNotice({
  title = 'Soul Path Webinar',
  eyebrow = 'Kundalini Yoga Tribe · AI Webinar',
}: {
  title?: string
  eyebrow?: string
}) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#FAF7F2',
        color: '#2A1F1A',
        fontFamily: "'Jost', system-ui, sans-serif",
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 20px',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600&family=Jost:wght@300;400;500;600&display=swap');
      `}</style>
      <div style={{ maxWidth: 560, textAlign: 'center' }}>
        <p
          style={{
            fontSize: 12,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: '#4A3728',
            margin: '0 0 22px',
            fontWeight: 500,
          }}
        >
          {eyebrow}
        </p>
        <h1
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 'clamp(32px, 5vw, 48px)',
            fontWeight: 400,
            lineHeight: 1.16,
            margin: '0 0 20px',
          }}
        >
          Das {title} ist jetzt kostenpflichtig.
        </h1>
        <p style={{ fontSize: 17, lineHeight: 1.8, color: '#4A3728', fontWeight: 300, margin: '0 0 12px' }}>
          Die kostenlose Anmeldung gibt es nicht mehr. Das Webinar kostet einmalig 29&nbsp;€ und
          dein persönlicher Zugangslink kommt direkt nach der Zahlung per E-Mail zu dir.
        </p>
        <p style={{ fontSize: 17, lineHeight: 1.8, color: '#4A3728', fontWeight: 300, margin: '0 0 34px' }}>
          Einmal zahlen, dann so oft du willst ansehen – 30 Tage lang.
        </p>
        <Link
          href="/webinar"
          style={{
            display: 'inline-block',
            background: '#D3BC76',
            color: '#2A1F1A',
            textDecoration: 'none',
            padding: '16px 44px',
            borderRadius: 999,
            fontSize: 16,
            fontWeight: 600,
            letterSpacing: '0.03em',
          }}
        >
          Jetzt anmelden · 29&nbsp;€
        </Link>
      </div>
    </div>
  )
}
