import { auth, currentUser } from '@clerk/nextjs/server'
import { SignInButton } from '@clerk/nextjs'
import Image from 'next/image'
import AdminClient from './AdminClient'

const C = {
  bg: '#06060a',
  panel: '#0d0d14',
  text: '#e0e0e0',
  textSoft: '#888',
  accent: '#c8f064',
  border: '#1a1a2e',
}

function Gate({ loggedIn }: { loggedIn: boolean }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: C.bg,
      color: C.text,
      fontFamily: 'monospace',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
    }}>
      <div style={{
        maxWidth: 520,
        width: '100%',
        background: C.panel,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: 32,
        textAlign: 'center',
      }}>
        <Image src="/icon.png" alt="KYT" width={56} height={56} style={{ marginBottom: 20, opacity: 0.9 }} />
        <p style={{ fontSize: 10, letterSpacing: '0.25em', textTransform: 'uppercase', color: C.accent, marginBottom: 8 }}>
          // Admin Protected
        </p>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#fff', marginBottom: 16 }}>
          Zugriff nur für Mitglieder
        </h1>
        <p style={{ color: C.textSoft, fontSize: 14, lineHeight: 1.8, margin: '0 0 24px' }}>
          {loggedIn
            ? 'Dieser Bereich ist nur für freigeschaltete Mitglieder oder Admins verfügbar.'
            : 'Bitte melde dich mit einem Mitgliederkonto an, um den Admin-Bereich zu öffnen.'}
        </p>
        {!loggedIn && (
          <SignInButton mode="redirect" forceRedirectUrl="/admin" fallbackRedirectUrl="/admin">
            <button style={{
              background: C.accent,
              color: '#000',
              border: 'none',
              borderRadius: 6,
              padding: '10px 18px',
              fontFamily: 'monospace',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}>
              Anmelden
            </button>
          </SignInButton>
        )}
      </div>
    </div>
  )
}

export default async function AdminPage() {
  const { userId } = await auth()
  const user = userId ? await currentUser() : null
  const role = (user?.publicMetadata as any)?.role
  const isMember = role === 'member' || role === 'admin'

  if (!isMember) {
    return <Gate loggedIn={!!userId} />
  }

  return <AdminClient />
}
