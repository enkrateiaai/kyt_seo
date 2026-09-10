import ProgrammContent from './ProgrammContent'
import SiteHeader from '@/app/components/SiteHeader'

export const metadata = {
  title: 'Programm – Kundalini Yoga Tribe',
  description:
    'Kalender mit Sonntags-Meditationen und Gastauftritten im Kundalini Yoga Tribe.',
  robots: 'noindex',
}

export default function ProgrammPage() {
  return (
    <>
      <SiteHeader isLoggedIn={false} />
      <ProgrammContent />
    </>
  )
}
