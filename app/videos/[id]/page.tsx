import { currentUser } from '@clerk/nextjs/server'
import { SignInButton, SignOutButton } from '@clerk/nextjs'
import redis from '@/lib/redis'
import { Metadata } from 'next'

interface PageProps {
  params: Promise<{ id: string }>
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
  const { id } = await params
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
  const { id } = await params
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
        }

        .vd-transcript p { margin-bottom: 1em; }
        .vd-transcript p:last-child { margin-bottom: 0; }

        .vd-transcript h3 {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 1.05rem;
          font-weight: 500;
          color: #2C2416;
          margin: 1.4em 0 0.4em;
        }

        .vd-transcript a {
          color: #C4873B;
          text-decoration: underline;
          text-decoration-color: rgba(196,135,59,0.4);
          text-underline-offset: 2px;
          transition: color 0.2s;
        }
        .vd-transcript a:hover { color: #A66E2B; }

        .vd-transcript--placeholder {
          color: #9B8E7E;
          font-style: italic;
        }

        .vd-glossary {
          margin-top: 52px;
        }

        .vd-glossary-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        @media (max-width: 600px) {
          .vd-glossary-grid { grid-template-columns: 1fr; }
        }

        .vd-glossary-item {
          background: #fff;
          border: 1px solid #EDE8E0;
          border-radius: 10px;
          padding: 16px 18px;
        }

        .vd-glossary-term {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 1rem;
          font-weight: 600;
          color: #2C2416;
          margin-bottom: 4px;
        }

        .vd-glossary-origin {
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #C4873B;
          margin-bottom: 6px;
        }

        .vd-glossary-def {
          font-size: 13px;
          color: #6B5D4F;
          line-height: 1.6;
        }

        .vd-glossary-def a {
          color: #C4873B;
          text-decoration: underline;
          text-decoration-color: rgba(196,135,59,0.35);
          text-underline-offset: 2px;
        }
        .vd-glossary-def a:hover { color: #A66E2B; }
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
              <div className="vd-transcript" dangerouslySetInnerHTML={{ __html: transcript as string }} />
            ) : (
              <div className="vd-transcript vd-transcript--placeholder">
                Transkription folgt in Kürze.
              </div>
            )}
          </div>

          <div className="vd-glossary">
            <p className="vd-section-kicker">Begriffe</p>
            <h2 className="vd-section-title">Kundalini Glossar</h2>
            <div className="vd-glossary-grid">

              <div className="vd-glossary-item">
                <div className="vd-glossary-term">Sat Nam</div>
                <div className="vd-glossary-origin">Sanskrit · Urmantra</div>
                <div className="vd-glossary-def">„Ich bin Wahrheit." Das Grundmantra des <a href="https://kundaliniyogatribe.de/">Kundalini Yoga</a>. Sat steht für Wahrheit, Nam für Identität. Es wird beim Ein- und Ausatmen still wiederholt und verankert das Bewusstsein im gegenwärtigen Moment.</div>
              </div>

              <div className="vd-glossary-item">
                <div className="vd-glossary-term">Anahata</div>
                <div className="vd-glossary-origin">Sanskrit · 4. Chakra</div>
                <div className="vd-glossary-def">Das Herzchakra – Energiezentrum in der Mitte der Brust. Anahata bedeutet „unberührt" oder „unverletzt". Es ist das Zentrum von Liebe, Mitgefühl, Kreativität und Verbindung. Viele <a href="https://kundaliniyogatribe.de/kriyas">Kriyas</a> zielen darauf ab, dieses Chakra zu öffnen.</div>
              </div>

              <div className="vd-glossary-item">
                <div className="vd-glossary-term">Pranayama</div>
                <div className="vd-glossary-origin">Sanskrit · Atemübung</div>
                <div className="vd-glossary-def">„Prana" bedeutet Lebensenergie, „Yama" Kontrolle oder Ausdehnung. Pranayama bezeichnet gezielte Atemtechniken, die das Nervensystem regulieren, die Lungen stärken und den Energiefluss im Körper lenken. Grundbaustein jeder Kundalini-Praxis.</div>
              </div>

              <div className="vd-glossary-item">
                <div className="vd-glossary-term">Feueratem (Breath of Fire)</div>
                <div className="vd-glossary-origin">Kundalini Yoga · Atemtechnik</div>
                <div className="vd-glossary-def">Schnelle, gleichmäßige Atemstöße durch die Nase – Einatem und Ausatem gleich lang. Der Bauch pumpt aktiv. Feueratem reinigt das Blut, weckt die Energie, stärkt das Nervensystem und löst emotionale Blockaden. Nicht geeignet in der Schwangerschaft.</div>
              </div>

              <div className="vd-glossary-item">
                <div className="vd-glossary-term">Kriya</div>
                <div className="vd-glossary-origin">Sanskrit · Übungssequenz</div>
                <div className="vd-glossary-def">Eine vollständige Abfolge von Körperhaltungen, Atemübungen und Mantras, die als Einheit wirken. Jede <a href="https://kundaliniyogatribe.de/kriyas">Kriya</a> hat eine spezifische Wirkung – etwa für das Nervensystem, die Organe oder emotionale Themen wie Angst oder Kreativität.</div>
              </div>

              <div className="vd-glossary-item">
                <div className="vd-glossary-term">Mudra</div>
                <div className="vd-glossary-origin">Sanskrit · Handgeste</div>
                <div className="vd-glossary-def">Eine symbolische Haltung der Hände oder des Körpers. Mudras lenken die Energieströme (Prana) im Körper. Bekannte Mudras im Kundalini Yoga: Gyan Mudra (Weisheit), Anjali Mudra (Dankbarkeit), Shuni Mudra (Geduld).</div>
              </div>

              <div className="vd-glossary-item">
                <div className="vd-glossary-term">Shavasana</div>
                <div className="vd-glossary-origin">Sanskrit · Entspannungshaltung</div>
                <div className="vd-glossary-def">„Totenhaltung" – flach auf dem Rücken liegend, Arme locker neben dem Körper, Handflächen nach oben. In dieser Haltung integriert das Nervensystem alle Eindrücke der Praxis. Oft als wichtigste Übung der ganzen Stunde bezeichnet.</div>
              </div>

              <div className="vd-glossary-item">
                <div className="vd-glossary-term">Chakra</div>
                <div className="vd-glossary-origin">Sanskrit · Energiezentrum</div>
                <div className="vd-glossary-def">„Rad" oder „Kreis". Im Yoga bezeichnet es eines der sieben Hauptenergiezentren entlang der Wirbelsäule – vom Wurzelchakra (Muladhara) bis zum Kronenchakra (Sahasrara). Kundalini-Energie steigt durch diese Zentren auf.</div>
              </div>

              <div className="vd-glossary-item">
                <div className="vd-glossary-term">Kundalini</div>
                <div className="vd-glossary-origin">Sanskrit · Lebensenergie</div>
                <div className="vd-glossary-def">„Die Gewickelte" – eine schlafende Energie, die bildlich am unteren Ende der Wirbelsäule (Wurzelchakra) ruht. <a href="https://kundaliniyogatribe.de/">Kundalini Yoga</a> weckt diese Energie durch Kriyas, Atemübungen und Mantras, damit sie die Wirbelsäule aufsteigen und das Bewusstsein erweitern kann.</div>
              </div>

              <div className="vd-glossary-item">
                <div className="vd-glossary-term">Prana</div>
                <div className="vd-glossary-origin">Sanskrit · Lebensatem</div>
                <div className="vd-glossary-def">Die universelle Lebensenergie, die in allem vorhanden ist. Im menschlichen Körper fließt Prana durch feinstoffliche Kanäle (Nadis). Pranayama-Übungen stärken und lenken diese Energie. Ein gut gefülltes Pranafeld zeigt sich in Vitalität, Klarheit und Kreativität.</div>
              </div>

              <div className="vd-glossary-item">
                <div className="vd-glossary-term">Drittes Auge (Ajna)</div>
                <div className="vd-glossary-origin">Sanskrit · 6. Chakra</div>
                <div className="vd-glossary-def">Das Stirnchakra, Sitz der Intuition und inneren Wahrnehmung. Im Kundalini Yoga richtet man den inneren Blick oft auf diesen Punkt – den Raum zwischen den Augenbrauen. Dies fördert Fokus, Klarheit und die Verbindung zum höheren Selbst.</div>
              </div>

              <div className="vd-glossary-item">
                <div className="vd-glossary-term">Ego Eradicator</div>
                <div className="vd-glossary-origin">Kundalini Yoga · Übung</div>
                <div className="vd-glossary-def">Eine klassische Kundalini-Übung: Arme in 60°-Winkel gehoben, Daumen nach oben, Feueratem. Sie öffnet die Lungen vollständig, stärkt das Nervensystem und hilft, einschränkende Denkmuster des Egos aufzulösen – ein Schlüssel für kreatives Denken und innere Freiheit.</div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  )
}
