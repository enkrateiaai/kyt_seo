import { auth, clerkClient } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import redis from '@/lib/redis'
import Link from 'next/link'

const C = {
  bg: '#06060a',
  panel: '#0d0d14',
  text: '#e0e0e0',
  accent: '#c8f064',
  border: '#1a1a2e',
}

function Result({ ok, message }: { ok: boolean; message: string }) {
  return (
    <div style={{
      minHeight: '100vh', background: C.bg, color: C.text,
      fontFamily: 'monospace', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '40px 24px',
    }}>
      <div style={{
        maxWidth: 480, width: '100%', background: C.panel,
        border: `1px solid ${C.border}`, borderRadius: 14, padding: 40, textAlign: 'center',
      }}>
        <p style={{ fontSize: 32, marginBottom: 16 }}>{ok ? '🙏' : '⚠️'}</p>
        <p style={{ color: ok ? C.accent : '#ff6b6b', marginBottom: 24, fontSize: 15, lineHeight: 1.7 }}>
          {message}
        </p>
        {ok && (
          <Link href="/videos" style={{
            display: 'inline-block', background: C.accent, color: '#000',
            textDecoration: 'none', padding: '10px 20px', borderRadius: 6,
            fontSize: 13, fontWeight: 700,
          }}>
            Zum Mitgliederbereich →
          </Link>
        )}
      </div>
    </div>
  )
}

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { userId } = await auth()
  const { token } = await searchParams

  // Clerk app-level invite redirects here with the sign-up ticket — just send to sign-up
  if (!token) {
    redirect('/sign-in')
  }

  if (!userId) {
    redirect(`/sign-in?redirect_url=/accept-invite?token=${token}`)
  }

  // Validate the in-app invite token
  const raw = await redis.get(`invite:token:${token}`)
  if (!raw) {
    return <Result ok={false} message="Dieser Einladungslink ist abgelaufen oder ungültig." />
  }

  const { inviteId, userId: invitedUserId, role, group } = JSON.parse(raw as string)

  if (userId !== invitedUserId) {
    return <Result ok={false} message="Diese Einladung ist für einen anderen Account. Bitte melde dich mit der eingeladenen E-Mail-Adresse an." />
  }

  // Set role on Clerk user
  const client = await clerkClient()
  await client.users.updateUserMetadata(userId, {
    publicMetadata: { role, ...(group ? { group } : {}) },
  })

  // Mark invite accepted in Redis
  const invitesRaw = await redis.get('invites')
  if (invitesRaw) {
    const invites: any[] = JSON.parse(invitesRaw as string)
    const updated = invites.map((i: any) =>
      i.id === inviteId
        ? { ...i, status: 'accepted', acceptedAt: new Date().toISOString(), clerkUserId: userId }
        : i
    )
    await redis.set('invites', JSON.stringify(updated))
  }

  // Consume the token
  await redis.del(`invite:token:${token}`)

  return <Result ok message={`Willkommen! Dein Account wurde als ${role === 'admin' ? 'Admin' : 'Mitglied'} freigeschaltet.`} />
}
