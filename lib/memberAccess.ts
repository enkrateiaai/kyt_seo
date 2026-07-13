import { auth } from '@clerk/nextjs/server'

type MembershipLike = {
  organization?: {
    id?: string | null
    slug?: string | null
    name?: string | null
  } | null
}

type ClerkUserLike = {
  id?: string | null
  firstName?: string | null
  first_name?: string | null
  fullName?: string | null
  imageUrl?: string | null
  image_url?: string | null
  primaryEmailAddress?: { emailAddress?: string | null } | null
  publicMetadata?: Record<string, unknown> | null
  organizationMemberships?: MembershipLike[] | null
  organization_memberships?: MembershipLike[] | null
  emailAddresses?: Array<{ emailAddress?: string | null }> | null
  email_addresses?: Array<{ email_address?: string | null }> | null
} | null

type EntitlementTier = 'none' | 'video' | 'live'

const ORGANIZATION_ENTITLEMENTS: Array<{ tier: Exclude<EntitlementTier, 'none'>; keys: string[] }> = [
  {
    tier: 'live',
    keys: [
      'org_3g4kskqf7orownjspuiq0sjfz9d',
      'the tribe (mit lives)',
      'kundalini-yoga-tribe-1783238437326087264',
      // Legacy live org id kept for backward compatibility with older Clerk setups.
      'org_3fzppbwz4alcimln7kfhq29jahg',
    ],
  },
  {
    tier: 'video',
    keys: [
      'org_3g4kx68gr2ojo2lhqpydamu8yak',
      'the tribe (ohne lives)',
      'the-tribe-ohne-lives--1783238470999217436',
      // Legacy video-only org id kept for backward compatibility with older Clerk setups.
      'org_3anhshdzp4zjgntjjtnde1h5azh',
    ],
  },
]

function normalize(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim().toLowerCase()
  return trimmed || null
}

function getOrganizationKeys(membership: MembershipLike | null | undefined): string[] {
  const organization = membership?.organization
  return [organization?.id, organization?.slug, organization?.name]
    .map((value) => normalize(value))
    .filter((value): value is string => Boolean(value))
}

function getMembershipTier(membership: MembershipLike | null | undefined): EntitlementTier {
  const keys = new Set(getOrganizationKeys(membership))
  for (const entry of ORGANIZATION_ENTITLEMENTS) {
    if (entry.keys.some((key) => keys.has(key))) {
      return entry.tier
    }
  }
  return 'none'
}

function getMemberships(user: ClerkUserLike): MembershipLike[] {
  if (!user) return []
  return user.organizationMemberships || user.organization_memberships || []
}

function getPublicMetadata(user: ClerkUserLike): Record<string, unknown> {
  if (!user?.publicMetadata || typeof user.publicMetadata !== 'object') {
    return {}
  }
  return user.publicMetadata
}

function hasMemberRole(user: ClerkUserLike): boolean {
  return normalize(getPublicMetadata(user).role) === 'member'
}

function getMetadataGroupKeys(user: ClerkUserLike): Set<string> {
  const metadata = getPublicMetadata(user)
  const rawGroups = [
    metadata.claimTargetGroup,
    ...(Array.isArray(metadata.memberGroups) ? metadata.memberGroups : []),
  ]

  return new Set(
    rawGroups
      .map((entry) => normalize(entry))
      .filter((value): value is string => Boolean(value)),
  )
}

function getMetadataTier(user: ClerkUserLike): EntitlementTier {
  const groups = getMetadataGroupKeys(user)
  for (const entry of ORGANIZATION_ENTITLEMENTS) {
    if (entry.keys.some((key) => groups.has(key))) {
      return entry.tier
    }
  }
  return hasMemberRole(user) ? 'video' : 'none'
}

function getOrganizationTier(user: ClerkUserLike): EntitlementTier {
  const memberships = getMemberships(user)
  if (memberships.length === 0) return 'none'

  let tier: EntitlementTier = 'none'
  for (const membership of memberships) {
    const currentTier = getMembershipTier(membership)
    if (currentTier === 'live') return 'live'
    if (currentTier === 'video') tier = 'video'
  }
  return tier
}

function getEntitlementTier(user: ClerkUserLike): EntitlementTier {
  if (!user) return 'none'

  // Clerk organizations are the source of truth whenever they exist.
  const organizationTier = getOrganizationTier(user)
  if (organizationTier !== 'none') {
    return organizationTier
  }

  return getMetadataTier(user)
}

function getEmails(user: ClerkUserLike): string[] {
  if (!user) return []

  const camel = Array.isArray(user.emailAddresses)
    ? user.emailAddresses.map((entry) => normalize(entry?.emailAddress)).filter((value): value is string => Boolean(value))
    : []

  const snake = Array.isArray(user.email_addresses)
    ? user.email_addresses.map((entry) => normalize(entry?.email_address)).filter((value): value is string => Boolean(value))
    : []

  return Array.from(new Set([...camel, ...snake]))
}

export function getPrimaryEmail(user: ClerkUserLike): string | null {
  if (!user) return null
  return normalize(user.primaryEmailAddress?.emailAddress) || getEmails(user)[0] || null
}

export function getUserDisplayName(user: ClerkUserLike): string | null {
  if (!user) return null
  return (
    user.firstName ||
    user.first_name ||
    user.fullName ||
    getPrimaryEmail(user)?.split('@')[0] ||
    user.id ||
    null
  )
}

export function getUserImageUrl(user: ClerkUserLike): string | null {
  if (!user) return null
  return user.imageUrl || user.image_url || null
}

export function hasVideoAccess(user: ClerkUserLike): boolean {
  const tier = getEntitlementTier(user)
  return tier === 'video' || tier === 'live'
}

export function hasLiveAccess(user: ClerkUserLike): boolean {
  return getEntitlementTier(user) === 'live'
}

export async function getViewerUser() {
  const { userId } = await auth()
  if (!userId) return null
  const secretKey = process.env.CLERK_SECRET_KEY
  if (!secretKey) return null

  const headers = { Authorization: `Bearer ${secretKey}` }
  const [userRes, membershipsRes] = await Promise.all([
    fetch(`https://api.clerk.com/v1/users/${userId}`, { headers, cache: 'no-store' }),
    fetch(`https://api.clerk.com/v1/users/${userId}/organization_memberships`, { headers, cache: 'no-store' }),
  ])

  if (!userRes.ok) return null

  const user = await userRes.json()
  const membershipsPayload = membershipsRes.ok ? await membershipsRes.json() : { data: [] }
  return {
    ...user,
    organizationMemberships: membershipsPayload.data || [],
  }
}
