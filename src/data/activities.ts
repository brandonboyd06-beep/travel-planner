import type { Activity } from '../types'

export const activities: Activity[] = [
  { name: 'Lake Louise Lakeshore', area: 'Lake Louise', difficulty: 'Easy', cost: 'Free', tags: ['Easy', 'Scenic'], note: 'Shuttle strongly preferred; lakeshore parking is limited.', image: '/images/lake-louise.jpg' },
  { name: 'Lake Agnes Tea House', area: 'Lake Louise', difficulty: 'Moderate', cost: 'Free', tags: ['Moderate', 'Weather-dependent'], note: 'About 7 km / 4.4 mi round trip before optional extensions.', image: '/images/lake-louise.jpg' },
  { name: 'Little Beehive', area: 'Lake Louise', difficulty: 'Moderate', cost: 'Free', tags: ['Moderate', 'Weather-dependent'], note: 'Optional extension only when trail conditions are good.', image: '/images/lake-louise.jpg' },
  { name: 'Moraine Lake Rockpile', area: 'Lake Louise', difficulty: 'Easy', cost: 'Free', tags: ['Easy', 'Scenic', 'Reservation required'], note: 'Shuttle required; personal vehicles are not normally permitted.', image: '/images/moraine-lake.jpg' },
  { name: 'Banff Gondola', area: 'Banff', difficulty: 'Easy', cost: 'Paid', tags: ['Paid', 'Reservation required', 'Bad weather'], note: 'Mixed-weather friendly; pair with the summit boardwalk.', image: '/images/banff-avenue.jpg' },
  { name: 'Banff Upper Hot Springs', area: 'Banff', difficulty: 'Easy', cost: 'Paid', tags: ['Paid', 'Bad weather'], note: 'Excellent cool-weather activity; verify current entry rules.', image: '/images/banff-avenue.jpg' },
  { name: 'Johnston Canyon Lower Falls', area: 'Banff', difficulty: 'Easy', cost: 'Free', tags: ['Easy', 'Scenic'], note: 'Catwalks can be wet or icy in October.', image: '/images/johnston-canyon.jpg' },
  { name: 'Johnston Canyon Upper Falls', area: 'Banff', difficulty: 'Easy–moderate', cost: 'Free', tags: ['Moderate', 'Weather-dependent'], note: 'Continue only if conditions and group energy are good.', image: '/images/johnston-canyon.jpg' },
  { name: 'Lake Minnewanka', area: 'Banff', difficulty: 'Easy', cost: 'Free', tags: ['Easy', 'Scenic'], note: 'Pair with Two Jack Lake and Cascade Ponds.', image: '/images/moraine-lake.jpg' },
  { name: 'Cave and Basin', area: 'Banff', difficulty: 'Easy', cost: 'Paid', tags: ['Indoor', 'Bad weather'], note: 'A useful historical and poor-weather backup.', image: '/images/banff-avenue.jpg' },
  { name: 'Peyto Lake', area: 'Icefields Parkway', difficulty: 'Easy–moderate', cost: 'Free', tags: ['Scenic', 'Weather-dependent'], note: 'Short uphill walk; traction may be useful.', image: '/images/icefields-parkway.jpg' },
  { name: 'Columbia Icefield Adventure', area: 'Icefields Parkway', difficulty: 'Easy', cost: 'Paid', tags: ['Paid', 'Reservation required', 'Weather-dependent'], note: 'Seasonal operation is near its end; never assume glacier access.', image: '/images/icefields-parkway.jpg' },
  { name: 'Policeman’s Creek Boardwalk', area: 'Canmore / Kananaskis', difficulty: 'Easy', cost: 'Free', tags: ['Easy', 'Scenic'], note: 'Walkable from central Canmore.', image: '/images/canmore.jpg' },
  { name: 'Grotto Canyon', area: 'Canmore / Kananaskis', difficulty: 'Easy–moderate', cost: 'Free', tags: ['Moderate', 'Weather-dependent'], note: 'Choose only after checking trail conditions.', image: '/images/canmore.jpg' },
  { name: 'Grassi Lakes', area: 'Canmore / Kananaskis', difficulty: 'Easy–moderate', cost: 'Free', tags: ['Status must be verified'], note: 'Do not assume open; keep alternate Canmore walks ready.', image: '/images/canmore.jpg' },
]

export const activityFilters = ['All', 'Easy', 'Moderate', 'Scenic', 'Indoor', 'Bad weather', 'Reservation required', 'Free', 'Paid', 'Banff', 'Lake Louise', 'Icefields Parkway', 'Canmore / Kananaskis']
