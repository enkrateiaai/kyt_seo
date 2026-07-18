/**
 * Import static HTML pages into Sanity as article/page documents.
 * Usage: node scripts/import-to-sanity.mjs
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join, basename } from 'path'
import { randomBytes } from 'crypto'

const TOKEN = process.env.SANITY_API_TOKEN || 'skaGEckEQ9nmLQYP65jrdl1Jzv5pcgou8UaOt9snXgA8CjETEFpkzzXJFFMGQNaACTCFdtmmdEs5Dxr5pZjvf0oh7NhGZDuJMgGZKy6NjoC2bZ2dehaWMlI1lJ2yDrbhUSZlx9RAABqo1jfVr6PSQwPS2M4z4FnQMkuxtJzo3PtoR3J1Qfjg'
const PROJECT = 'tk7egxqt'
const DATASET = 'production'
const API = `https://${PROJECT}.api.sanity.io/v2021-06-07/data/mutate/${DATASET}`

const PUBLIC_DIR = new URL('../public/satnam', import.meta.url).pathname

function key() {
  return randomBytes(4).toString('hex')
}

function extractMeta(html, tag) {
  const m = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'))
  return m ? m[1].replace(/<[^>]+>/g, '').trim() : ''
}

function extractMetaTag(html, name) {
  const m = html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'))
      || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, 'i'))
  return m ? m[1].trim() : ''
}

function htmlToBlocks(html) {
  // Extract main content area
  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)
    || html.match(/<article[^>]*>([\s\S]*?)<\/article>/i)
    || html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)

  const content = mainMatch ? mainMatch[1] : html

  // Remove scripts, styles, nav, header, footer
  const cleaned = content
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')

  const blocks = []

  // Match headings and paragraphs in order
  const pattern = /<(h1|h2|h3|h4|p|li)[^>]*>([\s\S]*?)<\/\1>/gi
  let match

  while ((match = pattern.exec(cleaned)) !== null) {
    const tag = match[1].toLowerCase()
    const innerHtml = match[2]
    const text = innerHtml.replace(/<[^>]+>/g, '').trim()

    if (!text) continue

    let style = 'normal'
    if (tag === 'h1') style = 'h1'
    else if (tag === 'h2') style = 'h2'
    else if (tag === 'h3') style = 'h3'
    else if (tag === 'h4') style = 'h3'

    blocks.push({
      _type: 'block',
      _key: key(),
      style,
      markDefs: [],
      children: [{ _type: 'span', _key: key(), text, marks: [] }],
    })
  }

  return blocks
}

function slugify(filename) {
  return basename(filename, '.html')
}

async function mutate(mutations) {
  const res = await fetch(API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ mutations }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(JSON.stringify(data))
  return data
}

async function importFile(filepath, type) {
  const html = readFileSync(filepath, 'utf-8')
  const title = extractMeta(html, 'title')
  const description = extractMetaTag(html, 'description')
  const slug = slugify(filepath)
  const body = htmlToBlocks(html)

  const doc = {
    _type: type,
    _id: `${type}-${slug}`,
    title,
    slug: { _type: 'slug', current: slug },
    body,
    ...(description ? { seo: { metaTitle: title, metaDescription: description } } : {}),
  }

  await mutate([{ createOrReplace: doc }])
  console.log(`✓ ${type}: ${slug} (${body.length} blocks)`)
}

async function main() {
  const artikelDir = join(PUBLIC_DIR, 'artikel')
  const artikelFiles = readdirSync(artikelDir).filter(f => f.endsWith('.html'))

  console.log(`\nImporting ${artikelFiles.length} articles...`)
  for (const f of artikelFiles) {
    await importFile(join(artikelDir, f), 'article')
  }

  // Static pages
  const pages = ['glossar.html', 'impressum.html', 'datenschutz.html']
  console.log(`\nImporting ${pages.length} pages...`)
  for (const f of pages) {
    const fp = join(PUBLIC_DIR, f)
    try { statSync(fp); await importFile(fp, 'page') } catch {}
  }

  // Mantras as articles
  const mantrasDir = join(PUBLIC_DIR, 'mantras')
  const mantraFiles = readdirSync(mantrasDir).filter(f => f.endsWith('.html'))
  console.log(`\nImporting ${mantraFiles.length} mantras...`)
  for (const f of mantraFiles) {
    await importFile(join(mantrasDir, f), 'article')
  }

  console.log('\nDone.')
}

main().catch(e => { console.error(e); process.exit(1) })
