export type RoutePoint = {
  id: string
  name: string
  coordinates?: [number, number]
  mapsQuery?: string
  note?: string
  day?: string
}

export type GoogleMapsTravelMode = 'driving' | 'walking' | 'bicycling' | 'transit'

export type GoogleMapsRouteLink = {
  href: string
  label: string
  points: RoutePoint[]
}

export const MAX_GOOGLE_MAPS_POINTS_PER_LINK = 5

const GOOGLE_MAPS_HOME = 'https://www.google.com/maps'
const GOOGLE_MAPS_SEARCH = 'https://www.google.com/maps/search/'
const GOOGLE_MAPS_DIRECTIONS = 'https://www.google.com/maps/dir/'

export function hasValidCoordinates(point: RoutePoint): point is RoutePoint & { coordinates: [number, number] } {
  if (!point.coordinates) return false
  const [latitude, longitude] = point.coordinates
  return Number.isFinite(latitude)
    && Number.isFinite(longitude)
    && latitude >= -90
    && latitude <= 90
    && longitude >= -180
    && longitude <= 180
}

function pointQuery(point: RoutePoint) {
  const explicitQuery = point.mapsQuery?.trim()
  if (explicitQuery) return explicitQuery
  if (hasValidCoordinates(point)) return point.coordinates.join(',')
  return point.name.trim()
}

function usablePoints(points: readonly RoutePoint[]) {
  return points.filter((point) => pointQuery(point).length > 0)
}

export function buildGoogleMapsSearchUrl(point: RoutePoint) {
  const query = pointQuery(point)
  if (!query) return GOOGLE_MAPS_HOME

  const url = new URL(GOOGLE_MAPS_SEARCH)
  url.searchParams.set('api', '1')
  url.searchParams.set('query', query)
  return url.toString()
}

/**
 * Builds one cross-platform Google Maps directions URL. Use
 * buildGoogleMapsDirectionsLinks for routes longer than five total points.
 */
export function buildGoogleMapsDirectionsUrl(
  points: readonly RoutePoint[],
  travelMode: GoogleMapsTravelMode = 'driving',
) {
  const route = usablePoints(points)
  if (route.length === 0) return GOOGLE_MAPS_HOME
  if (route.length === 1) return buildGoogleMapsSearchUrl(route[0])
  if (route.length > MAX_GOOGLE_MAPS_POINTS_PER_LINK) {
    throw new RangeError(`Google Maps route links support at most ${MAX_GOOGLE_MAPS_POINTS_PER_LINK} points in this app.`)
  }

  const origin = route[0]
  const destination = route[route.length - 1]
  const waypoints = route.slice(1, -1)
  const url = new URL(GOOGLE_MAPS_DIRECTIONS)
  url.searchParams.set('api', '1')
  url.searchParams.set('origin', pointQuery(origin))
  url.searchParams.set('destination', pointQuery(destination))
  url.searchParams.set('travelmode', travelMode)
  if (waypoints.length > 0) {
    url.searchParams.set('waypoints', waypoints.map(pointQuery).join('|'))
  }
  return url.toString()
}

/**
 * Splits a long route into mobile-safe five-point chunks. The last point in
 * each chunk is repeated as the first point in the next chunk so no leg is
 * lost when travelers open the links in sequence.
 */
export function chunkGoogleMapsRoute(points: readonly RoutePoint[]) {
  const route = usablePoints(points)
  if (route.length === 0) return []
  if (route.length <= MAX_GOOGLE_MAPS_POINTS_PER_LINK) return [route]

  const chunks: RoutePoint[][] = []
  let start = 0

  while (start < route.length) {
    const chunk = route.slice(start, start + MAX_GOOGLE_MAPS_POINTS_PER_LINK)
    chunks.push(chunk)
    if (start + chunk.length >= route.length) break
    start += MAX_GOOGLE_MAPS_POINTS_PER_LINK - 1
  }

  return chunks
}

export function buildGoogleMapsDirectionsLinks(
  points: readonly RoutePoint[],
  travelMode: GoogleMapsTravelMode = 'driving',
): GoogleMapsRouteLink[] {
  const chunks = chunkGoogleMapsRoute(points)

  return chunks.map((chunk, index) => ({
    href: buildGoogleMapsDirectionsUrl(chunk, travelMode),
    label: chunks.length === 1
      ? chunk.length === 1 ? 'Open stop in Google Maps' : 'Open route in Google Maps'
      : `Open route part ${index + 1} of ${chunks.length}`,
    points: chunk,
  }))
}
