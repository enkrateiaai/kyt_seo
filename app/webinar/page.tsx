import SoulPathPage from './SoulPathPage'

export const dynamic = 'force-dynamic'

export { metadata } from './SoulPathPage'

// ?slot=<id> pins the page to one scheduled slot. ?t=<iso> is only a hint
// for humans - the slot id decides what is shown.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ slot?: string | string[]; t?: string | string[] }>
}) {
  const params = await searchParams
  const raw = params.slot
  const slotId = typeof raw === 'string' ? raw.trim() : ''

  return <SoulPathPage slotId={slotId} />
}
