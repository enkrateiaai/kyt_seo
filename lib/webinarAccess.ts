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
