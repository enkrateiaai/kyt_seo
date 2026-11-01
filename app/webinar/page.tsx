export const dynamic = 'force-dynamic'

import { auth } from '@clerk/nextjs/server'
import SiteHeader from '@/app/components/SiteHeader'
import { fetchWebinarConfig, webinarPhase } from '@/lib/webinar'
import WebinarPlayer from './WebinarPlayer'

export const metadata = {
  title: 'Webinar – Kundalini Yoga Tribe',
  description:
    'Webinar-Aufzeichnung: Video und Zeitfenster werden im Studio festgelegt. Das Webinar ist frei zugänglich und läuft nur im angegebenen Zeitraum.',
}

export default async function WebinarPage() {
  // The webinar page is public — a Clerk hiccup must never take it down.
  let userId: string | null = null
  try {
    const authState = await auth()
    userId = authState.userId
  } catch {
    userId = null
  }

  const webinar = await fetchWebinarConfig()
  const phase = webinarPhase(webinar, Date.now())

  return (
    <>
      <SiteHeader isLoggedIn={!!userId} />
      <main
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(180deg, #FAF7F2 0%, #F3EDE4 100%)',
          color: '#2C2416',
          fontFamily: "'Jost', system-ui, sans-serif",
          padding: '48px 20px 80px',
        }}
      >
        <div style={{ maxWidth: 880, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h1
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 40,
                fontWeight: 400,
                letterSpacing: '0.06em',
                margin: '0 0 10px',
              }}
            >
              Webinar
            </h1>
            <p style={{ color: '#6B5D4F', fontSize: 15, margin: 0, lineHeight: 1.7 }}>
              Aufzeichnung des Webinars – frei zugänglich während des angegebenen Zeitraums.
            </p>
          </div>

          <WebinarPlayer initialWebinar={webinar} initialPhase={phase} />

          <p
            style={{
              textAlign: 'center',
              color: '#9B8E7E',
              fontSize: 12,
              marginTop: 28,
              lineHeight: 1.7,
            }}
          >
            Bildschirm bleibt aktiv während du schaust · Sat Nam
          </p>
        </div>
      </main>
    </>
  )
}
