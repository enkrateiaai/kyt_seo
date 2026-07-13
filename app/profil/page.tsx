import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import SiteHeader from '@/app/components/SiteHeader'
import ProfilContent from './ProfilContent'
import { getUserDisplayName, getUserImageUrl, getViewerUser } from '@/lib/memberAccess'

export default async function ProfilPage() {
  const { userId } = await auth()
  if (!userId) redirect('/anmeldung')

  const user = await getViewerUser()

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=DM+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; background: #FAF7F2; color: #2C2416; }
      `}</style>
      <SiteHeader
        clerkEnabled
        isLoggedIn
        userId={userId}
        userLabel={getUserDisplayName(user)}
        userImageUrl={getUserImageUrl(user)}
      />
      <ProfilContent />
    </>
  )
}
