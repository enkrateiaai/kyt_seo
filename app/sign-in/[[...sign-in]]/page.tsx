import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <SignIn />
    </main>
  )
}
