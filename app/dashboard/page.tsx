import { currentUser } from '@clerk/nextjs/server'
import { SignOutButton, SignInButton } from '@clerk/nextjs'

export default async function DashboardPage() {
  const user = await currentUser()

  const firstName = user?.firstName || user?.emailAddresses[0]?.emailAddress.split('@')[0]
  const email = user?.emailAddresses[0]?.emailAddress

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Guten Morgen' : hour < 17 ? 'Guten Tag' : 'Guten Abend'

  return (
    <main style={{
      minHeight: '100vh',
      background: '#080808',
      color: '#e8e8e8',
      fontFamily: 'monospace',
      padding: '40px'
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          {user ? (
            <>
              <p style={{ color: '#555', fontSize: '12px' }}>{email}</p>
              <SignOutButton redirectUrl="https://kundaliniyogatribe.de">
                <button style={{
                  background: 'transparent',
                  border: '1px solid #1e1e1e',
                  color: '#555',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  letterSpacing: '0.1em'
                }}>
                  Abmelden →
                </button>
              </SignOutButton>
            </>
          ) : (
            <div style={{ marginLeft: 'auto' }}>
              <SignInButton>
                <button style={{
                  background: 'transparent',
                  border: '1px solid #1e1e1e',
                  color: '#c8f064',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  letterSpacing: '0.1em'
                }}>
                  Anmelden / Log in →
                </button>
              </SignInButton>
            </div>
          )}
        </div>

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
            <p>✅ Angemeldet als <strong>{email}</strong></p>
          </div>
        )}

      </div>
    </main>
  )
}
