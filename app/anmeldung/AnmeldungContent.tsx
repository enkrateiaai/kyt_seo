'use client'
import { useSearchParams } from 'next/navigation'

const C = {
  bg: '#FAF7F2',
  text: '#2C2416',
  textSoft: '#6B5D4F',
  textMuted: '#9B8E7E',
  accent: '#C4873B',
  border: '#DDD5C8',
}

type Status = 'bestaetigt' | 'abgelaufen' | 'fehler' | 'abgemeldet' | null

const messages: Record<NonNullable<Status>, { icon: string; title: string; body: string }> = {
  bestaetigt: {
    icon: '🙏',
    title: 'Sat Nam – du bist dabei!',
    body: 'Deine Anmeldung wurde bestätigt. Du erhältst ab jetzt Kriyas, Meditationen und Impulse aus der Welt des Kundalini Yoga.',
  },
  abgelaufen: {
    icon: '⏳',
    title: 'Link abgelaufen',
    body: 'Der Bestätigungslink ist nicht mehr gültig (24 Stunden). Melde dich erneut an – wir schicken dir einen neuen Link.',
  },
  fehler: {
    icon: '✦',
    title: 'Etwas ist schiefgelaufen',
    body: 'Es gab einen technischen Fehler. Bitte versuche es erneut oder schreib uns an noreply@kundaliniyogatribe.de.',
  },
  abgemeldet: {
    icon: '🌿',
    title: 'Du wurdest abgemeldet',
    body: 'Deine E-Mail-Adresse wurde aus unserem Newsletter entfernt. Du erhältst keine weiteren E-Mails von uns. Sat Nam.',
  },
}

export default function AnmeldungContent() {
  const params = useSearchParams()
  const status = params.get('status') as Status

  const msg = status && messages[status]
    ? messages[status]
    : { icon: '◯', title: 'Kundalini Yoga Tribe', body: 'Melde dich an um Kriyas, Meditationen und Impulse zu erhalten.' }

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
          ← Zurück zur Website
        </a>
      </div>
    </main>
  )
}
