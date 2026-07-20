'use client'

import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { presentationTool, defineLocations } from 'sanity/presentation'
import { schema } from './sanity/schema'

const PREVIEW_URL = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')

export default defineConfig({
  name: 'kundaliniyogatribe',
  title: 'Kundalini Yoga Tribe',
  basePath: '/studio',

  projectId: 'tk7egxqt',
  dataset: 'production',

  plugins: [
    structureTool(),
    visionTool(),
    presentationTool({
      resolve: {
        locations: {
          article: defineLocations({
            select: { title: 'title', slug: 'slug.current' },
            resolve: (doc) => ({
              locations: doc?.slug
                ? [{ title: doc.title || 'Untitled', href: `/artikel/${doc.slug}` }]
                : [],
            }),
          }),
          page: defineLocations({
            select: { title: 'title', slug: 'slug.current' },
            resolve: (doc) => ({
              locations: doc?.slug
                ? [{ title: doc.title || 'Untitled', href: `/${doc.slug}` }]
                : [],
            }),
          }),
        },
      },
      previewUrl: {
        origin: PREVIEW_URL,
      },
    }),
  ],

  schema,
})
