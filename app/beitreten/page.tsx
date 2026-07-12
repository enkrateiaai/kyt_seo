import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Beitreten - Kundalini Yoga Tribe',
  robots: 'noindex',
}

export default function BeitretenPage() {
  redirect('https://www.charan-amrit-kaur.de/yoga-tribe/')
}
