import { AppShell } from './components/AppShell'
import { usePathname } from './components/AppLink'
import { CollaborationProvider } from './context/CollaborationContext'
import { ActivitiesPage } from './pages/ActivitiesPage'
import { BudgetPage } from './pages/BudgetPage'
import { BookingPage } from './pages/BookingPage'
import { DiningPage } from './pages/DiningPage'
import { ItineraryPage } from './pages/ItineraryPage'
import { LodgingPage } from './pages/LodgingPage'
import { MapPage } from './pages/MapPage'
import { NotesPage } from './pages/NotesPage'
import { OverviewPage } from './pages/OverviewPage'
import { TransportationPage } from './pages/TransportationPage'

export default function App() {
  const pathname = usePathname()
  const pages: Record<string, React.ReactNode> = {
    '/': <OverviewPage />, '/itinerary': <ItineraryPage />, '/book': <BookingPage />, '/lodging': <LodgingPage />,
    '/transportation': <TransportationPage />, '/dining': <DiningPage />, '/activities': <ActivitiesPage />,
    '/map': <MapPage />, '/budget': <BudgetPage />, '/notes': <NotesPage />,
  }
  return (
    <CollaborationProvider>
      <AppShell>
        {pages[pathname] ?? <OverviewPage />}
      </AppShell>
    </CollaborationProvider>
  )
}
