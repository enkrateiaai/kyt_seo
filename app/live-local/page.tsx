import LiveExperience from '../live/LiveExperience'
import LocalLivePlayer from './LocalLivePlayer'

export const metadata = {
  title: 'Live Local – Kundalini Yoga Tribe',
  description: 'Lokaler Direktstream fur Mitglieder',
}

export default async function LiveLocalPage() {
  return (
    <LiveExperience
      activeTab="live-local"
      title="Tribe Live Local"
      description="Der direkte Studiostream mit automatischem Start und einer ruhigen Offline-Ansicht im Kundalini Yoga Tribe Design."
      liveBadge="Direktsignal"
      player={<LocalLivePlayer />}
      footer="Der lokale Stream startet automatisch, sobald das Signal auf dem Server anliegt."
    />
  )
}
