export interface LodgingScenario {
  id: 'scenario-a' | 'scenario-b' | 'scenario-c'
  eyebrow: string
  title: string
  description: string
  total: number
  perPerson: number
  buffer: number
  tone: 'green' | 'amber' | 'blue'
  status: string
  segments: Array<{
    dates: string
    town: string
    property: string
    setup: string
    estimate: number
    note: string
  }>
  costLines: Array<{ label: string; amount: number }>
  highlights: string[]
  tradeoffs: string[]
}

export const lodgingScenarios: LodgingScenario[] = [
  {
    id: 'scenario-a',
    eyebrow: 'Scenario A · recommended',
    title: 'Banff + Canmore split stay',
    description: 'Four nights close to the Banff itinerary, then a roomy Canmore base for the slower final stretch.',
    total: 6810,
    perPerson: 1703,
    buffer: 1190,
    tone: 'green',
    status: '$1,190 under cap',
    segments: [
      { dates: 'Oct 3–7 · 4 nights', town: 'Banff', property: 'Canalta Lodge', setup: '3 rooms', estimate: 3420, note: 'Best current Banff value candidate' },
      { dates: 'Oct 7–10 · 3 nights', town: 'Canmore', property: 'Spring Creek Vacations', setup: '3-bedroom rental', estimate: 1860, note: 'Shared living space and full kitchen' },
    ],
    costLines: [
      { label: 'Banff hotel estimate', amount: 3420 },
      { label: 'Canmore rental estimate', amount: 1860 },
      { label: 'Tax and booking-fee allowance', amount: 925 },
      { label: 'Parking and price-change cushion', amount: 605 },
    ],
    highlights: ['Matches the planned Oct 7 move to Canmore', 'Keeps four Banff mornings close to the park', 'Adds a kitchen and common room for the group'],
    tradeoffs: ['One hotel change', 'Confirm a true three-bedroom layout', 'Direct rates and fees still need verification'],
  },
  {
    id: 'scenario-b',
    eyebrow: 'Scenario B',
    title: 'One central Banff base',
    description: 'Stay in Banff for all seven nights and trade maximum convenience for a much tighter budget buffer.',
    total: 7866,
    perPerson: 1967,
    buffer: 134,
    tone: 'amber',
    status: 'Little fee buffer',
    segments: [
      { dates: 'Oct 3–10 · 7 nights', town: 'Banff', property: 'Central Banff hotel target', setup: '3 rooms · ≤ $325 average', estimate: 6825, note: 'Start with Bow View; compare Canalta and Caribou' },
    ],
    costLines: [
      { label: '21 room-nights at $325 target', amount: 6825 },
      { label: 'Tax and fee allowance', amount: 1041 },
    ],
    highlights: ['No lodging change', 'Maximum access to Banff restaurants and transit', 'Simplest room arrangement'],
    tradeoffs: ['Only $134 below the cap', 'Requires a genuinely central rate near $325', 'Longer drives for the Canmore/Kananaskis days'],
  },
  {
    id: 'scenario-c',
    eyebrow: 'Scenario C',
    title: 'One Canmore rental',
    description: 'Use one larger Canmore home base for the entire trip and preserve the most money for dining and activities.',
    total: 4250,
    perPerson: 1063,
    buffer: 3750,
    tone: 'blue',
    status: 'Best value',
    segments: [
      { dates: 'Oct 3–10 · 7 nights', town: 'Canmore', property: 'Spring Creek Vacations target', setup: '3-bedroom rental', estimate: 3640, note: 'Assumes a $520 average nightly group rate' },
    ],
    costLines: [
      { label: '7 rental nights at $520 target', amount: 3640 },
      { label: 'Cleaning, tax, and fee allowance', amount: 610 },
    ],
    highlights: ['Largest budget cushion', 'Kitchen, laundry, and common space', 'No mid-trip move'],
    tradeoffs: ['About 25 minutes to Banff in ordinary conditions', 'More driving and parking dependence', 'Rental cancellation terms vary widely'],
  },
]
