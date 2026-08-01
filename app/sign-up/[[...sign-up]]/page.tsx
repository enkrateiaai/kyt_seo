import { SignUp } from '@clerk/nextjs'
import { hasClerkClientConfig } from '@/lib/authConfig'

export default async function SignUpPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = (await searchParams) || {}
  const redirectValue = params.redirect_url
  const redirectUrl = Array.isArray(redirectValue) ? redirectValue[0] : redirectValue
  const safeRedirectUrl = redirectUrl?.startsWith('/') ? redirectUrl : '/videos'

  if (!hasClerkClientConfig()) {
    return (
      <main style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FAF7F2', fontFamily: "'DM Sans', sans-serif", padding: '24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 560 }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Mitgliederbereich</h1>
          <p style={{ lineHeight: 1.6, maxWidth: 520 }}>
            Die Registrierung ist auf dieser Relaunch-Umgebung noch nicht eingerichtet.
          </p>
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href={safeRedirectUrl}
              style={{
                display: 'inline-block',
                padding: '12px 22px',
                borderRadius: 999,
                background: '#D3BC76',
                color: '#2C2416',
                textDecoration: 'none',
                fontWeight: 500,
              }}
            >
              Zur Videobibliothek
            </a>
            <a
              href="/sign-in"
              style={{
                display: 'inline-block',
                padding: '12px 22px',
                borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.22)',
                color: '#FAF7F2',
                textDecoration: 'none',
                fontWeight: 500,
              }}
            >
              Zur Anmeldung
            </a>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <SignUp forceRedirectUrl={safeRedirectUrl} fallbackRedirectUrl={safeRedirectUrl} />
    </main>
  )
}
