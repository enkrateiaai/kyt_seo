// WooCommerce REST client.
//
// The consumer key and the secret are NOT in the source code any more - they
// come from the environment (WC_CONSUMER_KEY / WC_CONSUMER_SECRET). A
// credential that is committed to git is a credential that leaks.

const WC_BASE = (process.env.WC_API_BASE || 'https://www.charan-amrit-kaur.de/wp-json/wc/v3').replace(/\/+$/, '')

// The WooCommerce host sits behind Cloudflare, which rejects requests without
// a browser-like User-Agent (error 1010).
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36'

export interface WcBilling {
  first_name: string
  last_name: string
  email: string
  address_1?: string
  city?: string
  postcode?: string
  country?: string
}

function getWcAuthHeader(): string {
  const key = process.env.WC_CONSUMER_KEY?.trim()
  const secret = process.env.WC_CONSUMER_SECRET?.trim()
  if (!key || !secret) {
    throw new Error('WooCommerce-Zugangsdaten fehlen (WC_CONSUMER_KEY / WC_CONSUMER_SECRET)')
  }
  return 'Basic ' + Buffer.from(`${key}:${secret}`).toString('base64')
}

export async function createWcOrder({
  productId,
  billing,
  transactionId,
}: {
  productId: number
  billing: WcBilling
  transactionId: string
}) {
  const res = await fetch(`${WC_BASE}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': USER_AGENT,
      Authorization: getWcAuthHeader(),
    },
    body: JSON.stringify({
      // The customer pays via Stripe on the site, the order in the shop only
      // documents the sale.
      payment_method: 'stripe',
      payment_method_title: 'Stripe',
      status: 'completed',
      set_paid: true,
      transaction_id: transactionId,
      billing,
      line_items: [{ product_id: productId, quantity: 1 }],
    }),
  })

  const text = await res.text()
  if (!res.ok) {
    // The shop answers with a JSON error body (e.g. rest_invalid_email).
    // That must not be swallowed - a failed order means no bookkeeping.
    let detail = text.slice(0, 400)
    try {
      const parsed = JSON.parse(text) as { message?: string; code?: string }
      detail = parsed.message || parsed.code || detail
    } catch {
      // keep the raw text
    }
    throw new Error(`WooCommerce ${res.status}: ${detail}`)
  }

  try {
    return JSON.parse(text)
  } catch {
    throw new Error('WooCommerce-Antwort ist kein gültiges JSON')
  }
}
