export const dynamic = 'force-dynamic'

import { auth } from '@clerk/nextjs/server'
import ProgrammContent from './ProgrammContent'
import SiteHeader from '@/app/components/SiteHeader'

export const metadata = {
  title: 'Programm – Kundalini Yoga Tribe',
  description:
    'Kalender mit Sonntags-Meditationen und Gastauftritten im Kundalini Yoga Tribe.',
  robots: 'noindex',
}

export default async function ProgrammPage() {
  const { userId } = await auth()
  return (
    <>
      <SiteHeader isLoggedIn={!!userId} />
      <ProgrammContent />
    </>
  )
}
