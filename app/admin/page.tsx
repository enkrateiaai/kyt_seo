import { auth } from '@clerk/nextjs/server'
import { SignInButton } from '@clerk/nextjs'
import Image from 'next/image'
import AdminClient from './AdminClient'
import AdminUsers from './AdminUsers'
import { hasClerkClientConfig, hasClerkServerConfig } from '@/lib/authConfig'
import { getViewerUser, isAdminUser } from '@/lib/memberAccess'

const C = {
  bg: '#06060a',
  panel: '#0d0d14',
  text: '#e0e0e0',
  textSoft: '#888',
  accent: '#c8f064',
  border: '#1a1a2e',
}

function Gate({ clerkEnabled, loggedIn }: { clerkEnabled: boolean; loggedIn: boolean }) {
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
        {!loggedIn && clerkEnabled && (
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
        {!loggedIn && !clerkEnabled && (
          <p style={{ color: C.textSoft, fontSize: 13, lineHeight: 1.7, margin: 0 }}>
            Die lokale Testumgebung lauft ohne Clerk-Anbindung. Der Admin-Bereich bleibt hier deshalb deaktiviert.
          </p>
        )}
      </div>
    </div>
  )
}

async function fetchAllUsers(secretKey: string) {
  const res = await fetch('https://api.clerk.com/v1/users?limit=100&order_by=-created_at', {
    headers: { Authorization: `Bearer ${secretKey}` },
    cache: 'no-store',
  })
  if (!res.ok) return []
  return res.json()
}

// Fetch members of each known legacy org and return userId -> orgName map
async function fetchOrgMemberMap(secretKey: string): Promise<Record<string, string>> {
  const ORG_IDS = [
    'org_3G4kskqF7oRoWNjsPuiQ0SjFz9D',
    'org_3G4kx68GR2OJo2LHQPyDaMu8yAK',
  ]
  const headers = { Authorization: `Bearer ${secretKey}` }
  const map: Record<string, string> = {}
  await Promise.all(ORG_IDS.map(async (orgId) => {
    try {
      const res = await fetch(`https://api.clerk.com/v1/organizations/${orgId}/memberships?limit=100`, { headers, cache: 'no-store' })
      if (!res.ok) return
      const { data } = await res.json()
      const orgName: string = data?.[0]?.organization?.name || orgId
      for (const m of (data || [])) {
        if (m.public_user_data?.user_id) map[m.public_user_data.user_id] = orgName
      }
    } catch {}
  }))
  return map
}

function roleInfo(u: any, orgMap: Record<string, string>): { value: string; display: string } {
  const role = u.public_metadata?.role || u.publicMetadata?.role
  if (role) return { value: role, display: role }
  const orgName = orgMap[u.id]
  if (orgName) {
    const lower = orgName.toLowerCase()
    if (lower.includes('mit lives')) return { value: 'mitlives', display: `mitlives (${orgName})` }
    if (lower.includes('ohne lives')) return { value: 'ohnelives', display: `ohnelives (${orgName})` }
  }
  return { value: '—', display: '—' }
}

function fmtDate(iso: string | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Berlin' })
}

export default async function AdminPage() {
  const clerkClientEnabled = hasClerkClientConfig()
  const clerkServerEnabled = hasClerkServerConfig()
  const { userId } = clerkServerEnabled ? await auth() : { userId: null }
  const user = clerkServerEnabled && userId ? await getViewerUser() : null
  const isAdmin = isAdminUser(user)

  if (!isAdmin) {
    return <Gate clerkEnabled={clerkClientEnabled} loggedIn={!!userId} />
  }

  const secretKey = process.env.CLERK_SECRET_KEY
  const [rawUsers, orgMap] = secretKey
    ? await Promise.all([fetchAllUsers(secretKey), fetchOrgMemberMap(secretKey)])
    : [[], {}]

  const userRows = rawUsers.map((u: any) => {
    const { value, display } = roleInfo(u, orgMap)
    return {
      id: u.id,
      name: [u.first_name, u.last_name].filter(Boolean).join(' ') || '—',
      email: u.email_addresses?.[0]?.email_address || '—',
      role: value,
      roleDisplay: display,
      lastSeen: fmtDate(u.unsafe_metadata?.lastSeen),
    }
  })

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, fontFamily: 'monospace', padding: '32px 24px' }}>
      <AdminClient />
      <AdminUsers initialUsers={userRows} />
    </div>
  )
}
