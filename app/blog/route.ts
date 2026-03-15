import { serveSatnamHtml } from '@/lib/serveStaticHtml'

export async function GET() {
  return serveSatnamHtml('blog.html')
}
