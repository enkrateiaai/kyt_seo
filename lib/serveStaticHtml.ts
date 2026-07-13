import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { hasClerkClientConfig, hasClerkConfig } from './authConfig'
import { getViewerUser, hasLiveAccess } from './memberAccess'

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function injectLandingPageLinks(
  html: string,
  isLoggedIn: boolean,
  clerkEnabled: boolean,
  userLabel?: string,
  canAccessLive: boolean = true,
): string {
  if (!clerkEnabled) {
    return html
      .replace(
        /<li><a href="\/videos"[^>]*>Mitgliederbereich<\/a><\/li>/g,
        '',
      )
      .replace(
        /<li><a href="\/sign-in[^"]*"[^>]*>Mitglieder<\/a><\/li>/g,
        '<li><a href="/sign-in">Anmelden</a></li>',
      )
      .replace(
        /<li><a href="\/sign-in[^"]*"[^>]*>Anmelden<\/a><\/li>/g,
        '<li><a href="/beitreten" class="nav-cta">Mitglied werden</a></li>',
      )
      .replace(
        /<a href="\/sign-in" class="btn-white">Mitglied werden →<\/a>/g,
        '<a href="/beitreten" class="btn-white">Mitglied werden →</a>',
      )
  }

  if (!isLoggedIn) {
    return html
      .replace(
        /<li><a href="\/videos"[^>]*>Mitgliederbereich<\/a><\/li>/g,
        '',
      )
      .replace(
        /<li><a href="\/sign-in[^"]*"[^>]*>Mitglieder<\/a><\/li>/g,
        '<li><a href="/sign-in">Anmelden</a></li>',
      )
  }

  return html
    .replace(
      /<li><a href="\/videos"[^>]*>Mitgliederbereich<\/a><\/li>/g,
      '',
    )
    .replace(
      /<li><a href="\/sign-in[^"]*"[^>]*>Anmelden<\/a><\/li>/g,
      '<li><a href="/api/sign-out" class="nav-cta">Log out</a></li>',
    )
    .replace(
      /<li><a href="\/sign-in[^"]*"[^>]*>Mitglieder<\/a><\/li>/g,
      '',
    )
}

function injectMobileNav(html: string): string {
  const css = `<style>
    .nav-burger{display:none;flex-direction:column;justify-content:center;align-items:center;gap:5px;width:42px;height:42px;background:rgba(255,252,247,0.9);border:1px solid rgba(196,113,74,0.25);border-radius:50%;cursor:pointer;flex-shrink:0;margin-left:auto}
    .nav-burger span{display:block;width:16px;height:1.5px;background:#7A725F;border-radius:2px;transition:transform .22s ease,opacity .22s ease}
    nav.nav--open .nav-burger span:nth-child(1){transform:translateY(6.5px) rotate(45deg)}
    nav.nav--open .nav-burger span:nth-child(2){opacity:0}
    nav.nav--open .nav-burger span:nth-child(3){transform:translateY(-6.5px) rotate(-45deg)}
    @media(max-width:720px){
      nav{padding:14px 20px !important;flex-wrap:wrap;gap:10px}
      .nav-logo{display:none !important}
      .nav-burger{display:flex}
      .nav-links{display:none !important;width:100%;flex-direction:column;gap:0;padding:8px 0;order:3}
      nav.nav--open .nav-links{display:flex !important}
      .nav-links li{width:100%}
      .nav-links a{display:block;padding:13px 4px;border-bottom:1px solid rgba(196,113,74,0.1);font-size:13px}
      .nav-links li:last-child a{border-bottom:none}
      .nav-user-chip{font-size:0.75rem;padding:8px 0}

      section{padding:60px 20px !important}

      .hero{grid-template-columns:1fr !important;min-height:auto}
      .hero-left{padding:100px 20px 48px !important;order:2}
      .hero-right{min-height:260px;order:1}
      .hero-mandala{width:220px !important;height:220px !important}
      .hero-actions{flex-direction:column;align-items:flex-start;gap:12px}
      .hero-decorative-text{display:none}

      .intro{grid-template-columns:1fr !important;gap:36px !important;padding:60px 20px !important}
      .intro-stat-row{gap:24px !important}
      .intro-card{padding:28px 20px !important}
      .intro-accent-line{display:none}

      .kriyas{padding:60px 20px !important}
      .kriyas-header{flex-direction:column;align-items:flex-start;gap:16px;margin-bottom:32px !important}
      .kriyas-grid{grid-template-columns:1fr !important}
      .kriya-card{padding:32px 20px !important}

      .snr{grid-template-columns:1fr !important}
      .snr-left{padding:60px 20px !important}
      .snr-right{padding:40px 20px !important;min-height:280px}
      .snr-card-stack{width:100% !important;max-width:360px}

      .mantras{padding:60px 20px !important}
      .mantras-grid{grid-template-columns:repeat(2,1fr) !important;gap:12px !important}
      .mantra-card{padding:24px 16px !important}

      .cta-band{flex-direction:column !important;align-items:flex-start !important;padding:60px 20px !important;gap:24px !important}

      footer{padding:60px 20px 32px !important}
      .footer-top{grid-template-columns:1fr !important;gap:36px !important}
      .footer-bottom{flex-direction:column !important;gap:10px !important;text-align:center}
    }
  </style>`
  const burger = `<button class="nav-burger" aria-label="Navigation öffnen" onclick="this.closest('nav').classList.toggle('nav--open')"><span></span><span></span><span></span></button>`
  return html
    .replace('</head>', `${css}</head>`)
    .replace('<ul class="nav-links"', `${burger}<ul class="nav-links"`)
}

export async function serveSatnamHtml(filename: string): Promise<NextResponse> {
  const filePath = path.join(process.cwd(), 'public', 'satnam', filename)
  try {
    const html = fs.readFileSync(filePath, 'utf8')
    const clerkEnabled = hasClerkClientConfig()
    const { userId } = hasClerkConfig() ? await auth() : { userId: null }
    const user = hasClerkConfig() && userId ? await getViewerUser() : null
    const userLabel =
      user?.firstName ||
      user?.fullName ||
      user?.primaryEmailAddress?.emailAddress?.split('@')[0] ||
      undefined
    const hydratedHtml = injectMobileNav(injectLandingPageLinks(
      html,
      !!userId,
      clerkEnabled,
      userLabel,
      hasLiveAccess(user),
    ))

    return new NextResponse(hydratedHtml, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store, max-age=0',
        'x-robots-tag': 'index, follow, max-image-preview:large',
      },
    })
  } catch {
    return new NextResponse('Not found', { status: 404 })
  }
}
