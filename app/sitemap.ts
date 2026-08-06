import type { MetadataRoute } from 'next'
import redis from '@/lib/redis'
import fs from 'fs'
import path from 'path'

const BASE = 'https://kundaliniyogatribe.de'

const STATIC_PAGES: MetadataRoute.Sitemap = [
  { url: `${BASE}/`,      lastModified: new Date(), changeFrequency: 'weekly',  priority: 1.0 },
  { url: `${BASE}/blog`,  lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.8 },
  { url: `${BASE}/glossar`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
  { url: `${BASE}/videos`, lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.9 },
  { url: `${BASE}/mantras`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
  { url: `${BASE}/impressum`,  lastModified: new Date(), changeFrequency: 'yearly', priority: 0.2 },
  { url: `${BASE}/datenschutz`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.2 },
]

function readMtime(filePath: string): Date {
  try { return fs.statSync(filePath).mtime } catch { return new Date() }
}

// Slugs that are clearly test/placeholder/deleted content — exclude from sitemap
function isJunkSlug(slug: string): boolean {
  if (slug.length <= 2) return true
  if (/^\d+(-\d+)?$/.test(slug)) return true
  if (/^(deleted|private|test|xy|x-\d|placeholder)/.test(slug)) return true
  return false
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Article pages — auto-discovered from filesystem
  let artikelEntries: MetadataRoute.Sitemap = []
  try {
    const artikelDir = path.join(process.cwd(), 'public/satnam/artikel')
    const files = fs.readdirSync(artikelDir)
    artikelEntries = files
      .filter(f => f.endsWith('.html'))
      .map(f => ({
        url: `${BASE}/artikel/${f.replace('.html', '')}`,
        lastModified: readMtime(path.join(artikelDir, f)),
        changeFrequency: 'monthly' as const,
        priority: 0.7,
      }))
  } catch {
    // Filesystem unavailable — skip
  }

  // Mantra pages — auto-discovered from filesystem
  let mantraEntries: MetadataRoute.Sitemap = []
  try {
    const mantraDir = path.join(process.cwd(), 'public/satnam/mantras')
    const files = fs.readdirSync(mantraDir)
    mantraEntries = files
      .filter(f => f.endsWith('.html'))
      .map(f => ({
        url: `${BASE}/mantras/${f.replace('.html', '')}`,
        lastModified: readMtime(path.join(mantraDir, f)),
        changeFrequency: 'monthly' as const,
        priority: 0.7,
      }))
  } catch {
    // Filesystem unavailable — skip
  }

  // Video pages — from Redis, junk slugs excluded
  let videoEntries: MetadataRoute.Sitemap = []
  try {
    const keys = await redis.keys('vidslug:*')
    const slugs = await Promise.all(keys.map(k => redis.get(k)))
    videoEntries = slugs
      .filter((s): s is string => typeof s === 'string' && !isJunkSlug(s))
      .map(slug => ({
        url: `${BASE}/videos/${slug}`,
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      }))
  } catch {
    // Redis unavailable — skip video entries
  }

  return [...STATIC_PAGES, ...artikelEntries, ...mantraEntries, ...videoEntries]
}
