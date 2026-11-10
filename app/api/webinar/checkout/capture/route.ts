import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { retrievePaymentIntent } from '@/lib/stripe'
import { createWcOrder } from '@/lib/woocommerce'
import redis from '@/lib/redis'
import { isResendConfigured, sendResendEmail } from '@/lib/resend'
import { buildWebinarCheckoutMail } from '@/lib/webinarCheckoutMail'

const WC_WEBINAR_PRODUCT_ID = 8365
const TOKEN_TTL_SEC = 60 * 60 * 24 * 30 // 30 days

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

  const name = (intent.metadata?.name || '').trim()
  const email = (intent.metadata?.email || '').trim()

  // 2. Create WooCommerce order (best-effort)
  try {
    await createWcOrder({
      productId: WC_WEBINAR_PRODUCT_ID,
      billing: {
        first_name: name.split(' ')[0] || name,
        last_name: name.split(' ').slice(1).join(' ') || '',
        email,
      },
      transactionId: paymentIntentId,
    })
  } catch {
    // non-blocking
  }

  // 3. Generate access token
  const token = randomBytes(32).toString('hex')
  const accessData = JSON.stringify({
    email, name,
    createdAt: new Date().toISOString(),
    txId: paymentIntentId,
    productId: WC_WEBINAR_PRODUCT_ID,
  })
  try {
    await redis.setex(`webinar:access:${token}`, TOKEN_TTL_SEC, accessData)
  } catch {
    return NextResponse.json({ error: 'Zugang konnte nicht gespeichert werden' }, { status: 500 })
  }

  // 4. Send confirmation email
  if (isResendConfigured()) {
    const mail = buildWebinarCheckoutMail({ name, email, token })
    await sendResendEmail({ to: email, subject: mail.subject, html: mail.html, text: mail.text })
  }

  return NextResponse.json({ success: true, token })
}
