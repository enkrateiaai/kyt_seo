'use client'

import { SignInButton, SignOutButton, useUser } from '@clerk/nextjs'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'

interface SiteHeaderProps {
  isLoggedIn: boolean
  signOutRedirectUrl?: string
  clerkEnabled?: boolean
  userId?: string | null
  userLabel?: string | null
  userImageUrl?: string | null
  canAccessLive?: boolean
}

export default function SiteHeader({ isLoggedIn, signOutRedirectUrl = '/', userLabel }: SiteHeaderProps) {
  const pathname = usePathname() || '/'
  const { user } = useUser()
  const imageUrl = user?.imageUrl
  const displayName = user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split('@')[0] || userLabel
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [burgerOpen, setBurgerOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  useEffect(() => { setBurgerOpen(false) }, [pathname])

  return (
    <>
      <header className="site-nav">
        <div className="site-nav__bar">
          {/* Logo */}
          <a href="/" className="site-nav__logo">
            <Image src="/icon.png" alt="KYT" width={28} height={28} style={{ borderRadius: 4, objectFit: 'cover' }} />
            <span className="site-nav__logo-text">Kundalini Yoga Tribe</span>
          </a>

          {/* Desktop nav links */}
          <nav className="site-nav__desktop" aria-label="Hauptnavigation">
            <a href="/blog">Blog</a>
            <a href="/mantras">Mantras</a>
            <a href="/videos">Videos</a>
            <a href="/live">Live</a>
            {!isLoggedIn && (
              <SignInButton mode="redirect" forceRedirectUrl={pathname} fallbackRedirectUrl={pathname}>
                <button type="button" className="site-nav__auth-btn">Anmelden</button>
              </SignInButton>
            )}
          </nav>

          {/* Right: burger then avatar (avatar stays at far right) */}
          <div className="site-nav__right">
            <button
              type="button"
              className={`site-nav__burger${burgerOpen ? ' site-nav__burger--open' : ''}`}
              aria-label={burgerOpen ? 'Menü schließen' : 'Menü öffnen'}
              onClick={() => setBurgerOpen(o => !o)}
            >
              <span /><span /><span />
            </button>

            {isLoggedIn && (
              <div className="site-nav__avatar-wrap" ref={dropdownRef}>
                <button
                  type="button"
                  className="site-nav__avatar-btn"
                  onClick={() => setDropdownOpen(o => !o)}
                  aria-label="Profil-Menü"
                >
                  {imageUrl
                    ? <img src={imageUrl} alt="Profil" className="site-nav__avatar-img" />
                    : <span className="site-nav__avatar-default">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                        </svg>
                      </span>
                  }
                </button>

                {dropdownOpen && (
                  <div className="site-nav__dropdown">
                    <a href="/profil" className="site-nav__dropdown-profile" onClick={() => setDropdownOpen(false)}>
                      {imageUrl
                        ? <img src={imageUrl} alt="Profil" className="site-nav__dropdown-avatar" />
                        : <span className="site-nav__dropdown-avatar site-nav__dropdown-avatar--default">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                              <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                            </svg>
                          </span>
                      }
                      {displayName && <span className="site-nav__dropdown-name">{displayName}</span>}
                    </a>
                    <div className="site-nav__dropdown-divider" />
                    <SignOutButton redirectUrl={signOutRedirectUrl}>
                      <button type="button" className="site-nav__dropdown-item site-nav__dropdown-item--logout">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                          <polyline points="16 17 21 12 16 7" />
                          <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        Log out
                      </button>
                    </SignOutButton>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mobile drawer — slides down from header */}
        {burgerOpen && (
          <nav className="site-nav__mobile" aria-label="Mobile Navigation">
            <a href="/blog" onClick={() => setBurgerOpen(false)}>Blog</a>
            <a href="/mantras" onClick={() => setBurgerOpen(false)}>Mantras</a>
            <a href="/videos" onClick={() => setBurgerOpen(false)}>Videos</a>
            <a href="/live" onClick={() => setBurgerOpen(false)}>Live</a>
            {!isLoggedIn && (
              <SignInButton mode="redirect" forceRedirectUrl={pathname} fallbackRedirectUrl={pathname}>
                <button type="button" className="site-nav__mobile-auth" onClick={() => setBurgerOpen(false)}>
                  Anmelden
                </button>
              </SignInButton>
            )}
          </nav>
        )}
      </header>
      <div className="site-nav__spacer" aria-hidden="true" />

      <style>{`
        .site-nav {
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 120;
          background: rgba(250, 247, 242, 0.96);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid #EDE8E0;
        }
        .site-nav__spacer { height: 72px; }

        /* Top bar */
        .site-nav__bar {
          max-width: 1100px;
          margin: 0 auto;
          padding: 0 24px;
          display: flex;
          align-items: center;
          height: 72px;
          gap: 24px;
        }
        .site-nav__logo {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: #2C2416;
          flex-shrink: 0;
        }
        .site-nav__logo-text {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 1.2rem;
          font-weight: 500;
          letter-spacing: 0.02em;
        }

        /* Desktop links */
        .site-nav__desktop {
          display: flex;
          align-items: center;
          gap: 24px;
          flex: 1;
          justify-content: flex-end;
        }
        .site-nav__desktop a {
          font-family: 'DM Sans', sans-serif;
          font-size: 0.875rem;
          font-weight: 500;
          color: #6B5D4F;
          text-decoration: none;
          letter-spacing: 0.02em;
          position: relative;
          padding: 4px 0;
          white-space: nowrap;
        }
        .site-nav__desktop a::after {
          content: '';
          position: absolute;
          left: 0; bottom: -2px;
          width: 0; height: 1.5px;
          background: #D3BC76;
          transition: width 0.24s ease;
        }
        .site-nav__desktop a:hover::after { width: 100%; }
        .site-nav__desktop a:hover { color: #2C2416; }
        .site-nav__auth-btn {
          font-family: 'DM Sans', sans-serif;
          font-size: 0.875rem;
          font-weight: 500;
          color: #6B5D4F;
          background: transparent;
          border: none;
          cursor: pointer;
          letter-spacing: 0.02em;
          padding: 4px 0;
          position: relative;
          white-space: nowrap;
        }
        .site-nav__auth-btn::after {
          content: '';
          position: absolute;
          left: 0; bottom: -2px;
          width: 0; height: 1.5px;
          background: #D3BC76;
          transition: width 0.24s ease;
        }
        .site-nav__auth-btn:hover::after { width: 100%; }
        .site-nav__auth-btn:hover { color: #2C2416; }

        /* Right cluster — always pushed to the far right */
        .site-nav__right {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
          margin-left: auto;
        }

        /* Avatar */
        .site-nav__avatar-wrap { position: relative; }
        .site-nav__avatar-btn {
          background: none; border: none; padding: 0;
          cursor: pointer; display: flex; align-items: center;
        }
        .site-nav__avatar-img {
          width: 32px; height: 32px;
          border-radius: 50%; object-fit: cover;
          border: 1.5px solid #DDD5C8;
          transition: border-color 0.2s;
          display: block;
        }
        .site-nav__avatar-btn:hover .site-nav__avatar-img { border-color: #D3BC76; }
        .site-nav__avatar-default {
          width: 32px; height: 32px;
          border-radius: 50%;
          border: 1.5px solid #DDD5C8;
          display: flex; align-items: center; justify-content: center;
          color: #9B8E7E; background: #F5F0EA;
          transition: border-color 0.2s, color 0.2s;
        }
        .site-nav__avatar-btn:hover .site-nav__avatar-default { border-color: #D3BC76; color: #D3BC76; }
        .site-nav__dropdown {
          position: absolute;
          top: calc(100% + 10px); right: 0;
          background: #FFFCF7;
          border: 1px solid #DDD5C8;
          border-radius: 10px;
          box-shadow: 0 8px 24px rgba(44,36,22,0.10);
          min-width: 190px; padding: 6px;
          z-index: 200;
          animation: dropdownIn 0.15s ease;
        }
        @keyframes dropdownIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .site-nav__dropdown-profile {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 10px; border-radius: 7px;
          text-decoration: none; transition: background 0.15s;
        }
        .site-nav__dropdown-profile:hover { background: #F5F0EA; }
        .site-nav__dropdown-avatar {
          width: 30px; height: 30px;
          border-radius: 50%; object-fit: cover;
          border: 1.5px solid #DDD5C8; flex-shrink: 0;
        }
        .site-nav__dropdown-avatar--default {
          display: flex; align-items: center; justify-content: center;
          background: #F5F0EA; color: #9B8E7E;
        }
        .site-nav__dropdown-name {
          font-family: 'DM Sans', sans-serif;
          font-size: 0.85rem; font-weight: 600; color: #2C2416;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .site-nav__dropdown-item {
          display: flex; align-items: center; gap: 9px;
          width: 100%; padding: 9px 10px; border-radius: 6px;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.875rem; font-weight: 500; color: #4A3F34;
          background: none; border: none; cursor: pointer;
          text-align: left; transition: background 0.15s; white-space: nowrap;
        }
        .site-nav__dropdown-item:hover { background: #F5F0EA; }
        .site-nav__dropdown-item--logout { color: #9B5050; }
        .site-nav__dropdown-item--logout:hover { background: #FDF0EE; }
        .site-nav__dropdown-divider { height: 1px; background: #EDE8E0; margin: 4px 0; }

        /* Burger button */
        .site-nav__burger {
          display: none;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 5px;
          width: 40px; height: 40px;
          background: rgba(255,252,247,0.9);
          border: 1px solid #DDD5C8;
          border-radius: 50%;
          cursor: pointer;
        }
        .site-nav__burger span {
          display: block;
          width: 16px; height: 1.5px;
          background: #7A725F; border-radius: 2px;
          transition: transform 0.22s ease, opacity 0.22s ease;
          pointer-events: none;
        }
        .site-nav__burger--open span:nth-child(1) { transform: translateY(6.5px) rotate(45deg); }
        .site-nav__burger--open span:nth-child(2) { opacity: 0; }
        .site-nav__burger--open span:nth-child(3) { transform: translateY(-6.5px) rotate(-45deg); }

        /* Mobile drawer */
        .site-nav__mobile {
          display: none;
          border-top: 1px solid #EDE8E0;
          padding: 8px 24px 16px;
          flex-direction: column;
        }
        .site-nav__mobile a,
        .site-nav__mobile-auth {
          display: block;
          padding: 14px 0;
          border-bottom: 1px solid #EDE8E0;
          font-family: 'DM Sans', sans-serif;
          font-size: 1rem; font-weight: 500;
          color: #2C2416; text-decoration: none;
          background: none; border-style: none;
          border-bottom: 1px solid #EDE8E0;
          width: 100%; text-align: left;
          cursor: pointer;
        }
        .site-nav__mobile a:last-child,
        .site-nav__mobile-auth { border-bottom: none; }

        @media (max-width: 720px) {
          .site-nav__spacer { height: 60px; }
          .site-nav__bar { height: 60px; padding: 0 16px; gap: 12px; }
          .site-nav__logo-text { font-size: 1rem; }
          .site-nav__desktop { display: none; }
          .site-nav__burger { display: flex; }
          .site-nav__mobile { display: flex; }
        }
      `}</style>
    </>
  )
}
