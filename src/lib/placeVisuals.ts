import type { ItineraryDay, ItineraryStop } from '../types'

export interface PlaceVisual {
  image: string
  imageAlt: string
}

interface VisualRule extends PlaceVisual {
  matches: RegExp
}

type VisualDay = Pick<ItineraryDay, 'title' | 'location' | 'stops' | 'image' | 'imageAlt'>

// Keep the most specific places first. These rules intentionally use both the
// human-facing name and common Google Maps wording so Miller Time additions do
// not have to match one exact spelling.
const placeRules: VisualRule[] = [
  {
    matches: /\bathabasca falls\b/i,
    image: '/images/activities/athabasca-falls.jpg',
    imageAlt: 'Athabasca Falls rushing through its rocky gorge near Jasper',
  },
  {
    matches: /\bmaligne lake\b|\bspirit island\b/i,
    image: '/images/activities/maligne-lake.jpg',
    imageAlt: 'Maligne Lake beneath snow-dusted peaks near Jasper',
  },
  {
    matches: /\bpyramid (?:lake|island)\b/i,
    image: '/images/activities/pyramid-lake.jpg',
    imageAlt: 'Pyramid Lake and its mountain backdrop near Jasper',
  },
  {
    matches: /\blake agnes\b|\blake agnes tea ?house\b/i,
    image: '/images/activities/lake-agnes-tea-house.jpg',
    imageAlt: 'Lake Agnes Tea House beside the alpine lake above Lake Louise',
  },
  {
    matches: /\blittle beehive\b/i,
    image: '/images/activities/little-beehive.jpg',
    imageAlt: 'The Little Beehive viewpoint overlooking Lake Louise and the Bow Valley',
  },
  {
    matches: /\bbanff gondola\b|\bsulphur mountain\b|\bsummit boardwalk\b/i,
    image: '/images/activities/banff-gondola.jpg',
    imageAlt: 'Banff Gondola cabins climbing Sulphur Mountain above the Bow Valley',
  },
  {
    matches: /\b(?:banff )?upper hot springs\b/i,
    image: '/images/activities/banff-upper-hot-springs.jpg',
    imageAlt: 'Banff Upper Hot Springs pool surrounded by mountain scenery',
  },
  {
    matches: /\bjohnston (?:canyon )?upper falls\b|\bupper falls.*johnston\b/i,
    image: '/images/activities/johnston-upper-falls.jpg',
    imageAlt: 'Upper Falls plunging into Johnston Canyon',
  },
  {
    matches: /\bjohnston canyon\b|\bjohnston lower falls\b|\blower falls.*johnston\b/i,
    image: '/images/johnston-canyon.jpg',
    imageAlt: 'Johnston Canyon waterfall and cliffside catwalk',
  },
  {
    matches: /\blake minnewanka\b/i,
    image: '/images/activities/lake-minnewanka.jpg',
    imageAlt: 'Lake Minnewanka stretching toward the Canadian Rockies near Banff',
  },
  {
    matches: /\bcave (?:and|&) basin\b|\bcave and basin national historic site\b/i,
    image: '/images/activities/cave-and-basin.jpg',
    imageAlt: 'The historic Cave and Basin site at the base of Sulphur Mountain',
  },
  {
    matches: /\bpeyto lake\b|\bbow summit\b/i,
    image: '/images/activities/peyto-lake.jpg',
    imageAlt: 'Turquoise Peyto Lake seen from the Bow Summit viewpoint',
  },
  {
    matches: /\bcolumbia icefield\b|\bathabasca glacier\b|\bglacier skywalk\b/i,
    image: '/images/activities/columbia-icefield.jpg',
    imageAlt: 'The Columbia Icefield and Athabasca Glacier along the Icefields Parkway',
  },
  {
    matches: /\bpoliceman(?:'|’)?s creek\b/i,
    image: '/images/activities/policemans-creek.jpg',
    imageAlt: 'Policeman’s Creek boardwalk with Canmore’s mountain skyline beyond',
  },
  {
    matches: /\bgrotto canyon\b/i,
    image: '/images/activities/grotto-canyon.jpg',
    imageAlt: 'The narrow rock walls and creek trail of Grotto Canyon',
  },
  {
    matches: /\bgrassi lakes?\b/i,
    image: '/images/activities/grassi-lakes.jpg',
    imageAlt: 'Clear turquoise water at Grassi Lakes above Canmore',
  },
  {
    matches: /\bmoraine lake\b|\bvalley of the ten peaks\b|\bten peaks\b/i,
    image: '/images/moraine-lake.jpg',
    imageAlt: 'Moraine Lake and the Valley of the Ten Peaks in early autumn',
  },
  {
    matches: /\blake louise\b|\bplain of six glaciers\b/i,
    image: '/images/lake-louise.jpg',
    imageAlt: 'Lake Louise framed by snowy peaks and Victoria Glacier',
  },
  {
    matches: /\bicefields parkway\b|\bbow lake\b|\bwaterfowl lakes?\b|\bmistaya canyon\b/i,
    image: '/images/icefields-parkway.jpg',
    imageAlt: 'The Icefields Parkway winding through the Canadian Rockies',
  },
]

const regionalRules: VisualRule[] = [
  {
    matches: /\bjasper\b/i,
    image: '/images/activities/jasper.jpg',
    imageAlt: 'Downtown Jasper beneath the surrounding Rocky Mountain peaks',
  },
  {
    matches: /\bcanmore\b|\bkananaskis\b|\bthree sisters\b|\bquarry lake\b/i,
    image: '/images/canmore.jpg',
    imageAlt: 'Canmore and the Bow Valley beneath the Canadian Rockies',
  },
  {
    matches: /\bbanff\b|\bbow falls\b|\bsurprise corner\b/i,
    image: '/images/banff-avenue.jpg',
    imageAlt: 'Banff Avenue beneath Cascade Mountain in autumn',
  },
]

function visualMatching(text: string, rules: VisualRule[]) {
  return rules.find((rule) => rule.matches.test(text))
}

function stopSearchText(stop: ItineraryStop) {
  return `${stop.name} ${stop.mapsQuery}`
}

/**
 * Selects the most representative known place for an itinerary day.
 *
 * A specific place in the title wins. Otherwise, the first core place with an
 * exact visual wins, followed by optional places and then the overnight region.
 * The stored visual remains the fallback for arrival days and future locations.
 */
export function resolveItineraryDayVisual(day: VisualDay): PlaceVisual {
  const exactTitle = visualMatching(day.title, placeRules)
  if (exactTitle) return { image: exactTitle.image, imageAlt: exactTitle.imageAlt }

  const visitStops = day.stops.filter((stop) => stop.kind !== 'travel' && stop.kind !== 'lodging')
  const coreStops = visitStops.filter((stop) => stop.priority !== 'optional')
  const optionalStops = visitStops.filter((stop) => stop.priority === 'optional')
  for (const stop of [...coreStops, ...optionalStops]) {
    const exactStop = visualMatching(stopSearchText(stop), placeRules)
    if (exactStop) return { image: exactStop.image, imageAlt: exactStop.imageAlt }
  }

  const regionalTitle = visualMatching(day.title, regionalRules)
  if (regionalTitle) return { image: regionalTitle.image, imageAlt: regionalTitle.imageAlt }

  for (const stop of [...coreStops, ...optionalStops]) {
    const regionalStop = visualMatching(stopSearchText(stop), regionalRules)
    if (regionalStop) return { image: regionalStop.image, imageAlt: regionalStop.imageAlt }
  }

  const regionalLocation = visualMatching(day.location, regionalRules)
  if (regionalLocation) return { image: regionalLocation.image, imageAlt: regionalLocation.imageAlt }

  return {
    image: day.image,
    imageAlt: day.imageAlt || `${day.title} in the Canadian Rockies`,
  }
}
