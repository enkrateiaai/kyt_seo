'use client'

import { useClerk } from '@clerk/nextjs'
import { useEffect } from 'react'

export default function SignOutPage() {
  const { signOut } = useClerk()

  useEffect(() => {
    void signOut({ redirectUrl: '/' })
  }, [signOut])

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#FAF7F2',
        color: '#2C2416',
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <p>Du wirst abgemeldet...</p>
    </main>
  )
}
