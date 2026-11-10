import { NextResponse } from 'next/server'
import { createPayPalOrder } from '@/lib/paypal'

const WEBINAR_PRICE = 29

export async function POST() {
  try {
    const order = await createPayPalOrder(WEBINAR_PRICE)
    if (!order.id) {
      return NextResponse.json({ error: 'PayPal order failed', detail: order }, { status: 502 })
    }
    return NextResponse.json({ orderId: order.id })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
