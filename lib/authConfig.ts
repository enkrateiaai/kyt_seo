export function getClerkPublishableKey(): string {
  return process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || process.env.CLERK_PUBLISHABLE_KEY || ''
}

export function hasClerkClientConfig(): boolean {
  return Boolean(getClerkPublishableKey())
}

export function hasClerkServerConfig(): boolean {
  return Boolean(getClerkPublishableKey() && process.env.CLERK_SECRET_KEY)
}

export function hasClerkConfig(): boolean {
  return hasClerkServerConfig()
}
