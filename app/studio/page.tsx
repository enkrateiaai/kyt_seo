import { auth } from '@clerk/nextjs/server'
import { hasClerkServerConfig } from '@/lib/authConfig'
import { getViewerUser, isAdminUser } from '@/lib/memberAccess'
import StudioClient from './StudioClient'

export const metadata = { title: 'Studio – Kundalini Yoga Tribe' }

export default async function StudioPage() {
  const clerkEnabled = hasClerkServerConfig()
  const { userId } = clerkEnabled ? await auth() : { userId: null }
  const user = clerkEnabled && userId ? await getViewerUser() : null
  const admin = user ? isAdminUser(user) : false

  if (!admin) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f1117', color: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', fontSize: 14 }}>
        Kein Zugriff. Bitte als Admin einloggen.
      </div>
    )
  }

  return <StudioClient />
}
