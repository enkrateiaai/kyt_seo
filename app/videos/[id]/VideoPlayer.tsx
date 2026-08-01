'use client'

import { useEffect, useState } from 'react'
import ExternalWindowLink from '@/app/components/ExternalWindowLink'

interface Props {
  videoId: string
  initialLocked: boolean
  thumbnailUrl: string
  title: string
  canonicalSlug: string
  clerkEnabled: boolean
  isLoggedIn: boolean
}

export default function VideoPlayer({
  videoId,
  initialLocked,
  thumbnailUrl,
  title,
  canonicalSlug,
  clerkEnabled,
  isLoggedIn,
}: Props) {
  const [locked, setLocked] = useState(initialLocked)

  useEffect(() => {
    if (!initialLocked) return
    fetch('/api/member-access', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.isMember) setLocked(false) })
      .catch(() => {})
  }, [initialLocked])

  if (!locked) {
    return (
      <div className="vd-embed">
        <div className="vd-embed__ratio">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    )
  }

  return (
    <div className="vd-lock">
      <div className="vd-lock__ratio">
        <img className="vd-lock__thumb" src={thumbnailUrl} alt={title} />
        <div className="vd-lock__overlay">
          <div className="vd-lock__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
          </div>
          <p className="vd-lock__text">Nur für Mitglieder</p>
          <p className="vd-lock__sub">Dieses Video ist Teil der Mitgliedschaft. Melde dich an oder werde Mitglied, um vollen Zugang zu erhalten.</p>
          <div className="vd-lock__actions">
            <ExternalWindowLink href="https://www.charan-amrit-kaur.de/yoga-tribe/" className="vd-lock__btn vd-lock__btn--primary">Mitglied werden →</ExternalWindowLink>
            {!isLoggedIn && clerkEnabled && (
              <a href={`/sign-in?redirect_url=${encodeURIComponent(`/videos/${canonicalSlug}`)}`} className="vd-lock__btn vd-lock__btn--secondary">Anmelden</a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
