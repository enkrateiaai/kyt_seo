import { currentUser } from '@clerk/nextjs/server'
import SiteHeader from '@/app/components/SiteHeader'

export default async function DashboardPage() {
  const user = await currentUser()

  const firstName = user?.firstName || user?.emailAddresses[0]?.emailAddress.split('@')[0]
  const email = user?.emailAddresses[0]?.emailAddress

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Guten Morgen' : hour < 17 ? 'Guten Tag' : 'Guten Abend'

  return (
    <>
      <SiteHeader isLoggedIn={!!user} signOutRedirectUrl="/" />

      <main style={{
        minHeight: '100vh',
        background: '#080808',
        color: '#e8e8e8',
        fontFamily: 'monospace',
        padding: '40px'
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '8px' }}>
          {user ? <>{greeting}, <span style={{ color: '#c8f064' }}>{firstName}</span></> : 'Willkommen'}
        </h1>
        {user && <p style={{ color: '#555', marginBottom: '40px' }}>{email}</p>}

        {user && (
          <div style={{
            background: '#111',
            border: '1px solid #1e1e1e',
            borderRadius: '10px',
            padding: '24px'
          }}>
            <p style={{ color: '#c8f064', marginBottom: '8px', fontSize: '11px', letterSpacing: '0.15em' }}>// STATUS</p>
            <p>◌ Angemeldet als <strong>{email}</strong></p>
          </div>
        )}

        </div>
      </main>
    </>
  )
}
