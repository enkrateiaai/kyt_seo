import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { SignOutButton } from '@clerk/nextjs'
import LivePlayer from './LivePlayer'

export const metadata = {
  title: 'Live Stream – Kundalini Yoga Tribe',
  description: 'Exklusiver Live-Stream für Mitglieder',
}

const btnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid #333',
  color: '#888',
  padding: '7px 14px',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 12,
  letterSpacing: '0.08em',
}

function Header({ name }: { name: string }) {
  return (
    <header style={{
      padding: '16px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: '1px solid #1a1a1a',
    }}>
      <a href="/" style={{
        display: 'flex', alignItems: 'center', gap: 10,
        textDecoration: 'none', color: '#f5f0e8',
      }}>
        <span style={{ fontSize: 20, color: '#c9a84c' }}>◯</span>
        <span style={{ fontSize: 15, fontWeight: 500, letterSpacing: '0.04em' }}>
          Kundalini Yoga Tribe
        </span>
      </a>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <a href="/videos" style={{ fontSize: 13, color: '#666', textDecoration: 'none' }}>
          Videos
        </a>
        <span style={{ fontSize: 13, color: '#555' }}>Sat Nam, {name}</span>
        <SignOutButton redirectUrl="https://kundaliniyogatribe.de">
          <button style={btnStyle}>Abmelden →</button>
        </SignOutButton>
      </div>
    </header>
  )
}

function NotAMember({ name }: { name: string }) {
  return (
    <main style={{
      minHeight: '100vh', background: '#0a0a0a', color: '#f5f0e8',
      fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column',
    }}>
      <Header name={name} />
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '60px 24px', textAlign: 'center',
      }}>
        <span style={{ fontSize: 40, marginBottom: 24 }}>◯</span>
        <h1 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 28, fontWeight: 400, letterSpacing: '0.06em',
          color: '#f5f0e8', margin: '0 0 16px',
        }}>
          Tribe Live Exklusiv
        </h1>
        <p style={{ color: '#888', fontSize: 15, maxWidth: 380, lineHeight: 1.7, margin: '0 0 32px' }}>
          Sat Nam, {name}. Dieser Live-Stream ist nur für Tribe-Mitglieder zugänglich.
        </p>
        <a
          href="mailto:info@kundaliniyogatribe.de?subject=Mitgliedschaft"
          style={{
            display: 'inline-block',
            padding: '12px 28px',
            background: '#c9a84c',
            color: '#0a0a0a',
            textDecoration: 'none',
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: '0.04em',
          }}
        >
          Mitgliedschaft anfragen
        </a>
      </div>
    </main>
  )
}

export default async function LivePage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await currentUser()
  const name = user?.firstName ?? 'Sat Nam'
  const isMember =
    (user?.publicMetadata as any)?.role === 'member' ||
    (user?.publicMetadata as any)?.role === 'admin'

  if (!isMember) return <NotAMember name={name} />

  return (
    <main style={{
      minHeight: '100vh', background: '#0a0a0a', color: '#f5f0e8',
      fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column',
    }}>
      <Header name={name} />

      <div style={{ textAlign: 'center', padding: '32px 24px 24px' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: '#c00', color: '#fff', fontSize: 11, fontWeight: 700,
          letterSpacing: '0.1em', padding: '4px 12px', borderRadius: 4,
          textTransform: 'uppercase', marginBottom: 14,
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%', background: '#fff',
            display: 'inline-block', animation: 'pulse 1.5s infinite',
          }} />
          Live
        </span>
        <h1 style={{
          fontSize: 22, fontWeight: 400, letterSpacing: '0.06em',
          color: '#f5f0e8', margin: '0 0 6px',
          fontFamily: "'Cormorant Garamond', serif",
        }}>
          Tribe Live Exklusiv
        </h1>
      </div>

      <LivePlayer />

      <p style={{
        textAlign: 'center', color: '#444', fontSize: 12,
        padding: '32px 24px', marginTop: 'auto',
      }}>
        Bildschirm bleibt aktiv während du schaust · Sat Nam
      </p>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </main>
  )
}
