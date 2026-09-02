'use client'

import { useEffect, useRef, useState } from 'react'

const C = {
  accent: '#D3BC76',
  border: '#DDD5C8',
  text: '#2C2416',
  textSoft: '#6B5D4F',
  textMuted: '#9B8E7E',
  bg: '#FAF7F2',
  bgWarm: '#F3EDE4',
}

const tabStyle = (active: boolean) => ({
  padding: '10px 20px',
  background: active ? C.accent : 'transparent',
  color: active ? '#fff' : C.textSoft,
  border: `1px solid ${active ? C.accent : C.border}`,
  borderRadius: 6,
  fontSize: 13,
  fontFamily: "'DM Sans', sans-serif",
  fontWeight: active ? 600 : 400,
  cursor: 'pointer',
  transition: 'all 0.15s',
})

function OneStreamPlayer() {
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
      } catch (e) {
        console.warn('NoSleep init failed', e)
      }
    }
    document.head.appendChild(script)
    return () => { noSleepRef.current?.disable() }
  }, [])

  return (
    <div style={{ width: '100%', height: 0, position: 'relative', paddingBottom: '56.25%', borderRadius: 8, overflow: 'hidden', background: '#000' }}>
      <iframe
        id="live-player"
        src="https://player.onestream.live/embed?token=MjE3NTkyMw==&type=up"
        style={{ position: 'absolute', width: '100%', height: '100%', border: 'none' }}
        scrolling="no"
        allow="autoplay; fullscreen"
        allowFullScreen
        // @ts-ignore
        playsInline
      />
    </div>
  )
}

function SrsPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<any>(null)
  const [state, setState] = useState<'loading' | 'playing' | 'offline'>('loading')

  useEffect(() => {
    const HLS_URL = '/api/studio/hls/live.m3u8'
    const video = videoRef.current
    if (!video) return

    const tryPlay = (Hls: any) => {
      if (Hls.isSupported()) {
        const hls = new Hls({ liveSyncDurationCount: 3, liveMaxLatencyDurationCount: 6 })
        hlsRef.current = hls
        hls.loadSource(HLS_URL)
        hls.attachMedia(video)
        hls.on(Hls.Events.MANIFEST_PARSED, () => { setState('playing'); video.play().catch(() => {}) })
        hls.on(Hls.Events.ERROR, (_: any, data: any) => {
          if (data.fatal) { setState('offline'); hls.destroy() }
        })
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = HLS_URL
        video.addEventListener('loadedmetadata', () => { setState('playing'); video.play().catch(() => {}) })
        video.addEventListener('error', () => setState('offline'))
      } else {
        setState('offline')
      }
    }

    if ((window as any).Hls) {
      tryPlay((window as any).Hls)
    } else {
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.6.3/dist/hls.min.js'
      script.onload = () => tryPlay((window as any).Hls)
      script.onerror = () => setState('offline')
      document.head.appendChild(script)
    }

    return () => { hlsRef.current?.destroy() }
  }, [])

  if (state === 'offline') {
    return (
      <div style={{ width: '100%', paddingBottom: '56.25%', position: 'relative', background: '#111', borderRadius: 8 }}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <span style={{ fontSize: 32 }}>📡</span>
          <p style={{ color: C.textMuted, fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}>
            Kein Stream aktiv
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: 0, position: 'relative', paddingBottom: '56.25%', borderRadius: 8, overflow: 'hidden', background: '#000' }}>
      {state === 'loading' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: C.textMuted, fontFamily: "'DM Sans', sans-serif", fontSize: 14 }}>Verbinde…</p>
        </div>
      )}
      <video
        ref={videoRef}
        style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'contain' }}
        controls
        playsInline
        muted={false}
      />
    </div>
  )
}

export default function LivePlayer() {
  const [tab, setTab] = useState<'onestream' | 'srs'>('onestream')

  return (
    <div style={{ width: '100%', maxWidth: 960, margin: '0 auto', padding: '0 16px' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={() => setTab('onestream')} style={tabStyle(tab === 'onestream')}>
          Tribe Live
        </button>
        <button onClick={() => setTab('srs')} style={tabStyle(tab === 'srs')}>
          Studio Stream
        </button>
      </div>

      {tab === 'onestream' ? <OneStreamPlayer /> : <SrsPlayer />}
    </div>
  )
}
