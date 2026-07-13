import LiveExperience from './LiveExperience'
import OneStreamPlayer from './OneStreamPlayer'

export const metadata = {
  title: 'Live Stream – Kundalini Yoga Tribe',
  description: 'Exklusiver Live-Stream für Mitglieder',
}

export default async function LivePage() {
  return (
    <LiveExperience
      activeTab="live"
      title="Tribe Live Exklusiv"
      description="Der bisherige Mitglieder-Stream bleibt erhalten. Uber die neue Registerkarte kannst du jederzeit zum lokalen Direktsignal wechseln."
      liveBadge="Live"
      player={<OneStreamPlayer />}
      footer="Bildschirm bleibt aktiv wahrend du schaust · Sat Nam"
    />
  )
}
