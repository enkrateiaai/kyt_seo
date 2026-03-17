import { auth, currentUser } from '@clerk/nextjs/server'
import { SignInButton } from '@clerk/nextjs'
import Image from 'next/image'
import LivePlayer from './LivePlayer'
import SiteHeader from '@/app/components/SiteHeader'

export const metadata = {
  title: 'Live Stream – Kundalini Yoga Tribe',
  description: 'Exklusiver Live-Stream für Mitglieder',
}

const C = {
  bg:          '#FAF7F2',
  bgWarm:      '#F3EDE4',
  text:        '#2C2416',
  textSoft:    '#6B5D4F',
  textMuted:   '#9B8E7E',
  accent:      '#D3BC76',
  border:      '#DDD5C8',
}

function Gate({ loggedIn }: { loggedIn: boolean }) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '60px 24px', textAlign: 'center',
    }}>
      <Image src="/icon.png" alt="Logo" width={72} height={72} style={{ marginBottom: 28, opacity: 0.85 }} />
      <h1 style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: 32, fontWeight: 400, letterSpacing: '0.06em',
        color: C.text, margin: '0 0 16px',
      }}>
        Tribe Live Exklusiv
      </h1>
      <p style={{ color: C.textSoft, fontSize: 15, maxWidth: 380, lineHeight: 1.8, margin: '0 0 36px' }}>
        {loggedIn
          ? 'Dieser Live-Stream ist nur für Tribe-Mitglieder zugänglich.'
          : 'Bitte melde dich an oder werde Mitglied um den Live-Stream zu sehen.'}
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        {!loggedIn && (
          <SignInButton>
            <button style={{
              padding: '13px 28px', background: 'transparent',
              border: `1px solid ${C.border}`, color: C.textSoft,
              borderRadius: 6, fontSize: 14, cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
            }}>
              Anmelden
            </button>
          </SignInButton>
        )}
        <a
          href="https://www.charan-amrit-kaur.de/yoga-tribe/"
          target="_blank" rel="noopener"
          style={{
            display: 'inline-block', padding: '13px 28px',
            background: C.accent, color: '#fff', textDecoration: 'none',
            borderRadius: 6, fontSize: 14, fontWeight: 500,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Mitglied werden →
        </a>
      </div>
    </div>
  )
}

export default async function LivePage() {
  const { userId } = await auth()
  const user = userId ? await currentUser() : null
  const isMember =
    (user?.publicMetadata as any)?.role === 'member' ||
    (user?.publicMetadata as any)?.role === 'admin'

  return (
    <main style={{
      minHeight: '100vh', background: C.bg, color: C.text,
      fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column',
    }}>
      <SiteHeader isLoggedIn={!!userId} signOutRedirectUrl="/live" />

      {isMember ? (
        <>
          <div style={{ textAlign: 'center', padding: '32px 24px 20px' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: '#c00', color: '#fff', fontSize: 11, fontWeight: 700,
              letterSpacing: '0.1em', padding: '4px 12px', borderRadius: 4,
              textTransform: 'uppercase', marginBottom: 14,
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
              Live
            </span>
            <h1 style={{ fontSize: 24, fontWeight: 400, letterSpacing: '0.06em', color: C.text, margin: 0, fontFamily: "'Cormorant Garamond', serif" }}>
              Tribe Live Exklusiv
            </h1>
          </div>
          <div style={{ padding: '0 24px 24px' }}>
            <LivePlayer />
          </div>
          <p style={{ textAlign: 'center', color: C.textMuted, fontSize: 12, padding: '16px 24px 32px', marginTop: 'auto' }}>
            Bildschirm bleibt aktiv während du schaust · Sat Nam
          </p>
        </>
      ) : (
        <Gate loggedIn={!!userId} />
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=DM+Sans:wght@300;400;500&display=swap');
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </main>
  )
}
