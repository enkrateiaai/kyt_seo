import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { capturePayPalOrder } from '@/lib/paypal'
import { createWcOrder } from '@/lib/woocommerce'
import redis from '@/lib/redis'
import { isResendConfigured, sendResendEmail } from '@/lib/resend'
import { buildWebinarCheckoutMail } from '@/lib/webinarCheckoutMail'

const WC_WEBINAR_PRODUCT_ID = 8365
const TOKEN_TTL_SEC = 60 * 60 * 24 * 180 // 180 days

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  let body: { paypalOrderId?: unknown; name?: unknown; email?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Ungültiger JSON-Body' }, { status: 400 })
  }

  const paypalOrderId = typeof body.paypalOrderId === 'string' ? body.paypalOrderId.trim() : ''
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 80) : ''
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''

  if (!paypalOrderId) return NextResponse.json({ error: 'paypalOrderId fehlt' }, { status: 400 })
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'Ungültige E-Mail' }, { status: 400 })
  if (name.length < 2) return NextResponse.json({ error: 'Name fehlt' }, { status: 400 })

  // 1. Capture the PayPal order
  const capture = await capturePayPalOrder(paypalOrderId)
  if (capture.status !== 'COMPLETED') {
    return NextResponse.json({ error: 'Zahlung nicht abgeschlossen', detail: capture }, { status: 402 })
  }

  const unit = capture.purchase_units?.[0]
  const payer = capture.payer || {}
  const txId = unit?.payments?.captures?.[0]?.id || paypalOrderId

  // 2. Create WooCommerce order
  const billing = {
    first_name: payer.name?.given_name || name.split(' ')[0] || name,
    last_name: payer.name?.surname || name.split(' ').slice(1).join(' ') || '',
    email: payer.email_address || email,
  }
  try {
    await createWcOrder({ productId: WC_WEBINAR_PRODUCT_ID, billing, transactionId: txId })
  } catch {
    // WC order creation is best-effort; don't block access delivery
  }

  // 3. Generate access token
  const token = randomBytes(32).toString('hex')
  const accessData = JSON.stringify({
    email,
    name,
    createdAt: new Date().toISOString(),
    txId,
    productId: WC_WEBINAR_PRODUCT_ID,
  })
  try {
    await redis.setex(`webinar:access:${token}`, TOKEN_TTL_SEC, accessData)
  } catch {
    return NextResponse.json({ error: 'Zugang konnte nicht gespeichert werden' }, { status: 500 })
  }

  // 4. Send confirmation email with the personalized link
  if (isResendConfigured()) {
    const mail = buildWebinarCheckoutMail({ name, email, token })
    await sendResendEmail({ to: email, subject: mail.subject, html: mail.html, text: mail.text })
  }

  return NextResponse.json({ success: true, token })
}
