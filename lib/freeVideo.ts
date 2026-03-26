export const FREE_VIDEO_ID = process.env.NEXT_PUBLIC_FREE_VIDEO_ID || 'EYZxuvrRup8'

export function isFreeVideo(videoId: string) {
  return videoId === FREE_VIDEO_ID
}
