/**
 * One-off migration: list all members from both Clerk Organizations and
 * backfill their publicMetadata.role = 'member' in the Clerk user record.
 *
 * Usage:
 *   CLERK_SECRET_KEY=sk_live_... node scripts/migrate-org-members.mjs
 *   OR (dry run):
 *   CLERK_SECRET_KEY=sk_live_... DRY_RUN=1 node scripts/migrate-org-members.mjs
 */

const SECRET = process.env.CLERK_SECRET_KEY
if (!SECRET) { console.error('Set CLERK_SECRET_KEY'); process.exit(1) }

const DRY = process.env.DRY_RUN === '1'
const BASE = 'https://api.clerk.com/v1'

const ORG_IDS = [
  'org_3G4kx68GR2OJo2LHQPyDaMu8yAK',  // The Tribe (ohne lives)
  'org_3G4kskqF7oRoWNjsPuiQ0SjFz9D',  // The Tribe (mit lives)
]

async function clerkGet(path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${SECRET}` },
  })
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}: ${await res.text()}`)
  return res.json()
}

async function clerkPatch(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${SECRET}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`PATCH ${path} → ${res.status}: ${await res.text()}`)
  return res.json()
}

async function getOrgMembers(orgId) {
  const members = []
  let offset = 0
  while (true) {
    const data = await clerkGet(`/organizations/${orgId}/memberships?limit=100&offset=${offset}`)
    if (!data.data?.length) break
    members.push(...data.data)
    if (members.length >= data.total_count) break
    offset += 100
  }
  return members
}

async function getAllClerkUsers() {
  const users = []
  let offset = 0
  while (true) {
    const data = await clerkGet(`/users?limit=100&offset=${offset}`)
    if (!Array.isArray(data) || !data.length) break
    users.push(...data)
    if (data.length < 100) break
    offset += 100
  }
  return users
}

async function main() {
  console.log(DRY ? '=== DRY RUN ===' : '=== LIVE MIGRATION ===')

  // Collect all org member user IDs across both orgs
  const orgMemberUserIds = new Set()
  for (const orgId of ORG_IDS) {
    console.log(`\nFetching members for org ${orgId}...`)
    let members
    try {
      members = await getOrgMembers(orgId)
    } catch (e) {
      console.warn(`  Could not fetch org ${orgId} (may not exist):`, e.message)
      continue
    }
    console.log(`  Found ${members.length} members`)
    for (const m of members) {
      orgMemberUserIds.add(m.public_user_data?.user_id ?? m.user_id)
    }
  }

  console.log(`\nTotal unique org members: ${orgMemberUserIds.size}`)

  // Also check ALL users for existing role (they may have been set via set-member endpoint)
  console.log('\nFetching all Clerk users...')
  const allUsers = await getAllClerkUsers()
  console.log(`Total Clerk users: ${allUsers.length}`)

  // Summary
  let alreadySet = 0, willSet = 0, skipped = 0

  for (const user of allUsers) {
    const existingRole = user.public_metadata?.role
    const isOrgMember = orgMemberUserIds.has(user.id)
    const email = user.email_addresses?.[0]?.email_address

    if (existingRole === 'admin') {
      console.log(`  SKIP (admin)  ${user.id} ${email}`)
      skipped++
      continue
    }

    if (existingRole === 'member') {
      console.log(`  OK (already)  ${user.id} ${email}`)
      alreadySet++
      continue
    }

    if (!isOrgMember) {
      console.log(`  SKIP (no-org) ${user.id} ${email}`)
      skipped++
      continue
    }

    // This user is in an org but doesn't have role set → backfill
    console.log(`  SET member    ${user.id} ${email}${DRY ? ' [dry]' : ''}`)
    willSet++

    if (!DRY) {
      await clerkPatch(`/users/${user.id}/metadata`, {
        public_metadata: { role: 'member' },
      })
      // Small delay to avoid Clerk rate limit
      await new Promise(r => setTimeout(r, 150))
    }
  }

  console.log(`\n=== Done ===`)
  console.log(`  Already 'member': ${alreadySet}`)
  console.log(`  Set to 'member':  ${willSet}${DRY ? ' (dry — not applied)' : ''}`)
  console.log(`  Skipped:          ${skipped}`)
}

main().catch(e => { console.error(e); process.exit(1) })
