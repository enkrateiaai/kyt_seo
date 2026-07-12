import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

const REDIRECT_URL = 'https://kundaliniyogatribe.de/'

async function handleSignOut(request: NextRequest) {
  const { sessionId } = await auth()
  if (sessionId) {
    try {
      const client = await clerkClient()
      await client.sessions.revokeSession(sessionId)
    } catch {
      // proceed even if revocation fails
    }
  }

  const response = NextResponse.redirect(REDIRECT_URL)
  const cookies = request.cookies.getAll()

  for (const cookie of cookies) {
    response.cookies.set({
      name: cookie.name,
      value: '',
      maxAge: 0,
      expires: new Date(0),
      path: '/',
      domain: '.kundaliniyogatribe.de',
    })
  }

  return response
}

export async function GET(request: NextRequest) {
  return handleSignOut(request)
}

export async function POST(request: NextRequest) {
  return handleSignOut(request)
}
