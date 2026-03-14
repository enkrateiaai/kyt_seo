import { currentUser } from '@clerk/nextjs/server'
import { SignInButton, SignOutButton } from '@clerk/nextjs'
import redis from '@/lib/redis'
import { Metadata } from 'next'

interface PageProps {
  params: { id: string }
}

interface YouTubeVideoDetails {
  title: string
  description: string
  publishedAt: string
  thumbnailUrl: string
}

async function fetchVideoDetails(videoId: string): Promise<YouTubeVideoDetails | null> {
  const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY
  if (!apiKey) return null

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`,
      { next: { revalidate: 3600 } }
    )
    const data = await res.json()
    const item = data.items?.[0]
    if (!item) return null

    return {
      title: item.snippet.title,
      description: item.snippet.description,
      publishedAt: item.snippet.publishedAt,
      thumbnailUrl:
        item.snippet.thumbnails?.maxres?.url ||
        item.snippet.thumbnails?.standard?.url ||
        item.snippet.thumbnails?.high?.url ||
        `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    }
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = params
  const video = await fetchVideoDetails(id)
  const title = video ? `${video.title} – Kundalini Yoga Tribe` : 'Video – Kundalini Yoga Tribe'
  const description = video
    ? video.description.slice(0, 160)
    : 'Kundalini Yoga Video auf Kundalini Yoga Tribe'
  const thumbnailUrl = `https://img.youtube.com/vi/${id}/maxresdefault.jpg`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://kundaliniyogatribe.de/videos/${id}`,
      images: [{ url: thumbnailUrl, width: 1280, height: 720 }],
      type: 'video.other',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [thumbnailUrl],
    },
  }
}

export default async function VideoDetailPage({ params }: PageProps) {
  const { id } = params
  const [user, video, transcript] = await Promise.all([
    currentUser(),
    fetchVideoDetails(id),
    redis.get(`transcript:${id}`),
  ])

  const email = user?.emailAddresses[0]?.emailAddress
  const title = video?.title ?? 'Kundalini Yoga Video'
  const description = video?.description ?? ''
  const publishedAt = video?.publishedAt ?? new Date().toISOString()
  const thumbnailUrl = `https://img.youtube.com/vi/${id}/maxresdefault.jpg`

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: title,
    description: description.slice(0, 500),
    thumbnailUrl,
    uploadDate: publishedAt,
    embedUrl: `https://www.youtube.com/embed/${id}`,
    url: `https://kundaliniyogatribe.de/videos/${id}`,
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          font-family: 'DM Sans', -apple-system, sans-serif;
          background: #FAF7F2;
          color: #2C2416;
          -webkit-font-smoothing: antialiased;
        }

        .v-nav {
          position: sticky;
          top: 0;
          z-index: 100;
          background: #FAF7F2;
          border-bottom: 1px solid #DDD5C8;
          padding: 14px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .v-nav__logo {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: #2C2416;
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 1.1rem;
          font-weight: 400;
        }

        .v-nav__logo-mark {
          color: #C4873B;
          font-size: 1.2rem;
        }

        .v-nav__right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .v-nav__email {
          font-size: 12px;
          color: #9B8E7E;
        }

        .v-btn {
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 500;
          padding: 8px 18px;
          border-radius: 100px;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid #DDD5C8;
          background: transparent;
          color: #6B5D4F;
        }

        .v-btn:hover {
          border-color: #C4873B;
          color: #C4873B;
        }

        .v-btn--primary {
          background: #C4873B;
          border-color: #C4873B;
          color: #fff;
        }

        .v-btn--primary:hover {
          background: #A66E2B;
          border-color: #A66E2B;
          color: #fff;
        }

        .vd-page {
          min-height: 100vh;
          background: #FAF7F2;
          padding: 40px 24px 80px;
        }

        .vd-container {
          max-width: 860px;
          margin: 0 auto;
        }

        .vd-back {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: #9B8E7E;
          text-decoration: none;
          margin-bottom: 28px;
          transition: color 0.2s;
          font-family: 'DM Sans', sans-serif;
        }
        .vd-back:hover { color: #C4873B; }

        .vd-embed {
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid #DDD5C8;
          background: #000;
          box-shadow: 0 4px 24px rgba(44,36,22,0.08);
          margin-bottom: 32px;
        }

        .vd-embed__ratio {
          position: relative;
          padding-bottom: 56.25%;
          height: 0;
        }

        .vd-embed__ratio iframe {
          position: absolute;
          top: 0; left: 0;
          width: 100%; height: 100%;
          border: none;
        }

        .vd-title {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: clamp(1.6rem, 4vw, 2.4rem);
          font-weight: 300;
          color: #2C2416;
          line-height: 1.2;
          margin-bottom: 16px;
        }

        .vd-divider {
          height: 1px;
          background: #EDE8E0;
          margin: 28px 0;
        }

        .vd-description {
          font-size: 14px;
          color: #6B5D4F;
          line-height: 1.75;
          white-space: pre-wrap;
        }

        .vd-transcript-section {
          margin-top: 40px;
        }

        .vd-section-kicker {
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #C4873B;
          margin-bottom: 12px;
        }

        .vd-section-title {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 1.4rem;
          font-weight: 400;
          color: #2C2416;
          margin-bottom: 16px;
        }

        .vd-transcript {
          background: #F3EDE4;
          border: 1px solid #EDE8E0;
          border-radius: 12px;
          padding: 24px 28px;
          font-size: 14px;
          color: #4A3F32;
          line-height: 1.8;
          white-space: pre-wrap;
        }

        .vd-transcript--placeholder {
          color: #9B8E7E;
          font-style: italic;
        }
      `}</style>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="v-nav">
        <a href="https://kundaliniyogatribe.de/" className="v-nav__logo">
          <span className="v-nav__logo-mark">◯</span>
          Kundalini Yoga Tribe
        </a>
        <div className="v-nav__right">
          {user ? (
            <>
              <span className="v-nav__email">{email}</span>
              <SignOutButton>
                <button className="v-btn">Abmelden</button>
              </SignOutButton>
            </>
          ) : (
            <SignInButton>
              <button className="v-btn v-btn--primary">Anmelden →</button>
            </SignInButton>
          )}
        </div>
      </nav>

      <div className="vd-page">
        <div className="vd-container">
          <a href="/videos" className="vd-back">← Zurück zur Bibliothek</a>

          <div className="vd-embed">
            <div className="vd-embed__ratio">
              <iframe
                src={`https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>

          <h1 className="vd-title">{title}</h1>

          {description && (
            <>
              <div className="vd-divider" />
              <p className="vd-description">{description}</p>
            </>
          )}

          <div className="vd-transcript-section">
            <p className="vd-section-kicker">Transkription</p>
            <h2 className="vd-section-title">Videoinhalt</h2>
            {transcript ? (
              <div className="vd-transcript">{transcript}</div>
            ) : (
              <div className="vd-transcript vd-transcript--placeholder">
                Transkription folgt in Kürze.
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
