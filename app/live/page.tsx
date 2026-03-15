import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import LivePlayer from './LivePlayer'

export const metadata = {
  title: 'Live Stream – Kundalini Yoga Tribe',
  description: 'Exklusiver Live-Stream für Mitglieder',
}

export default async function LivePage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await currentUser()
  const name = user?.firstName ?? 'Sat Nam'

  return (
    <main style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      color: '#f5f0e8',
      fontFamily: "'DM Sans', sans-serif",
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <header style={{
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #222',
      }}>
        <a href="/" style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          textDecoration: 'none',
          color: '#f5f0e8',
        }}>
          <span style={{ fontSize: 20, color: '#c9a84c' }}>◯</span>
          <span style={{ fontSize: 15, fontWeight: 500, letterSpacing: '0.04em' }}>
            Kundalini Yoga Tribe
          </span>
        </a>
        <span style={{ fontSize: 13, color: '#888' }}>
          Sat Nam, {name}
        </span>
      </header>

      {/* Live badge + title */}
      <div style={{ textAlign: 'center', padding: '32px 24px 24px' }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: '#c00',
          color: '#fff',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.1em',
          padding: '4px 12px',
          borderRadius: 4,
          textTransform: 'uppercase',
          marginBottom: 14,
        }}>
          <span style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: '#fff',
            display: 'inline-block',
            animation: 'pulse 1.5s infinite',
          }} />
          Live
        </span>
        <h1 style={{
          fontSize: 22,
          fontWeight: 400,
          letterSpacing: '0.06em',
          color: '#f5f0e8',
          margin: 0,
          fontFamily: "'Cormorant Garamond', serif",
        }}>
          Tribe Live Exklusiv
        </h1>
      </div>

      {/* Video player */}
      <LivePlayer />

      {/* Footer note */}
      <p style={{
        textAlign: 'center',
        color: '#555',
        fontSize: 12,
        padding: '32px 24px',
        marginTop: 'auto',
      }}>
        Bildschirm bleibt aktiv während du schaust · Sat Nam
      </p>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </main>
  )
}
