import { article } from './schemas/article'
import { page } from './schemas/page'
import { siteSettings } from './schemas/siteSettings'

export const schema = {
  types: [article, page, siteSettings],
}
