import { serveSatnamHtml } from '@/lib/serveStaticHtml'

interface Props {
  params: Promise<{ slug: string }>
}

export async function GET(_req: Request, { params }: Props) {
  const { slug } = await params
  // Handle both /artikel/foo and /artikel/foo.html
  const filename = slug.endsWith('.html') ? slug : `${slug}.html`
  return serveSatnamHtml(`artikel/${filename}`)
}
