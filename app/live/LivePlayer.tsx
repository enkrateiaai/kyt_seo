'use client'

import { useEffect, useRef } from 'react'

export default function LivePlayer() {
  const noSleepRef = useRef<any>(null)

  useEffect(() => {
    // Load NoSleep dynamically
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/nosleep/0.12.0/nosleep.min.js'
    script.onload = () => {
      try {
        noSleepRef.current = new (window as any).NoSleep()
        // Enable on first user interaction (required by browsers)
        const enable = () => {
          noSleepRef.current?.enable()
          document.removeEventListener('touchstart', enable)
          document.removeEventListener('click', enable)
        }
        document.addEventListener('touchstart', enable, { once: true })
        document.addEventListener('click', enable, { once: true })
      } catch (e) {
        console.warn('NoSleep init failed', e)
      }
    }
    document.head.appendChild(script)

    return () => {
      noSleepRef.current?.disable()
    }
  }, [])

  return (
    <div style={{
      width: '100%',
      maxWidth: 960,
      margin: '0 auto',
      padding: '0 16px',
    }}>
      <div style={{
        width: '100%',
        height: 0,
        position: 'relative',
        paddingBottom: '56.25%',
        borderRadius: 8,
        overflow: 'hidden',
        background: '#000',
      }}>
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
          // @ts-ignore – non-standard but needed for iOS inline playback
          playsInline
        />
      </div>
    </div>
  )
}
