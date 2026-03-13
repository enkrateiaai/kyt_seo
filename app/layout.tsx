import { ClerkProvider } from '@clerk/nextjs'
import { deDE } from '@clerk/localizations'
import './globals.css'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider localization={deDE}>
      <html lang="de">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}

export const metadata = {
  title: 'Tribe Live Exklusiv',
  description: 'Exklusiver Mitgliederbereich',
}
