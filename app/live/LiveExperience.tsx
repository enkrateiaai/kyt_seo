import { ReactNode } from 'react'
import { auth } from '@clerk/nextjs/server'
import { SignInButton } from '@clerk/nextjs'
import Image from 'next/image'
import SiteHeader from '@/app/components/SiteHeader'
import ExternalWindowLink from '@/app/components/ExternalWindowLink'
import { hasClerkClientConfig, hasClerkServerConfig } from '@/lib/authConfig'
import { getUserDisplayName, getUserImageUrl, getViewerUser, hasLiveAccess } from '@/lib/memberAccess'

const C = {
  bg: '#FAF7F2',
  bgWarm: '#F3EDE4',
  panel: 'rgba(255, 252, 247, 0.82)',
  text: '#2C2416',
  textSoft: '#6B5D4F',
  textMuted: '#9B8E7E',
  accent: '#D3BC76',
  accentDeep: '#B89A4A',
  border: '#DDD5C8',
  live: '#B9453C',
}

function Gate({ clerkEnabled, loggedIn, redirectPath }: { clerkEnabled: boolean; loggedIn: boolean; redirectPath: string }) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 24px',
        textAlign: 'center',
      }}
    >
      <Image src="/icon.png" alt="Logo" width={72} height={72} style={{ marginBottom: 28, opacity: 0.85 }} />
      <h1
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 32,
          fontWeight: 400,
          letterSpacing: '0.06em',
          color: C.text,
          margin: '0 0 16px',
        }}
      >
        Tribe Live Mitgliedschaft
      </h1>
      <p style={{ color: C.textSoft, fontSize: 15, maxWidth: 420, lineHeight: 1.8, margin: '0 0 36px' }}>
        {loggedIn
          ? 'Der Live-Bereich ist Teil der Tribe Live Mitgliedschaft. Mit deiner Tribe Mitgliedschaft hast du Zugang zu den Videos – für Live kannst du jederzeit upgraden.'
          : 'Bitte melde dich an oder werde Mitglied, um die Live-Streams zu sehen.'}
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        {!loggedIn && clerkEnabled && (
          <SignInButton mode="redirect" forceRedirectUrl={redirectPath} fallbackRedirectUrl={redirectPath}>
            <button
              style={{
                padding: '13px 28px',
                background: 'transparent',
                border: `1px solid ${C.border}`,
                color: C.textSoft,
                borderRadius: 999,
                fontSize: 14,
                cursor: 'pointer',
                fontFamily: "'Jost', sans-serif",
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              Anmelden
            </button>
          </SignInButton>
        )}
        {!loggedIn && !clerkEnabled && (
          <p style={{ color: C.textMuted, fontSize: 13, lineHeight: 1.7, maxWidth: 420, margin: 0 }}>
            Die lokale Testumgebung lauft ohne Mitglieder-Login. Dieser Bereich bleibt auf dem Pi daher geschlossen.
          </p>
        )}
        <ExternalWindowLink
          href="https://www.charan-amrit-kaur.de/yoga-tribe/"
          style={{
            display: 'inline-block',
            padding: '13px 28px',
            background: C.accent,
            color: C.text,
            textDecoration: 'none',
            borderRadius: 999,
            fontSize: 14,
            fontWeight: 500,
            fontFamily: "'Jost', sans-serif",
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          Mitglied werden
        </ExternalWindowLink>
      </div>
    </div>
  )
}

function Tabs({ active }: { active: 'live' | 'live-local' }) {
  const tabStyle = (selected: boolean) => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 18px',
    borderRadius: 999,
    border: `1px solid ${selected ? C.accent : C.border}`,
    background: selected ? C.accent : 'rgba(255,255,255,0.65)',
    color: C.text,
    textDecoration: 'none',
    fontSize: 12,
    letterSpacing: '0.14em',
    textTransform: 'uppercase' as const,
    fontFamily: "'Jost', sans-serif",
    transition: 'transform 0.2s ease, background 0.2s ease',
  })

  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        justifyContent: 'center',
        flexWrap: 'wrap',
        marginTop: 18,
      }}
    >
      <a href="/live" style={tabStyle(active === 'live')}>
        Live
      </a>
      <a href="/live-local" style={tabStyle(active === 'live-local')}>
        Live Local
      </a>
    </div>
  )
}

export default async function LiveExperience({
  activeTab,
  title,
  description,
  liveBadge,
  player,
  footer,
}: {
  activeTab: 'live' | 'live-local'
  title: string
  description: string
  liveBadge: string
  player: ReactNode
  footer: string
}) {
  const clerkClientEnabled = hasClerkClientConfig()
  const clerkServerEnabled = hasClerkServerConfig()
  const { userId } = clerkServerEnabled ? await auth() : { userId: null }
  const user = clerkServerEnabled && userId ? await getViewerUser() : null
  const isMember = hasLiveAccess(user)
  const userLabel = getUserDisplayName(user) || userId
  const userImageUrl = getUserImageUrl(user)

  return (
    <main
      style={{
        minHeight: '100vh',
        background: `radial-gradient(circle at top, rgba(211,188,118,0.12), transparent 34%), ${C.bg}`,
        color: C.text,
        fontFamily: "'Jost', sans-serif",
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <SiteHeader clerkEnabled={clerkClientEnabled} isLoggedIn={!!userId} userId={userId} userLabel={userLabel} userImageUrl={userImageUrl} canAccessLive={isMember} />

      {isMember ? (
        <>
          <div style={{ padding: '32px 24px 18px', textAlign: 'center' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: '#fff',
                border: `1px solid rgba(185, 69, 60, 0.22)`,
                color: C.live,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.14em',
                padding: '7px 14px',
                borderRadius: 999,
                textTransform: 'uppercase',
                marginBottom: 16,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: C.live,
                  display: 'inline-block',
                  animation: 'pulse 1.5s infinite',
                }}
              />
              {liveBadge}
            </span>
            <h1
              style={{
                fontSize: 36,
                fontWeight: 400,
                letterSpacing: '0.04em',
                color: C.text,
                margin: 0,
                fontFamily: "'Cormorant Garamond', serif",
              }}
            >
              {title}
            </h1>
            <p style={{ margin: '12px auto 0', maxWidth: 620, color: C.textSoft, fontSize: 15, lineHeight: 1.8 }}>
              {description}
            </p>
            <Tabs active={activeTab} />
          </div>

          <div style={{ width: '100%', maxWidth: 1160, margin: '0 auto', padding: '0 24px 28px' }}>{player}</div>

          <p style={{ textAlign: 'center', color: C.textMuted, fontSize: 12, padding: '0 24px 34px', marginTop: 'auto' }}>
            {footer}
          </p>
        </>
      ) : (
        <Gate clerkEnabled={clerkClientEnabled} loggedIn={!!userId} redirectPath={activeTab === 'live' ? '/live' : '/live-local'} />
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600&family=Jost:wght@300;400;500;600&display=swap');
        @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.35; transform: scale(0.88); } }
      `}</style>
    </main>
  )
}
