import SoulPathPage from './SoulPathPage'

export const dynamic = 'force-dynamic'

export { metadata } from './SoulPathPage'

// ?slot=<id> pins the page to one scheduled slot. ?t=<iso> is only a hint
// for humans - the slot id decides what is shown. ?token=<token> belongs to
// one booking and lets the studio see who is watching.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ slot?: string | string[]; t?: string | string[]; token?: string | string[] }>
}) {
  const params = await searchParams
  const raw = params.slot
  const slotId = typeof raw === 'string' ? raw.trim() : ''
  const rawToken = params.token
  const token = typeof rawToken === 'string' ? rawToken.trim() : ''

  return <SoulPathPage slotId={slotId} token={token} />
}
