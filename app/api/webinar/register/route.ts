import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// The free registration of the former Soul Path webinar.
//
// The webinar is a paid product now: a free registration would hand out
// access to a paid webinar, and the mails it sent contained a link that the
// paywall rejected afterwards. The endpoint is therefore closed with 410.
//
// Buyers go through /api/webinar/checkout (Stripe) and get their access
// token there. The previous implementation is preserved in the git history.
export async function POST(_request: NextRequest) {
  return NextResponse.json(
    {
      error:
        'Die kostenlose Anmeldung ist geschlossen. Das Webinar kostet 29 EUR - bitte über /webinar buchen.',
      paid: true,
      checkoutUrl: '/webinar',
    },
    { status: 410, headers: { 'cache-control': 'no-store, max-age=0' } },
  )
}
