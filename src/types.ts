export type Status = 'Not started' | 'Researching' | 'Ready to book' | 'Booked'

export type ItineraryStopKind = 'travel' | 'activity' | 'scenic' | 'meal' | 'lodging' | 'other'
export type ItineraryStopPriority = 'fixed' | 'core' | 'optional'

export interface ItineraryStop {
  id: string
  name: string
  kind: ItineraryStopKind
  priority: ItineraryStopPriority
  mapsQuery: string
  coordinates?: [number, number]
  note?: string
  source: 'seed' | 'manual' | 'miller'
  sourceUrl?: string
}

export interface ItineraryDay {
  id: string
  day: string
  date: number
  month: string
  title: string
  location: string
  image: string
  imageAlt: string
  tone: 'blue' | 'green' | 'amber'
  label?: string
  stops: ItineraryStop[]
  optional: string[]
  backup: string
  logistics: string
  dining: string[]
  coordinates: [number, number]
}

export interface ItineraryPlan {
  schemaVersion: 1
  revision: number
  updatedAt: string
  days: ItineraryDay[]
  appliedProposalIds: string[]
}

export type ItineraryStopPatch = Partial<Pick<ItineraryStop, 'name' | 'kind' | 'priority' | 'mapsQuery' | 'note' | 'sourceUrl'>> & {
  coordinates?: [number, number] | null
}

export type ItineraryOperation =
  | { type: 'add_stop'; dayId: string; afterStopId?: string; stop: Omit<ItineraryStop, 'id' | 'source'> }
  | { type: 'update_stop'; dayId: string; stopId: string; patch: ItineraryStopPatch }
  | { type: 'move_stop'; stopId: string; fromDayId: string; toDayId: string; afterStopId?: string }
  | { type: 'remove_stop'; dayId: string; stopId: string }

export interface ItineraryProposal {
  id: string
  baseRevision: number
  summary: string
  rationale: string
  operations: ItineraryOperation[]
  warnings: string[]
  sources: Array<{ title: string; url: string }>
}

export interface Lodging {
  id: string
  name: string
  town: 'Banff' | 'Canmore'
  type: 'Hotel' | 'Condo / rental'
  price: number
  total: number
  rooms: string
  walkability: string
  parking: string
  kitchen: string
  amenities: string
  transit: string
  score: number
  loyalty: string
  pros: string[]
  cons: string[]
  url: string
  lastChecked: string
  recommended?: boolean
}

export interface Restaurant {
  name: string
  town: 'Banff' | 'Canmore' | 'Lake Louise'
  cuisine: string
  price: '$$' | '$$$' | '$$$$'
  atmosphere: string
  bestFor: string
  day: string
  reserve: boolean
  url: string
}

export interface Activity {
  name: string
  area: string
  difficulty: 'Easy' | 'Moderate' | 'Easy–moderate'
  cost: 'Free' | 'Paid'
  tags: string[]
  note: string
  image: string
}

export interface MapLocation {
  id: string
  name: string
  category: 'Lodging' | 'Dining' | 'Activities' | 'Shuttle pickup' | 'Scenic stops' | 'Airport' | 'Visitor centers'
  coordinates: [number, number]
  day: string
  note: string
}
