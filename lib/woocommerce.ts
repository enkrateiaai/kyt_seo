const WC_BASE = 'https://www.charan-amrit-kaur.de/wp-json/wc/v3'
const WC_AUTH =
  'Basic ' +
  Buffer.from('ViktorG:6JJC XXhp WdUS dyOo 1D8m i2h2').toString('base64')

export interface WcBilling {
  first_name: string
  last_name: string
  email: string
  address_1?: string
  city?: string
  postcode?: string
  country?: string
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
      Authorization: WC_AUTH,
    },
    body: JSON.stringify({
      payment_method: 'paypal',
      payment_method_title: 'PayPal',
      status: 'completed',
      set_paid: true,
      transaction_id: transactionId,
      billing,
      line_items: [{ product_id: productId, quantity: 1 }],
    }),
  })
  return res.json()
}
