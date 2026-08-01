export type BookingPriority = 'book-now' | 'plan-soon' | 'verify-later'

export interface BookingItem {
  id: string
  title: string
  category: string
  tripDate: string
  priority: BookingPriority
  deadline: string
  fallback?: string
  summary: string
  instructions: string[]
  bookingUrl: string
  bookingLabel: string
  infoUrl: string
  sourceLabel: string
}

export const bookingItems: BookingItem[] = [
  {
    id: 'parks-lakes-shuttle',
    title: 'Parks Canada lake shuttles',
    category: 'Required for Moraine Lake',
    tripDate: 'Sunday, Oct 4',
    priority: 'book-now',
    deadline: 'Book now — reservations opened Apr 15',
    fallback: 'If sold out: 60% of seats release Oct 2 at 8:00 a.m. MDT',
    summary: 'Use the Lake Louise Park & Ride for Lake Louise and Moraine Lake. Normal private vehicles cannot drive to Moraine Lake.',
    instructions: [
      'Choose Oct 4 for four adults.',
      'Reserve a Park & Ride departure and use the included Lake Connector between both lakes.',
      'Download the confirmation before leaving Banff.',
    ],
    bookingUrl: 'https://reservation.pc.gc.ca/Banff-LakeLouise',
    bookingLabel: 'Check Oct 4 seats',
    infoUrl: 'https://parks.canada.ca/pn-np/ab/banff/visit/parkbus/louise',
    sourceLabel: 'Parks Canada',
  },
  {
    id: 'roam-super-pass',
    title: 'Roam Reservable Super Pass',
    category: 'Best car-free alternative from Banff',
    tripDate: 'Sunday, Oct 4',
    priority: 'book-now',
    deadline: 'Book now — October inventory opened Jul 27',
    fallback: 'If your preferred times are gone, check Parks Canada above',
    summary: 'A reserved round trip from Banff to Lake Louise plus the Parks Canada Lake Connector to Moraine Lake.',
    instructions: [
      'Select Super Pass, Oct 4, and four adults.',
      'Choose Banff High School Transit Hub → Lake Louise Lakeshore in both directions.',
      'Arrive with the whole group 20 minutes early; late reservations are cancelled.',
    ],
    bookingUrl: 'https://roamtransit.betterez.com/cart/607a075d39c0361ea1fe027a',
    bookingLabel: 'Check Roam seats',
    infoUrl: 'https://roamtransit.com/fares/reservations/super-pass-reservations/',
    sourceLabel: 'Roam Transit',
  },
  {
    id: 'banff-gondola',
    title: 'Banff Gondola',
    category: 'Timed attraction ticket',
    tripDate: 'Monday, Oct 5',
    priority: 'plan-soon',
    deadline: 'Choose a time by Sep 5',
    fallback: 'Keep this movable if the mountain forecast looks poor',
    summary: 'The gondola is open year-round, but preferred times can sell out. Advance tickets also unlock the eligible attraction shuttle.',
    instructions: [
      'Choose an afternoon time after the Banff town stops.',
      'Keep enough daylight for the summit boardwalk.',
      'If dining at Sky Bistro, reserve the restaurant separately.',
    ],
    bookingUrl: 'https://www.banffjaspercollection.com/attractions/banff-gondola/tickets/',
    bookingLabel: 'Book Gondola',
    infoUrl: 'https://www.banffjaspercollection.com/attractions/banff-gondola/',
    sourceLabel: 'Banff Jasper Collection',
  },
  {
    id: 'sky-bistro',
    title: 'Sky Bistro',
    category: 'Optional summit dinner',
    tripDate: 'Monday, Oct 5',
    priority: 'plan-soon',
    deadline: 'The 90-day window is open — reserve if selected',
    fallback: 'Gondola admission is separate from the restaurant reservation',
    summary: 'Book only after choosing the Gondola time so the ride and dinner fit together.',
    instructions: [
      'Book a table for four.',
      'Allow time to ride up before the reservation.',
      'Keep the confirmation with the Gondola tickets.',
    ],
    bookingUrl: 'https://www.banffjaspercollection.com/dining/sky-bistro/reserve-a-table/',
    bookingLabel: 'Reserve table',
    infoUrl: 'https://www.banffjaspercollection.com/dining/sky-bistro/',
    sourceLabel: 'Sky Bistro',
  },
  {
    id: 'columbia-icefield',
    title: 'Columbia Icefield Adventure',
    category: 'Optional timed tour',
    tripDate: 'Tuesday, Oct 6',
    priority: 'plan-soon',
    deadline: 'Decide by Sep 5; book as soon as the day is confirmed',
    fallback: 'Weather dependent; the 2026 season ends Oct 12',
    summary: 'A 2.5–3 hour Ice Explorer and Skywalk tour on the long Icefields Parkway day.',
    instructions: [
      'Only book if the group wants the full-day commitment.',
      'Build drive time and an early departure into the itinerary.',
      'Recheck Alberta 511 and the weather before leaving.',
    ],
    bookingUrl: 'https://www.banffjaspercollection.com/attractions/columbia-icefield-adventure/tickets/',
    bookingLabel: 'Check tour times',
    infoUrl: 'https://www.banffjaspercollection.com/attractions/columbia-icefield-adventure/',
    sourceLabel: 'Banff Jasper Collection',
  },
  {
    id: 'lake-minnewanka',
    title: 'Lake Minnewanka Cruise',
    category: 'Optional flex-day activity',
    tripDate: 'Friday, Oct 9',
    priority: 'verify-later',
    deadline: 'Decide by Sep 9, then reserve a daytime departure',
    fallback: 'Weather dependent and only three days before the Oct 12 season close',
    summary: 'The Classic Cruise is scheduled 10:00 a.m.–5:00 p.m. on this date, subject to weather and operations.',
    instructions: [
      'Protect Oct 9 as the trip flex day first.',
      'If the week looks stable, select a daytime cruise for four.',
      'Use the included shuttle or Roam Route 6 because parking is limited.',
    ],
    bookingUrl: 'https://www.banffjaspercollection.com/attractions/lake-minnewanka-cruise/tickets/',
    bookingLabel: 'Check cruise times',
    infoUrl: 'https://www.banffjaspercollection.com/attractions/lake-minnewanka-cruise/location-hours/',
    sourceLabel: 'Banff Jasper Collection',
  },
]

export const bookingSources = [
  {
    label: 'Parks Canada shuttle rules',
    href: 'https://parks.canada.ca/pn-np/ab/banff/visit/parkbus/louise',
  },
  {
    label: 'Roam Super Pass instructions',
    href: 'https://roamtransit.com/fares/reservations/super-pass-reservations/',
  },
  {
    label: '2026 attraction opening dates',
    href: 'https://www.banffjaspercollection.com/plan-your-trip/opening-dates/',
  },
]
