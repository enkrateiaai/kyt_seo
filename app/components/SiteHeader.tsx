'use client'

import { useEffect, useState } from 'react'
import { SignInButton } from '@clerk/nextjs'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import ExternalWindowLink from '@/app/components/ExternalWindowLink'

interface SiteHeaderProps {
  clerkEnabled?: boolean
  isLoggedIn: boolean
  signOutRedirectUrl?: string
  userId?: string | null
  userLabel?: string | null
  userImageUrl?: string | null
  canAccessLive?: boolean
}

export default function SiteHeader({
  clerkEnabled = true,
  isLoggedIn,
  signOutRedirectUrl: _signOutRedirectUrl,
  userId,
  userLabel,
  userImageUrl,
}: SiteHeaderProps) {
  const pathname = usePathname() || '/'
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  const authNode = clerkEnabled && isLoggedIn ? (
    <a href="/api/sign-out" className="site-header__cta" onClick={() => setMenuOpen(false)}>
      Log out
    </a>
  ) : clerkEnabled ? (
    <SignInButton mode="redirect" forceRedirectUrl={pathname} fallbackRedirectUrl={pathname}>
      <button type="button" className="site-header__cta" onClick={() => setMenuOpen(false)}>
        Anmelden
      </button>
    </SignInButton>
  ) : (
    <ExternalWindowLink
      href="https://www.charan-amrit-kaur.de/yoga-tribe/"
      className="site-header__cta"
      onClick={() => setMenuOpen(false)}
    >
      Mitglied werden
    </ExternalWindowLink>
  )

  return (
    <>
      <header className="site-header">
        <div className="site-header__inner">
          <a href="/" className="site-header__logo">
            <Image
              src="/icon.png"
              alt="KYT"
              width={28}
              height={28}
              style={{ borderRadius: 4, objectFit: 'cover', flexShrink: 0 }}
            />
            <span className="site-header__logo-text">Kundalini Yoga Tribe</span>
          </a>

          <button
            type="button"
            className={`site-header__toggle${menuOpen ? ' site-header__toggle--open' : ''}`}
            aria-expanded={menuOpen}
            aria-controls="site-header-links"
            aria-label={menuOpen ? 'Navigation schliessen' : 'Navigation oeffnen'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>

          <nav
            id="site-header-links"
            className={`site-header__links${menuOpen ? ' site-header__links--open' : ''}`}
            aria-label="Hauptnavigation"
          >
            <a href="/blog" onClick={() => setMenuOpen(false)}>
              Blog
            </a>
            <a href="/mantras" onClick={() => setMenuOpen(false)}>
              Mantras
            </a>
            <a href="/videos" onClick={() => setMenuOpen(false)}>
              Videos
            </a>
            <a href="/live" onClick={() => setMenuOpen(false)}>
              Live
            </a>
            {authNode}
            {clerkEnabled && isLoggedIn ? (
              <a href="/profil" className="site-header__profile" onClick={() => setMenuOpen(false)} aria-label="Profil">
                {userImageUrl ? (
                  <img
                    src={userImageUrl}
                    alt={userLabel ? `${userLabel} Profilbild` : 'Profilbild'}
                    className="site-header__profile-image"
                  />
                ) : (
                  <span className="site-header__profile-fallback" aria-hidden="true">
                    {((userLabel || userId || 'P').trim().charAt(0) || 'P').toUpperCase()}
                  </span>
                )}
              </a>
            ) : null}
          </nav>
        </div>
      </header>
      <div className="site-header__spacer" aria-hidden="true" />

      <style>{`
        .site-header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 100;
          background: rgba(250, 247, 242, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid transparent;
          transition: border-color 0.4s ease, background 0.4s ease;
        }
        .site-header__spacer {
          height: 72px;
        }
        .site-header__inner {
          max-width: 1100px;
          margin: 0 auto;
          padding: 0 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 72px;
          gap: 20px;
        }
        .site-header__logo {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
          color: #2c2416;
          flex-shrink: 0;
        }
        .site-header__logo-text {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 1.25rem;
          font-weight: 500;
          letter-spacing: 0.02em;
        }
        .site-header__links {
          display: flex;
          align-items: center;
          gap: 32px;
          margin-left: auto;
        }
        .site-header__links a,
        .site-header__links button {
          font-family: 'Jost', 'DM Sans', sans-serif;
          font-size: 0.875rem;
          font-weight: 500;
          color: #6b5d4f;
          text-decoration: none;
          letter-spacing: 0.02em;
          position: relative;
          padding: 4px 0;
          background: transparent;
          border: none;
          cursor: pointer;
        }
        .site-header__links a::after,
        .site-header__links button::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          width: 0;
          height: 1.5px;
          background: #d3bc76;
          transition: width 0.4s ease;
        }
        .site-header__links a:hover,
        .site-header__links button:hover {
          color: #2c2416;
        }
        .site-header__links a:hover::after,
        .site-header__links button:hover::after {
          width: 100%;
        }
        .site-header__cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 40px;
          padding: 0 22px !important;
          border: 1px solid #c4714a !important;
          color: #c4714a !important;
          letter-spacing: 0.22em !important;
          text-transform: uppercase;
          font-size: 11px !important;
        }
        .site-header__cta::after {
          display: none !important;
        }
        .site-header__cta:hover {
          background: #c4714a !important;
          color: #faf7f2 !important;
        }
        .site-header__profile {
          width: 34px;
          height: 34px;
          border-radius: 999px;
          overflow: hidden;
          border: 1px solid rgba(196, 113, 74, 0.24);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: rgba(244, 236, 224, 0.8);
        }
        .site-header__profile::after {
          display: none !important;
        }
        .site-header__profile-image,
        .site-header__profile-fallback {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .site-header__profile-image {
          object-fit: cover;
        }
        .site-header__profile-fallback {
          font-family: 'Jost', sans-serif;
          font-size: 0.82rem;
          font-weight: 500;
          color: #7a725f;
        }
        .site-header__toggle {
          display: none;
          flex-direction: column;
          gap: 5px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 8px;
          margin-left: auto;
        }
        .site-header__toggle span {
          display: block;
          width: 24px;
          height: 2px;
          background: #2c2416;
          transition: transform 0.3s ease, opacity 0.3s ease;
        }
        .site-header__toggle--open span:nth-child(1) {
          transform: translateY(7px) rotate(45deg);
        }
        .site-header__toggle--open span:nth-child(2) {
          opacity: 0;
        }
        .site-header__toggle--open span:nth-child(3) {
          transform: translateY(-7px) rotate(-45deg);
        }
        @media (max-width: 720px) {
          .site-header__spacer {
            height: 64px;
          }
          .site-header__inner {
            height: 64px;
            padding: 0 16px;
            justify-content: flex-end;
          }
          .site-header__logo {
            display: none;
          }
          .site-header__toggle {
            display: flex;
          }
          .site-header__links {
            display: none;
            position: absolute;
            top: 64px;
            left: 0;
            right: 0;
            flex-direction: column;
            align-items: stretch;
            gap: 16px;
            background: #faf7f2;
            border-bottom: 1px solid #efe6cc;
            padding: 24px 16px;
          }
          .site-header__links--open {
            display: flex;
          }
          .site-header__links a,
          .site-header__links button {
            width: 100%;
            text-align: left;
          }
          .site-header__profile {
            width: 40px;
            height: 40px;
          }
        }
      `}</style>
    </>
  )
}
