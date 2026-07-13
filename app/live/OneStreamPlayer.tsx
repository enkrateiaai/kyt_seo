'use client'

import { useEffect, useRef } from 'react'

export default function OneStreamPlayer() {
  const noSleepRef = useRef<any>(null)

  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/nosleep/0.12.0/nosleep.min.js'
    script.onload = () => {
      try {
        noSleepRef.current = new (window as any).NoSleep()
        const enable = () => {
          noSleepRef.current?.enable()
          document.removeEventListener('touchstart', enable)
          document.removeEventListener('click', enable)
        }
        document.addEventListener('touchstart', enable, { once: true })
        document.addEventListener('click', enable, { once: true })
      } catch (error) {
        console.warn('NoSleep init failed', error)
      }
    }
    document.head.appendChild(script)

    return () => {
      noSleepRef.current?.disable()
    }
  }, [])

  return (
    <section
      style={{
        background: 'rgba(255, 252, 247, 0.82)',
        border: '1px solid #DDD5C8',
        borderRadius: 28,
        padding: 22,
        boxShadow: '0 20px 60px rgba(44, 36, 22, 0.08)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 18,
          alignItems: 'center',
          marginBottom: 18,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <p style={{ margin: 0, color: '#9B8E7E', fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
            Livestream
          </p>
          <h2 style={{ margin: '6px 0 0', color: '#2C2416', fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 500 }}>
            OneStream Ubertragung
          </h2>
        </div>
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 999,
            background: 'rgba(211,188,118,0.18)',
            color: '#6B5D4F',
            fontSize: 13,
          }}
        >
          Exklusiv fur Mitglieder
        </div>
      </div>

      <div
        style={{
          width: '100%',
          height: 0,
          position: 'relative',
          paddingBottom: '56.25%',
          borderRadius: 22,
          overflow: 'hidden',
          background: 'linear-gradient(180deg, #241a16 0%, #0d0a09 100%)',
        }}
      >
        <iframe
          id="live-player"
          src="https://player.onestream.live/embed?token=MjE3NTkyMw==&type=up"
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            border: 'none',
          }}
          scrolling="no"
          allow="autoplay; fullscreen"
          allowFullScreen
        />
      </div>
    </section>
  )
}
