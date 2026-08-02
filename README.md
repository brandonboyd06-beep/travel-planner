# Banff 2026 Trip Planner

A responsive, production-ready trip dashboard for four adults traveling through Banff and the Canadian Rockies from October 3–10, 2026. It combines a weather-flexible itinerary, lodging comparison, shuttle planning, dining, activities, an interactive map, budget estimates, and local-first packing and reservation lists.

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
- Environment variables: Supabase browser settings for collaboration and Miller Time AI

Connect this repository in Netlify and accept the detected settings, or run the Netlify CLI from the repository root. The core local-first planner works without environment variables. To enable Miller Time AI and optional collaboration, add:

```bash
VITE_SUPABASE_URL=https://mymunodjaxymhbnhjwjx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
```

Use a publishable key only. Never expose a Supabase secret or service-role key in Vite or Netlify browser variables. Add the deployed Netlify origin to Supabase Auth's allowed redirect URLs so magic links can return to the app.

The floating Miller Time AI virtual travel agent runs in `supabase/functions/miller-time-ai/` and reads `OPENAI_API_KEY` from the Supabase project's Edge Function secrets. It defaults to `gpt-5.6-terra`, uses the Responses API with live web search, and can return review-only itinerary proposals inside the regular chat. The Book & Reserve page uses `supabase/functions/booking-readiness/` to refresh current official reservation guidance and still reads `ANTHROPIC_API_KEY`. Neither provider key is duplicated in Netlify or bundled into the browser app. The functions accept the project's publishable key, which allows account-free visitors while rejecting requests that are not made through a configured Supabase client.

For local Edge Function development, use `supabase functions serve miller-time-ai --env-file <ignored-env-file>` or `supabase functions serve booking-readiness --env-file <ignored-env-file>`. Never commit either provider key. Optional Supabase secrets `OPENAI_MODEL` and `OPENAI_REASONING_EFFORT` can override Miller Time's defaults; `ANTHROPIC_MODEL` still controls the booking-readiness function.

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

## Local-first preferences and collaboration

All optional planning choices are stored in `localStorage`, namespaced with `banff-2026:`. These include the preferred lodging option, checklist completion, reservation statuses, budget estimates, optional itinerary expansion, and personal notes. Visitors do not need an account and anonymous sessions never write to Supabase.

The first local edit shows a small, dismissible confirmation explaining that the change is saved only on that device. Choosing **Collaborate** opens passwordless email sign-in. After sign-in, existing local choices are copied to a shared trip and subsequent edits sync through Supabase Realtime. Signing out leaves the browser-local copy intact.

Database migrations live in `supabase/migrations/`. The dedicated `travel_planner` schema contains:

- `profiles` — private account display names
- `trips` — shared trip ownership and dates
- `trip_members` — owner/editor/viewer membership and pending email invitations
- `trip_state` — one JSON value per local preference key for low-conflict syncing

Every table has row-level security. The `anon` role has no schema or table privileges; authenticated reads and writes require matching trip membership. Owners can add collaborators by email, and the recipient joins after signing in with that same address.

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
