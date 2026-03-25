import { SignIn } from '@clerk/nextjs'

export default async function SignInPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = (await searchParams) || {}
  const redirectValue = params.redirect_url
  const redirectUrl = Array.isArray(redirectValue) ? redirectValue[0] : redirectValue
  const safeRedirectUrl = redirectUrl?.startsWith('/') ? redirectUrl : '/videos'

  return (
    <main style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <SignIn forceRedirectUrl={safeRedirectUrl} fallbackRedirectUrl={safeRedirectUrl} />
    </main>
  )
}
