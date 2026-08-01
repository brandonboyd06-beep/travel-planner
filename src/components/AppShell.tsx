import { useState, type ReactNode } from 'react'
import {
  BedDouble, Bus, CalendarCheck2, CalendarDays, ChevronRight, CircleDollarSign, Compass,
  Home, Map, Menu, NotebookPen, Route, Utensils, X,
} from 'lucide-react'
import { trip } from '../data/trip'
import { AppLink, usePathname } from './AppLink'
import { CollaborationStatusButton, InviteTripButton } from './CollaborationModal'
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

function Sidebar({ close }: { close?: () => void }) {
  return (
    <aside className="sidebar" aria-label="Primary navigation">
      <div className="brand-block">
        <img src="/brand/mt-travel-logo-320.jpg" alt="" className="brand-mark" />
        <div><strong>BANFF 2026</strong><span>Oct 3 – Oct 10, 2026</span></div>
      </div>
      <img className="sidebar-photo" src="/images/moraine-lake.jpg" alt="Moraine Lake in early October" />
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

function TopBar({ openMenu }: { openMenu: () => void }) {
  const pathname = usePathname()
  const current = nav.find((item) => item.to === pathname) ?? nav[0]
  return (
    <header className="topbar">
      <button className="icon-button mobile-menu" onClick={openMenu} aria-label="Open navigation"><Menu size={21} /></button>
      <div className="mobile-title"><img src="/brand/mt-travel-logo-320.jpg" alt="" /><div><strong>{current.label}</strong><span>{trip.shortDates}</span></div></div>
      <nav className="topnav" aria-label="Section shortcuts">
        {nav.slice(0, 9).map(({ to, label, icon: Icon }) => (
          <AppLink key={to} href={to} exact={to === '/'}><Icon size={16} /><span>{label.replace('Transportation & Shuttles', 'Transport').replace('Budget & Expenses', 'Budget').replace('Book & Reserve', 'Book')}</span></AppLink>
        ))}
      </nav>
      <div className="topbar-utility"><div className="trip-countdown"><Route size={16} /><span>63 days to go</span></div><InviteTripButton /><CollaborationStatusButton /></div>
    </header>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const [drawer, setDrawer] = useState(false)
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <TopBar openMenu={() => setDrawer(true)} />
        <main className="main-content">{children}</main>
        <footer className="app-footer">
          <span>Rates, schedules, seasonal operations, trail access, and transportation details can change.</span>
          <strong>Verify with the official provider before booking or departing.</strong>
        </footer>
      </div>
      {drawer ? (
        <div className="drawer-layer" role="dialog" aria-modal="true" aria-label="Mobile navigation">
          <button className="drawer-scrim" aria-label="Close navigation" onClick={() => setDrawer(false)} />
          <div className="drawer"><button className="drawer-close" onClick={() => setDrawer(false)} aria-label="Close navigation"><X /></button><Sidebar close={() => setDrawer(false)} /></div>
        </div>
      ) : null}
      <nav className="bottom-nav" aria-label="Mobile shortcuts">
        {nav.slice(0, 4).map(({ to, label, icon: Icon }) => <AppLink key={to} href={to} exact={to === '/'}><Icon size={19} /><span>{label.split(' ')[0]}</span></AppLink>)}
        <button onClick={() => setDrawer(true)}><Menu size={19} /><span>More</span></button>
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
