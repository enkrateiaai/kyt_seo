const BASE =
  process.env.PAYPAL_ENV === 'sandbox'
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com'

async function getAccessToken(): Promise<string> {
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization:
        'Basic ' +
        Buffer.from(
          `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
        ).toString('base64'),
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  })
  const data = await res.json()
  if (!data.access_token) throw new Error('PayPal token failed: ' + JSON.stringify(data))
  return data.access_token
}

export async function createPayPalOrder(amount: number, currency = 'EUR') {
  const token = await getAccessToken()
  const res = await fetch(`${BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: { currency_code: currency, value: amount.toFixed(2) },
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            payment_method_preference: 'IMMEDIATE_PAYMENT_REQUIRED',
            user_action: 'PAY_NOW',
          },
        },
      },
    }),
  })
  return res.json()
}

export async function capturePayPalOrder(orderId: string) {
  const token = await getAccessToken()
  const res = await fetch(`${BASE}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })
  return res.json()
}
