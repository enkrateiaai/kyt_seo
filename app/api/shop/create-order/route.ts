import { NextRequest, NextResponse } from 'next/server'
import { createPayPalOrder } from '@/lib/paypal'

const ALLOWED_PRODUCTS: Record<number, { price: number; name: string }> = {
  8059: { price: 70, name: 'Schnuppertermin (50 Min)' },
  8060: { price: 270, name: '5er-Karte' },
}

export async function POST(req: NextRequest) {
  try {
    const { productId } = await req.json()
    const product = ALLOWED_PRODUCTS[productId]
    if (!product) return NextResponse.json({ error: 'Invalid product' }, { status: 400 })

    const order = await createPayPalOrder(product.price)
    if (!order.id) return NextResponse.json({ error: 'PayPal order failed', detail: order }, { status: 502 })

    return NextResponse.json({ orderId: order.id })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
