'use client'

import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { presentationTool } from 'sanity/presentation'
import { schema } from './sanity/schema'

const PREVIEW_URL = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
const PREVIEW_SECRET = process.env.NEXT_PUBLIC_SANITY_PREVIEW_SECRET || 'kyt-preview-secret'

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
      previewUrl: {
        origin: PREVIEW_URL,
        previewMode: {
          enable: `/api/draft?secret=${PREVIEW_SECRET}`,
          disable: '/api/disable-draft',
        },
      },
    }),
  ],

  schema,
})
