import Stripe from 'stripe'

let _stripe: Stripe | null = null
function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY missing')
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  }
  return _stripe
}

export async function createWebinarPaymentIntent(name: string, email: string) {
  return getStripe().paymentIntents.create({
    amount: 2900,
    currency: 'eur',
    metadata: { name, email, product: 'ai-webinar' },
    automatic_payment_methods: { enabled: true },
    receipt_email: email,
  })
}

export async function retrievePaymentIntent(id: string) {
  return getStripe().paymentIntents.retrieve(id)
}
