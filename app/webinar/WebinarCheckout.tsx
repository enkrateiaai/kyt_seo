'use client'

import { useState, useEffect } from 'react'
import { loadStripe, type Stripe, type StripeElements } from '@stripe/stripe-js'

const STRIPE_PK = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const C = {
  gold: '#D3BC76', deepBrown: '#2A1F1A', warmBrown: '#4A3728',
  sand: '#E8DDD0', warmWhite: '#FAF7F2', muted: '#8A7B72',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', border: `1px solid ${C.sand}`,
  borderRadius: 8, fontSize: 15, background: '#FFFCF7', color: C.deepBrown,
  fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 500, color: C.warmBrown,
  marginBottom: 6, letterSpacing: '0.03em',
}

export default function WebinarCheckout() {
  const [name, setName]       = useState('')
  const [email, setEmail]     = useState('')
  const [touched, setTouched] = useState(false)
  const [status, setStatus]   = useState<'idle'|'loading'|'paying'|'success'|'error'>('idle')
  const [message, setMessage] = useState('')
  const [link, setLink] = useState('')

  const [stripe, setStripe]     = useState<Stripe | null>(null)
  const [elements, setElements] = useState<StripeElements | null>(null)
  const [clientSecret, setSecret] = useState('')

  const formValid = name.trim().length >= 2 && EMAIL_RE.test(email.trim())

  useEffect(() => {
    if (!STRIPE_PK) return
    loadStripe(STRIPE_PK).then(s => setStripe(s))
  }, [])

  useEffect(() => {
    if (!stripe || !clientSecret || status !== 'paying') return
    const els = stripe.elements({ clientSecret, appearance: {
      theme: 'flat',
      variables: {
        colorPrimary: C.deepBrown, colorBackground: '#FFFCF7',
        colorText: C.deepBrown, colorTextSecondary: C.warmBrown,
        fontFamily: 'Jost, system-ui, sans-serif',
        borderRadius: '8px', spacingUnit: '4px',
      },
    }})
    setElements(els)
    const el = els.create('payment')
    el.mount('#stripe-payment-element')
    return () => { el.unmount() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientSecret, status])

  const handleProceed = async () => {
    if (!formValid) { setTouched(true); return }
    setStatus('loading')
    setMessage('')
    try {
      const res = await fetch('/api/webinar/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase() }),
      })
      const data = await res.json()
      if (!data.clientSecret) throw new Error(data.error || 'Fehler beim Erstellen der Zahlung')
      setSecret(data.clientSecret)
      setStatus('paying')
    } catch (e) {
      setStatus('error')
      setMessage(String(e))
    }
  }

  const handlePay = async () => {
    if (!stripe || !elements) return
    setStatus('loading')
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: 'if_required',
    })
    if (error) {
      setStatus('paying')
      setMessage(error.message || 'Zahlung fehlgeschlagen.')
      return
    }
    if (paymentIntent?.status === 'succeeded') {
      setStatus('loading')
      const res = await fetch('/api/webinar/checkout/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentIntentId: paymentIntent.id }),
      })
      const data = await res.json()
      if (data.success) {
        setStatus('success')
        setLink(`${window.location.origin}/webinar?token=${data.token}`)
        setMessage(
          data.mailSent === false
            ? `Die Bestaetigungsmail konnte nicht zugestellt werden. Bitte nutze diesen Link: ${window.location.origin}/webinar?token=${data.token}`
            : `Dein Zugangslink ist unterwegs an ${email.trim()}.`,
        )
      } else {
        setStatus('error')
        setMessage(data.error || 'Fehler nach der Zahlung.')
      }
    }
  }

  if (status === 'success') {
    return (
      <div style={{ background: '#F0F7F0', border: '1px solid #C3DFC3', borderRadius: 12,
        padding: '28px 24px', textAlign: 'center', color: '#2A5C2A', lineHeight: 1.7,
        maxWidth: 480, margin: '0 auto' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
        <p style={{ margin: 0, fontSize: 15 }}>{message}</p>
        {link && (
          <a href={link} style={{ display: 'inline-block', marginTop: 12, color: '#2A5C2A', fontSize: 14, wordBreak: 'break-all' }}>
            {link}
          </a>
        )}
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto' }}>

      {status === 'idle' && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
            <div>
              <label style={labelStyle} htmlFor="wb-name">Dein Name</label>
              <input id="wb-name" style={inputStyle} type="text" autoComplete="given-name"
                placeholder="Dein Name" value={name}
                onChange={e => { setName(e.target.value); setTouched(true) }} />
            </div>
            <div>
              <label style={labelStyle} htmlFor="wb-email">Deine E-Mail-Adresse</label>
              <input id="wb-email" style={inputStyle} type="email" inputMode="email" autoComplete="email"
                placeholder="deine@email.de" value={email}
                onChange={e => { setEmail(e.target.value); setTouched(true) }} />
              <p style={{ fontSize: 12, color: C.muted, margin: '6px 0 0', lineHeight: 1.6 }}>
                Dorthin schicken wir deinen persönlichen Webinar-Link.
              </p>
            </div>
          </div>

          {touched && !formValid && (
            <p style={{ fontSize: 13, color: C.muted, textAlign: 'center', margin: '0 0 16px' }}>
              Bitte Name und gültige E-Mail eingeben.
            </p>
          )}

          <button onClick={handleProceed} style={{
            width: '100%', padding: '14px',
            background: formValid ? C.deepBrown : '#ccc',
            color: C.warmWhite, border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600,
            fontFamily: 'inherit', cursor: formValid ? 'pointer' : 'default', letterSpacing: '0.02em',
          }}>
            Weiter zur Zahlung →
          </button>
        </>
      )}

      {status === 'loading' && (
        <p style={{ textAlign: 'center', color: C.muted, fontSize: 14, padding: '20px 0' }}>
          Zahlung wird vorbereitet …
        </p>
      )}

      {status === 'paying' && (
        <>
          <div id="stripe-payment-element" style={{ marginBottom: 20 }} />
          {message && (
            <div style={{ background: '#FDF0EE', border: '1px solid #E8C0BB', borderRadius: 8,
              padding: '12px 16px', color: '#8B3030', fontSize: 14, marginBottom: 16 }}>
              {message}
            </div>
          )}
          <button onClick={handlePay} style={{
            width: '100%', padding: '14px', background: C.deepBrown, color: C.warmWhite,
            border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600,
            fontFamily: 'inherit', cursor: 'pointer', letterSpacing: '0.02em',
          }}>
            29 € bezahlen
          </button>
        </>
      )}

      {status === 'error' && (
        <>
          <div style={{ background: '#FDF0EE', border: '1px solid #E8C0BB', borderRadius: 8,
            padding: '12px 16px', color: '#8B3030', fontSize: 14, marginBottom: 16 }}>
            {message}
          </div>
          <button onClick={() => { setStatus('idle'); setMessage('') }} style={{
            width: '100%', padding: '12px', background: 'transparent', color: C.warmBrown,
            border: `1px solid ${C.sand}`, borderRadius: 8, fontSize: 14,
            fontFamily: 'inherit', cursor: 'pointer',
          }}>
            Erneut versuchen
          </button>
        </>
      )}

      {!STRIPE_PK && (
        <p style={{ textAlign: 'center', color: C.muted, fontSize: 13 }}>
          Zahlung ist gerade nicht verfügbar.
        </p>
      )}
    </div>
  )
}
