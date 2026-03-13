import { currentUser } from '@clerk/nextjs/server'
import { SignOutButton, SignInButton } from '@clerk/nextjs'
import YouTubeGallery from './gallery'

export default async function VideosPage() {
  const user = await currentUser()
  const isMember = user?.publicMetadata?.role === 'member'
  const email = user?.emailAddresses[0]?.emailAddress

  return (
    <div>
      {/* Top bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 16px', background: '#06060a', borderBottom: '1px solid #1a1a2e',
        fontFamily: 'monospace'
      }}>
        {user ? (
          <>
            <span style={{ fontSize: 11, color: '#444' }}>{email}</span>
            <SignOutButton>
              <button style={{
                background: 'transparent', border: '1px solid #1a1a2e',
                color: '#555', padding: '6px 14px', borderRadius: 6,
                fontFamily: 'monospace', fontSize: 11, cursor: 'pointer'
              }}>
                Abmelden →
              </button>
            </SignOutButton>
          </>
        ) : (
          <div style={{ marginLeft: 'auto' }}>
            <SignInButton>
              <button style={{
                background: 'transparent', border: '1px solid #1a1a2e',
                color: '#c8f064', padding: '6px 14px', borderRadius: 6,
                fontFamily: 'monospace', fontSize: 11, cursor: 'pointer'
              }}>
                Anmelden / Log in →
              </button>
            </SignInButton>
          </div>
        )}
      </div>
      <YouTubeGallery isMember={isMember} />
    </div>
  )
}
