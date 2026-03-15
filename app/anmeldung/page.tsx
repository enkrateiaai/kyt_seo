import { Suspense } from 'react'
import AnmeldungContent from './AnmeldungContent'

export const metadata = {
  title: 'Anmeldung – Kundalini Yoga Tribe',
  robots: 'noindex',
}

export default function AnmeldungPage() {
  return (
    <Suspense>
      <AnmeldungContent />
    </Suspense>
  )
}
