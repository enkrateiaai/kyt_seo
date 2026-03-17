'use client'

import { useEffect, useState, useRef, useCallback } from 'react'

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

interface SearchResult {
  id: string
  title: string
  thumbnail: string
  excerpt: string
  matchStart: number
  matchEnd: number
}

interface Props {
  isMember: boolean
}

const PAGE_SIZE = 9

export default function YouTubeGallery({ isMember }: Props) {
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [activeVideo, setActiveVideo] = useState<Video | null>(null)
  const [activePlaylistId, setActivePlaylistId] = useState<number | null>(null)
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<number | null>(null)
  const [filterMenuOpen, setFilterMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [transcriptIds, setTranscriptIds] = useState<Set<string>>(new Set())
  const [slugMap, setSlugMap] = useState<Record<string, string>>({})
  const [freeIds, setFreeIds] = useState<Set<string>>(new Set())
  const playerRef = useRef<HTMLDivElement>(null)
  const filterRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY
  const selectedPlaylist = playlists.find(p => p.id === selectedPlaylistId) || null
  const visiblePlaylists = selectedPlaylistId === null
    ? playlists
    : playlists.filter(p => p.id === selectedPlaylistId)

  const handleSearch = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!value.trim() || value.trim().length < 2) {
      setSearchResults(null)
      setSearchLoading(false)
      return
    }
    setSearchLoading(true)
    debounceRef.current = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(value.trim())}`)
        .then(r => r.json())
        .then((data: SearchResult[]) => {
          setSearchResults(data)
          setSearchLoading(false)
        })
        .catch(() => setSearchLoading(false))
    }, 350)
  }, [])

  useEffect(() => {
    fetch('/api/slugs')
      .then(r => r.json())
      .then((map: Record<string, string>) => setSlugMap(map))
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/free-videos')
      .then(r => r.json())
      .then((ids: string[]) => setFreeIds(new Set<string>(ids)))
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/transcripts')
      .then(r => r.json())
      .then((ids: string[]) => setTranscriptIds(new Set(ids)))
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/playlists')
      .then(r => r.json())
      .then((data: Playlist[]) => {
        const withLoading = data.map(p => ({ ...p, videos: [], loading: true, page: 0 }))
        setPlaylists(withLoading)
        withLoading.forEach(p => {
          fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=200&playlistId=${p.playlistId}&key=${apiKey}`)
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

  useEffect(() => {
    if (selectedPlaylistId !== null && !playlists.some(p => p.id === selectedPlaylistId)) {
      setSelectedPlaylistId(null)
    }
  }, [playlists, selectedPlaylistId])

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!filterRef.current) return
      if (!filterRef.current.contains(event.target as Node)) {
        setFilterMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [])

  const setPage = (playlistId: number, page: number) => {
    setPlaylists(prev => prev.map(p => p.id === playlistId ? { ...p, page } : p))
  }

  const handleVideoClick = (video: Video, playlist: Playlist) => {
    const isLocked = !isMember && !freeIds.has(video.id)
    if (isLocked) {
      window.open('https://www.charan-amrit-kaur.de/yoga-tribe/', '_blank')
      return
    }
    setActiveVideo(video)
    setActivePlaylistId(playlist.id)
  }

  const handleSelectPlaylist = (playlistId: number | null) => {
    setSelectedPlaylistId(playlistId)
    setFilterMenuOpen(false)
    if (searchResults || playlistId === null) return
    window.requestAnimationFrame(() => {
      document.getElementById(`section-${playlistId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAF7F2', padding: '40px 24px 80px' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

        .v-search {
          position: relative;
          margin-bottom: 40px;
        }
        .v-search__icon {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          color: #9B8E7E;
          pointer-events: none;
          font-size: 16px;
          line-height: 1;
        }
        .v-search__input {
          width: 100%;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          padding: 14px 180px 14px 44px;
          border: 1px solid #DDD5C8;
          border-radius: 100px;
          background: #fff;
          color: #2C2416;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-shadow: 0 2px 8px rgba(44,36,22,0.04);
        }
        .v-search__input::placeholder { color: #B8AFA6; }
        .v-search__input:focus {
          border-color: #D3BC76;
          box-shadow: 0 0 0 3px rgba(211,188,118,0.12), 0 2px 8px rgba(44,36,22,0.04);
        }
        .v-search__clear {
          position: absolute;
          right: 138px;
          top: 50%;
          transform: translateY(-50%);
          background: #EDE8E0;
          border: none;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6B5D4F;
          font-size: 12px;
          transition: background 0.2s;
        }
        .v-search__clear:hover { background: #DDD5C8; }
        .v-search__spinner {
          position: absolute;
          right: 138px;
          top: 50%;
          transform: translateY(-50%);
          width: 18px; height: 18px;
          border: 2px solid #EDE8E0;
          border-top-color: #D3BC76;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        .v-search__filter {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          z-index: 2;
        }
        .v-search__filter-btn {
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          font-weight: 500;
          color: #6B5D4F;
          background: #F3EDE4;
          border: 1px solid #DDD5C8;
          border-radius: 100px;
          height: 34px;
          padding: 0 12px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          max-width: 160px;
        }
        .v-search__filter-label {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .v-search__filter-btn:hover {
          border-color: #D3BC76;
          color: #D3BC76;
        }
        .v-search__filter-menu {
          position: absolute;
          right: 0;
          top: calc(100% + 8px);
          width: min(280px, calc(100vw - 48px));
          max-height: 280px;
          overflow-y: auto;
          background: #fff;
          border: 1px solid #DDD5C8;
          border-radius: 12px;
          box-shadow: 0 10px 24px rgba(44,36,22,0.12);
          padding: 6px;
          z-index: 15;
        }
        .v-search__filter-item {
          width: 100%;
          text-align: left;
          border: none;
          background: transparent;
          border-radius: 8px;
          padding: 8px 10px;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          color: #2C2416;
          cursor: pointer;
        }
        .v-search__filter-item:hover {
          background: #F3EDE4;
        }
        .v-search__filter-item--active {
          background: #F3EDE4;
          color: #D3BC76;
          font-weight: 500;
        }

        .v-results { animation: fadeIn 0.25s ease; }
        .v-results__meta {
          font-size: 12px;
          color: #9B8E7E;
          margin-bottom: 20px;
          letter-spacing: 0.03em;
        }
        .v-results__meta strong { color: #6B5D4F; }
        .v-results__empty {
          text-align: center;
          padding: 60px 20px;
          color: #9B8E7E;
          font-size: 14px;
        }
        .v-results__empty-icon { font-size: 32px; margin-bottom: 12px; }

        .v-result {
          display: flex;
          gap: 16px;
          padding: 16px;
          background: #fff;
          border: 1px solid #EDE8E0;
          border-radius: 12px;
          margin-bottom: 12px;
          text-decoration: none;
          color: inherit;
          transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
          animation: fadeIn 0.3s ease;
        }
        .v-result:hover {
          border-color: #D3BC76;
          box-shadow: 0 4px 16px rgba(44,36,22,0.08);
          transform: translateY(-1px);
        }
        .v-result__thumb {
          flex-shrink: 0;
          width: 140px;
          height: 79px;
          border-radius: 8px;
          overflow: hidden;
          background: #F3EDE4;
        }
        .v-result__thumb img {
          width: 100%; height: 100%;
          object-fit: cover;
          display: block;
        }
        .v-result__body {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .v-result__title {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 1.05rem;
          font-weight: 400;
          color: #2C2416;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .v-result__excerpt {
          font-size: 13px;
          color: #6B5D4F;
          line-height: 1.55;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .v-result__excerpt mark {
          background: rgba(211,188,118,0.2);
          color: #2C2416;
          border-radius: 2px;
          padding: 0 2px;
          font-weight: 500;
        }
        .v-result__cta {
          font-size: 12px;
          color: #D3BC76;
          font-weight: 500;
          margin-top: auto;
        }
        @media (max-width: 640px) {
          .v-search__input { padding-right: 146px; }
          .v-search__clear, .v-search__spinner { right: 106px; }
          .v-search__filter-btn {
            max-width: 120px;
            padding: 0 10px;
            gap: 6px;
          }
        }
        @media (max-width: 480px) {
          .v-result__thumb { width: 100px; height: 56px; }
        }

        .v-container { max-width: 1100px; margin: 0 auto; }

        .v-header { margin-bottom: 48px; padding-bottom: 32px; border-bottom: 1px solid #DDD5C8; }
        .v-header__kicker {
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #D3BC76;
          margin-bottom: 10px;
        }
        .v-header__title {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: clamp(2rem, 5vw, 3.2rem);
          font-weight: 300;
          color: #2C2416;
          line-height: 1.15;
          margin-bottom: 10px;
        }
        .v-header__sub {
          font-size: 14px;
          color: #9B8E7E;
        }
        .v-header__badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 12px;
          padding: 6px 14px;
          background: #F3EDE4;
          border: 1px solid #DDD5C8;
          border-radius: 100px;
          font-size: 12px;
          color: #6B5D4F;
        }

        .v-player {
          margin-bottom: 48px;
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid #DDD5C8;
          background: #fff;
          animation: fadeIn 0.3s ease;
          box-shadow: 0 4px 24px rgba(44,36,22,0.06);
        }
        .v-player__iframe-wrap {
          position: relative;
          padding-bottom: 56.25%;
          height: 0;
        }
        .v-player__iframe-wrap iframe {
          position: absolute;
          top: 0; left: 0;
          width: 100%; height: 100%;
          border: none;
        }
        .v-player__title {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 20px;
          border-top: 1px solid #EDE8E0;
        }
        .v-player__dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: #D3BC76;
          flex-shrink: 0;
        }
        .v-player__title-text {
          font-size: 13px;
          color: #2C2416;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-weight: 400;
        }

        .v-loading-global {
          display: flex;
          align-items: center;
          gap: 12px;
          min-height: 200px;
          justify-content: center;
          color: #9B8E7E;
          font-size: 13px;
        }
        .v-spinner {
          width: 28px; height: 28px;
          border: 2px solid #EDE8E0;
          border-top-color: #D3BC76;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          flex-shrink: 0;
        }

        .v-section { margin-bottom: 52px; }
        .v-section__header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 20px;
        }
        .v-section__title {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 1.35rem;
          font-weight: 400;
          color: #2C2416;
          margin: 0;
          white-space: nowrap;
        }
        .v-section__line {
          flex: 1;
          height: 1px;
          background: #EDE8E0;
        }
        .v-section__count {
          font-size: 11px;
          color: #9B8E7E;
          flex-shrink: 0;
        }

        .v-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }
        @media (max-width: 640px) {
          .v-grid { grid-template-columns: repeat(2, 1fr); }
        }

        .v-card {
          position: relative;
          background: #F3EDE4;
          border: 1px solid #EDE8E0;
          border-radius: 10px;
          overflow: hidden;
          cursor: pointer;
          aspect-ratio: 16/9;
          transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
        }
        .v-card:hover {
          border-color: #DDD5C8;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(44,36,22,0.08);
        }
        .v-card--active {
          border-color: #D3BC76 !important;
          box-shadow: 0 0 0 3px rgba(211,188,118,0.15), 0 4px 16px rgba(44,36,22,0.1) !important;
        }
        .v-card img {
          width: 100%; height: 100%;
          object-fit: cover;
          display: block;
        }

        .v-card__lock {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .v-card__lock-icon {
          width: 36px; height: 36px;
          border-radius: 50%;
          background: rgba(0,0,0,0.45);
          backdrop-filter: blur(4px);
          border: 1.5px solid rgba(255,255,255,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
        }

        .v-card__playing {
          position: absolute;
          top: 7px; left: 7px;
          z-index: 10;
          background: #D3BC76;
          color: #fff;
          font-size: 8px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 100px;
          font-family: 'DM Sans', sans-serif;
          letter-spacing: 0.05em;
        }
        .v-card__free {
          position: absolute;
          top: 7px; right: 7px;
          z-index: 10;
          background: #7A8B6F;
          color: #fff;
          font-size: 8px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 100px;
          font-family: 'DM Sans', sans-serif;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .v-pagination {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 18px;
        }
        .v-pagination__btn {
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          font-weight: 500;
          padding: 7px 16px;
          border-radius: 100px;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid #DDD5C8;
          background: #fff;
          color: #6B5D4F;
        }
        .v-pagination__btn:hover:not(:disabled) {
          border-color: #D3BC76;
          color: #D3BC76;
        }
        .v-pagination__btn:disabled {
          opacity: 0.35;
          cursor: default;
        }
        .v-pagination__info {
          font-size: 11px;
          color: #9B8E7E;
        }

        /* TOC */
        .v-item { display: flex; flex-direction: column; }
        .v-item__meta {
          padding: 6px 2px 0;
          display: flex;
          justify-content: flex-end;
        }
        .v-item__link {
          font-size: 11px;
          color: #D3BC76;
          text-decoration: none;
          white-space: nowrap;
          font-weight: 500;
          transition: opacity 0.2s;
        }
        .v-item__link:hover { opacity: 0.7; }

        @media (max-width: 640px) {
          .v-header { margin-bottom: 36px; padding-bottom: 24px; }
        }
      `}</style>

      <div className="v-container">

        {/* Header */}
        <div className="v-header">
          <p className="v-header__kicker">Kundalini Yoga Tribe</p>
          <h1 className="v-header__title">Video Bibliothek</h1>
          {isMember ? (
            <p className="v-header__sub">Vollständiger Zugriff auf alle Kriyas und Meditationen.</p>
          ) : (
            <>
              <p className="v-header__sub">Ein Schnuppervideo ist kostenlos zugänglich.</p>
              <div className="v-header__badge">
                <span>🔒</span>
                <span>Mitgliedschaft für vollen Zugriff</span>
                <a href="https://www.charan-amrit-kaur.de/yoga-tribe/" target="_blank" rel="noopener" style={{ color: '#D3BC76', fontWeight: 500 }}>
                  Mehr erfahren →
                </a>
              </div>
            </>
          )}

        </div>

        {/* Search */}
        <div className="v-search">
          <span className="v-search__icon">⌕</span>
          <input
            className="v-search__input"
            type="text"
            placeholder="In Transkripten suchen…"
            value={query}
            onChange={e => {
              setQuery(e.target.value)
              handleSearch(e.target.value)
            }}
            autoComplete="off"
            spellCheck={false}
          />
          <div className="v-search__filter" ref={filterRef}>
            <button
              className="v-search__filter-btn"
              onClick={() => setFilterMenuOpen(prev => !prev)}
              aria-haspopup="menu"
              aria-expanded={filterMenuOpen}
              type="button"
            >
              <span className="v-search__filter-label">{selectedPlaylist?.title || 'Alle Typen'}</span>
              <span>{filterMenuOpen ? '▴' : '▾'}</span>
            </button>
            {filterMenuOpen && (
              <div className="v-search__filter-menu" role="menu" aria-label="Video Typen">
                <button
                  className={`v-search__filter-item${selectedPlaylistId === null ? ' v-search__filter-item--active' : ''}`}
                  onClick={() => handleSelectPlaylist(null)}
                  role="menuitem"
                  type="button"
                >
                  Alle Typen
                </button>
                {playlists.map(playlist => (
                  <button
                    key={playlist.id}
                    className={`v-search__filter-item${selectedPlaylistId === playlist.id ? ' v-search__filter-item--active' : ''}`}
                    onClick={() => handleSelectPlaylist(playlist.id)}
                    role="menuitem"
                    type="button"
                  >
                    {playlist.title}
                  </button>
                ))}
              </div>
            )}
          </div>
          {searchLoading && <div className="v-search__spinner" />}
          {!searchLoading && query && (
            <button
              className="v-search__clear"
              onClick={() => { setQuery(''); setSearchResults(null) }}
              aria-label="Suche zurücksetzen"
            >✕</button>
          )}
        </div>

        {/* Search Results */}
        {searchResults !== null && (
          <div className="v-results">
            {searchResults.length > 0 ? (
              <>
                <p className="v-results__meta">
                  <strong>{searchResults.length} {searchResults.length === 1 ? 'Ergebnis' : 'Ergebnisse'}</strong> für „{query}"
                </p>
                {searchResults.map(result => {
                  const before = result.excerpt.slice(0, result.matchStart)
                  const match = result.excerpt.slice(result.matchStart, result.matchEnd)
                  const after = result.excerpt.slice(result.matchEnd)
                  return (
                    <a key={result.id} href={`/videos/${slugMap[result.id] ?? result.id}`} className="v-result">
                      <div className="v-result__thumb">
                        <img src={result.thumbnail} alt={result.title} loading="lazy" />
                      </div>
                      <div className="v-result__body">
                        <p className="v-result__title">{result.title}</p>
                        <p className="v-result__excerpt">
                          {before}<mark>{match}</mark>{after}
                        </p>
                        <span className="v-result__cta">Zur Seite →</span>
                      </div>
                    </a>
                  )
                })}
              </>
            ) : (
              <div className="v-results__empty">
                <div className="v-results__empty-icon">🔍</div>
                <p>Kein Treffer für „{query}"</p>
              </div>
            )}
          </div>
        )}

        {/* Player */}
        {activeVideo && !searchResults && (
          <div className="v-player" ref={playerRef}>
            <div className="v-player__iframe-wrap">
              <iframe
                src={`https://www.youtube.com/embed/${activeVideo.id}?autoplay=1&rel=0&modestbranding=1`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="v-player__title">
              <div className="v-player__dot" />
              <p className="v-player__title-text">{activeVideo.title}</p>
            </div>
          </div>
        )}

        {/* Global loading */}
        {playlists.length === 0 && !searchResults && (
          <div className="v-loading-global">
            <div className="v-spinner" />
            Lade Playlists…
          </div>
        )}

        {/* Playlists */}
        {!searchResults && visiblePlaylists.map(playlist => {
          const page = playlist.page || 0
          // Pin free video to position 0 only for non-members
          const videos = [...(playlist.videos || [])].sort((a, b) => {
            if (!isMember) {
              if (freeIds.has(a.id)) return -1
              if (freeIds.has(b.id)) return 1
            }
            return 0
          })
          const totalPages = Math.ceil(videos.length / PAGE_SIZE)
          const pageVideos = videos.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

          return (
            <div key={playlist.id} id={`section-${playlist.id}`} className="v-section" style={{ scrollMarginTop: 80 }}>
              <div className="v-section__header">
                <h2 className="v-section__title">{playlist.title}</h2>
                <div className="v-section__line" />
                {!playlist.loading && (
                  <span className="v-section__count">{videos.length} Videos</span>
                )}
              </div>

              {playlist.loading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#9B8E7E', fontSize: 13 }}>
                  <div className="v-spinner" style={{ width: 18, height: 18 }} />
                  Lade Videos…
                </div>
              )}

              {!playlist.loading && pageVideos.length > 0 && (
                <div className="v-grid">
                  {pageVideos.map(video => {
                    const isFreeVideo = freeIds.has(video.id)
                    const isLocked = !isMember && !isFreeVideo
                    const isActive = activeVideo?.id === video.id && activePlaylistId === playlist.id

                    return (
                      <div key={video.id} className="v-item">
                        <div
                          onClick={() => handleVideoClick(video, playlist)}
                          className={`v-card${isLocked ? ' v-card--locked' : ''}${isActive ? ' v-card--active' : ''}`}
                        >
                          <img src={video.thumbnail} alt={video.title} loading="lazy" />

                          {isLocked && (
                            <div className="v-card__lock">
                              <div className="v-card__lock-icon">🔒</div>
                            </div>
                          )}
                          {isActive && <span className="v-card__playing">▶ Läuft</span>}
                          {isFreeVideo && !isMember && (
                            <span className="v-card__free">Gratis</span>
                          )}
                        </div>
                        {transcriptIds.has(video.id) && (
                          <div className="v-item__meta">
                            <a
                              href={`/videos/${slugMap[video.id] ?? video.id}`}
                              className="v-item__link"
                              onClick={e => e.stopPropagation()}
                            >
                              Mehr zum Video →
                            </a>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {!playlist.loading && totalPages > 1 && (
                <div className="v-pagination">
                  <button
                    className="v-pagination__btn"
                    onClick={() => setPage(playlist.id, page - 1)}
                    disabled={page === 0}
                  >
                    ← Vorherige
                  </button>
                  <span className="v-pagination__info">{page + 1} / {totalPages}</span>
                  <button
                    className="v-pagination__btn"
                    onClick={() => setPage(playlist.id, page + 1)}
                    disabled={page >= totalPages - 1}
                  >
                    Nächste →
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
