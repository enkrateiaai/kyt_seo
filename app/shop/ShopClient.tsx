'use client'

import Script from 'next/script'
import { useState, useEffect, useRef } from 'react'
import SiteHeader from '@/app/components/SiteHeader'

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || ''

interface Product {
  id: number
  name: string
  subtitle: string
  description: string
  price: number
  perUnit?: string
  wcUrl: string
}

const PRODUCTS: Product[] = [
  {
    id: 8059,
    name: 'Schnuppertermin',
    subtitle: '50 Minuten · Einzelsitzung',
    description:
      'Lerne Sat Nam Rasayan in einer persönlichen Sitzung kennen. Ideal für alle, die diese tiefe Heiltradition zum ersten Mal erleben möchten.',
    price: 70,
    wcUrl: 'https://www.charan-amrit-kaur.de/produkt/schnuppertermin-50-min/',
  },
  {
    id: 8060,
    name: '5er-Karte',
    subtitle: '5 Sitzungen · 54 € pro Sitzung',
    description:
      'Fünf Einzelsitzungen Sat Nam Rasayan. Die regelmäßige Praxis vertieft den Prozess und ermöglicht nachhaltige Transformation.',
    price: 270,
    perUnit: '54 € pro Sitzung',
    wcUrl: 'https://www.charan-amrit-kaur.de/produkt/5er-karte/',
  },
]

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    paypal?: any
  }
}

export default function ShopClient() {
  const [selected, setSelected] = useState<Product | null>(null)
  const [paypalReady, setPaypalReady] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const buttonsRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ppInstance = useRef<any>(null)

  useEffect(() => {
    if (!selected || !paypalReady || !PAYPAL_CLIENT_ID) return
    if (!buttonsRef.current) return

    ppInstance.current?.close()
    buttonsRef.current.innerHTML = ''
    setStatus('idle')
    setMessage('')

    const product = selected
    ppInstance.current = window.paypal.Buttons({
      style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay' },

      createOrder: async () => {
        setStatus('loading')
        const res = await fetch('/api/shop/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId: product.id }),
        })
        const data = await res.json()
        if (!data.orderId) throw new Error(data.error || 'Order creation failed')
        return data.orderId
      },

      onApprove: async (_data: { orderID: string }) => {
        setStatus('loading')
        const res = await fetch('/api/shop/capture-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paypalOrderId: _data.orderID, productId: product.id }),
        })
        const data = await res.json()
        if (data.success) {
          setStatus('success')
          setMessage('Zahlung erhalten – du bekommst eine Bestätigung per E-Mail.')
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
  }, [selected, paypalReady])

  const closeModal = () => {
    ppInstance.current?.close()
    setSelected(null)
    setStatus('idle')
    setMessage('')
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

      <SiteHeader isLoggedIn={false} />

      <main style={{
        minHeight: '100vh',
        background: '#FAF7F2',
        fontFamily: "'DM Sans', sans-serif",
        color: '#2C2416',
        paddingTop: 72,
      }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=DM+Sans:wght@300;400;500&display=swap');
        `}</style>

        {/* Header */}
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '56px 24px 32px' }}>
          <p style={{ fontSize: 12, letterSpacing: '0.12em', color: '#9B8E7E', textTransform: 'uppercase', marginBottom: 12 }}>
            Sat Nam Rasayan
          </p>
          <h1 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 'clamp(28px, 5vw, 40px)',
            fontWeight: 400,
            color: '#2C2416',
            margin: '0 0 16px',
            lineHeight: 1.2,
          }}>
            Sitzungen buchen
          </h1>
          <p style={{ fontSize: 15, color: '#6B5D4F', lineHeight: 1.7, maxWidth: 520 }}>
            Tiefe Heilarbeit in der Tradition des Kundalini Yoga. Wähle das Angebot, das zu dir passt.
          </p>
        </div>

        {/* Product cards */}
        <div style={{
          maxWidth: 800,
          margin: '0 auto',
          padding: '0 24px 80px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 24,
        }}>
          {PRODUCTS.map(p => (
            <div key={p.id} style={{
              background: '#FFFCF7',
              border: '1px solid #DDD5C8',
              borderRadius: 12,
              padding: '32px 28px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}>
              <p style={{ fontSize: 11, letterSpacing: '0.1em', color: '#9B8E7E', textTransform: 'uppercase', margin: 0 }}>
                {p.subtitle}
              </p>
              <h2 style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 26,
                fontWeight: 400,
                margin: 0,
                color: '#2C2416',
              }}>{p.name}</h2>
              <p style={{ fontSize: 14, color: '#6B5D4F', lineHeight: 1.7, margin: 0, flex: 1 }}>
                {p.description}
              </p>
              <div style={{ marginTop: 8 }}>
                <span style={{ fontSize: 28, fontWeight: 500, color: '#2C2416' }}>{p.price} €</span>
                {p.perUnit && (
                  <span style={{ fontSize: 13, color: '#9B8E7E', marginLeft: 8 }}>{p.perUnit}</span>
                )}
              </div>
              <button
                onClick={() => setSelected(p)}
                style={{
                  marginTop: 4,
                  padding: '12px 0',
                  background: '#D3BC76',
                  color: '#2C2416',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: "'DM Sans', sans-serif",
                  cursor: 'pointer',
                  letterSpacing: '0.02em',
                  transition: 'opacity 0.2s',
                }}
                onMouseOver={e => (e.currentTarget.style.opacity = '0.85')}
                onMouseOut={e => (e.currentTarget.style.opacity = '1')}
              >
                Jetzt buchen
              </button>
            </div>
          ))}
        </div>

        {/* Quick-view modal */}
        {selected && (
          <div
            onClick={e => { if (e.target === e.currentTarget) closeModal() }}
            style={{
              position: 'fixed', inset: 0, zIndex: 300,
              background: 'rgba(44,36,22,0.45)',
              display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            }}
          >
            <div style={{
              background: '#FFFCF7',
              borderRadius: '16px 16px 0 0',
              padding: '32px 28px 40px',
              width: '100%',
              maxWidth: 520,
              maxHeight: '90vh',
              overflowY: 'auto',
              animation: 'slideUp 0.25s ease',
            }}>
              <style>{`@keyframes slideUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>

              {/* Modal header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <p style={{ fontSize: 11, letterSpacing: '0.1em', color: '#9B8E7E', textTransform: 'uppercase', margin: '0 0 4px' }}>
                    {selected.subtitle}
                  </p>
                  <h2 style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: 24, fontWeight: 400, margin: 0, color: '#2C2416',
                  }}>{selected.name}</h2>
                </div>
                <button onClick={closeModal} style={{
                  background: 'none', border: 'none', fontSize: 20, cursor: 'pointer',
                  color: '#9B8E7E', lineHeight: 1, padding: '0 0 0 16px',
                }}>✕</button>
              </div>

              <p style={{ fontSize: 14, color: '#6B5D4F', lineHeight: 1.7, marginBottom: 24 }}>
                {selected.description}
              </p>

              <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid #EDE8E0' }}>
                <span style={{ fontSize: 32, fontWeight: 500 }}>{selected.price} €</span>
                {selected.perUnit && (
                  <span style={{ fontSize: 13, color: '#9B8E7E', marginLeft: 8 }}>{selected.perUnit}</span>
                )}
              </div>

              {/* Payment area */}
              {status === 'success' ? (
                <div style={{
                  background: '#F0F7F0', border: '1px solid #C3DFC3', borderRadius: 8,
                  padding: '20px', textAlign: 'center', color: '#2A5C2A', fontSize: 14, lineHeight: 1.6,
                }}>
                  ✓ {message}
                </div>
              ) : status === 'error' ? (
                <div style={{
                  background: '#FDF0EE', border: '1px solid #E8C0BB', borderRadius: 8,
                  padding: '16px', textAlign: 'center', color: '#8B3030', fontSize: 14,
                }}>
                  {message}
                </div>
              ) : PAYPAL_CLIENT_ID ? (
                <>
                  {status === 'loading' && (
                    <p style={{ textAlign: 'center', color: '#9B8E7E', fontSize: 13, marginBottom: 12 }}>Verarbeitung…</p>
                  )}
                  <div ref={buttonsRef} />
                </>
              ) : (
                /* Fallback: no PayPal credentials configured */
                <a
                  href={selected.wcUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'block', textAlign: 'center',
                    padding: '14px', background: '#D3BC76',
                    color: '#2C2416', borderRadius: 6,
                    textDecoration: 'none', fontWeight: 600, fontSize: 14,
                  }}
                >
                  Zur Kasse →
                </a>
              )}

              {/* Always show fallback link below PayPal */}
              {PAYPAL_CLIENT_ID && status !== 'success' && (
                <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: '#9B8E7E' }}>
                  oder{' '}
                  <a href={selected.wcUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#9B8E7E' }}>
                    mit Kreditkarte / SEPA zahlen →
                  </a>
                </p>
              )}
            </div>
          </div>
        )}
      </main>
    </>
  )
}
