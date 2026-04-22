'use client'

import { useState } from 'react'
import Link from 'next/link'

const TELEGRAM_URL = process.env.NEXT_PUBLIC_TELEGRAM_URL || 'https://t.me/kundaliniyogatribe'

export default function JoinPage() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setState('loading')
    setErrorMsg('')
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (res.ok) {
        setState('success')
      } else {
        setErrorMsg(data.error || 'Ein Fehler ist aufgetreten.')
        setState('error')
      }
    } catch {
      setErrorMsg('Verbindungsfehler. Bitte versuche es erneut.')
      setState('error')
    }
  }

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
          Wähle deinen Weg ins Tribe
        </h1>
        <p style={{
          fontSize: '17px',
          lineHeight: 1.7,
          color: '#6b5d4f',
          maxWidth: '480px',
          margin: '0 auto',
        }}>
          Jeden Tag eine kurze Kundalini-Praxis. Kriyas, Meditationen und Impulse für dein Leben.
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
              Sofort dabei
            </p>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '24px', fontWeight: 300, margin: '0 0 12px', color: '#2a2520' }}>
              Telegram-Community
            </h2>
            <p style={{ fontSize: '15px', lineHeight: 1.7, color: '#6b5d4f', margin: 0 }}>
              Tritt unserem Telegram-Kanal bei und erhalte tägliche Kriyas, kurze Impulse und Gemeinschaft — direkt auf deinem Handy.
            </p>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {['Tägliche Praxis-Impulse', 'Direkter Kontakt zur Community', 'Kein Spam, kein Algorithmus'].map(item => (
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
            Gratis Programm
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
              7 Tage Kundalini Reset
            </p>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '24px', fontWeight: 300, margin: '0 0 12px', color: '#2a2520' }}>
              Dein kostenloses 7-Tage-Programm
            </h2>
            <p style={{ fontSize: '15px', lineHeight: 1.7, color: '#6b5d4f', margin: 0 }}>
              Jeden Tag eine kurze Kundalini-Praxis direkt in dein Postfach — aufgebaut, damit du spürst, was sich verändert.
            </p>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {['7 geführte Kriyas (je ~15 Min.)', 'Täglich eine neue Energie', 'Danach: monatlicher Newsletter'].map(item => (
              <li key={item} style={{ fontSize: '14px', color: '#6b5d4f', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#b89654', fontSize: '16px' }}>✓</span> {item}
              </li>
            ))}
          </ul>

          {state === 'success' ? (
            <div style={{
              background: '#f0ebe0',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center',
            }}>
              <p style={{ fontSize: '22px', marginBottom: '8px' }}>🙏</p>
              <p style={{ fontFamily: 'Georgia, serif', fontSize: '18px', color: '#2a2520', margin: '0 0 6px' }}>
                Sat Nam!
              </p>
              <p style={{ fontSize: '14px', color: '#6b5d4f', margin: 0 }}>
                Prüfe dein Postfach und bestätige deine Anmeldung.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: 'auto' }}>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="deine@email.de"
                disabled={state === 'loading'}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '13px 16px',
                  border: '1px solid #ddd6c8',
                  borderRadius: '10px',
                  fontSize: '15px',
                  background: '#fdfaf5',
                  color: '#2a2520',
                  outline: 'none',
                }}
              />
              {state === 'error' && (
                <p style={{ fontSize: '13px', color: '#c0392b', margin: 0 }}>{errorMsg}</p>
              )}
              <button
                type="submit"
                disabled={state === 'loading'}
                style={{
                  background: state === 'loading' ? '#d4c498' : '#b89654',
                  color: '#fff',
                  border: 'none',
                  padding: '14px 28px',
                  borderRadius: '100px',
                  fontSize: '15px',
                  fontWeight: 500,
                  cursor: state === 'loading' ? 'not-allowed' : 'pointer',
                  letterSpacing: '0.02em',
                }}
              >
                {state === 'loading' ? 'Wird gesendet…' : 'Reset starten →'}
              </button>
              <p style={{ fontSize: '11px', color: '#9b8e7e', textAlign: 'center', margin: 0 }}>
                Kein Spam. Abmeldung jederzeit möglich.
              </p>
            </form>
          )}
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
