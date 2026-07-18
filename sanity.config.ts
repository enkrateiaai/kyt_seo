'use client'

import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { schema } from './sanity/schema'

export default defineConfig({
  name: 'kundaliniyogatribe',
  title: 'Kundalini Yoga Tribe',

  projectId: 'tk7egxqt',
  dataset: 'production',

  plugins: [
    structureTool(),
    visionTool(),
  ],

  schema,
})
