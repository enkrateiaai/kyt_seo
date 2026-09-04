import LiveExperience from './LiveExperience'
import LocalLivePlayer from '../live-local/LocalLivePlayer'

export const metadata = {
  title: 'Kundalini Yoga Live – Kundalini Yoga Tribe',
  description:
    'Tägliche Lives finden um 6:30 Uhr und 10 Uhr von Mo.-Fr. statt und am Wochenende um 7:00 Uhr und 10 Uhr. Sonntag Abend um 20:30 Uhr findet die Meditation statt.',
}

export default async function LivePage() {
  return (
    <LiveExperience
      activeTab="live"
      title="Kundalini Yoga Live"
      description="Tägliche Lives finden um 6:30 Uhr und 10 Uhr von Mo.-Fr. statt und am Wochenende um 7:00 Uhr und 10 Uhr. Sonntag Abend um 20:30 Uhr findet die Meditation statt."
      liveBadge="Live"
      player={<LocalLivePlayer />}
      footer="Bildschirm bleibt aktiv während du schaust · Sat Nam"
    />
  )
}
