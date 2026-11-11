import SoulBusinessPage from './SoulBusinessPage'
import { verifyWebinarAccess } from '@/lib/webinarAccess'

export const dynamic = 'force-dynamic'

export { metadata } from './SoulBusinessPage'

// ?slot=<id> pins the page to one scheduled slot. ?t=<iso> is only a hint
// for humans - the slot id decides what is shown. ?token=<token> belongs to
// one buyer and lets the studio see who is watching.
//
// The webinar is a paid product: without a valid access token the page shows
// the call to action instead of the player.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ slot?: string | string[]; t?: string | string[]; token?: string | string[] }>
}) {
  const params = await searchParams
  const rawSlot = params.slot
  const slotId = typeof rawSlot === 'string' ? rawSlot.trim() : ''
  const rawToken = params.token
  const token = typeof rawToken === 'string' ? rawToken.trim() : ''

  const access = await verifyWebinarAccess(token)
  if (!access.ok) {
    return <SoulBusinessPage slotId={slotId} locked />
  }

  return <SoulBusinessPage slotId={slotId} token={token} />
}
