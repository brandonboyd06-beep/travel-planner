import type { ItineraryDay, ItineraryPlan } from '../types'
import { makeStop, makeTextStop } from './tripPlaces'

const days: ItineraryDay[] = [
  {
    id: '2026-10-03', day: 'SAT', date: 3, month: 'OCT', title: 'Arrival: Calgary → Banff', location: 'Banff town',
    image: '/images/thumbs/banff-avenue.jpg', imageAlt: 'Banff Avenue beneath Cascade Mountain in autumn', tone: 'blue',
    stops: [
      makeStop('oct03-arrive-yyc', 'calgary-airport', 'travel', 'fixed', 'Arrive at varying times'),
      makeTextStop('oct03-avis', 'Pick up one larger Avis rental vehicle', 'Avis Calgary International Airport', 'travel', 'fixed'),
      makeTextStop('oct03-drive', 'Drive to Banff · about 1.5 hours', 'Banff Alberta', 'travel'),
      makeStop('oct03-banff-avenue', 'banff-avenue', 'activity'),
    ],
    optional: ['Grocery and snack stop', 'Welcome drinks at PARK or Three Bears'],
    backup: 'Downtown shops, Whyte Museum, and dinner close to lodging.',
    logistics: 'Build flexibility around arrival times and road conditions.',
    dining: ['PARK Distillery', 'Three Bears Brewery', 'Hello Sunshine'], coordinates: [51.1784, -115.5708],
  },
  {
    id: '2026-10-04', day: 'SUN', date: 4, month: 'OCT', title: 'Lake Louise & Moraine Lake', location: 'Banff town',
    image: '/images/thumbs/moraine-lake.jpg', imageAlt: 'Moraine Lake and the Ten Peaks in early autumn', tone: 'green', label: 'Reservation required',
    stops: [
      makeStop('oct04-shuttle-banff', 'banff-avenue', 'travel', 'fixed', 'Early shuttle departure from Banff'),
      makeStop('oct04-lake-louise', 'lake-louise', 'scenic'),
      makeStop('oct04-lake-agnes', 'lake-agnes-tea-house', 'activity', 'core', 'Moderate hike; verify the tea house is operating'),
      makeTextStop('oct04-connector', 'Connector shuttle to Moraine Lake', 'Moraine Lake shuttle', 'travel', 'fixed'),
      makeStop('oct04-moraine', 'moraine-lake', 'scenic'),
      makeStop('oct04-return-banff', 'banff-avenue', 'travel', 'fixed', 'Return to Banff after the final shuttle'),
    ],
    optional: ['Little Beehive extension', 'Walliser Stube reservation', 'Plain of Six Glaciers Tea House instead of Lake Agnes'],
    backup: 'Lakeshores, Fairmont public areas, and Rockpile only.',
    logistics: 'No normal private vehicle access to Moraine Lake. Verify the final 2026 timetable.',
    dining: ['Walliser Stube', 'The Bison', 'Shoku Izakaya'], coordinates: [51.3273, -116.1818],
  },
  {
    id: '2026-10-05', day: 'MON', date: 5, month: 'OCT', title: 'Banff Town, Gondola & Relaxation', location: 'Banff town',
    image: '/images/thumbs/banff-avenue.jpg', imageAlt: 'Downtown Banff with mountains beyond', tone: 'blue',
    stops: [
      makeTextStop('oct05-breakfast', 'Relaxed breakfast', 'Breakfast Banff Alberta', 'meal'),
      makeStop('oct05-bow-falls', 'bow-falls', 'scenic'),
      makeStop('oct05-surprise-corner', 'surprise-corner', 'scenic'),
      makeStop('oct05-gondola', 'banff-gondola', 'activity'),
      makeStop('oct05-hot-springs', 'upper-hot-springs', 'activity'),
      makeStop('oct05-downtown', 'banff-avenue', 'activity', 'core', 'Relaxed downtown afternoon'),
    ],
    optional: ['Sky Bistro lunch', 'Fairmont afternoon tea or spa'],
    backup: 'This mixed indoor/outdoor day already works well in poor weather.',
    logistics: 'Use the rental car, Roam Route 1, or attraction shuttle; verify seasonal service.',
    dining: ['Sky Bistro', 'Bluebird', 'Rundle Bar'], coordinates: [51.1482, -115.5555],
  },
  {
    id: '2026-10-06', day: 'TUE', date: 6, month: 'OCT', title: 'Icefields Parkway Adventure', location: 'Banff town',
    image: '/images/thumbs/icefields-parkway.jpg', imageAlt: 'Icefields Parkway curving toward snowy Canadian Rockies peaks', tone: 'amber', label: 'Use the best road-weather day',
    stops: [
      makeStop('oct06-start-banff', 'banff-avenue', 'travel', 'fixed', 'Start with a full tank and offline maps'),
      makeStop('oct06-bow-lake', 'bow-lake', 'scenic'),
      makeStop('oct06-peyto-lake', 'peyto-lake', 'scenic'),
      makeStop('oct06-waterfowl', 'waterfowl-lakes', 'scenic', 'optional'),
      makeStop('oct06-mistaya', 'mistaya-canyon', 'activity', 'optional'),
      makeStop('oct06-columbia', 'columbia-icefield', 'activity'),
      makeStop('oct06-return-banff', 'banff-avenue', 'travel', 'fixed', 'Return to Banff before a flexible dinner'),
    ],
    optional: ['Columbia Icefield Adventure', 'Athabasca Glacier vehicle and Skywalk'],
    backup: 'Turn around after Peyto Lake or Mistaya Canyon.',
    logistics: 'Long driving day. Full tank, food, water, layers, offline maps, and same-day road check.',
    dining: ['Keep dinner flexible'], coordinates: [52.2203, -117.2245],
  },
  {
    id: '2026-10-07', day: 'WED', date: 7, month: 'OCT', title: 'Johnston Canyon → Canmore', location: 'Canmore',
    image: '/images/thumbs/johnston-canyon.jpg', imageAlt: 'Johnston Canyon waterfall and suspended catwalk', tone: 'green',
    stops: [
      makeStop('oct07-checkout', 'canalta-lodge', 'lodging', 'fixed', 'Check out from Banff'),
      makeStop('oct07-johnston', 'johnston-canyon', 'activity', 'core', 'Lower Falls; Upper Falls only if conditions are good'),
      makeStop('oct07-checkin', 'spring-creek', 'lodging', 'fixed', 'Check in at the Canmore base'),
      makeStop('oct07-policemans-creek', 'policemans-creek', 'activity'),
      makeStop('oct07-downtown-canmore', 'canmore-downtown', 'activity'),
    ],
    optional: ['Upper Falls extension', 'Cocktails at Where the Buffalo Roam'],
    backup: 'Short Lower Falls visit, then warm up in Canmore cafés and shops.',
    logistics: 'Catwalks may be wet or icy. Check Bow Valley Parkway restrictions.',
    dining: ['Bridgette Bar', 'Crazyweed', 'Grizzly Paw'], coordinates: [51.2459, -115.8392],
  },
  {
    id: '2026-10-08', day: 'THU', date: 8, month: 'OCT', title: 'Canmore & Kananaskis', location: 'Canmore',
    image: '/images/thumbs/canmore.jpg', imageAlt: 'Bow River path in Canmore with mountain peaks beyond', tone: 'blue', label: 'Weather-dependent',
    stops: [
      makeStop('oct08-policemans-creek', 'policemans-creek', 'activity'),
      makeStop('oct08-quarry-lake', 'quarry-lake', 'scenic'),
      makeTextStop('oct08-trail', 'Choose a trail for current conditions', 'Kananaskis Country Alberta', 'activity'),
      makeStop('oct08-grizzly-paw', 'grizzly-paw', 'meal', 'core', 'Brewery stop only after the day’s driving is finished'),
    ],
    optional: ['Grotto Canyon', 'Heart Creek', 'Troll Falls · verify access'],
    backup: 'Downtown Canmore, shopping, coffee, breweries, or a spa-style afternoon.',
    logistics: 'Grassi Lakes status must be verified; do not build the day around it.',
    dining: ['Sauvage', 'The Sensory', 'Rocky Mountain Flatbread'], coordinates: [51.089, -115.359],
  },
  {
    id: '2026-10-09', day: 'FRI', date: 9, month: 'OCT', title: 'Flexible Recovery Day', location: 'Canmore',
    image: '/images/thumbs/lake-louise.jpg', imageAlt: 'Turquoise alpine lake surrounded by snowy mountains', tone: 'amber', label: 'Intentionally flexible',
    stops: [
      makeTextStop('oct09-retry', 'Repeat a weather-canceled priority', 'Banff National Park', 'activity', 'optional'),
      makeStop('oct09-minnewanka', 'lake-minnewanka', 'scenic', 'optional'),
      makeStop('oct09-two-jack', 'two-jack-lake', 'scenic', 'optional'),
      makeStop('oct09-canmore', 'canmore-downtown', 'activity', 'optional', 'Or keep the day relaxed in Banff or Canmore'),
      makeStop('oct09-dinner', 'bridgette-bar', 'meal', 'core', 'Long final dinner; reserve if this is the group’s anchor'),
    ],
    optional: ['Cruise if operating', 'Spa or afternoon tea', 'Additional moderate hike if safe'],
    backup: 'Museums, breweries, shopping, pools, and an easy river walk.',
    logistics: 'Confirm any seasonal cruise or shuttle operation directly.',
    dining: ['Bridgette Bar', 'Sauvage', 'Where the Buffalo Roam'], coordinates: [51.2476, -115.4993],
  },
  {
    id: '2026-10-10', day: 'SAT', date: 10, month: 'OCT', title: 'Departure: Canmore → Calgary', location: 'Calgary Airport',
    image: '/images/thumbs/canmore.jpg', imageAlt: 'Autumn landscape beside the Bow River in Canmore', tone: 'blue',
    stops: [
      makeStop('oct10-breakfast', 'canmore-downtown', 'meal', 'core', 'Breakfast and coffee in Canmore'),
      makeStop('oct10-checkout', 'spring-creek', 'lodging', 'fixed', 'Check out'),
      makeTextStop('oct10-drive', 'Drive to Calgary International Airport', 'Calgary International Airport', 'travel', 'fixed'),
      makeStop('oct10-yyc', 'calgary-airport', 'travel', 'fixed', 'Return the Avis vehicle and fly home'),
    ],
    optional: ['Coffee and bagels for the road'],
    backup: 'Leave extra time if snow, ice, or flight schedules change.',
    logistics: 'Build generous time for weather and varying departure times.',
    dining: ['Rocky Mountain Bagel Co.'], coordinates: [51.1224, -114.0132],
  },
]

export const defaultItineraryPlan: ItineraryPlan = {
  schemaVersion: 1,
  revision: 0,
  updatedAt: '2026-08-01T00:00:00.000Z',
  days,
  appliedProposalIds: [],
}

// Backward-compatible read-only export for catalog-style pages. Editable views
// should consume the Itinerary context so local and collaborative changes appear.
export const itinerary = defaultItineraryPlan.days
