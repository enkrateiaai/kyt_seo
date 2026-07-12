import { auth, clerkClient } from '@clerk/nextjs/server'

type MembershipLike = {
  organization?: {
    id?: string | null
    slug?: string | null
    name?: string | null
  } | null
}

type ClerkUserLike = {
  publicMetadata?: Record<string, unknown> | null
  organizationMemberships?: MembershipLike[] | null
} | null

// "The Tribe (mit lives)" — videos + live access
const TRIBE_MIT_LIVES_ORG_ID = 'org_3G4kskqF7oRoWNjsPuiQ0SjFz9D'
// "The Tribe (ohne lives)" — videos only
const TRIBE_OHNE_LIVES_ORG_ID = 'org_3G4kx68GR2OJo2LHQPyDaMu8yAK'

const VIDEO_ORG_IDS = new Set([TRIBE_MIT_LIVES_ORG_ID, TRIBE_OHNE_LIVES_ORG_ID])

// Legacy keys for backward compat with publicMetadata group checks
const MEMBERLIGHT_KEYS = new Set(['memberlight', 'member-light', TRIBE_MIT_LIVES_ORG_ID])

function normalize(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim().toLowerCase()
  return trimmed || null
}

function readStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(normalize).filter((entry): entry is string => Boolean(entry))
  }

  const single = normalize(value)
  return single ? [single] : []
}

function isMemberlightMarker(value: unknown): boolean {
  return readStringList(value).some((entry) => MEMBERLIGHT_KEYS.has(entry))
}

function orgIdOf(membership: MembershipLike | null | undefined): string | null {
  return normalize(membership?.organization?.id)
}

export function hasVideoAccess(user: ClerkUserLike): boolean {
  if (!user) return false

  const metadata = user.publicMetadata || {}
  const role = normalize(metadata.role)
  if (role === 'member' || role === 'admin') return true

  if (
    isMemberlightMarker(metadata.group) ||
    isMemberlightMarker(metadata.memberGroup) ||
    isMemberlightMarker(metadata.claimTargetGroup) ||
    isMemberlightMarker(metadata.memberGroups)
  ) {
    return true
  }

  const memberships = user.organizationMemberships || []
  return memberships.some(m => { const id = orgIdOf(m); return id ? VIDEO_ORG_IDS.has(id) : false })
}

export function hasLiveAccess(user: ClerkUserLike): boolean {
  if (!user) return false
  const metadata = user.publicMetadata || {}

  // Legacy group-based exclusion
  if (
    isMemberlightMarker(metadata.group) ||
    isMemberlightMarker(metadata.memberGroup) ||
    isMemberlightMarker(metadata.claimTargetGroup) ||
    isMemberlightMarker(metadata.memberGroups)
  ) {
    return false
  }

  const role = normalize(metadata.role)
  if (role === 'member' || role === 'admin') return true

  // "The Tribe (mit lives)" org members get live access
  const memberships = user.organizationMemberships || []
  return memberships.some(m => orgIdOf(m) === TRIBE_MIT_LIVES_ORG_ID)
}

export function getPrimaryEmail(user: ClerkUserLike & { emailAddresses?: Array<{ emailAddress: string }> | null } | null): string | null {
  if (!user) return null
  return (user as { emailAddresses?: Array<{ emailAddress: string }> | null }).emailAddresses?.[0]?.emailAddress ?? null
}

export function getUserDisplayName(user: ClerkUserLike & { firstName?: string | null; emailAddresses?: Array<{ emailAddress: string }> | null } | null): string | null {
  if (!user) return null
  const u = user as { firstName?: string | null; emailAddresses?: Array<{ emailAddress: string }> | null }
  return u.firstName || u.emailAddresses?.[0]?.emailAddress?.split('@')[0] || null
}

export function getUserImageUrl(user: ClerkUserLike & { imageUrl?: string | null } | null): string | null {
  if (!user) return null
  return (user as { imageUrl?: string | null }).imageUrl ?? null
}

export async function getViewerUser() {
  const { userId } = await auth()
  if (!userId) return null

  const client = await clerkClient()
  const [user, { data: orgMemberships }] = await Promise.all([
    client.users.getUser(userId),
    client.users.getOrganizationMembershipList({ userId }),
  ])
  return { ...user, organizationMemberships: orgMemberships }
}
