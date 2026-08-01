import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { ChevronDown, ChevronUp, ExternalLink, Info, TriangleAlert } from 'lucide-react'

export function SummaryCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <article className="summary-card"><span>{label}</span><strong>{value}</strong>{detail ? <small>{detail}</small> : null}</article>
}

export function StatusPill({ children, tone = 'blue' }: { children: ReactNode; tone?: 'blue' | 'green' | 'amber' | 'gray' }) {
  return <span className={`status-pill ${tone}`}>{children}</span>
}

export function AlertBanner({ children, tone = 'warning' }: { children: ReactNode; tone?: 'warning' | 'info' }) {
  const Icon = tone === 'warning' ? TriangleAlert : Info
  return <div className={`alert-banner ${tone}`}><Icon size={20} /><div>{children}</div></div>
}

export function ExternalLinkButton({ href, children, className = '' }: { href: string; children: ReactNode; className?: string }) {
  return <a className={`button secondary ${className}`} href={href} target="_blank" rel="noopener noreferrer">{children}<ExternalLink size={14} /></a>
}

export function Button({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`button ${className}`} {...props} />
}

export function SeeMoreButton({ expanded, onClick, moreLabel = 'See more options', lessLabel = 'See fewer options', count }: {
  expanded: boolean
  onClick: () => void
  moreLabel?: string
  lessLabel?: string
  count?: number
}) {
  const Icon = expanded ? ChevronUp : ChevronDown
  return (
    <button className="see-more-button" type="button" onClick={onClick} aria-expanded={expanded}>
      <span>{expanded ? lessLabel : moreLabel}{!expanded && count ? ` (${count})` : ''}</span>
      <Icon size={18} />
    </button>
  )
}

export function EmptyMapGraphic({ points = 3 }: { points?: number }) {
  return (
    <div className="mini-map" aria-label="Stylized route preview">
      <svg viewBox="0 0 180 140" aria-hidden="true">
        <path className="terrain" d="M-10 32C30 3 58 45 94 20s68 6 96-8M-8 98c35-32 69 8 96-20 24-23 55-16 99-46M20 152c17-30 32-41 59-42 38-1 49-37 92-47" />
        <path className="road" d="M28 126C60 103 38 81 79 70s34-35 75-48" />
        {Array.from({ length: points }, (_, index) => <circle key={index} cx={28 + index * (126 / Math.max(points - 1, 1))} cy={126 - index * (104 / Math.max(points - 1, 1))} r="5" />)}
      </svg>
    </div>
  )
}
