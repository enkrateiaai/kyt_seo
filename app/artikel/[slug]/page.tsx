import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import { client } from '@/lib/sanity'
import { PortableText } from '@portabletext/react'
import { VisualEditing } from 'next-sanity/visual-editing'

interface Props {
  params: Promise<{ slug: string }>
}

async function getArticle(slug: string, preview: boolean) {
  const q = `*[_type == "article" && slug.current == $slug][0]{
    _id, title, body, excerpt,
    "seo": seo{ metaTitle, metaDescription }
  }`
  return client.fetch(q, { slug }, {
    perspective: preview ? 'previewDrafts' : 'published',
    useCdn: false,
    token: preview ? process.env.SANITY_API_TOKEN : undefined,
  })
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const article = await getArticle(slug, false)
  if (!article) return {}
  return {
    title: article.seo?.metaTitle || article.title,
    description: article.seo?.metaDescription || article.excerpt,
  }
}

export default async function ArtikelPage({ params }: Props) {
  const { slug } = await params
  const { isEnabled } = await draftMode()
  const article = await getArticle(slug, isEnabled)

  if (!article) notFound()

  return (
    <>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500;600&display=swap" />
      <link rel="stylesheet" href="/satnam/css/style.css" />

      <nav className="nav" id="nav">
        <div className="nav__inner">
          <a href="/" className="nav__logo">
            <img src="/icon.png" alt="KYT" style={{ width: 28, height: 28, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
            <span className="nav__logo-text">Kundalini Yoga Tribe</span>
          </a>
        </div>
      </nav>

      <main className="article-page" style={{ maxWidth: 760, margin: '0 auto', padding: '80px 24px 60px' }}>
        <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 400, lineHeight: 1.25, marginBottom: '2rem' }}>
          {article.title}
        </h1>
        {article.body && (
          <div className="article-body" style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '1.05rem', lineHeight: 1.75, color: '#2c2416' }}>
            <PortableText value={article.body} />
          </div>
        )}
      </main>
      {isEnabled && <VisualEditing />}
    </>
  )
}
