import { currentUser } from '@clerk/nextjs/server'
import { SignOutButton, SignInButton } from '@clerk/nextjs'
import Image from 'next/image'
import YouTubeGallery from './gallery'

export default async function VideosPage() {
  const user = await currentUser()
  const isMember = user?.publicMetadata?.role === 'member'
  const email = user?.emailAddresses[0]?.emailAddress

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          font-family: 'DM Sans', -apple-system, sans-serif;
          background: #FAF7F2;
          color: #2C2416;
          -webkit-font-smoothing: antialiased;
        }

        .v-nav {
          position: sticky;
          top: 0;
          z-index: 100;
          background: #FAF7F2;
          border-bottom: 1px solid #DDD5C8;
          padding: 14px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .v-nav__logo {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: #2C2416;
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 1.1rem;
          font-weight: 400;
        }

        .v-nav__logo-mark {
          color: #C4873B;
          font-size: 1.2rem;
        }

        .v-nav__right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .v-nav__email {
          font-size: 12px;
          color: #9B8E7E;
        }

        /* Hide email on small screens */
        @media (max-width: 600px) {
          .v-nav__email { display: none; }
          .v-nav__logo span:last-child { display: none; }
          .v-nav { padding: 12px 16px; }
          .v-btn { padding: 6px 14px; font-size: 12px; }
        }

        .v-btn {
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 500;
          padding: 8px 18px;
          border-radius: 100px;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid #DDD5C8;
          background: transparent;
          color: #6B5D4F;
        }

        .v-btn:hover {
          border-color: #C4873B;
          color: #C4873B;
        }

        .v-btn--primary {
          background: #C4873B;
          border-color: #C4873B;
          color: #fff;
        }

        .v-btn--primary:hover {
          background: #A66E2B;
          border-color: #A66E2B;
          color: #fff;
        }
      `}</style>

      <nav className="v-nav">
        <a href="https://kundaliniyogatribe.de/" className="v-nav__logo">
          <Image src="/icon.png" alt="Logo" width={30} height={30} style={{ borderRadius: 4 }} />
          Kundalini Yoga Tribe
        </a>
        <div className="v-nav__right">
          {user ? (
            <>
              <span className="v-nav__email">{email}</span>
              <SignOutButton redirectUrl="/videos">
                <button className="v-btn">Abmelden</button>
              </SignOutButton>
            </>
          ) : (
            <SignInButton>
              <button className="v-btn v-btn--primary">Anmelden →</button>
            </SignInButton>
          )}
        </div>
      </nav>

      <YouTubeGallery isMember={isMember} />
    </>
  )
}
