# Banff 2026 Trip Planner

A responsive, production-ready trip dashboard for four adults traveling through Banff and the Canadian Rockies from October 3–10, 2026. It combines a weather-flexible itinerary, lodging comparison, shuttle planning, dining, activities, an interactive map, budget estimates, and browser-local packing and reservation lists.

## Run locally

```bash
npm install
npm run dev
```

Build and preview the production output:

```bash
npm run build
npm run preview
```

## Deploy to Netlify

The included `netlify.toml` uses:

- Build command: `npm run build`
- Publish directory: `dist`
- SPA fallback: all routes redirect to `/index.html`
- Environment variables: none

Connect this repository in Netlify and accept the detected settings, or run the Netlify CLI from the repository root. The app does not require Supabase or any paid API in version one.

## Content and architecture

Trip content lives separately from presentation in `src/data/`:

- `trip.ts` — trip facts and verified official source URLs
- `itinerary.ts` — all eight calendar days
- `lodging.ts` — researched lodging candidates and price snapshots
- `restaurants.ts` — dining shortlist
- `activities.ts` — activity catalog and filters
- `transportation.ts` — destination-specific transport guidance
- `packing.ts` — packing, reservations, and safety lists
- `mapLocations.ts` — coordinates and map categories

Update lodging estimates in `src/data/lodging.ts`. Every lodging price is intentionally labeled with a last-checked date and a direct-verification warning.

## Browser-local preferences

The app stores only optional planning choices in `localStorage`, namespaced with `banff-2026:`. These include the preferred lodging option, checklist completion, reservation statuses, budget estimates, optional itinerary expansion, and personal notes. No accounts, tracking, or remote database are used.

## Maps and imagery

- Interactive map tiles: [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), displayed via Leaflet.
- Scenic photography: locally stored, AI-generated project assets created for this app. No third-party photo hotlinks are used.
- Replace images by adding optimized files to `public/images/` and updating the matching `image` field in the data files. Keep wide 16:9 crops and descriptive alt text.

## Important verification note

This site is a planning aid, not a booking engine. Rates, schedules, seasonal operations, road conditions, trail access, shuttle inventory, and attraction availability can change. Verify every item with the official provider before booking or departing. In particular, confirm:

- 2026 Lake Louise / Moraine Lake shuttle inventory and operating dates
- Banff Gondola and attraction-shuttle hours
- Lake Minnewanka Cruise and Columbia Icefield seasonal operation
- Current trail bulletins, Grassi Lakes access, and Bow Valley Parkway restrictions
- Alberta 511 road conditions on the Icefields Parkway
- Direct lodging prices, taxes, fees, cancellation terms, and room layouts
