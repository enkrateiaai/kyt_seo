import { SignOutButton } from '@clerk/nextjs'
import Image from 'next/image'

interface SiteHeaderProps {
  isLoggedIn: boolean
  signOutRedirectUrl?: string
}

const MEMBERSHIP_URL = 'https://www.charan-amrit-kaur.de/yoga-tribe/'

export default function SiteHeader({ isLoggedIn, signOutRedirectUrl = '/' }: SiteHeaderProps) {
  return (
    <>
      <header className="site-nav">
        <div className="site-nav__inner">
          <a href="/" className="site-nav__logo">
            <Image src="/icon.png" alt="KYT" width={28} height={28} style={{ borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
            <span className="site-nav__logo-text">Kundalini Yoga Tribe</span>
          </a>

          <nav className="site-nav__links" aria-label="Hauptnavigation">
            <a href="/blog">Blog</a>
            <a href="/mantras">Mantras</a>
            <a href="/videos">Videos</a>
            <a href="/live">Live</a>
            {isLoggedIn ? (
              <SignOutButton redirectUrl={signOutRedirectUrl}>
                <button type="button" className="site-nav__auth-btn">Log out</button>
              </SignOutButton>
            ) : (
              <a href={MEMBERSHIP_URL}>Mitglieder</a>
            )}
          </nav>
        </div>
      </header>
      <div className="site-nav__spacer" aria-hidden="true" />

      <style>{`
        .site-nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 120;
          background: rgba(250, 247, 242, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid transparent;
          transition: border-color 0.35s ease, background 0.35s ease;
        }
        .site-nav__spacer {
          height: 72px;
        }
        .site-nav__inner {
          max-width: 1100px;
          margin: 0 auto;
          padding: 0 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          min-height: 72px;
          gap: 16px;
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
          font-size: 1.25rem;
          font-weight: 500;
          letter-spacing: 0.02em;
        }
        .site-nav__links {
          display: flex;
          align-items: center;
          gap: 24px;
          overflow-x: auto;
          white-space: nowrap;
          padding-bottom: 2px;
        }
        .site-nav__links a {
          font-family: 'DM Sans', sans-serif;
          font-size: 0.875rem;
          font-weight: 500;
          color: #6B5D4F;
          text-decoration: none;
          letter-spacing: 0.02em;
          position: relative;
          padding: 4px 0;
        }
        .site-nav__links a::after {
          content: '';
          position: absolute;
          left: 0;
          bottom: -2px;
          width: 0;
          height: 1.5px;
          background: #C4873B;
          transition: width 0.24s ease;
        }
        .site-nav__links a:hover::after { width: 100%; }
        .site-nav__links a:hover { color: #2C2416; }
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
        }
        .site-nav__auth-btn::after {
          content: '';
          position: absolute;
          left: 0;
          bottom: -2px;
          width: 0;
          height: 1.5px;
          background: #C4873B;
          transition: width 0.24s ease;
        }
        .site-nav__auth-btn:hover::after { width: 100%; }
        .site-nav__auth-btn:hover { color: #2C2416; }

        @media (max-width: 720px) {
          .site-nav__spacer { height: 64px; }
          .site-nav__inner {
            padding: 0 16px;
            min-height: 64px;
          }
          .site-nav__logo-text { font-size: 1.05rem; }
          .site-nav__links { gap: 16px; }
        }
      `}</style>
    </>
  )
}
