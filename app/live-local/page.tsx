import LocalLivePlayer from './LocalLivePlayer'

export const metadata = {
  title: 'Live Stream – Kundalini Yoga Tribe',
}

export default function LiveLocalPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#0f0e0c', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '24px' }}>
      <LocalLivePlayer />
    </main>
  )
}
