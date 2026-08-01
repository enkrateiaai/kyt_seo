import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import SiteHeader from '@/app/components/SiteHeader'
import ProfilContent from './ProfilContent'
import TrackVisit from '@/app/components/TrackVisit'
import { getUserDisplayName, getUserImageUrl, getViewerUser, hasVideoAccess, hasLiveAccess } from '@/lib/memberAccess'

function aboLabel(user: Awaited<ReturnType<typeof getViewerUser>>): { label: string; detail: string; color: string } {
  if (!user) return { label: 'Kein aktives Abo', detail: '', color: '#9B8E7E' }
  const role = (user as any)?.public_metadata?.role || (user as any)?.publicMetadata?.role
  if (role === 'admin') return { label: 'Admin', detail: 'Vollzugang', color: '#D3BC76' }
  if (hasLiveAccess(user)) return { label: 'Mit Lives', detail: 'Video- & Live-Zugang', color: '#D3BC76' }
  if (hasVideoAccess(user)) return { label: 'Ohne Lives', detail: 'Video-Zugang', color: '#C4A882' }
  return { label: 'Kein aktives Abo', detail: 'Kein Zugang', color: '#9B8E7E' }
}

export default async function ProfilPage() {
  const { userId } = await auth()
  if (!userId) redirect('/anmeldung')

  const user = await getViewerUser()
  const abo = aboLabel(user)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=DM+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; background: #FAF7F2; color: #2C2416; }
      `}</style>
      <TrackVisit />
      <SiteHeader
        clerkEnabled
        isLoggedIn
        userId={userId}
        userLabel={getUserDisplayName(user)}
        userImageUrl={getUserImageUrl(user)}
      />
      <main style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px 0' }}>
        <div style={{
          background: '#fff',
          border: '1px solid #DDD5C8',
          borderRadius: 10,
          padding: '20px 24px',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}>
          <div>
            <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9B8E7E', marginBottom: 4 }}>Aktuelles Abo</p>
            <p style={{ fontSize: 18, fontWeight: 600, color: abo.color }}>{abo.label}</p>
            {abo.detail && <p style={{ fontSize: 13, color: '#6B5D4F', marginTop: 2 }}>{abo.detail}</p>}
          </div>
          <span style={{ fontSize: 28 }}>✦</span>
        </div>
      </main>
      <ProfilContent />
    </>
  )
}
