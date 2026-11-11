import PaidWebinarNotice from '../webinar/PaidWebinarNotice'

export const dynamic = 'force-dynamic'

// The free registration is gone: the webinar is a paid product now.
// The page stays as a signpost to the checkout.
export const metadata = {
  title: 'Webinar anmelden – Kundalini Yoga Tribe',
  description:
    'Das Soul Path Webinar ist ein bezahltes Webinar: 29 EUR einmalig, dein persönlicher Zugangslink kommt per E-Mail.',
  alternates: { canonical: 'https://kundaliniyogatribe.de/webinar' },
  robots: { index: false, follow: true },
}

export default function WebinarAnmeldungPage() {
  return <PaidWebinarNotice />
}
