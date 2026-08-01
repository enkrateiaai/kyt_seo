'use client'

import { useEffect } from 'react'

const THROTTLE_MS = 60 * 60 * 1000 // 1 hour
const LS_KEY = 'kyt_last_visit'

export default function TrackVisit() {
  useEffect(() => {
    const last = Number(localStorage.getItem(LS_KEY) || 0)
    if (Date.now() - last < THROTTLE_MS) return
    fetch('/api/track-visit', { method: 'POST' }).then(r => {
      if (r.ok) localStorage.setItem(LS_KEY, String(Date.now()))
    }).catch(() => {})
  }, [])

  return null
}
