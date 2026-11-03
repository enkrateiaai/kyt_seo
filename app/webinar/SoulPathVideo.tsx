'use client'

import React, { useEffect, useState } from 'react'

const C = {
  warmWhite: '#FAF7F2',
  sand: '#E8DDD0',
  gold: '#C9A96E',
  goldLight: '#E2C898',
  terracotta: '#D3BC76',
  deepBrown: '#2A1F1A',
  warmBrown: '#4A3728',
  muted: '#8A7B72',
  white: '#FFFFFF',
}

/**
 * Google-Drive-Video-ID. Leer = Platzhalter-Frame (Vorschau mit Hinweis).
 * Einsetzen, sobald Catherine das Webinar hochgeladen hat.
 */
const GOOGLE_DRIVE_FILE_ID = process.env.NEXT_PUBLIC_SOULPATH_DRIVE_ID || ''

export default function SoulPathVideo({
  ctaUrl,
  ctaLabel,
}: {
  ctaUrl: string
  ctaLabel: string
}) {
  // DSGVO: erst nach aktivem Klick wird der externe Player geladen.
  const [consent, setConsent] = useState(false)
  const [hasDriveVideo, setHasDriveVideo] = useState(false)

  useEffect(() => {
    setHasDriveVideo(Boolean(GOOGLE_DRIVE_FILE_ID))
  }, [])

  const frameStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    aspectRatio: '16 / 9',
    background: `linear-gradient(150deg, #2A1F1A 0%, #4A3728 55%, #7A8C72 100%)`,
    borderRadius: 12,
    overflow: 'hidden',
    border: `1px solid ${C.sand}`,
    boxShadow: '0 24px 60px rgba(42,31,26,0.18)',
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={frameStyle}>
        {!consent ? (
          /* ── Platzhalter + Einwilligung ── */
          <button
            type="button"
            onClick={() => setConsent(true)}
            aria-label="Webinar-Video laden und abspielen"
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 18, border: 'none', cursor: 'pointer',
              background: 'transparent', color: C.warmWhite, padding: 24, textAlign: 'center',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 74, height: 74, borderRadius: '50%',
                border: `1px solid ${C.goldLight}`, background: 'rgba(201,169,110,0.16)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <span
                style={{
                  width: 0, height: 0, marginLeft: 5,
                  borderTop: '11px solid transparent', borderBottom: '11px solid transparent',
                  borderLeft: '18px solid #FAF7F2',
                }}
              />
            </span>
            <span
              style={{
                fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(20px, 3vw, 28px)',
                fontWeight: 400, lineHeight: 1.3,
              }}
            >
              {hasDriveVideo
                ? 'Webinar-Video abspielen'
                : 'Dein 30-minütiges Webinar'}
            </span>
            <span style={{ fontSize: 13, opacity: 0.75, maxWidth: 420, lineHeight: 1.7 }}>
              Mit einem Klick wird das Video von Google Drive geladen. Dabei werden Daten an
              Google übertragen – Details in der Datenschutzerklärung.
            </span>
          </button>
        ) : hasDriveVideo ? (
          /* ── Embed nach Einwilligung ── */
          <iframe
            src={`https://drive.google.com/file/d/${GOOGLE_DRIVE_FILE_ID}/preview`}
            title="Soul Path Webinar"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
          />
        ) : (
          /* ── Platzhalter-Frame (kein Video hinterlegt) ── */
          <div
            style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 14,
              color: C.warmWhite, textAlign: 'center', padding: 28,
            }}
          >
            <span style={{ fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', opacity: 0.8 }}>
              Platzhalter
            </span>
            <span
              style={{
                fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(22px, 3.4vw, 32px)',
                lineHeight: 1.3, maxWidth: 520,
              }}
            >
              Hier wird dein 30-minütiges Webinar erscheinen
            </span>
            <span style={{ fontSize: 13, opacity: 0.7, lineHeight: 1.7, maxWidth: 460 }}>
              Das Video wird von Google Drive eingebettet. Sobald die Aufzeichnung hochgeladen
              ist, erscheint der Player an dieser Stelle automatisch.
            </span>
          </div>
        )}
      </div>

      {/* CTA direkt unter dem Video */}
      <div style={{ marginTop: 22, textAlign: 'center' }}>
        <a
          href={ctaUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block', background: C.terracotta, color: C.deepBrown,
            fontSize: 16, fontWeight: 600, letterSpacing: '0.03em', textDecoration: 'none',
            padding: '16px 38px', borderRadius: 999,
          }}
        >
          {ctaLabel}
        </a>
        <p style={{ color: C.muted, fontSize: 13, margin: '16px 0 0', lineHeight: 1.7 }}>
          30 Minuten · Persönlich · Unverbindlich – mit mir persönlich
        </p>
      </div>
    </div>
  )
}
