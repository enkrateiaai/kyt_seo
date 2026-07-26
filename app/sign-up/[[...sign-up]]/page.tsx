import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <SignUp fallbackRedirectUrl="/videos" />
    </main>
  )
}
