// Archive route of the former Soul Path webinar page.
//
// The webinar is a paid product now, so this route does not hand out the
// video any more: it behaves exactly like /webinar. Visitors without a valid
// access token get the landing page with "Jetzt anmelden", visitors with the
// personal link from their purchase get the player.
import AIWebinarLanding from '../webinar/AIWebinarLanding'
import SoulPathPage from '../webinar/SoulPathPage'
import { verifyWebinarAccess } from '@/lib/webinarAccess'

export const dynamic = 'force-dynamic'

export { metadata } from '../webinar/SoulPathPage'

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[]; slot?: string | string[] }>
}) {
  const params = await searchParams
  const rawToken = params.token
  const token = typeof rawToken === 'string' ? rawToken.trim() : ''

  if (token) {
    const access = await verifyWebinarAccess(token)
    if (access.ok) {
      const rawSlot = params.slot
      const slotId = typeof rawSlot === 'string' ? rawSlot.trim() : ''
      return <SoulPathPage slotId={slotId} token={token} />
    }
    return <AIWebinarLanding invalidToken />
  }

  return <AIWebinarLanding />
}
