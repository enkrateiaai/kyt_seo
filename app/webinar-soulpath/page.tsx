import SoulPathPage from '../webinar/SoulPathPage'

export const dynamic = 'force-dynamic'

export { metadata } from '../webinar/SoulPathPage'

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ slot?: string | string[] }>
}) {
  const params = await searchParams
  const raw = params.slot
  const slotId = typeof raw === 'string' ? raw.trim() : ''
  return <SoulPathPage slotId={slotId} />
}
