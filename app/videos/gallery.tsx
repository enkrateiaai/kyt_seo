'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface Video {
  id: string
  title: string
  thumbnail: string
}

interface Playlist {
  id: number
  title: string
  playlistId: string
  videos?: Video[]
  loading?: boolean
  page?: number
}

interface Props {
  isMember: boolean
}

const PAGE_SIZE = 9

export default function YouTubeGallery({ isMember }: Props) {
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [activeVideo, setActiveVideo] = useState<Video | null>(null)
  const [activePlaylistId, setActivePlaylistId] = useState<number | null>(null)
  const playerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY

  useEffect(() => {
    fetch('/api/playlists')
      .then(r => r.json())
      .then((data: Playlist[]) => {
        const withLoading = data.map(p => ({ ...p, videos: [], loading: true, page: 0 }))
        setPlaylists(withLoading)
        withLoading.forEach(p => {
          fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${p.playlistId}&key=${apiKey}`)
            .then(r => r.json())
            .then(res => {
              const videos: Video[] = (res.items || []).map((item: any) => ({
                id: item.snippet.resourceId.videoId,
                title: item.snippet.title,
                thumbnail: item.snippet.thumbnails?.medium?.url ||
                  `https://img.youtube.com/vi/${item.snippet.resourceId.videoId}/mqdefault.jpg`,
              }))
              setPlaylists(prev => prev.map(pl =>
                pl.id === p.id ? { ...pl, videos, loading: false } : pl
              ))
            })
            .catch(() => setPlaylists(prev => prev.map(pl =>
              pl.id === p.id ? { ...pl, loading: false } : pl
            )))
        })
      })
  }, [])

  useEffect(() => {
    if (activeVideo && playerRef.current) {
      playerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [activeVideo])

  const setPage = (playlistId: number, page: number) => {
    setPlaylists(prev => prev.map(p => p.id === playlistId ? { ...p, page } : p))
  }

  const handleVideoClick = (video: Video, playlist: Playlist, index: number) => {
    const allVideos = playlist.videos || []
    const globalIndex = allVideos.findIndex(v => v.id === video.id)
    const isLocked = !isMember && globalIndex !== 0
    if (isLocked) {
      window.open('https://www.charan-amrit-kaur.de/yoga-tribe/', '_blank')
      return
    }
    setActiveVideo(video)
    setActivePlaylistId(playlist.id)
  }

  const btnStyle = (disabled: boolean) => ({
    background: disabled ? '#0d0d14' : '#1a1a2e',
    color: disabled ? '#333' : '#c8f064',
    border: '1px solid #1a1a2e',
    borderRadius: 6,
    padding: '8px 18px',
    fontFamily: 'monospace',
    fontSize: 12,
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    transition: 'all 0.2s'
  })

  return (
    <div style={{ minHeight: '100vh', background: '#06060a', color: '#e0e0e0', fontFamily: 'monospace', padding: '32px 16px' }}>

      {/* Header */}
      <div style={{ marginBottom: 32, paddingBottom: 24, borderBottom: '1px solid #1a1a2e' }}>
        <p style={{ fontSize: 10, letterSpacing: '0.25em', textTransform: 'uppercase', color: '#c8f064', marginBottom: 8 }}>
          // Exklusiv für Mitglieder
        </p>
        <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
          Video Bibliothek
        </h1>
        {!isMember && (
          <p style={{ fontSize: 12, color: '#888', marginTop: 8 }}>
            🔒 Werde Mitglied um alle Videos freizuschalten
          </p>
        )}
      </div>

      {/* Player */}
      {activeVideo && (
        <div ref={playerRef} style={{ marginBottom: 40, background: '#0d0d14', border: '1px solid #1a1a2e', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
            <iframe
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
              src={`https://www.youtube.com/embed/${activeVideo.id}?autoplay=1&rel=0&modestbranding=1`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderTop: '1px solid #1a1a2e' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#c8f064', boxShadow: '0 0 8px #c8f064', flexShrink: 0 }} />
            <p style={{ fontSize: 13, color: '#e0e0e0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {activeVideo.title}
            </p>
          </div>
        </div>
      )}

      {/* Loading */}
      {playlists.length === 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 200, justifyContent: 'center' }}>
          <div style={{ width: 32, height: 32, border: '2px solid #1a1a2e', borderTopColor: '#c8f064', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Playlists */}
      {playlists.map(playlist => {
        const page = playlist.page || 0
        const videos = playlist.videos || []
        const totalPages = Math.ceil(videos.length / PAGE_SIZE)
        const pageVideos = videos.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

        return (
          <div key={playlist.id} style={{ marginBottom: 48 }}>

            {/* Playlist Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                {playlist.title}
              </h2>
              <div style={{ flex: 1, height: 1, background: '#1a1a2e' }} />
              {!playlist.loading && (
                <span style={{ fontSize: 11, color: '#444', flexShrink: 0 }}>
                  {videos.length} Videos
                </span>
              )}
            </div>

            {/* Loading */}
            {playlist.loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#444', fontSize: 12 }}>
                <div style={{ width: 20, height: 20, border: '2px solid #1a1a2e', borderTopColor: '#c8f064', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Lade Videos...
              </div>
            )}

            {/* Grid */}
            {!playlist.loading && pageVideos.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {pageVideos.map(video => {
                  const globalIndex = videos.findIndex(v => v.id === video.id)
                  const isLocked = !isMember && globalIndex !== 0
                  const isActive = activeVideo?.id === video.id && activePlaylistId === playlist.id

                  return (
                    <div
                      key={video.id}
                      onClick={() => handleVideoClick(video, playlist, globalIndex)}
                      style={{
                        position: 'relative', background: '#0d0d14',
                        border: `1px solid ${isActive ? '#c8f064' : '#1a1a2e'}`,
                        borderRadius: 10, overflow: 'hidden', cursor: 'pointer',
                        aspectRatio: '16/9',
                        boxShadow: isActive ? '0 0 20px rgba(200,240,100,0.1)' : 'none',
                        transition: 'border-color 0.2s',
                      }}
                    >
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        loading="lazy"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: isLocked ? 'brightness(0.4)' : 'none' }}
                      />

                      {/* Lock overlay */}
                      {isLocked && (
                        <div style={{
                          position: 'absolute', inset: 0,
                          display: 'flex', flexDirection: 'column',
                          alignItems: 'center', justifyContent: 'center',
                          gap: 4
                        }}>
                          <span style={{ fontSize: 32 }}>🔒</span>
                          <span style={{ fontSize: 9, color: '#888', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                            Mitglieder
                          </span>
                        </div>
                      )}

                      {/* Playing indicator */}
                      {isActive && (
                        <span style={{
                          position: 'absolute', top: 6, left: 6, zIndex: 10,
                          background: '#c8f064', color: '#000', fontSize: 8,
                          fontWeight: 600, padding: '2px 6px', borderRadius: 100,
                        }}>▶</span>
                      )}

                      {/* Free badge on first video */}
                      {globalIndex === 0 && !isMember && (
                        <span style={{
                          position: 'absolute', top: 6, right: 6, zIndex: 10,
                          background: '#c8f064', color: '#000', fontSize: 8,
                          fontWeight: 700, padding: '2px 8px', borderRadius: 100,
                          textTransform: 'uppercase', letterSpacing: '0.1em'
                        }}>Gratis</span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Pagination */}
            {!playlist.loading && totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
                <button onClick={() => setPage(playlist.id, page - 1)} disabled={page === 0} style={btnStyle(page === 0)}>
                  ← Vorherige
                </button>
                <span style={{ fontSize: 11, color: '#444' }}>{page + 1} / {totalPages}</span>
                <button onClick={() => setPage(playlist.id, page + 1)} disabled={page >= totalPages - 1} style={btnStyle(page >= totalPages - 1)}>
                  Nächste →
                </button>
              </div>
            )}

          </div>
        )
      })}
    </div>
  )
}
