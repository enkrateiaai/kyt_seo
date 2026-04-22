'use client'
import { useSearchParams } from 'next/navigation'

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

export default function AnmeldungContent() {
  const params = useSearchParams()
  const status = params.get('status') as Status
  const lang = params.get('lang') === 'en' ? 'en' : 'de'

  const set = messages[lang]
  const msg = status && set[status]
    ? set[status]
    : {
        icon: '◯',
        title: 'Kundalini Yoga Tribe',
        body: lang === 'en'
          ? 'Sign up to receive Kriyas, meditations and insights.'
          : 'Melde dich an um Kriyas, Meditationen und Impulse zu erhalten.',
      }

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
          href="https://kundaliniyogatribe.de/"
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
          {lang === 'en' ? '← Back to website' : '← Zurück zur Website'}
        </a>
      </div>
    </main>
  )
}
