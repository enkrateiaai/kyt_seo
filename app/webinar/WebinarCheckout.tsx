'use client'

import Script from 'next/script'
import { useState, useEffect, useRef } from 'react'

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || ''

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    paypal?: any
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const C = {
  gold: '#D3BC76',
  deepBrown: '#2A1F1A',
  warmBrown: '#4A3728',
  sand: '#E8DDD0',
  warmWhite: '#FAF7F2',
  muted: '#8A7B72',
}

export default function WebinarCheckout() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [paypalReady, setPaypalReady] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [formTouched, setFormTouched] = useState(false)
  const buttonsRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ppInstance = useRef<any>(null)

  const formValid = name.trim().length >= 2 && EMAIL_RE.test(email.trim())

  useEffect(() => {
    if (!formValid || !paypalReady || !PAYPAL_CLIENT_ID || !buttonsRef.current) return

    ppInstance.current?.close()
    buttonsRef.current.innerHTML = ''
    setStatus('idle')

    ppInstance.current = window.paypal.Buttons({
      style: { layout: 'vertical', color: 'gold', shape: 'pill', label: 'pay' },

      createOrder: async () => {
        setStatus('loading')
        const res = await fetch('/api/webinar/checkout', { method: 'POST' })
        const data = await res.json()
        if (!data.orderId) throw new Error(data.error || 'Bestellung fehlgeschlagen')
        return data.orderId
      },

      onApprove: async (_data: { orderID: string }) => {
        setStatus('loading')
        const res = await fetch('/api/webinar/checkout/capture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paypalOrderId: _data.orderID,
            name: name.trim(),
            email: email.trim().toLowerCase(),
          }),
        })
        const data = await res.json()
        if (data.success) {
          setStatus('success')
          setMessage('Zahlung erhalten! Dein persönlicher Webinar-Link ist unterwegs an ' + email.trim() + '.')
        } else {
          setStatus('error')
          setMessage(data.error || 'Zahlung fehlgeschlagen. Bitte versuche es erneut.')
        }
      },

      onError: () => {
        setStatus('error')
        setMessage('Fehler bei der Zahlung. Bitte versuche es erneut.')
      },
    })

    if (ppInstance.current.isEligible()) {
      ppInstance.current.render(buttonsRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formValid, paypalReady])

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    border: `1px solid ${C.sand}`,
    borderRadius: 8,
    fontSize: 15,
    background: '#FFFCF7',
    color: C.deepBrown,
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 13,
    fontWeight: 500,
    color: C.warmBrown,
    marginBottom: 6,
    letterSpacing: '0.03em',
  }

  if (status === 'success') {
    return (
      <div style={{
        background: '#F0F7F0',
        border: '1px solid #C3DFC3',
        borderRadius: 12,
        padding: '28px 24px',
        textAlign: 'center',
        color: '#2A5C2A',
        lineHeight: 1.7,
        maxWidth: 480,
        margin: '0 auto',
      }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
        <p style={{ margin: 0, fontSize: 15 }}>{message}</p>
      </div>
    )
  }

  return (
    <>
      {PAYPAL_CLIENT_ID && (
        <Script
          src={`https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=EUR&intent=capture`}
          strategy="lazyOnload"
          onLoad={() => setPaypalReady(true)}
        />
      )}

      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
          <div>
            <label style={labelStyle} htmlFor="webinar-name">Dein Name</label>
            <input
              id="webinar-name"
              style={inputStyle}
              type="text"
              autoComplete="given-name"
              placeholder="Dein Name"
              value={name}
              onChange={e => { setName(e.target.value); setFormTouched(true) }}
            />
          </div>
          <div>
            <label style={labelStyle} htmlFor="webinar-email">Deine E-Mail-Adresse</label>
            <input
              id="webinar-email"
              style={inputStyle}
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="deine@email.de"
              value={email}
              onChange={e => { setEmail(e.target.value); setFormTouched(true) }}
            />
            <p style={{ fontSize: 12, color: C.muted, margin: '6px 0 0', lineHeight: 1.6 }}>
              Dorthin schicken wir deinen persönlichen Webinar-Link.
            </p>
          </div>
        </div>

        {status === 'error' && (
          <div style={{
            background: '#FDF0EE', border: '1px solid #E8C0BB', borderRadius: 8,
            padding: '12px 16px', color: '#8B3030', fontSize: 14, marginBottom: 16,
          }}>
            {message}
          </div>
        )}

        {formTouched && !formValid ? (
          <p style={{ fontSize: 13, color: C.muted, textAlign: 'center', margin: '0 0 16px' }}>
            Bitte Name und E-Mail-Adresse eingeben, um zur Zahlung zu gelangen.
          </p>
        ) : null}

        {status === 'loading' && (
          <p style={{ textAlign: 'center', color: C.muted, fontSize: 13, marginBottom: 12 }}>
            Verarbeitung …
          </p>
        )}

        {formValid && PAYPAL_CLIENT_ID ? (
          <div ref={buttonsRef} />
        ) : formValid && !PAYPAL_CLIENT_ID ? (
          <p style={{ textAlign: 'center', color: C.muted, fontSize: 13 }}>
            Zahlung ist gerade nicht verfügbar. Bitte versuche es später erneut.
          </p>
        ) : null}
      </div>
    </>
  )
}
