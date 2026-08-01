import type { Restaurant } from '../types'

export const restaurants: Restaurant[] = [
  { name: 'PARK Distillery', town: 'Banff', cuisine: 'Canadian comfort · distillery', price: '$$', atmosphere: 'Lively and casual', bestFor: 'First-night dinner', day: 'Day 1', reserve: false, url: 'https://www.parkdistillery.com/' },
  { name: 'Three Bears Brewery', town: 'Banff', cuisine: 'Pizza · brewery', price: '$$', atmosphere: 'Relaxed group-friendly', bestFor: 'Flexible dinner', day: 'Day 1', reserve: false, url: 'https://threebearsbanff.com/' },
  { name: 'Banff Ave Brewing Co.', town: 'Banff', cuisine: 'Pub · brewery', price: '$$', atmosphere: 'Casual', bestFor: 'Beer and easy dinner', day: 'Any Banff day', reserve: false, url: 'https://banffavebrewingco.ca/' },
  { name: 'The Bison', town: 'Banff', cuisine: 'Upscale Canadian', price: '$$$', atmosphere: 'Warm and refined', bestFor: 'Special dinner', day: 'Day 2 or 3', reserve: true, url: 'https://www.thebison.ca/' },
  { name: 'Bluebird', town: 'Banff', cuisine: 'Steakhouse · chophouse', price: '$$$', atmosphere: 'Stylish alpine', bestFor: 'Celebration dinner', day: 'Day 3', reserve: true, url: 'https://www.bluebirdbanff.com/' },
  { name: 'Farm & Fire', town: 'Banff', cuisine: 'Wood-fired Canadian', price: '$$$', atmosphere: 'Approachable upscale', bestFor: 'Group dinner', day: 'Day 2 or 3', reserve: true, url: 'https://www.farmandfirebanff.com/' },
  { name: 'Hello Sunshine', town: 'Banff', cuisine: 'Japanese-inspired', price: '$$$', atmosphere: 'Lively and social', bestFor: 'Fun group night', day: 'Day 1 or 3', reserve: true, url: 'https://www.hellosunshinebanff.com/' },
  { name: 'Shoku Izakaya', town: 'Banff', cuisine: 'Japanese · izakaya', price: '$$', atmosphere: 'Casual-modern', bestFor: 'Shared plates', day: 'Day 2', reserve: true, url: 'https://www.shokubistro.com/' },
  { name: 'Block Kitchen + Bar', town: 'Banff', cuisine: 'Eclectic small plates', price: '$$$', atmosphere: 'Small and energetic', bestFor: 'Cocktails and plates', day: 'Day 1', reserve: true, url: 'https://blockkitchenandbar.com/' },
  { name: 'Sky Bistro', town: 'Banff', cuisine: 'Canadian fine dining', price: '$$$$', atmosphere: 'Destination views', bestFor: 'Gondola day lunch', day: 'Day 3', reserve: true, url: 'https://www.banffjaspercollection.com/dining/sky-bistro/' },
  { name: 'Rundle Bar', town: 'Banff', cuisine: 'Cocktails · afternoon tea', price: '$$$$', atmosphere: 'Historic grand hotel', bestFor: 'Splurge drinks or tea', day: 'Day 3 or 7', reserve: true, url: 'https://www.fairmont.com/banff-springs/dining/rundlebar/' },
  { name: 'Walliser Stube', town: 'Lake Louise', cuisine: 'Swiss-inspired · fondue', price: '$$$$', atmosphere: 'Intimate alpine', bestFor: 'Lake-day special meal', day: 'Day 2', reserve: true, url: 'https://www.fairmont.com/lake-louise/dining/walliserstube/' },
  { name: 'Bridgette Bar Canmore', town: 'Canmore', cuisine: 'Wood-fired contemporary', price: '$$$', atmosphere: 'Stylish and sociable', bestFor: 'Final dinner', day: 'Day 5 or 7', reserve: true, url: 'https://www.bridgettebar.com/canmore' },
  { name: 'Sauvage', town: 'Canmore', cuisine: 'Tasting menu', price: '$$$$', atmosphere: 'Creative fine dining', bestFor: 'One big splurge', day: 'Day 6 or 7', reserve: true, url: 'https://www.sauvagerestaurant.ca/' },
  { name: 'The Sensory', town: 'Canmore', cuisine: 'Canadian', price: '$$$', atmosphere: 'Mountain views', bestFor: 'Scenic dinner', day: 'Day 6', reserve: true, url: 'https://thesensory.ca/' },
  { name: 'Crazyweed', town: 'Canmore', cuisine: 'Globally inspired', price: '$$$', atmosphere: 'Local favorite', bestFor: 'Comfortable dinner', day: 'Day 5', reserve: true, url: 'https://crazyweed.ca/' },
  { name: 'Rocky Mountain Flatbread', town: 'Canmore', cuisine: 'Pizza · local ingredients', price: '$$', atmosphere: 'Easy and casual', bestFor: 'Low-key group dinner', day: 'Day 6', reserve: false, url: 'https://www.rockymountainflatbread.ca/canmore/' },
  { name: 'Where the Buffalo Roam', town: 'Canmore', cuisine: 'Cocktails · comfort food', price: '$$', atmosphere: 'Lively saloon', bestFor: 'Late drinks', day: 'Day 5 or 7', reserve: false, url: 'https://www.wherebuffaloroam.ca/' },
  { name: 'The Grizzly Paw', town: 'Canmore', cuisine: 'Brewery · pub', price: '$$', atmosphere: 'Casual', bestFor: 'Post-hike beers', day: 'Day 6', reserve: false, url: 'https://www.thegrizzlypaw.com/' },
]
