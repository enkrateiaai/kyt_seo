import { ClerkProvider } from '@clerk/nextjs'
import { deDE } from '@clerk/localizations'
import { Analytics } from '@vercel/analytics/next'
import { VisualEditing } from 'next-sanity/visual-editing'
import './globals.css'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider localization={deDE}>
      <html lang="de">
        <body>
          {children}
          <VisualEditing />
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  )
}

export const metadata = {
  title: 'Tribe Live Exklusiv',
  description: 'Exklusiver Mitgliederbereich',
  verification: {
    google: 'WbKa8bl4XOf0YczramJ7IJt1KWWNcv5zWtlgILfYf-I',
  },
}
