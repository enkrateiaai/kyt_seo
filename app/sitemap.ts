import type { MetadataRoute } from 'next'
import redis from '@/lib/redis'

const BASE = 'https://kundaliniyogatribe.de'

const STATIC_PAGES: MetadataRoute.Sitemap = [
  { url: `${BASE}/`,               lastModified: new Date(), changeFrequency: 'weekly',  priority: 1.0 },
  { url: `${BASE}/blog`,           lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.8 },
  { url: `${BASE}/glossar`,        lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
  { url: `${BASE}/videos`,         lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.9 },
  { url: `${BASE}/artikel/was-ist-sat-nam-rasayan`,      lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
  { url: `${BASE}/artikel/sat-kriya-anleitung`,          lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
  { url: `${BASE}/artikel/sat-nam-rasayan-erfahrungen`,  lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
  { url: `${BASE}/artikel/sat-nam-rasayan-vs-reiki`,     lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
  { url: `${BASE}/artikel/40-tage-kriya-challenge`,      lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
  { url: `${BASE}/artikel/kriya-gegen-angst`,            lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
  { url: `${BASE}/impressum`,      lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.2 },
  { url: `${BASE}/datenschutz`,    lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.2 },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Fetch all video slugs from Redis
  let videoEntries: MetadataRoute.Sitemap = []
  try {
    const keys = await redis.keys('vidslug:*')
    const slugs = await Promise.all(keys.map(k => redis.get(k)))
    videoEntries = slugs
      .filter((s): s is string => Boolean(s))
      .map(slug => ({
        url: `${BASE}/videos/${slug}`,
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      }))
  } catch {
    // Redis unavailable — skip video entries
  }

  return [...STATIC_PAGES, ...videoEntries]
}
