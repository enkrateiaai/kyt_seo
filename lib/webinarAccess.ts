// Access check for the paid AI Webinar.
//
// The webinar is a product: after the payment is captured the buyer gets a
// personal token. The token is stored in Redis and rides along in the link
// that is mailed out.
//
// EVERY surface that can hand out the video has to ask this module first.
// A check only on the page is not enough, because the video itself is
// streamed from /api/webinar/video - whoever can call that endpoint can
// download the file.
//
// The legacy registration tokens (webinar:token:<token>) are NOT accepted:
// the webinar is a paid product, so only a paid access token opens the video.

import redis from '@/lib/redis'

export type WebinarAccessKind = 'paid' | 'none'

export type WebinarAccess = {
  ok: boolean
  kind: WebinarAccessKind
  email?: string
  name?: string
  productId?: number
}

const ACCESS_KEY_PREFIX = 'webinar:access:'

export function accessKey(token: string): string {
  return `${ACCESS_KEY_PREFIX}${token}`
}

// Checks a token that came from a link. Returns ok=false for an empty,
// unknown or expired token.
export async function verifyWebinarAccess(token: string | null | undefined): Promise<WebinarAccess> {
  const value = (token || '').trim()
  if (!value) return { ok: false, kind: 'none' }

  try {
    const raw = await redis.get(accessKey(value))
    if (!raw) return { ok: false, kind: 'none' }
    const parsed = JSON.parse(raw) as { email?: string; name?: string; productId?: number }
    return {
      ok: true,
      kind: 'paid',
      email: typeof parsed.email === 'string' ? parsed.email : undefined,
      name: typeof parsed.name === 'string' ? parsed.name : undefined,
      productId: typeof parsed.productId === 'number' ? parsed.productId : undefined,
    }
  } catch {
    // Redis unreachable - treat as "no access" so a broken backend can never
    // accidentally hand the video out.
    return { ok: false, kind: 'none' }
  }
}

// How long an access token stays valid.
export const ACCESS_TTL_SECONDS = 60 * 60 * 24 * 30 // 30 days

// Index of who bought the webinar and which token belongs to whom.
// Without it the paid buyers could not be found again (the free registration
// is closed), and a reminder mail would have to fall back to a link without a
// token - which the paywall rejects.
const BUYER_TOKEN_KEY_PREFIX = 'webinar:access:email:'
const BUYERS_KEY = 'webinar:access:buyers'

export function buyerTokenKey(email: string): string {
  return `${BUYER_TOKEN_KEY_PREFIX}${email.trim().toLowerCase()}`
}

// Remembers the buyer -> token relation after a successful payment.
export async function indexBuyer(email: string, token: string): Promise<void> {
  const mail = email.trim().toLowerCase()
  if (!mail || !token) return
  await redis.setex(buyerTokenKey(mail), ACCESS_TTL_SECONDS, token)
  await redis.sadd(BUYERS_KEY, mail)
}

export type BuyerRecord = {
  email: string
  token: string
  name?: string
}

// Finds the buyer and their access token again.
export async function findBuyer(email: string): Promise<BuyerRecord | null> {
  let token = ''
  try {
    token = (await redis.get(buyerTokenKey(email))) || ''
  } catch {
    return null
  }
  token = token.trim()
  if (!token) return null
  const access = await verifyWebinarAccess(token)
  if (!access.ok) return null
  return { email: email.trim().toLowerCase(), token, name: access.name }
}

// All buyers that have a valid access token.
export async function listBuyers(): Promise<BuyerRecord[]> {
  let emails: string[] = []
  try {
    emails = await redis.smembers(BUYERS_KEY)
  } catch {
    return []
  }
  const buyers: BuyerRecord[] = []
  for (const email of emails) {
    const buyer = await findBuyer(email)
    if (buyer) buyers.push(buyer)
  }
  return buyers
}
