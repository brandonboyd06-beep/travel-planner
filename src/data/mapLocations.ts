import type { MapLocation } from '../types'

export const mapLocations: MapLocation[] = [
  { id: 'yyc', name: 'Calgary International Airport', category: 'Airport', coordinates: [51.1224, -114.0132], day: 'Days 1 & 8', note: 'Avis pickup and return' },
  { id: 'banff', name: 'Banff', category: 'Lodging', coordinates: [51.1784, -115.5708], day: 'Days 1–5', note: 'Four-night recommended base' },
  { id: 'louise', name: 'Lake Louise', category: 'Scenic stops', coordinates: [51.4254, -116.1773], day: 'Day 2', note: 'Lakeshore and Lake Agnes' },
  { id: 'moraine', name: 'Moraine Lake', category: 'Shuttle pickup', coordinates: [51.3217, -116.186], day: 'Day 2', note: 'Shuttle access required' },
  { id: 'bow', name: 'Bow Lake', category: 'Scenic stops', coordinates: [51.6818, -116.4647], day: 'Day 4', note: 'Easy Icefields stop' },
  { id: 'peyto', name: 'Peyto Lake', category: 'Activities', coordinates: [51.7175, -116.506], day: 'Day 4', note: 'Short uphill viewpoint walk' },
  { id: 'icefield', name: 'Columbia Icefield', category: 'Activities', coordinates: [52.2203, -117.2245], day: 'Day 4', note: 'Weather and seasonal operation dependent' },
  { id: 'johnston', name: 'Johnston Canyon', category: 'Activities', coordinates: [51.2459, -115.8392], day: 'Day 5', note: 'Lower and optional Upper Falls' },
  { id: 'minnewanka', name: 'Lake Minnewanka', category: 'Scenic stops', coordinates: [51.2476, -115.4993], day: 'Day 7', note: 'Flexible-day option' },
  { id: 'canmore', name: 'Canmore', category: 'Lodging', coordinates: [51.089, -115.359], day: 'Days 5–8', note: 'Three-night recommended base' },
  { id: 'gondola', name: 'Banff Gondola', category: 'Activities', coordinates: [51.1482, -115.5555], day: 'Day 3', note: 'Reservation recommended' },
  { id: 'park', name: 'PARK Distillery', category: 'Dining', coordinates: [51.1759, -115.5704], day: 'Day 1', note: 'Casual welcome dinner' },
  { id: 'visitor', name: 'Banff Visitor Centre', category: 'Visitor centers', coordinates: [51.177, -115.5718], day: 'Any day', note: 'Current conditions and local help' },
]
