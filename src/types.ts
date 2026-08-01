export type Status = 'Not started' | 'Researching' | 'Ready to book' | 'Booked'

export interface ItineraryDay {
  day: string
  date: number
  month: string
  title: string
  location: string
  image: string
  imageAlt: string
  tone: 'blue' | 'green' | 'amber'
  label?: string
  core: string[]
  optional: string[]
  backup: string
  logistics: string
  dining: string[]
  coordinates: [number, number]
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
