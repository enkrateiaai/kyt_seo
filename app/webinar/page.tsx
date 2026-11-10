import redis from '@/lib/redis'
import AIWebinarLanding from './AIWebinarLanding'
import SoulPathPage from './SoulPathPage'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'AI Webinar – Kundalini Yoga Tribe',
  description:
    'KI für dein Soul Business – konkret, praxisnah und ohne Technik-Stress. 60-minütiges Webinar für Coaches, Yogalehrerinnen und spirituelle UnternehmerInnen.',
  keywords: 'AI Webinar, KI Business, Kundalini Yoga, Soul Business, Charan Amrit Kaur',
  alternates: { canonical: 'https://kundaliniyogatribe.de/webinar' },
  openGraph: {
    title: 'AI Webinar – KI für dein Soul Business',
    description: 'Wie du KI-Tools sinnvoll in dein spirituelles Business integrierst und mehr Zeit für deine Berufung gewinnst.',
    url: 'https://kundaliniyogatribe.de/webinar',
    type: 'website',
    locale: 'de_DE',
  },
  robots: { index: true, follow: true },
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[]; slot?: string | string[]; t?: string | string[] }>
}) {
  const params = await searchParams
  const rawToken = params.token
  const token = typeof rawToken === 'string' ? rawToken.trim() : ''

  if (token) {
    let isValid = false
    try {
      const data = await redis.get(`webinar:access:${token}`)
      isValid = Boolean(data)
    } catch {
      // Redis unavailable – treat as invalid
    }
    if (isValid) {
      const rawSlot = params.slot
      const slotId = typeof rawSlot === 'string' ? rawSlot.trim() : ''
      return <SoulPathPage slotId={slotId} token={token} />
    }
    // Token was present but invalid
    return <AIWebinarLanding invalidToken />
  }

  return <AIWebinarLanding />
}
