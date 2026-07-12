'use client'
import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { SignIn, SignUp, useUser } from '@clerk/nextjs'

const C = {
  bg: '#FAF7F2',
  text: '#2C2416',
  textSoft: '#6B5D4F',
  textMuted: '#9B8E7E',
  accent: '#D3BC76',
  border: '#DDD5C8',
}

type Status = 'bestaetigt' | 'abgelaufen' | 'fehler' | 'abgemeldet' | null

const messages = {
  de: {
    bestaetigt: {
      icon: '☽',
      title: 'Sat Nam – du bist dabei!',
      body: 'Deine Anmeldung wurde bestätigt. Du erhältst ab jetzt Kriyas, Meditationen und Impulse aus der Welt des Kundalini Yoga.',
    },
    abgelaufen: {
      icon: '◔',
      title: 'Link abgelaufen',
      body: 'Der Bestätigungslink ist nicht mehr gültig (24 Stunden). Melde dich erneut an – wir schicken dir einen neuen Link.',
    },
    fehler: {
      icon: '✦',
      title: 'Etwas ist schiefgelaufen',
      body: 'Es gab einen technischen Fehler. Bitte versuche es erneut oder schreib uns an info@kundaliniyogatribe.de.',
    },
    abgemeldet: {
      icon: '☾',
      title: 'Du wurdest abgemeldet',
      body: 'Deine E-Mail-Adresse wurde aus unserem Newsletter entfernt. Du erhältst keine weiteren E-Mails von uns. Sat Nam.',
    },
  },
  en: {
    bestaetigt: {
      icon: '☽',
      title: "Sat Nam – you're in!",
      body: "Your subscription is confirmed. You'll now receive Kriyas, meditations and insights from the world of Kundalini Yoga.",
    },
    abgelaufen: {
      icon: '◔',
      title: 'Link expired',
      body: "The confirmation link is no longer valid (24 hours). Sign up again and we'll send you a new one.",
    },
    fehler: {
      icon: '✦',
      title: 'Something went wrong',
      body: 'There was a technical error. Please try again or write to us at info@kundaliniyogatribe.de.',
    },
    abgemeldet: {
      icon: '☾',
      title: "You've been unsubscribed",
      body: "Your email address has been removed from our list. You won't receive any further emails from us. Sat Nam.",
    },
  },
}

const clerkAppearance = {
  variables: {
    colorPrimary: '#D3BC76',
    colorBackground: '#FAF7F2',
    colorText: '#2C2416',
    colorTextSecondary: '#6B5D4F',
    colorInputBackground: '#FAF7F2',
    colorInputText: '#2C2416',
    fontFamily: "'DM Sans', sans-serif",
    borderRadius: '6px',
  },
  elements: {
    card: { boxShadow: 'none', border: '1px solid #DDD5C8', background: '#FAF7F2' },
    headerTitle: { fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: '22px' },
    headerSubtitle: { color: '#6B5D4F' },
    socialButtonsBlockButton: { border: '1px solid #DDD5C8', color: '#2C2416', background: '#FAF7F2' },
    socialButtonsBlockButtonText: { color: '#2C2416' },
    dividerLine: { background: '#DDD5C8' },
    dividerText: { color: '#9B8E7E' },
    formFieldInput: { border: '1px solid #DDD5C8', background: '#FAF7F2', color: '#2C2416' },
    formButtonPrimary: { background: '#D3BC76', color: '#2C2416' },
    footerActionLink: { color: '#D3BC76' },
    badge: { display: 'none' },
    developmentModeWarning: { display: 'none' },
  },
}

export default function AnmeldungContent() {
  const params = useSearchParams()
  const status = params.get('status') as Status
  const clerkStatus = params.get('__clerk_status')
  const clerkTicket = params.get('__clerk_ticket')
  const lang = params.get('lang') === 'en' ? 'en' : 'de'
  const { isLoaded, isSignedIn } = useUser()

  const set = messages[lang]

  // Known status from our own flows (newsletter confirm/unsubscribe)
  if (status && set[status]) {
    return (
      <PageShell>
        <StaticMessage msg={set[status]} lang={lang} />
      </PageShell>
    )
  }

  // New user accepting an org invite — needs <SignUp> to process ticket + create account
  if (clerkTicket && clerkStatus === 'sign_up') {
    return (
      <PageShell>
        <div style={{ fontSize: 40, marginBottom: 20, textAlign: 'center' }}>◯</div>
        <p style={{ fontSize: 13, color: '#9B8E7E', marginBottom: 16, textAlign: 'center' }}>
          Erstelle dein Konto mit der E-Mail-Adresse, an die die Einladung gesendet wurde.
        </p>
        <SignUp
          appearance={clerkAppearance}
          forceRedirectUrl="/videos"
          fallbackRedirectUrl="/videos"
        />
      </PageShell>
    )
  }

  // Existing user accepting an org invite — needs <SignIn> to authenticate + process ticket
  if (clerkTicket && clerkStatus === 'sign_in') {
    return (
      <PageShell>
        <div style={{ fontSize: 40, marginBottom: 20, textAlign: 'center' }}>◯</div>
        <p style={{ fontSize: 13, color: '#9B8E7E', marginBottom: 16, textAlign: 'center' }}>
          Melde dich mit der E-Mail-Adresse an, an die die Einladung gesendet wurde.
        </p>
        <SignIn
          appearance={clerkAppearance}
          forceRedirectUrl="/videos"
          fallbackRedirectUrl="/videos"
        />
      </PageShell>
    )
  }

  // After completing invite (no ticket, status present), or already signed in
  if ((isLoaded && isSignedIn) || clerkStatus === 'sign_in' || clerkStatus === 'sign_up') {
    return (
      <PageShell>
        <StaticMessage
          msg={set.bestaetigt}
          lang={lang}
          cta={{ href: '/videos', label: lang === 'en' ? '→ Go to videos' : '→ Zu den Videos' }}
        />
      </PageShell>
    )
  }

  // Default: branded sign-in for existing members
  return (
    <PageShell>
      <div style={{ fontSize: 40, marginBottom: 20, textAlign: 'center' }}>◯</div>
      <SignIn
        appearance={clerkAppearance}
        forceRedirectUrl="/anmeldung?__clerk_status=sign_in"
        fallbackRedirectUrl="/anmeldung?__clerk_status=sign_in"
      />
    </PageShell>
  )
}

function PageShell({ children }: { children: ReactNode }) {
  return (
    <main style={{
      minHeight: '100vh',
      background: C.bg,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      fontFamily: "'DM Sans', sans-serif",
      color: C.text,
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=DM+Sans:wght@300;400;500&display=swap');`}</style>
      {children}
    </main>
  )
}

function StaticMessage({
  msg,
  lang,
  cta,
}: {
  msg: { icon: string; title: string; body: string }
  lang: string
  cta?: { href: string; label: string }
}) {
  return (
    <div style={{ textAlign: 'center', maxWidth: 480 }}>
      <div style={{ fontSize: 48, marginBottom: 24 }}>{msg.icon}</div>
      <h1 style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: 30,
        fontWeight: 400,
        letterSpacing: '0.04em',
        margin: '0 0 16px',
        color: C.text,
      }}>
        {msg.title}
      </h1>
      <p style={{
        fontSize: 16,
        lineHeight: 1.8,
        color: C.textSoft,
        margin: '0 0 36px',
      }}>
        {msg.body}
      </p>
      <a
        href={cta?.href ?? 'https://kundaliniyogatribe.de/'}
        style={{
          display: 'inline-block',
          padding: '12px 28px',
          background: 'transparent',
          border: `1px solid ${C.border}`,
          color: C.textSoft,
          borderRadius: 6,
          textDecoration: 'none',
          fontSize: 14,
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {cta?.label ?? (lang === 'en' ? '← Back to website' : '← Zurück zur Website')}
      </a>
    </div>
  )
}
