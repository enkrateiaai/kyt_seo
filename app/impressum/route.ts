import { serveSatnamHtml } from '@/lib/serveStaticHtml'

export const dynamic = 'force-dynamic'

export async function GET() {
  return await serveSatnamHtml('impressum.html')
}
