import YouTubeGallery from './gallery'
import SiteHeader from '@/app/components/SiteHeader'
import { hasClerkClientConfig, hasClerkConfig } from '@/lib/authConfig'
import { getUserDisplayName, getUserImageUrl, getViewerUser, hasLiveAccess, hasVideoAccess } from '@/lib/memberAccess'

export const dynamic = 'force-dynamic'

export default async function VideosPage() {
  const clerkEnabled = hasClerkClientConfig()
  const user = hasClerkConfig() ? await getViewerUser() : null
  const isMember = hasVideoAccess(user)
  const canAccessLive = hasLiveAccess(user)
  const userLabel = getUserDisplayName(user)
  const userImageUrl = getUserImageUrl(user)

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

      <SiteHeader clerkEnabled={clerkEnabled} isLoggedIn={!!user} userId={user?.id} userLabel={userLabel} userImageUrl={userImageUrl} canAccessLive={canAccessLive} />

      <YouTubeGallery isMember={isMember} />
    </>
  )
}
