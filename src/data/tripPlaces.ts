import type { ItineraryStop, ItineraryStopKind, ItineraryStopPriority } from '../types'

export interface TripPlace {
  id: string
  name: string
  coordinates: [number, number]
  mapsQuery: string
  note: string
  aliases?: string[]
}

export const tripPlaces: TripPlace[] = [
  { id: 'calgary-airport', name: 'Calgary International Airport', coordinates: [51.1315, -114.0106], mapsQuery: 'Calgary International Airport', note: 'YYC arrival and rental-car pickup', aliases: ['Calgary Airport', 'YYC'] },
  { id: 'banff-avenue', name: 'Banff Avenue', coordinates: [51.1777, -115.5708], mapsQuery: 'Banff Avenue Banff Alberta', note: 'Downtown walk, shops, restaurants, and bars', aliases: ['Downtown Banff', 'Banff town'] },
  { id: 'canalta-lodge', name: 'Canalta Lodge', coordinates: [51.1847, -115.5626], mapsQuery: 'Canalta Lodge Banff', note: 'Recommended Banff base' },
  { id: 'lake-louise', name: 'Lake Louise Lakeshore', coordinates: [51.4176, -116.2169], mapsQuery: 'Lake Louise Lakeshore Alberta', note: 'Lakeshore walk and Fairmont area', aliases: ['Lake Louise'] },
  { id: 'lake-agnes-tea-house', name: 'Lake Agnes Tea House', coordinates: [51.4164, -116.2448], mapsQuery: 'Lake Agnes Tea House Alberta', note: 'Moderate hike from Lake Louise; verify seasonal operation', aliases: ['Lake Agnes', 'Lake Agnes teahouse'] },
  { id: 'plain-six-glaciers-tea-house', name: 'Plain of Six Glaciers Tea House', coordinates: [51.3926, -116.2504], mapsQuery: 'Plain of Six Glaciers Tea House Alberta', note: 'Longer Lake Louise hike; verify seasonal operation', aliases: ['Six Glaciers Tea House', 'Plain of Six Glaciers teahouse'] },
  { id: 'moraine-lake', name: 'Moraine Lake', coordinates: [51.3273, -116.1818], mapsQuery: 'Moraine Lake Alberta', note: 'Transit required; Rockpile and shoreline' },
  { id: 'bow-falls', name: 'Bow Falls', coordinates: [51.1665, -115.5602], mapsQuery: 'Bow Falls Banff', note: 'Short scenic stop near Banff' },
  { id: 'surprise-corner', name: 'Surprise Corner Viewpoint', coordinates: [51.1672, -115.5590], mapsQuery: 'Surprise Corner Viewpoint Banff', note: 'Classic Fairmont Banff Springs viewpoint', aliases: ['Surprise Corner'] },
  { id: 'banff-gondola', name: 'Banff Gondola', coordinates: [51.1482, -115.5555], mapsQuery: 'Banff Gondola', note: 'Sulphur Mountain gondola and summit boardwalk' },
  { id: 'upper-hot-springs', name: 'Banff Upper Hot Springs', coordinates: [51.1510, -115.5607], mapsQuery: 'Banff Upper Hot Springs', note: 'Relaxing hot-pool stop; verify hours' },
  { id: 'bow-lake', name: 'Bow Lake', coordinates: [51.6684, -116.4480], mapsQuery: 'Bow Lake Alberta', note: 'Icefields Parkway scenic stop' },
  { id: 'peyto-lake', name: 'Peyto Lake Viewpoint', coordinates: [51.7176, -116.5087], mapsQuery: 'Peyto Lake Viewpoint Alberta', note: 'Short uphill access to a major viewpoint', aliases: ['Peyto Lake'] },
  { id: 'waterfowl-lakes', name: 'Waterfowl Lakes', coordinates: [51.8491, -116.6354], mapsQuery: 'Waterfowl Lakes Alberta', note: 'Optional Icefields Parkway pullout' },
  { id: 'mistaya-canyon', name: 'Mistaya Canyon', coordinates: [51.9428, -116.7166], mapsQuery: 'Mistaya Canyon Trailhead Alberta', note: 'Short walk if conditions are safe' },
  { id: 'columbia-icefield', name: 'Columbia Icefield Discovery Centre', coordinates: [52.2203, -117.2245], mapsQuery: 'Columbia Icefield Discovery Centre', note: 'Farthest point on the Parkway day', aliases: ['Columbia Icefield'] },
  { id: 'johnston-canyon', name: 'Johnston Canyon', coordinates: [51.2459, -115.8392], mapsQuery: 'Johnston Canyon Trailhead Alberta', note: 'Lower Falls walk; catwalks can be icy' },
  { id: 'canmore-downtown', name: 'Downtown Canmore', coordinates: [51.0890, -115.3590], mapsQuery: 'Downtown Canmore Alberta', note: 'Shops, restaurants, and brewery stops', aliases: ['Canmore'] },
  { id: 'spring-creek', name: 'Spring Creek Vacations', coordinates: [51.0834, -115.3514], mapsQuery: 'Spring Creek Vacations Canmore', note: 'Recommended Canmore base' },
  { id: 'policemans-creek', name: 'Policeman’s Creek Boardwalk', coordinates: [51.0863, -115.3571], mapsQuery: "Policeman's Creek Boardwalk Canmore", note: 'Easy central Canmore walk' },
  { id: 'quarry-lake', name: 'Quarry Lake Park', coordinates: [51.0802, -115.3960], mapsQuery: 'Quarry Lake Park Canmore', note: 'Easy views of the Three Sisters', aliases: ['Quarry Lake'] },
  { id: 'grotto-canyon', name: 'Grotto Canyon Trailhead', coordinates: [51.0463, -115.2148], mapsQuery: 'Grotto Canyon Trailhead Alberta', note: 'Conditions-dependent hike', aliases: ['Grotto Canyon'] },
  { id: 'lake-minnewanka', name: 'Lake Minnewanka', coordinates: [51.2476, -115.4993], mapsQuery: 'Lake Minnewanka Alberta', note: 'Flexible scenic-day option' },
  { id: 'two-jack-lake', name: 'Two Jack Lake', coordinates: [51.2308, -115.5128], mapsQuery: 'Two Jack Lake Alberta', note: 'Easy scenic stop near Lake Minnewanka' },
  { id: 'park-distillery', name: 'PARK Distillery', coordinates: [51.1762, -115.5702], mapsQuery: 'PARK Distillery Banff', note: 'Food and drinks after the driving is finished' },
  { id: 'three-bears', name: 'Three Bears Brewery & Restaurant', coordinates: [51.1764, -115.5709], mapsQuery: 'Three Bears Brewery Banff', note: 'Banff brewery and dinner option', aliases: ['Three Bears Brewery'] },
  { id: 'banff-ave-brewing', name: 'Banff Ave Brewing Co.', coordinates: [51.1769, -115.5714], mapsQuery: 'Banff Ave Brewing Company', note: 'Central Banff brewpub' },
  { id: 'grizzly-paw', name: 'The Grizzly Paw Pub', coordinates: [51.0890, -115.3582], mapsQuery: 'The Grizzly Paw Pub Canmore', note: 'Canmore brewery stop after the day’s driving', aliases: ['Grizzly Paw'] },
  { id: 'bridgette-bar', name: 'Bridgette Bar Canmore', coordinates: [51.0879, -115.3573], mapsQuery: 'Bridgette Bar Canmore', note: 'Dinner and cocktails in Canmore', aliases: ['Bridgette Bar'] },
  { id: 'where-buffalo-roam', name: 'Where the Buffalo Roam Saloon', coordinates: [51.0895, -115.3596], mapsQuery: 'Where the Buffalo Roam Saloon Canmore', note: 'Cocktails after the day’s driving' },
  { id: 'fairmont-lake-louise', name: 'Fairmont Chateau Lake Louise', coordinates: [51.4165, -116.2124], mapsQuery: 'Fairmont Chateau Lake Louise', note: 'Hotel public areas and dining' },
]

export const tripPlacesById = new Map(tripPlaces.map((place) => [place.id, place]))

const normalizedPlaces = tripPlaces.flatMap((place) => [place.name, ...(place.aliases ?? [])].map((label) => [label.toLocaleLowerCase(), place] as const))

export function findTripPlace(name: string) {
  const normalized = name.trim().toLocaleLowerCase()
  if (!normalized) return undefined
  const exact = normalizedPlaces.find(([label]) => label === normalized)?.[1]
  if (exact) return exact
  if (normalized.length < 4) return undefined
  const candidates = normalizedPlaces
    .filter(([label]) => label.includes(normalized) || normalized.includes(label))
    .map(([, place]) => place)
    .filter((place, index, places) => places.findIndex((candidate) => candidate.id === place.id) === index)
  return candidates.length === 1 ? candidates[0] : undefined
}

export function makeStop(
  id: string,
  placeId: string,
  kind: ItineraryStopKind,
  priority: ItineraryStopPriority = 'core',
  note?: string,
): ItineraryStop {
  const place = tripPlacesById.get(placeId)
  if (!place) throw new Error(`Unknown trip place: ${placeId}`)
  return {
    id,
    name: place.name,
    kind,
    priority,
    mapsQuery: place.mapsQuery,
    coordinates: place.coordinates,
    note: note ?? place.note,
    source: 'seed',
  }
}

export function makeTextStop(
  id: string,
  name: string,
  mapsQuery: string,
  kind: ItineraryStopKind,
  priority: ItineraryStopPriority = 'core',
  coordinates?: [number, number],
  note?: string,
): ItineraryStop {
  return { id, name, mapsQuery, kind, priority, coordinates, note, source: 'seed' }
}
