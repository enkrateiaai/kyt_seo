import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/clerk/create-member
 *
 * Wird aus der Shop-Automation (n8n) nach einer NEUEN Bestellung aufgerufen.
 * Legt den Clerk-Nutzer an (falls es ihn noch nicht gibt), setzt die
 * passende Tribe-Berechtigung und erstellt fuer NEUE Kunden zusaetzlich eine
 * Clerk-Einladung, damit der Kunde sein Passwort selbst waehlt.
 *
 *   tier "live"  -> The Tribe (mit lives)  -> role "mitlives"
 *   tier "video" -> The Tribe (ohne lives) -> role "ohnelives"
 *
 * Body (JSON):
 *   { "email": "kunde@example.com", "firstName": "...", "lastName": "...",
 *     "tier": "live" | "video", "password": "...", "orderNumber": "1234",
 *     "sendInvite": true }
 *
 * "sendInvite" (Default true): nur fuer NEU angelegte Nutzer. Bestandskunden
 * bekommen keine Einladung - sie behalten ihr Passwort. Schlaegt die
 * Einladung fehl, laeuft alles normal weiter (Fallback auf Passwort).
 *
 * Auth: entweder "Authorization: Bearer <CLERK_MEMBER_SECRET>" oder
 *       "secret" im Body. Identisch zum Muster von /api/clerk/set-member.
 *
 * Antwort: { ok, created, invited, inviteId, inviteUrl, inviteOk, userId,
 *            email, tier, role, orgId, label, checked, orderNumber }
 */
const CLERK_API = 'https://api.clerk.com/v1'

const INVITE_REDIRECT_URL = 'https://kundaliniyogatribe.de/sign-up'
const INVITE_VALID_DAYS = 14

const TIERS = {
  live: {
    role: 'mitlives',
    orgId: 'org_3g4kskqf7orownjspuiq0sjfz9d',
    label: 'The Tribe (mit lives)',
  },
  video: {
    role: 'ohnelives',
    orgId: 'org_3g4kx68gr2ojo2lhqpydamu8yak',
    label: 'The Tribe (ohne lives)',
  },
} as const

type TierKey = keyof typeof TIERS

function clerkHeaders(): Record<string, string> {
  const key = process.env.CLERK_SECRET_KEY?.trim()
  if (!key) throw new Error('CLERK_SECRET_KEY not configured')
  return { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }
}

async function clerkFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${CLERK_API}${path}`, {
    ...init,
    headers: { ...clerkHeaders(), ...((init.headers as Record<string, string>) || {}) },
  })
  const text = await res.text()
  let body: any = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = { raw: text }
  }
  if (!res.ok) {
    const message = body?.errors?.[0]?.long_message || body?.errors?.[0]?.message || res.statusText
    throw new Error(`Clerk ${path} -> ${res.status}: ${message}`)
  }
  return body as T
}

/**
 * Die Clerk-REST-API liefert bei Listen ein reines Array (nicht { data: [...] }).
 * Beide Formen akzeptieren, damit der Abruf robust bleibt.
 */
function asList(payload: any): any[] {
  if (Array.isArray(payload)) return payload
  if (payload && Array.isArray(payload.data)) return payload.data
  return []
}

export async function POST(req: NextRequest) {
  const secret = process.env.CLERK_MEMBER_SECRET?.trim()
  if (!secret) {
    return NextResponse.json({ error: 'Not configured' }, { status: 500 })
  }

  let body: {
    email?: string
    firstName?: string
    lastName?: string
    tier?: string
    password?: string
    orderNumber?: string | number
    sendInvite?: boolean
    secret?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const headerSecret = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')?.trim()
  if (body.secret !== secret && headerSecret !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const email = String(body.email ?? '').trim().toLowerCase()
  if (!email || !email.includes('@')) {
    return NextResponse.json({ ok: false, error: 'invalid email' }, { status: 400 })
  }

  const tierKey: TierKey = body.tier === 'video' ? 'video' : 'live'
  const tier = TIERS[tierKey]
  const sendInvite = body.sendInvite !== false

  try {
    const list = await clerkFetch<any>(
      `/users?email_address=${encodeURIComponent(email)}&limit=1`,
    )
    const existing = asList(list)[0] ?? null
    let user: any = existing
    let created = false

    const existingMetadata = (existing?.public_metadata || {}) as Record<string, unknown>
    const existingGroups = Array.isArray(existingMetadata.memberGroups)
      ? (existingMetadata.memberGroups as string[]).filter(Boolean)
      : []
    const groups = Array.from(new Set([...existingGroups, tier.orgId]))
    // Admins duerfen nicht durch einen Kauf heruntergestuft werden.
    const role = existingMetadata.role === 'admin' ? 'admin' : tier.role
    const publicMetadata = { ...existingMetadata, role, memberGroups: groups, claimTargetGroup: tier.orgId }

    if (!existing) {
      user = await clerkFetch<any>('/users', {
        method: 'POST',
        body: JSON.stringify({
          email_address: [email],
          first_name: body.firstName || undefined,
          last_name: body.lastName || undefined,
          password: body.password || undefined,
          skip_email_verification: true,
          skip_password_requirement: !body.password,
          public_metadata: publicMetadata,
        }),
      })
      created = true
    } else {
      user = await clerkFetch<any>(`/users/${existing.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ public_metadata: publicMetadata }),
      })
    }

    // Einladung nur fuer NEUE Kunden. Bestandskunden behalten ihr Passwort.
    let invited = false
    let inviteId: string | null = null
    let inviteUrl: string | null = null
    let inviteOk = false
    let inviteError: string | null = null

    if (sendInvite && created) {
      try {
        const invitation = await clerkFetch<any>('/invitations', {
          method: 'POST',
          body: JSON.stringify({
            email_address: email,
            public_metadata: publicMetadata,
            redirect_url: INVITE_REDIRECT_URL,
            ignore_existing: true,
            expires_in_days: INVITE_VALID_DAYS,
          }),
        })
        inviteId = invitation?.id ?? null
        inviteUrl = invitation?.url ?? invitation?.publicUrl ?? null

        // Zuruecklesen und die Einladung wirklich pruefen.
        const invList = await clerkFetch<any>(
          `/invitations?email_address=${encodeURIComponent(email)}&limit=10`,
        )
        const found = asList(invList).find((inv: any) => inv?.id === inviteId)
        inviteOk = Boolean(
          found &&
            found.status === 'pending' &&
            String(found.email_address ?? '').toLowerCase() === email &&
            inviteUrl,
        )
        invited = inviteOk
      } catch (e: any) {
        // Einladung ist optional - der Kunde behält in jedem Fall sein Passwort.
        inviteError = e?.message || 'invite failed'
        console.error('Clerk invite error:', e)
      }
    }

    // Zuruecklesen und die Berechtigung wirklich pruefen.
    const check = await clerkFetch<any>(`/users/${user.id}`)
    const meta = (check?.public_metadata || {}) as Record<string, unknown>
    const checkGroups = Array.isArray(meta.memberGroups) ? (meta.memberGroups as string[]) : []
    const roleOk = meta.role === tier.role || meta.role === 'admin'
    const checked = roleOk && checkGroups.includes(tier.orgId)

    return NextResponse.json({
      ok: checked,
      created,
      invited,
      inviteId,
      inviteUrl,
      inviteOk,
      inviteError,
      userId: user.id,
      email,
      tier: tierKey,
      role,
      orgId: tier.orgId,
      label: tier.label,
      checked,
      orderNumber: body.orderNumber ?? null,
    })
  } catch (e: any) {
    console.error('Clerk create-member error:', e)
    return NextResponse.json({ ok: false, error: e?.message || 'Server error' }, { status: 500 })
  }
}
