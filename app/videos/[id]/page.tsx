import { currentUser } from '@clerk/nextjs/server'
import { SignInButton, SignOutButton } from '@clerk/nextjs'
import { redirect } from 'next/navigation'
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

// Resolve slug or videoId → always return the canonical videoId
async function resolveVideoId(idOrSlug: string): Promise<{ videoId: string; slug: string | null }> {
  // Check if it's a slug (has slug: mapping)
  const fromSlug = await redis.get(`slug:${idOrSlug}`) as string | null
  if (fromSlug) return { videoId: fromSlug, slug: idOrSlug }
  // Otherwise treat as videoId, look up its slug
  const slug = await redis.get(`vidslug:${idOrSlug}`) as string | null
  return { videoId: idOrSlug, slug }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const { videoId, slug } = await resolveVideoId(id)
  const canonicalId = slug ?? id
  const [video, customTitle] = await Promise.all([fetchVideoDetails(videoId), redis.get(`title:${videoId}`)])
  const baseTitle = (customTitle as string | null) ?? video?.title
  const title = baseTitle ? `${baseTitle} – Kundalini Yoga Tribe` : 'Video – Kundalini Yoga Tribe'
  const description = video
    ? video.description.slice(0, 160)
    : 'Kundalini Yoga Video auf Kundalini Yoga Tribe'
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`

  return {
    title,
    description,
    alternates: { canonical: `https://kundaliniyogatribe.de/videos/${canonicalId}` },
    openGraph: {
      title,
      description,
      url: `https://kundaliniyogatribe.de/videos/${canonicalId}`,
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
  const { videoId, slug } = await resolveVideoId(id)

  // Redirect old /videos/[youtubeId] URLs to /videos/[slug]
  if (slug && id !== slug) {
    redirect(`/videos/${slug}`)
  }

  const [user, video, transcript, customTitle, isFree, mantrasRaw] = await Promise.all([
    currentUser(),
    fetchVideoDetails(videoId),
    redis.get(`transcript:${videoId}`),
    redis.get(`title:${videoId}`),
    redis.get(`free:${videoId}`),
    redis.get(`mantras:${videoId}`),
  ])
  const videoMantras: { slug: string; name: string }[] = mantrasRaw ? JSON.parse(mantrasRaw as string) : []

  const email = user?.emailAddresses[0]?.emailAddress
  const isMember = user?.publicMetadata?.role === 'member'
  const isLocked = !isFree && !isMember
  const title = (customTitle as string | null) ?? video?.title ?? 'Kundalini Yoga Video'
  const description = video?.description ?? ''
  const publishedAt = video?.publishedAt ?? new Date().toISOString()
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
  const canonicalSlug = slug ?? videoId

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: title,
    description: description.slice(0, 500),
    thumbnailUrl,
    uploadDate: publishedAt,
    embedUrl: `https://www.youtube.com/embed/${videoId}`,
    url: `https://kundaliniyogatribe.de/videos/${canonicalSlug}`,
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

        .vd-mantras {
          margin-top: 48px;
        }
        .vd-mantras__grid {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 16px;
        }
        .vd-mantra-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: rgba(196,135,59,0.08);
          border: 1px solid rgba(196,135,59,0.25);
          border-radius: 20px;
          color: #C4873B;
          font-size: 0.88rem;
          text-decoration: none;
          transition: background 0.2s, border-color 0.2s;
        }
        .vd-mantra-pill:hover {
          background: rgba(196,135,59,0.16);
          border-color: rgba(196,135,59,0.5);
        }
        .vd-mantra-pill__icon { font-size: 0.95rem; }

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

        .vd-glossary-icon {
          width: 38px;
          height: 38px;
          background: rgba(196,135,59,0.1);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 10px;
          color: #C4873B;
        }
        .vd-glossary-icon svg {
          width: 18px;
          height: 18px;
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

        .vd-tts {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 14px;
        }
        .vd-tts__btn {
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          font-weight: 500;
          padding: 7px 16px;
          border-radius: 100px;
          border: 1px solid #DDD5C8;
          background: #fff;
          color: #6B5D4F;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
        }
        .vd-tts__btn:hover { border-color: #C4873B; color: #C4873B; }
        .vd-tts__btn--active { background: #C4873B; border-color: #C4873B; color: #fff; }
        .vd-tts__btn--active:hover { background: #A66E2B; border-color: #A66E2B; color: #fff; }
        .vd-tts__btn:disabled { opacity: 0.4; cursor: default; }
        .vd-tts__btn svg { width: 13px; height: 13px; flex-shrink: 0; }

        .vd-lock {
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid #DDD5C8;
          background: #000;
          box-shadow: 0 4px 24px rgba(44,36,22,0.08);
          margin-bottom: 32px;
          position: relative;
        }
        .vd-lock__ratio {
          position: relative;
          padding-bottom: 56.25%;
          height: 0;
        }
        .vd-lock__thumb {
          position: absolute;
          top: 0; left: 0;
          width: 100%; height: 100%;
          object-fit: cover;
          filter: blur(6px) brightness(0.4);
        }
        .vd-lock__overlay {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 14px;
          text-align: center;
          padding: 24px;
        }
        .vd-lock__icon {
          width: 56px; height: 56px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .vd-lock__icon svg { width: 24px; height: 24px; color: #fff; }
        .vd-lock__text {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 1.2rem;
          font-weight: 400;
          color: #fff;
        }
        .vd-lock__sub {
          font-size: 13px;
          color: rgba(255,255,255,0.6);
          max-width: 340px;
        }
        .vd-lock__actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: center;
          margin-top: 4px;
        }
        .vd-lock__btn {
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 500;
          padding: 9px 22px;
          border-radius: 100px;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.2s;
        }
        .vd-lock__btn--primary {
          background: #C4873B;
          border: 1px solid #C4873B;
          color: #fff;
        }
        .vd-lock__btn--primary:hover { background: #A66E2B; }
        .vd-lock__btn--secondary {
          background: transparent;
          border: 1px solid rgba(255,255,255,0.3);
          color: #fff;
        }
        .vd-lock__btn--secondary:hover { border-color: rgba(255,255,255,0.6); }

        .vd-content-lock {
          position: relative;
          border-radius: 12px;
          overflow: hidden;
        }
        .vd-content-lock__blur {
          filter: blur(4px);
          pointer-events: none;
          user-select: none;
          opacity: 0.5;
          max-height: 160px;
          overflow: hidden;
        }
        .vd-content-lock__gate {
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, transparent 0%, rgba(250,247,242,0.95) 40%, #FAF7F2 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          padding: 24px;
          gap: 10px;
        }
        .vd-content-lock__label {
          font-size: 13px;
          color: #6B5D4F;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .vd-content-lock__label svg { width: 14px; height: 14px; color: #C4873B; }
      `}</style>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="v-nav">
        <a href="https://kundaliniyogatribe.de/" className="v-nav__logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://kundaliniyogatribe.de/icon.png" alt="KYT" style={{width:'28px',height:'28px',borderRadius:'4px',objectFit:'cover',flexShrink:0}} />
          Kundalini Yoga Tribe
        </a>
        <div className="v-nav__right">
          {user ? (
            <>
              <span className="v-nav__email">{email}</span>
              <SignOutButton redirectUrl="https://kundaliniyogatribe.de">
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

          {isLocked ? (
            <div className="vd-lock">
              <div className="vd-lock__ratio">
                <img className="vd-lock__thumb" src={thumbnailUrl} alt={title} />
                <div className="vd-lock__overlay">
                  <div className="vd-lock__icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0110 0v4"/>
                    </svg>
                  </div>
                  <p className="vd-lock__text">Nur für Mitglieder</p>
                  <p className="vd-lock__sub">Dieses Video ist Teil der Mitgliedschaft. Melde dich an oder werde Mitglied, um vollen Zugang zu erhalten.</p>
                  <div className="vd-lock__actions">
                    <a href="https://www.charan-amrit-kaur.de/yoga-tribe/" target="_blank" rel="noopener" className="vd-lock__btn vd-lock__btn--primary">Mitglied werden →</a>
                    {!user && <a href="/sign-in" className="vd-lock__btn vd-lock__btn--secondary">Anmelden</a>}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="vd-embed">
              <div className="vd-embed__ratio">
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          )}

          <h1 className="vd-title">{title}</h1>
          <p style={{fontSize:'13px',color:'#9B8E7E',marginTop:'8px',marginBottom:'0'}}>
            🔗 <a href={`https://www.kundaliniyogatribe.de/videos/${canonicalSlug}`} style={{color:'#C4873B',textDecoration:'underline',textDecorationColor:'rgba(196,135,59,0.4)',textUnderlineOffset:'2px'}}>{`kundaliniyogatribe.de/videos/${canonicalSlug}`}</a>
          </p>

          {description && (
            <>
              <div className="vd-divider" />
              <p className="vd-description">{description}</p>
            </>
          )}

          <div className="vd-transcript-section">
            <h2 className="vd-section-title">Videoinhalt</h2>

            {transcript && (
              <div className="vd-tts">
                <button id="tts-play" className="vd-tts__btn" title="Vorlesen">
                  <svg viewBox="0 0 16 16" fill="currentColor"><path d="M3 3.5v9l10-4.5L3 3.5z"/></svg>
                  Vorlesen
                </button>
                <button id="tts-pause" className="vd-tts__btn" title="Pause" style={{display:'none'}}>
                  <svg viewBox="0 0 16 16" fill="currentColor"><rect x="3" y="2" width="4" height="12"/><rect x="9" y="2" width="4" height="12"/></svg>
                  Pause
                </button>
                <button id="tts-stop" className="vd-tts__btn" title="Stopp" style={{display:'none'}}>
                  <svg viewBox="0 0 16 16" fill="currentColor"><rect x="2" y="2" width="12" height="12" rx="1"/></svg>
                  Stopp
                </button>
              </div>
            )}

            {transcript ? (
              <div id="vd-transcript-text" className="vd-transcript" dangerouslySetInnerHTML={{ __html: transcript as string }} />
            ) : (
              <div className="vd-transcript vd-transcript--placeholder">
                Transkription folgt in Kürze.
              </div>
            )}
          </div>

          <script dangerouslySetInnerHTML={{ __html: `
            (function() {
              var synth = window.speechSynthesis;
              var playBtn  = document.getElementById('tts-play');
              var pauseBtn = document.getElementById('tts-pause');
              var stopBtn  = document.getElementById('tts-stop');
              if (!playBtn || !synth) return;

              function getVoice() {
                var voices = synth.getVoices();
                return voices.find(function(v) { return v.lang.startsWith('de') && (v.name.includes('Google') || v.name.includes('Natural')); })
                  || voices.find(function(v) { return v.lang.startsWith('de'); })
                  || voices[0];
              }

              function getPlainText() {
                var el = document.getElementById('vd-transcript-text');
                return el ? el.innerText : '';
              }

              function setPlaying(active) {
                playBtn.style.display  = active ? 'none' : 'flex';
                pauseBtn.style.display = active ? 'flex' : 'none';
                stopBtn.style.display  = active ? 'flex' : 'none';
              }

              playBtn.addEventListener('click', function() {
                if (synth.paused) { synth.resume(); setPlaying(true); return; }
                synth.cancel();
                var utt = new SpeechSynthesisUtterance(getPlainText());
                utt.lang   = 'de-DE';
                utt.rate   = 0.75;
                utt.pitch  = 1.0;
                utt.volume = 1.0;
                var v = getVoice(); if (v) utt.voice = v;
                utt.onend = function() { setPlaying(false); };
                utt.onerror = function() { setPlaying(false); };
                synth.speak(utt);
                setPlaying(true);
              });

              pauseBtn.addEventListener('click', function() {
                synth.pause();
                pauseBtn.style.display = 'none';
                playBtn.style.display  = 'flex';
                playBtn.querySelector && (playBtn.innerHTML = '<svg viewBox="0 0 16 16" fill="currentColor" style="width:13px;height:13px"><path d="M3 3.5v9l10-4.5L3 3.5z"/></svg> Weiter');
              });

              stopBtn.addEventListener('click', function() {
                synth.cancel();
                setPlaying(false);
                if (playBtn.innerHTML.includes('Weiter')) playBtn.innerHTML = '<svg viewBox="0 0 16 16" fill="currentColor" style="width:13px;height:13px"><path d="M3 3.5v9l10-4.5L3 3.5z"/></svg> Vorlesen';
              });

              synth.onvoiceschanged = function() {};
            })();
          ` }} />

          {videoMantras.length > 0 && (
            <div className="vd-mantras">
              <p className="vd-section-kicker">Mantras</p>
              <h2 className="vd-section-title">Mantras in diesem Video</h2>
              <div className="vd-mantras__grid">
                {videoMantras.map((m) => (
                  <a key={m.slug} href={`https://kundaliniyogatribe.de/mantras/${m.slug}`} className="vd-mantra-pill">
                    <span className="vd-mantra-pill__icon">🕉</span>
                    {m.name}
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="vd-glossary">
            <p className="vd-section-kicker">Begriffe</p>
            <h2 className="vd-section-title">Kundalini Glossar</h2>
            <div className="vd-glossary-grid">

              <div className="vd-glossary-item">
                <div className="vd-glossary-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M3 7 Q6 4 9 7 Q12 10 15 7 Q18 4 21 7"/>
                    <path d="M3 12 Q6 9 9 12 Q12 15 15 12 Q18 9 21 12"/>
                    <path d="M3 17 Q6 14 9 17 Q12 20 15 17 Q18 14 21 17"/>
                  </svg>
                </div>
                <div className="vd-glossary-term">Sat Nam</div>
                <div className="vd-glossary-origin">Sanskrit · Urmantra</div>
                <div className="vd-glossary-def">„Ich bin Wahrheit." Das Grundmantra des <a href="https://kundaliniyogatribe.de/">Kundalini Yoga</a>. Sat steht für Wahrheit, Nam für Identität. Es wird beim Ein- und Ausatmen still wiederholt und verankert das Bewusstsein im gegenwärtigen Moment.</div>
              </div>

              <div className="vd-glossary-item">
                <div className="vd-glossary-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 20.5l-1.3-1.2C5.4 14.6 2 11.7 2 8.2 2 5.3 4.2 3 7 3c1.6 0 3.1.8 4 2 .9-1.2 2.4-2 4-2 2.8 0 5 2.3 5 5.2 0 3.5-3.4 6.4-8.7 11.1L12 20.5z"/>
                  </svg>
                </div>
                <div className="vd-glossary-term">Anahata</div>
                <div className="vd-glossary-origin">Sanskrit · 4. Chakra</div>
                <div className="vd-glossary-def">Das Herzchakra – Energiezentrum in der Mitte der Brust. Anahata bedeutet „unberührt" oder „unverletzt". Es ist das Zentrum von Liebe, Mitgefühl, Kreativität und Verbindung. Viele <a href="https://kundaliniyogatribe.de/kriyas">Kriyas</a> zielen darauf ab, dieses Chakra zu öffnen.</div>
              </div>

              <div className="vd-glossary-item">
                <div className="vd-glossary-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M12 3 L12 11"/>
                    <path d="M12 11 Q7 11 5 14 Q3 17 5 20 Q7 22 9 20 Q11 18 11 16 L11 11"/>
                    <path d="M12 11 Q17 11 19 14 Q21 17 19 20 Q17 22 15 20 Q13 18 13 16 L13 11"/>
                  </svg>
                </div>
                <div className="vd-glossary-term">Pranayama</div>
                <div className="vd-glossary-origin">Sanskrit · Atemübung</div>
                <div className="vd-glossary-def">„Prana" bedeutet Lebensenergie, „Yama" Kontrolle oder Ausdehnung. Pranayama bezeichnet gezielte Atemtechniken, die das Nervensystem regulieren, die Lungen stärken und den Energiefluss im Körper lenken. Grundbaustein jeder Kundalini-Praxis.</div>
              </div>

              <div className="vd-glossary-item">
                <div className="vd-glossary-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2c0 0-6 7-6 12a6 6 0 0012 0c0-3-1.5-5.5-2.5-7 0 2.5-1 4-2 4s-2-1.5-2-3.5C11.5 6 12 2 12 2z"/>
                  </svg>
                </div>
                <div className="vd-glossary-term">Feueratem (Breath of Fire)</div>
                <div className="vd-glossary-origin">Kundalini Yoga · Atemtechnik</div>
                <div className="vd-glossary-def">Schnelle, gleichmäßige Atemstöße durch die Nase – Einatem und Ausatem gleich lang. Der Bauch pumpt aktiv. Feueratem reinigt das Blut, weckt die Energie, stärkt das Nervensystem und löst emotionale Blockaden. Nicht geeignet in der Schwangerschaft.</div>
              </div>

              <div className="vd-glossary-item">
                <div className="vd-glossary-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M12 21 L12 14"/>
                    <path d="M12 14 Q9 9 6 8 Q7 12 12 14"/>
                    <path d="M12 14 Q15 9 18 8 Q17 12 12 14"/>
                    <path d="M12 14 Q7 12 4 14 Q7 16 12 14"/>
                    <path d="M12 14 Q17 12 20 14 Q17 16 12 14"/>
                    <path d="M12 14 Q11 9 12 5 Q13 9 12 14"/>
                  </svg>
                </div>
                <div className="vd-glossary-term">Kriya</div>
                <div className="vd-glossary-origin">Sanskrit · Übungssequenz</div>
                <div className="vd-glossary-def">Eine vollständige Abfolge von Körperhaltungen, Atemübungen und Mantras, die als Einheit wirken. Jede <a href="https://kundaliniyogatribe.de/kriyas">Kriya</a> hat eine spezifische Wirkung – etwa für das Nervensystem, die Organe oder emotionale Themen wie Angst oder Kreativität.</div>
              </div>

              <div className="vd-glossary-item">
                <div className="vd-glossary-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 13V6a1 1 0 012 0v4"/>
                    <path d="M10 10V5a1 1 0 012 0v5"/>
                    <path d="M12 10V6a1 1 0 012 0v4"/>
                    <path d="M14 11V8a1 1 0 012 0v5c0 3-2 5-5 5H9a5 5 0 01-5-5v-2a1 1 0 012 0"/>
                  </svg>
                </div>
                <div className="vd-glossary-term">Mudra</div>
                <div className="vd-glossary-origin">Sanskrit · Handgeste</div>
                <div className="vd-glossary-def">Eine symbolische Haltung der Hände oder des Körpers. Mudras lenken die Energieströme (Prana) im Körper. Bekannte Mudras im Kundalini Yoga: Gyan Mudra (Weisheit), Anjali Mudra (Dankbarkeit), Shuni Mudra (Geduld).</div>
              </div>

              <div className="vd-glossary-item">
                <div className="vd-glossary-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <circle cx="6" cy="8" r="2" fill="currentColor" stroke="none"/>
                    <path d="M3 15 L21 15"/>
                    <path d="M9 15 L7 19"/>
                    <path d="M15 15 L17 19"/>
                    <path d="M9 15 L11 10 L13 15"/>
                  </svg>
                </div>
                <div className="vd-glossary-term">Shavasana</div>
                <div className="vd-glossary-origin">Sanskrit · Entspannungshaltung</div>
                <div className="vd-glossary-def">„Totenhaltung" – flach auf dem Rücken liegend, Arme locker neben dem Körper, Handflächen nach oben. In dieser Haltung integriert das Nervensystem alle Eindrücke der Praxis. Oft als wichtigste Übung der ganzen Stunde bezeichnet.</div>
              </div>

              <div className="vd-glossary-item">
                <div className="vd-glossary-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="9"/>
                    <circle cx="12" cy="12" r="3"/>
                    <line x1="12" y1="3" x2="12" y2="9"/>
                    <line x1="12" y1="15" x2="12" y2="21"/>
                    <line x1="3" y1="12" x2="9" y2="12"/>
                    <line x1="15" y1="12" x2="21" y2="12"/>
                    <line x1="5.6" y1="5.6" x2="9.2" y2="9.2"/>
                    <line x1="14.8" y1="14.8" x2="18.4" y2="18.4"/>
                    <line x1="18.4" y1="5.6" x2="14.8" y2="9.2"/>
                    <line x1="9.2" y1="14.8" x2="5.6" y2="18.4"/>
                  </svg>
                </div>
                <div className="vd-glossary-term">Chakra</div>
                <div className="vd-glossary-origin">Sanskrit · Energiezentrum</div>
                <div className="vd-glossary-def">„Rad" oder „Kreis". Im Yoga bezeichnet es eines der sieben Hauptenergiezentren entlang der Wirbelsäule – vom Wurzelchakra (Muladhara) bis zum Kronenchakra (Sahasrara). Kundalini-Energie steigt durch diese Zentren auf.</div>
              </div>

              <div className="vd-glossary-item">
                <div className="vd-glossary-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M12 21 C8 21 5 18 5 14 C5 10 8 8 11 9 C14 9 16 12 15 15 C14 17 12 17 11 16 C10 15 11 13 12 13"/>
                  </svg>
                </div>
                <div className="vd-glossary-term">Kundalini</div>
                <div className="vd-glossary-origin">Sanskrit · Lebensenergie</div>
                <div className="vd-glossary-def">„Die Gewickelte" – eine schlafende Energie, die bildlich am unteren Ende der Wirbelsäule (Wurzelchakra) ruht. <a href="https://kundaliniyogatribe.de/">Kundalini Yoga</a> weckt diese Energie durch Kriyas, Atemübungen und Mantras, damit sie die Wirbelsäule aufsteigen und das Bewusstsein erweitern kann.</div>
              </div>

              <div className="vd-glossary-item">
                <div className="vd-glossary-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <circle cx="12" cy="12" r="4"/>
                    <line x1="12" y1="2" x2="12" y2="5"/>
                    <line x1="12" y1="19" x2="12" y2="22"/>
                    <line x1="2" y1="12" x2="5" y2="12"/>
                    <line x1="19" y1="12" x2="22" y2="12"/>
                    <line x1="4.9" y1="4.9" x2="7.1" y2="7.1"/>
                    <line x1="16.9" y1="16.9" x2="19.1" y2="19.1"/>
                    <line x1="19.1" y1="4.9" x2="16.9" y2="7.1"/>
                    <line x1="7.1" y1="16.9" x2="4.9" y2="19.1"/>
                  </svg>
                </div>
                <div className="vd-glossary-term">Prana</div>
                <div className="vd-glossary-origin">Sanskrit · Lebensatem</div>
                <div className="vd-glossary-def">Die universelle Lebensenergie, die in allem vorhanden ist. Im menschlichen Körper fließt Prana durch feinstoffliche Kanäle (Nadis). Pranayama-Übungen stärken und lenken diese Energie. Ein gut gefülltes Pranafeld zeigt sich in Vitalität, Klarheit und Kreativität.</div>
              </div>

              <div className="vd-glossary-item">
                <div className="vd-glossary-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M2 12 Q6 5 12 5 Q18 5 22 12 Q18 19 12 19 Q6 19 2 12z"/>
                    <circle cx="12" cy="12" r="3"/>
                    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>
                  </svg>
                </div>
                <div className="vd-glossary-term">Drittes Auge (Ajna)</div>
                <div className="vd-glossary-origin">Sanskrit · 6. Chakra</div>
                <div className="vd-glossary-def">Das Stirnchakra, Sitz der Intuition und inneren Wahrnehmung. Im Kundalini Yoga richtet man den inneren Blick oft auf diesen Punkt – den Raum zwischen den Augenbrauen. Dies fördert Fokus, Klarheit und die Verbindung zum höheren Selbst.</div>
              </div>

              <div className="vd-glossary-item">
                <div className="vd-glossary-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <circle cx="12" cy="5" r="2" fill="currentColor" stroke="none"/>
                    <line x1="12" y1="7" x2="12" y2="14"/>
                    <path d="M12 9 L5 5"/>
                    <path d="M12 9 L19 5"/>
                    <path d="M12 14 L9 20"/>
                    <path d="M12 14 L15 20"/>
                  </svg>
                </div>
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
