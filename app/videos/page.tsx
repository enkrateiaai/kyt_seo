import { currentUser } from '@clerk/nextjs/server'
import YouTubeGallery from './gallery'
import SiteHeader from '@/app/components/SiteHeader'

export default async function VideosPage() {
  const user = await currentUser()
  const isMember = user?.publicMetadata?.role === 'member'

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
      `}</style>

      <SiteHeader isLoggedIn={!!user} signOutRedirectUrl="/videos" />

      <YouTubeGallery isMember={isMember} />
    </>
  )
}
