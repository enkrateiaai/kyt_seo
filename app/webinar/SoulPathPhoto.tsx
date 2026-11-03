'use client'

import React, { useState } from 'react'

const C = {
  sand: '#E8DDD0',
  terracotta: '#D3BC76',
  warmBrown: '#4A3728',
}

/**
 * Catherine-Scheitterlein-Foto mit gracefulm Platzhalter.
 * Datei: public/soulpath/catherine.jpg
 */
export default function SoulPathPhoto() {
  const [failed, setFailed] = useState(false)

  return (
    <div
      style={{
        aspectRatio: '4 / 5', width: '100%', maxWidth: 380, margin: '0 auto',
        borderRadius: 10, overflow: 'hidden', position: 'relative',
        background: `linear-gradient(160deg, ${C.sand} 0%, ${C.terracotta} 100%)`,
        border: `1px solid ${C.sand}`,
      }}
    >
      {!failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/soulpath/catherine.jpg"
          alt="Catherine Scheitterlein, Soul Path Coach"
          onError={() => setFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <div
          style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 10,
            color: C.warmBrown, textAlign: 'center', padding: 24,
          }}
        >
          <span style={{ fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            Dein Foto
          </span>
          <span style={{ fontSize: 13, opacity: 0.7, lineHeight: 1.6 }}>
            Platzhalter: public/soulpath/catherine.jpg
          </span>
        </div>
      )}
    </div>
  )
}
