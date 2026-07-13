'use client'

import type { CSSProperties, MouseEvent, ReactNode } from 'react'

interface ExternalWindowLinkProps {
  href: string
  className?: string
  style?: CSSProperties
  children: ReactNode
  onClick?: () => void
}

export default function ExternalWindowLink({
  href,
  className,
  style,
  children,
  onClick,
}: ExternalWindowLinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    onClick?.()
    window.open(href, '_blank', 'noopener,noreferrer')
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer external"
      className={className}
      style={style}
      onClick={handleClick}
    >
      {children}
    </a>
  )
}
