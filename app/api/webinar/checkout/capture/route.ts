import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { retrievePaymentIntent } from '@/lib/stripe'
import { createWcOrder } from '@/lib/woocommerce'
import redis from '@/lib/redis'
import { isResendConfigured, sendResendEmail } from '@/lib/resend'
import { buildWebinarCheckoutMail } from '@/lib/webinarCheckoutMail'
import { ACCESS_TTL_SECONDS, indexBuyer } from '@/lib/webinarAccess'

const WC_WEBINAR_PRODUCT_ID = 8365
const PRICE_CENTS = 2900
const PRICE_CURRENCY = 'eur'
const PRODUCT_KEY = 'ai-webinar'
const TOKEN_TTL_SEC = ACCESS_TTL_SECONDS // 30 days

// Maps a payment to the token it produced. A double submit (retry, refresh)
// must not hand out a second token, a second order and a second mail.
const INTENT_TOKEN_KEY = 'webinar:access:intent:'

export async function POST(req: NextRequest) {
  let body: { paymentIntentId?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Ungültiger JSON-Body' }, { status: 400 })
  }

  const paymentIntentId = typeof body.paymentIntentId === 'string' ? body.paymentIntentId.trim() : ''
  if (!paymentIntentId) return NextResponse.json({ error: 'paymentIntentId fehlt' }, { status: 400 })

  // 1. Verify payment
  const intent = await retrievePaymentIntent(paymentIntentId)
  if (intent.status !== 'succeeded') {
    return NextResponse.json({ error: 'Zahlung nicht abgeschlossen', status: intent.status }, { status: 402 })
  }

  // 1b. Verify that this really is the AI-Webinar payment (29 EUR).
  // Without this check every succeeded PaymentIntent of this Stripe account
  // (e.g. a 1 EUR test intent) would grant a full webinar access.
  const amount = intent.amount_received ?? intent.amount
  if (amount !== PRICE_CENTS || intent.currency !== PRICE_CURRENCY || intent.metadata?.product !== PRODUCT_KEY) {
    return NextResponse.json(
      { error: 'Zahlung passt nicht zum AI Webinar', amount, currency: intent.currency },
      { status: 402 },
    )
  }

  const name = (intent.metadata?.name || '').trim()
  const email = (intent.metadata?.email || '').trim().toLowerCase()
  if (!email) {
    return NextResponse.json({ error: 'E-Mail-Adresse fehlt in der Zahlung' }, { status: 422 })
  }

  // 1c. Same payment, second call -> reuse the token that was already issued.
  const intentKey = `${INTENT_TOKEN_KEY}${paymentIntentId}`
  let token: string | null = null
  try {
    const existing = await redis.get(intentKey)
    if (existing) token = existing
  } catch {
    // Redis unreachable - fall through and issue a fresh token.
  }

  // 2. Create WooCommerce order
  let orderId: number | null = null
  let orderError: string | undefined
  if (!token) {
    try {
      const order = await createWcOrder({
        productId: WC_WEBINAR_PRODUCT_ID,
        billing: {
          first_name: name.split(' ')[0] || name,
          last_name: name.split(' ').slice(1).join(' ') || '',
          email,
        },
        transactionId: paymentIntentId,
      })
      orderId = (order as { id?: number })?.id ?? null
      if (!orderId) {
        orderError = 'Bestellung ohne ID zurückgegeben'
        console.error('[webinar] WooCommerce-Bestellung ohne ID', order)
      }
    } catch (error) {
      // non-blocking, but never silent: a missing order means no bookkeeping
      orderError = error instanceof Error ? error.message : String(error)
      console.error('[webinar] WooCommerce-Bestellung fehlgeschlagen', error)
    }
  }

  // 3. Generate access token
  if (!token) {
    token = randomBytes(32).toString('hex')
    const accessData = JSON.stringify({
      email, name,
      createdAt: new Date().toISOString(),
      txId: paymentIntentId,
      productId: WC_WEBINAR_PRODUCT_ID,
    })
    try {
      await redis.setex(`webinar:access:${token}`, TOKEN_TTL_SEC, accessData)
      await redis.setex(intentKey, TOKEN_TTL_SEC, token)
    } catch {
      return NextResponse.json({ error: 'Zugang konnte nicht gespeichert werden' }, { status: 500 })
    }
  }

  // 3b. Remember who bought it and which token belongs to them, so the
  // buyer can be found again later (reminder mail, support) without asking
  // the customer for their token. A failure here must not block the purchase:
  // the access token itself is already stored.
  try {
    await indexBuyer(email, token)
  } catch (error) {
    console.error('[webinar] Käufer-Index konnte nicht geschrieben werden', error)
  }

  // 4. Send confirmation email
  let mailSent = false
  let mailError: string | undefined
  if (isResendConfigured()) {
    const mail = buildWebinarCheckoutMail({ name, email, token })
    const result = await sendResendEmail({ to: email, subject: mail.subject, html: mail.html, text: mail.text })
    mailSent = result.ok
    if (!result.ok) {
      mailError = result.error
      console.error('[webinar] Bestätigungsmail konnte nicht zugestellt werden', result.error)
    }
  } else {
    mailError = 'RESEND_API_KEY fehlt'
    console.error('[webinar] Bestätigungsmail nicht konfiguriert')
  }

  // The token is also returned so the client can show the link directly when
  // the mail provider is down - the buyer must never pay and stay locked out.
  return NextResponse.json({ success: true, token, mailSent, mailError, orderId, orderError })
}
