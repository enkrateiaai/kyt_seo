'use client'
import { UserProfile } from '@clerk/nextjs'

const clerkAppearance = {
  variables: {
    colorPrimary: '#D3BC76',
    colorBackground: '#FAF7F2',
    colorText: '#2C2416',
    colorTextSecondary: '#6B5D4F',
    colorInputBackground: '#FAF7F2',
    colorInputText: '#2C2416',
    fontFamily: "'DM Sans', sans-serif",
    borderRadius: '6px',
  },
  elements: {
    card: { boxShadow: 'none', border: '1px solid #DDD5C8', background: '#FAF7F2' },
    navbar: { background: '#FAF7F2', borderRight: '1px solid #DDD5C8' },
    headerTitle: { fontFamily: "'Cormorant Garamond', serif", fontWeight: 400 },
    formButtonPrimary: { background: '#D3BC76', color: '#2C2416' },
    footerActionLink: { color: '#D3BC76' },
    badge: { display: 'none' },
    developmentModeWarning: { display: 'none' },
  },
}

export default function ProfilContent() {
  return (
    <main style={{
      minHeight: '100vh',
      background: '#FAF7F2',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      padding: '48px 24px',
    }}>
      <UserProfile appearance={clerkAppearance} />
    </main>
  )
}
