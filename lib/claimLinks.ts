import crypto from 'crypto'
import redis from '@/lib/redis'

const CLAIM_LINK_PREFIX = 'claim-link:'
const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 7

export interface ClaimLinkRecord {
  email?: string
  customerRef?: string
  targetGroup?: string
  createdAt: string
  expiresAt: string
  usedAt?: string
  usedByUserId?: string
  usedByEmail?: string
}

function getClaimLinkKey(token: string): string {
  return `${CLAIM_LINK_PREFIX}${token}`
}

export async function createClaimLink({
  email,
  customerRef,
  targetGroup,
  ttlSeconds = DEFAULT_TTL_SECONDS,
}: {
  email?: string
  customerRef?: string
  targetGroup?: string
  ttlSeconds?: number
}): Promise<string> {
  const token = crypto.randomUUID()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000)

  const record: ClaimLinkRecord = {
    email: email?.trim().toLowerCase() || undefined,
    customerRef: customerRef?.trim() || undefined,
    targetGroup: targetGroup?.trim() || undefined,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  }

  const key = getClaimLinkKey(token)
  await redis.setex(key, ttlSeconds, JSON.stringify(record))
  const stored = await redis.get(key)
  if (!stored) {
    throw new Error('Failed to persist claim link token')
  }
  return token
}

export async function getClaimLink(token: string): Promise<ClaimLinkRecord | null> {
  const raw = await redis.get(getClaimLinkKey(token))
  if (!raw) return null

  try {
    return JSON.parse(raw) as ClaimLinkRecord
  } catch {
    return null
  }
}

export async function markClaimLinkUsed(
  token: string,
  record: ClaimLinkRecord,
  userId: string,
  usedByEmail?: string
): Promise<void> {
  const updated: ClaimLinkRecord = {
    ...record,
    usedAt: new Date().toISOString(),
    usedByUserId: userId,
    usedByEmail: usedByEmail?.trim().toLowerCase() || undefined,
  }

  const key = getClaimLinkKey(token)
  await redis.set(key, JSON.stringify(updated))
}

export function isClaimLinkExpired(record: ClaimLinkRecord): boolean {
  return Date.now() > new Date(record.expiresAt).getTime()
}
