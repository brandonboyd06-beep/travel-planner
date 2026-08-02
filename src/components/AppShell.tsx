import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  BedDouble, Bus, CalendarCheck2, CalendarDays, ChevronRight, CircleDollarSign, Compass,
  Home, Map, Menu, NotebookPen, Route, Utensils, X,
} from 'lucide-react'
import { trip } from '../data/trip'
import { AppLink, normalizePathname, usePathname } from './AppLink'
import { CollaborationStatusButton, InviteTripButton } from './CollaborationModal'
import { HelpGuide } from './HelpGuide'
import { MillerTimeAI } from './MillerTimeAI'

const nav = [
  { to: '/', label: 'Trip Overview', icon: Home },
  { to: '/itinerary', label: 'Itinerary', icon: CalendarDays },
  { to: '/book', label: 'Book & Reserve', icon: CalendarCheck2 },
  { to: '/lodging', label: 'Lodging', icon: BedDouble },
  { to: '/transportation', label: 'Transportation & Shuttles', icon: Bus },
  { to: '/dining', label: 'Dining & Drinks', icon: Utensils },
  { to: '/activities', label: 'Things To Do', icon: Compass },
  { to: '/map', label: 'Map', icon: Map },
  { to: '/budget', label: 'Budget & Expenses', icon: CircleDollarSign },
  { to: '/notes', label: 'Notes & Lists', icon: NotebookPen },
]

const TRIP_START = new Date('2026-10-03T00:00:00-06:00').getTime()
const TRIP_END = new Date('2026-10-11T00:00:00-06:00').getTime()
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000

function countdownText(now = Date.now()) {
  if (now >= TRIP_END) return 'Trip complete'
  if (now >= TRIP_START) return 'Trip is underway'
  const days = Math.max(1, Math.ceil((TRIP_START - now) / MILLISECONDS_PER_DAY))
  return `${days} ${days === 1 ? 'day' : 'days'} to go`
}

function useTripCountdown() {
  const [label, setLabel] = useState(() => countdownText())

  useEffect(() => {
    const update = () => setLabel(countdownText())
    const interval = window.setInterval(update, 60 * 60 * 1000)
    return () => window.clearInterval(interval)
  }, [])

  return label
}

function Sidebar({ close }: { close?: () => void }) {
  return (
    <aside className="sidebar" aria-label="Primary navigation">
      <div className="brand-block">
        <img src="/brand/mt-travel-logo-320.jpg" alt="" className="brand-mark" />
        <div><strong>BANFF 2026</strong><span>Oct 3 – Oct 10, 2026</span></div>
      </div>
      <img className="sidebar-photo" src="/images/thumbs/moraine-lake.jpg" alt="Moraine Lake in early October" loading="lazy" decoding="async" />
      <nav className="sidebar-nav">
        {nav.map(({ to, label, icon: Icon }) => (
          <AppLink key={to} href={to} exact={to === '/'} onClick={close}>
            <Icon size={17} strokeWidth={1.8} /><span>{label}</span>
          </AppLink>
        ))}
      </nav>
      <div className="sidebar-spacer" />
      <section className="sidebar-panel" aria-label="October climate note">
        <div className="eyebrow-row"><span>Banff, AB</span><span className="weather-icon">☁</span></div>
        <strong>October range</strong>
        <span>Cool days · freezing nights</span>
        <small>Forecast available closer to departure</small>
      </section>
      <section className="sidebar-panel budget-mini" aria-label="Lodging budget">
        <div className="eyebrow-row"><span>Lodging budget</span><strong>$8,000</strong></div>
        <div className="progress"><span style={{ width: '0%' }} /></div>
        <small>No confirmed spending yet</small>
      </section>
    </aside>
  )
}

function TopBar({ openMenu, menuOpen }: { openMenu: () => void; menuOpen: boolean }) {
  const pathname = normalizePathname(usePathname())
  const current = nav.find((item) => item.to === pathname)
  const countdown = useTripCountdown()
  return (
    <header className="topbar">
      <button className="icon-button mobile-menu" onClick={openMenu} aria-label="Open navigation" aria-controls="mobile-navigation-dialog" aria-expanded={menuOpen}><Menu size={21} /></button>
      <div className="mobile-title"><img src="/brand/mt-travel-logo-320.jpg" alt="" /><div><strong>{current?.label ?? 'Page not found'}</strong><span>{trip.shortDates}</span></div></div>
      <nav className="topnav" aria-label="Section shortcuts">
        {nav.slice(0, 9).map(({ to, label, icon: Icon }) => (
          <AppLink key={to} href={to} exact={to === '/'}><Icon size={16} /><span>{label.replace('Transportation & Shuttles', 'Transport').replace('Budget & Expenses', 'Budget').replace('Book & Reserve', 'Book')}</span></AppLink>
        ))}
      </nav>
      <div className="topbar-utility"><div className="trip-countdown"><Route size={16} /><span>{countdown}</span></div><HelpGuide /><InviteTripButton /><CollaborationStatusButton /></div>
    </header>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const [drawer, setDrawer] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)
  const drawerCloseRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!drawer) return
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    const desktopQuery = window.matchMedia('(min-width: 1025px)')
    const focusTimer = window.setTimeout(() => drawerCloseRef.current?.focus(), 0)
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        setDrawer(false)
        return
      }
      if (event.key !== 'Tab' || !drawerRef.current) return
      const focusable = Array.from(drawerRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ))
      if (!focusable.length) {
        event.preventDefault()
        drawerRef.current.focus()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (!drawerRef.current.contains(document.activeElement)) {
        event.preventDefault()
        first.focus()
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    const closeAtDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setDrawer(false)
    }

    document.addEventListener('keydown', onKeyDown)
    desktopQuery.addEventListener('change', closeAtDesktop)
    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('keydown', onKeyDown)
      desktopQuery.removeEventListener('change', closeAtDesktop)
      document.body.style.overflow = previousOverflow
      previousFocus?.focus()
    }
  }, [drawer])

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to trip content</a>
      <Sidebar />
      <div className="app-main">
        <TopBar openMenu={() => setDrawer(true)} menuOpen={drawer} />
        <main className="main-content" id="main-content" tabIndex={-1}>{children}</main>
        <footer className="app-footer">
          <span>Rates, schedules, seasonal operations, trail access, and transportation details can change.</span>
          <strong>Verify with the official provider before booking or departing.</strong>
        </footer>
      </div>
      {drawer ? (
        <div id="mobile-navigation-dialog" className="drawer-layer" role="dialog" aria-modal="true" aria-labelledby="mobile-navigation-title">
          <button className="drawer-scrim" type="button" tabIndex={-1} aria-hidden="true" onClick={() => setDrawer(false)} />
          <div ref={drawerRef} className="drawer" tabIndex={-1}><h2 className="sr-only" id="mobile-navigation-title">Trip navigation</h2><button ref={drawerCloseRef} className="drawer-close" type="button" onClick={() => setDrawer(false)} aria-label="Close navigation"><X /></button><Sidebar close={() => setDrawer(false)} /></div>
        </div>
      ) : null}
      <nav className="bottom-nav" aria-label="Mobile shortcuts">
        {nav.slice(0, 4).map(({ to, label, icon: Icon }) => <AppLink key={to} href={to} exact={to === '/'}><Icon size={19} /><span>{label.split(' ')[0]}</span></AppLink>)}
        <button type="button" onClick={() => setDrawer(true)} aria-controls="mobile-navigation-dialog" aria-expanded={drawer}><Menu size={19} /><span>More</span></button>
      </nav>
      <MillerTimeAI />
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle: string; actions?: ReactNode }) {
  return <div className="page-heading"><div><h1>{title}</h1><p>{subtitle}</p></div>{actions ? <div className="page-actions">{actions}</div> : null}</div>
}

export function SectionHeading({ title, link }: { title: string; link?: { label: string; to: string } }) {
  return <div className="section-heading"><h2>{title}</h2>{link ? <AppLink href={link.to}>{link.label}<ChevronRight size={15} /></AppLink> : null}</div>
}
