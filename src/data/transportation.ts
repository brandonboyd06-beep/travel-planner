import { officialLinks } from './trip'

export const transportation = [
  { title: 'Calgary Airport → Banff', mode: 'Avis rental vehicle', status: 'Ready to book', summary: 'About 1.5 hours in ordinary conditions. Weather and traffic can add time.', steps: ['Pick up one larger vehicle', 'Optional grocery stop', 'Build arrival-time flexibility'], link: 'https://www.avis.com/' },
  { title: 'Lake Louise + Moraine Lake', mode: 'Shuttle required', status: 'Ready to book', summary: 'Reserve the Roam option from Banff or Parks Canada from the Lake Louise Park & Ride.', steps: ['No normal personal vehicle access to Moraine Lake', 'Use Lake Connector between lakes', 'Verify final 2026 timetable'], link: officialLinks.parksTransit },
  { title: 'Banff Gondola', mode: 'Roam / attraction shuttle / car', status: 'Researching', summary: 'Roam Route 1 and eligible attraction shuttles reduce parking stress.', steps: ['Pre-purchase if using attraction shuttle', 'Verify October schedule', 'Pair with Upper Hot Springs'], link: officialLinks.gondola },
  { title: 'Johnston Canyon', mode: 'Rental vehicle', status: 'Researching', summary: 'Parking can fill. Check Bow Valley Parkway restrictions and trail conditions.', steps: ['Arrive early', 'Carry traction if icy', 'Lower Falls first'], link: officialLinks.trails },
  { title: 'Icefields Parkway', mode: 'Rental vehicle only', status: 'Not started', summary: 'Limited services and no reliable cell coverage. Use only on a safe road-weather day.', steps: ['Fill gas before departure', 'Download offline maps', 'Check Alberta 511 same day'], link: officialLinks.road },
  { title: 'Lake Minnewanka', mode: 'Rental vehicle likely', status: 'Researching', summary: 'Seasonal transit and cruise service may be near its end by October 9.', steps: ['Verify Route 6', 'Verify cruise operation', 'Keep shoreline visit as fallback'], link: officialLinks.minnewanka },
]
