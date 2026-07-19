import { createClient } from 'next-sanity'

export const client = createClient({
  projectId: 'tk7egxqt',
  dataset: 'production',
  apiVersion: '2026-07-18',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
})
