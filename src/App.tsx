import { lazy, Suspense, useEffect } from 'react'
import { AppShell } from './components/AppShell'
import { AppLink, navigate, normalizePathname, scrollToHashWhenReady, usePathname } from './components/AppLink'
import { CollaborationProvider } from './context/CollaborationContext'
import { ItineraryProvider } from './context/ItineraryContext'

const OverviewPage = lazy(() => import('./pages/OverviewPage').then((module) => ({ default: module.OverviewPage })))
const ItineraryPage = lazy(() => import('./pages/ItineraryPage').then((module) => ({ default: module.ItineraryPage })))
const BookingPage = lazy(() => import('./pages/BookingPage').then((module) => ({ default: module.BookingPage })))
const LodgingPage = lazy(() => import('./pages/LodgingPage').then((module) => ({ default: module.LodgingPage })))
const TransportationPage = lazy(() => import('./pages/TransportationPage').then((module) => ({ default: module.TransportationPage })))
const DiningPage = lazy(() => import('./pages/DiningPage').then((module) => ({ default: module.DiningPage })))
const ActivitiesPage = lazy(() => import('./pages/ActivitiesPage').then((module) => ({ default: module.ActivitiesPage })))
const MapPage = lazy(() => import('./pages/MapPage').then((module) => ({ default: module.MapPage })))
const BudgetPage = lazy(() => import('./pages/BudgetPage').then((module) => ({ default: module.BudgetPage })))
const NotesPage = lazy(() => import('./pages/NotesPage').then((module) => ({ default: module.NotesPage })))

const routes = {
  '/': { title: 'Trip Overview', Component: OverviewPage },
  '/itinerary': { title: 'Itinerary', Component: ItineraryPage },
  '/book': { title: 'Book & Reserve', Component: BookingPage },
  '/lodging': { title: 'Lodging', Component: LodgingPage },
  '/transportation': { title: 'Transportation & Shuttles', Component: TransportationPage },
  '/dining': { title: 'Dining & Drinks', Component: DiningPage },
  '/activities': { title: 'Things To Do', Component: ActivitiesPage },
  '/map': { title: 'Map', Component: MapPage },
  '/budget': { title: 'Budget & Expenses', Component: BudgetPage },
  '/notes': { title: 'Notes & Lists', Component: NotesPage },
} as const

function RouteLoading() {
  return <div className="app-route-loading" role="status" aria-live="polite"><i /><span>Opening this part of the trip…</span></div>
}

function NotFoundPage() {
  return (
    <section className="panel app-not-found">
      <span>404 · Trail not found</span>
      <h1>This trip page wandered off route.</h1>
      <p>The link may be old, but the Banff plan is still right where you left it.</p>
      <AppLink className="button primary" href="/">Back to Trip Overview</AppLink>
    </section>
  )
}

export default function App() {
  const pathname = usePathname()
  const canonicalPathname = normalizePathname(pathname)
  const route = routes[canonicalPathname as keyof typeof routes]

  useEffect(() => {
    if (pathname === canonicalPathname) return
    navigate(`${canonicalPathname}${window.location.search}${window.location.hash}`, true)
  }, [canonicalPathname, pathname])

  useEffect(() => {
    document.title = route
      ? `${route.title} · Banff 2026 · MT Travel`
      : 'Page not found · Banff 2026 · MT Travel'
    scrollToHashWhenReady()
  }, [route])

  const RouteComponent = route?.Component
  return (
    <CollaborationProvider>
      <ItineraryProvider>
        <AppShell>
          <Suspense fallback={<RouteLoading />}>
            {RouteComponent ? <RouteComponent /> : <NotFoundPage />}
          </Suspense>
        </AppShell>
      </ItineraryProvider>
    </CollaborationProvider>
  )
}
