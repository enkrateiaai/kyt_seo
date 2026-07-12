import { NextRequest, NextResponse } from 'next/server'
import { capturePayPalOrder } from '@/lib/paypal'
import { createWcOrder } from '@/lib/woocommerce'

const ALLOWED_PRODUCTS: Record<number, { price: number; name: string }> = {
  8059: { price: 70, name: 'Schnuppertermin (50 Min)' },
  8060: { price: 270, name: '5er-Karte' },
}

export async function POST(req: NextRequest) {
  try {
    const { paypalOrderId, productId } = await req.json()
    if (!ALLOWED_PRODUCTS[productId]) return NextResponse.json({ error: 'Invalid product' }, { status: 400 })

    const capture = await capturePayPalOrder(paypalOrderId)
    if (capture.status !== 'COMPLETED') {
      return NextResponse.json({ error: 'Payment not completed', detail: capture }, { status: 402 })
    }

    const unit = capture.purchase_units?.[0]
    const payer = capture.payer || {}
    const txId = unit?.payments?.captures?.[0]?.id || paypalOrderId
    const shipping = unit?.shipping?.address || {}

    const billing = {
      first_name: payer.name?.given_name || '',
      last_name: payer.name?.surname || '',
      email: payer.email_address || '',
      address_1: shipping.address_line_1 || '',
      city: shipping.admin_area_2 || '',
      postcode: shipping.postal_code || '',
      country: shipping.country_code || '',
    }

    const order = await createWcOrder({ productId, billing, transactionId: txId })

    return NextResponse.json({ success: true, wcOrderId: order.id, transactionId: txId })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
