import '@supabase/functions-js/edge-runtime.d.ts'
import { withSupabase } from '@supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

const ANTHROPIC_MESSAGES_URL = 'https://api.anthropic.com/v1/messages'
const DEFAULT_MODEL = 'claude-sonnet-5'
const MAX_BODY_BYTES = 24_000
const WINDOW_MS = 60_000
const REQUESTS_PER_WINDOW = 10
const requestWindows = new Map<string, number[]>()

const tripBrief = `
TRIP FACTS
- Banff & the Canadian Rockies, October 3–10, 2026 (7 nights), for Brandon, Alex, Contir, and Miller Time.
- Fly into Calgary; one larger Avis rental vehicle. Maximum lodging budget: $8,000 total / $2,000 per traveler.
- This website is a planning aid, not a booking engine. Rates, inventory, schedules, weather, trails, and seasonal operations must be verified with the official provider.

ITINERARY
- Sat Oct 3: arrive Calgary at varying times, collect rental, ~1.5-hour drive to Banff, settle in and walk Banff Avenue.
- Sun Oct 4: Lake Louise and Moraine Lake. Shuttle required for Moraine Lake; normal private vehicle access is not permitted. Lake Agnes is optional/moderate.
- Mon Oct 5: Banff town, Bow Falls, Surprise Corner, Gondola, Upper Hot Springs. Strong poor-weather day.
- Tue Oct 6: Icefields Parkway on the best road-weather day: Bow Lake, Peyto Lake, optional Mistaya/Columbia Icefield. Full tank, offline maps, food, water, layers, and same-day Alberta 511 check.
- Wed Oct 7: check out of Banff, Johnston Canyon Lower Falls, optional Upper Falls if safe, then move to Canmore.
- Thu Oct 8: Canmore/Kananaskis, with the walk chosen for conditions. Do not assume Grassi Lakes is open.
- Fri Oct 9: recovery/flex day for a weather-canceled priority, Lake Minnewanka if operating, or a relaxed Banff/Canmore day.
- Sat Oct 10: breakfast, Canmore to Calgary Airport, return rental, fly home.

LODGING SCENARIOS
- Scenario A (recommended): Oct 3–7 Canalta Lodge in Banff, 3 rooms, working estimate $3,420; Oct 7–10 Spring Creek Vacations in Canmore, 3-bedroom rental, $1,860; allowances $1,530; total $6,810 / $1,703 each / $1,190 below cap.
- Scenario B: all 7 nights in central Banff, 3 rooms at a target $325 average; base $6,825 plus $1,041 allowance; total $7,866 / $1,967 each / $134 below cap.
- Scenario C: all 7 nights in a Canmore 3-bedroom rental at a target $520 nightly; base $3,640 plus $610 allowance; total $4,250 / $1,063 each / $3,750 below cap.
- Other researched stays include Caribou, Peaks, Moose, Moxy, Fox, Royal Canadian, Hotel Canoe, Elk + Avenue, Bow View, The Kenrick, Blackstone, Falcon Crest, The Malcolm, Everwild, and Silver Creek. These are research snapshots only.

TRANSPORT AND RESERVATIONS
- Priorities: book lodging; reserve Lake Louise/Moraine Lake transportation; then Gondola/Sky Bistro, top dinners, Columbia Icefield if chosen, Avis, and verify Lake Minnewanka operations.
- Moraine Lake requires transit; compare Roam from Banff with Parks Canada Park & Ride. Verify the final 2026 reservation window and October timetable.
- Johnston Canyon parking can fill and catwalks may be wet/icy. Icefields Parkway has limited services and unreliable cell coverage.

DINING SHORTLIST
- Casual Banff: PARK Distillery, Three Bears, Banff Ave Brewing. Priority Banff reservations: The Bison, Bluebird, Farm & Fire, Hello Sunshine, Shoku, Block, Sky Bistro, Rundle Bar.
- Lake Louise special meal: Walliser Stube.
- Canmore: Bridgette Bar, Sauvage, The Sensory, Crazyweed, Rocky Mountain Flatbread, Where the Buffalo Roam, Grizzly Paw.

ACTIVITY STYLE AND CONSTRAINTS
- The group wants easy-to-moderate options and weather-ready backups. October can mean freezing nights, wet/icy paths, snow, and changing road conditions.
- Main options: Lake Louise lakeshore, Lake Agnes, Little Beehive, Moraine Rockpile, Gondola, Upper Hot Springs, Johnston Canyon, Lake Minnewanka, Cave and Basin, Peyto Lake, Columbia Icefield, Policeman’s Creek, Grotto Canyon, and Grassi Lakes only if confirmed open.

HOW THE WEBSITE WORKS
- Overview: trip facts and priority checklist. Itinerary: each day plus expandable options and full logistics. Book & Reserve: the action center for live official-source guidance, clear booking deadlines, direct provider links, and shared completion status; the group only needs one of the two lake-shuttle choices. Lodging: filters, preferred stay, three clickable scenarios, detailed costs, and calculator. Transportation, Dining, and Things To Do: researched option catalogs with filters and expandable lists. Map: trip pins and an Open in Google Maps action. Budget: editable planning estimates. Notes: browser-local lists and notes.
- Edits save to this browser by default. Account creation is optional and only needed to collaborate/sync with the group. Guest AI chat stays browser-local. Signed-in users get a private, per-user, per-trip transcript in Supabase so their conversation resumes on another device.
`.trim()

const systemPrompt = `You are Miller Time AI, the warm, practical virtual travel agent inside the Banff 2026 planner. You know the site and the plan described below. Answer questions about the itinerary, explain any screen or choice, compare options, and suggest easy changes that respect the group's dates, budget, pace, transportation constraints, and October weather risk.

Personality:
- Bring "Miller Time" energy: upbeat, social, decisive, a little playful, and always ready to scout a great brewery or bar. Sound like a fun, capable friend who happens to be an excellent travel agent—not a generic concierge or a beer advertisement.
- When it naturally fits, favor a post-adventure brewery, taproom, cocktail bar, or lively happy hour. For brewery suggestions, look up the current tap list or official menu and name the strongest IPA option(s), including style and ABV when the source provides them. Tap lists rotate, so label what was verified online and what still needs an in-person check.
- Give the exact beer name shown by the source. If the current menu only says "IPA" or omits ABV, say that plainly rather than dressing it up as a named beer or guessing.
- Do not force alcohol into every answer. Offer a good non-alcoholic or food-forward alternative when relevant.
- Safety is non-negotiable: never encourage the rental-car driver to drink. Put brewery/bar stops after the day's driving, within walking distance, by Roam/transit/taxi, or with a designated driver. Never suggest drinking before the Icefields Parkway or another remote drive.

Behavior:
- Lead with a direct recommendation, then give a short reason.
- Default to 120–180 words and never exceed 220 words unless the traveler explicitly asks for a detailed analysis.
- Write plain text without Markdown headings, bold markers, tables, or code blocks. Simple hyphen bullets are fine when they genuinely help.
- Finish the answer cleanly. Do not end with an offer or follow-up question unless a missing detail truly blocks the recommendation.
- When suggesting a change, name the day or scenario affected and explain the smallest workable adjustment.
- Geography guardrail: the Icefields Parkway runs northwest from the Lake Louise area; Canmore is southeast of Banff. The Parkway is not on the way to Canmore. Never combine the full Parkway day with the Oct 7 Johnston Canyon, checkout, and Canmore move. If Oct 6 weather is poor, recommend floating the Parkway between Oct 5/6 based on the forecast, using the Oct 9 flex day, shortening it to Bow Lake/Peyto Lake, or skipping it.
- Distinguish stored trip facts from the visitor's current browser preferences supplied below.
- Use web search whenever a recommendation depends on current facts: brewery tap lists and IPAs, menus, hours, seasonal operations, prices, events, weather, roads, trails, or reservation rules. Prefer official brewery, venue, Parks Canada, Alberta 511, and operator sources. Cite the source links and never invent a beer, menu item, or current condition.
- Do not invent precise drive or walk times. Canalta Lodge sits toward the eastern end of Banff Avenue, so do not describe every central Banff stop as a 5–10 minute walk from it; direct travelers to the site's Google Maps option when exact routing matters.
- Never claim live availability, prices, road status, weather, trail access, or reservation confirmation unless a current cited source supports it. Even then, explain what should be rechecked before the trip.
- Do not invent bookings or change the plan yourself. You can explain exactly what the traveler should update in the app.
- If information is missing, say so plainly instead of guessing.

${tripBrief}`

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface SourceLink {
  title: string
  url: string
}

interface StoredConversation {
  id: number
}

interface AnthropicCitation {
  type?: string
  title?: string
  url?: string
}

interface AnthropicContentBlock {
  type?: string
  text?: string
  citations?: AnthropicCitation[]
}

interface AnthropicResponse {
  content?: AnthropicContentBlock[]
  stop_reason?: string
  error?: { type?: string }
  usage?: { server_tool_use?: { web_search_requests?: number } }
}

function json(status: number, body: Record<string, unknown>) {
  return Response.json(body, {
    status,
    headers: { 'cache-control': 'no-store' },
  })
}

function clientKey(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('cf-connecting-ip')
    || 'unknown'
}

function isRateLimited(request: Request) {
  const now = Date.now()
  const key = clientKey(request)
  const active = (requestWindows.get(key) || []).filter((timestamp) => now - timestamp < WINDOW_MS)
  if (active.length >= REQUESTS_PER_WINDOW) return true
  active.push(now)
  requestWindows.set(key, active)
  return false
}

function validTripId(value: unknown): value is string {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

async function findConversation(client: SupabaseClient, userId: string, tripId: string) {
  const result = await client
    .schema('travel_planner')
    .from('ai_conversations')
    .select('id')
    .eq('user_id', userId)
    .eq('trip_id', tripId)
    .maybeSingle()

  if (result.error) throw result.error
  return result.data as StoredConversation | null
}

async function getOrCreateConversation(client: SupabaseClient, userId: string, tripId: string) {
  const existing = await findConversation(client, userId, tripId)
  if (existing) return existing

  const created = await client
    .schema('travel_planner')
    .from('ai_conversations')
    .insert({ user_id: userId, trip_id: tripId })
    .select('id')
    .single()

  if (!created.error) return created.data as StoredConversation
  if (created.error.code === '23505') {
    const raced = await findConversation(client, userId, tripId)
    if (raced) return raced
  }
  throw created.error
}

async function loadMessages(client: SupabaseClient, conversationId: number, limit = 30) {
  const result = await client
    .schema('travel_planner')
    .from('ai_messages')
    .select('id, role, content, sources, created_at')
    .eq('conversation_id', conversationId)
    .order('id', { ascending: false })
    .limit(limit)

  if (result.error) throw result.error
  return (result.data ?? []).reverse()
}

function extractAnswer(result: AnthropicResponse) {
  if (!Array.isArray(result.content)) return ''
  const lastSearchResult = result.content.reduce(
    (latest, block, index) => block.type === 'web_search_tool_result' ? index : latest,
    -1,
  )
  const answerBlocks = lastSearchResult >= 0 ? result.content.slice(lastSearchResult + 1) : result.content
  return answerBlocks.filter((block) => block.type === 'text').map((block) => block.text || '').join('').trim()
}

function extractSources(result: AnthropicResponse): SourceLink[] {
  const sources = new Map<string, SourceLink>()
  for (const block of result.content ?? []) {
    for (const citation of block.citations ?? []) {
      if (citation.type !== 'web_search_result_location' || !citation.url) continue
      sources.set(citation.url, {
        url: citation.url,
        title: citation.title?.trim() || new URL(citation.url).hostname.replace(/^www\./, ''),
      })
    }
  }
  return [...sources.values()].slice(0, 6)
}

export default {
  fetch: withSupabase({ auth: ['user', 'publishable', 'secret'] }, async (request, context) => {
    if (request.method !== 'POST') return json(405, { error: 'Use POST for Miller Time AI.' })

    const contentLength = Number(request.headers.get('content-length') || 0)
    if (contentLength > MAX_BODY_BYTES) return json(413, { error: 'That conversation is too large. Start a fresh chat and try again.' })

    let payload: Record<string, unknown>
    try {
      payload = await request.json()
    } catch {
      return json(400, { error: 'The chat request was not valid JSON.' })
    }

    const action = payload.action === 'load' || payload.action === 'reset' ? payload.action : 'chat'
    const tripId = validTripId(payload.tripId) ? payload.tripId : null
    const userId = context.authMode === 'user' && typeof context.userClaims?.id === 'string'
      ? context.userClaims.id
      : null
    const memoryClient = userId && tripId ? context.supabase : null

    if (action !== 'chat') {
      if (!memoryClient || !userId || !tripId) return json(200, { messages: [], memory: 'local' })
      try {
        const conversation = await findConversation(memoryClient, userId, tripId)
        if (action === 'reset') {
          if (conversation) {
            const deleted = await memoryClient
              .schema('travel_planner')
              .from('ai_conversations')
              .delete()
              .eq('id', conversation.id)
            if (deleted.error) throw deleted.error
          }
          return json(200, { messages: [], memory: 'cloud' })
        }
        const storedMessages = conversation ? await loadMessages(memoryClient, conversation.id) : []
        return json(200, { messages: storedMessages, memory: 'cloud' })
      } catch (error) {
        console.error('Miller Time memory action failed', error instanceof Error ? error.message : 'unknown')
        return json(503, { error: 'Miller Time could not reach your saved conversation. Please try again.' })
      }
    }

    if (isRateLimited(request)) return json(429, { error: 'Miller Time AI is getting a lot of questions. Please wait a minute and try again.' })

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) return json(503, { error: 'Miller Time AI has not been connected to Anthropic yet.' })

    const rawMessages = Array.isArray(payload.messages) ? payload.messages.slice(-12) : []
    const submittedMessages = rawMessages
      .filter((message): message is ChatMessage => Boolean(
        message
        && typeof message === 'object'
        && ('role' in message)
        && (message.role === 'user' || message.role === 'assistant')
        && ('content' in message)
        && typeof message.content === 'string',
      ))
      .map((message) => ({ role: message.role, content: message.content.trim().slice(0, 1600) }))
      .filter((message) => message.content.length > 0)

    if (!submittedMessages.length || submittedMessages[submittedMessages.length - 1].role !== 'user') {
      return json(400, { error: 'Ask Miller Time AI a question to continue.' })
    }

    const question = submittedMessages[submittedMessages.length - 1].content
    let conversation: StoredConversation | null = null
    let messages = submittedMessages

    if (memoryClient && userId && tripId) {
      try {
        conversation = await getOrCreateConversation(memoryClient, userId, tripId)
        const storedMessages = await loadMessages(memoryClient, conversation.id, 20)
        messages = [
          ...storedMessages.map(({ role, content }) => ({ role: role as ChatMessage['role'], content: content as string })),
          { role: 'user', content: question },
        ]
      } catch (error) {
        console.error('Miller Time memory load failed', error instanceof Error ? error.message : 'unknown')
        return json(503, { error: 'Miller Time could not reach your saved conversation. Please try again.' })
      }
    }

    const pageContext = payload.pageContext && typeof payload.pageContext === 'object'
      ? payload.pageContext as Record<string, unknown>
      : {}
    const page = typeof pageContext.page === 'string' ? pageContext.page.slice(0, 100) : 'unknown'
    const preferences = pageContext.preferences && typeof pageContext.preferences === 'object'
      ? JSON.stringify(pageContext.preferences).slice(0, 5000)
      : '{}'

    try {
      const response = await fetch(ANTHROPIC_MESSAGES_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: Deno.env.get('ANTHROPIC_MODEL') || DEFAULT_MODEL,
          max_tokens: 700,
          thinking: { type: 'disabled' },
          system: `${systemPrompt}\n\nCURRENT APP CONTEXT\nPage: ${page}\nBrowser-local planning preferences: ${preferences}`,
          messages,
          tools: [{
            type: 'web_search_20250305',
            name: 'web_search',
            max_uses: 3,
            user_location: {
              type: 'approximate',
              city: 'Banff',
              region: 'Alberta',
              country: 'CA',
              timezone: 'America/Edmonton',
            },
          }],
        }),
      })

      const result = await response.json().catch(() => ({})) as AnthropicResponse

      if (!response.ok) {
        console.error('Anthropic API error', response.status, result.error?.type || 'unknown')
        return json(response.status === 429 ? 429 : 502, {
          error: response.status === 429
            ? 'Miller Time AI is temporarily busy. Please try again shortly.'
            : 'Miller Time AI could not answer just now. Please try again.',
          code: result.error?.type || 'anthropic_upstream_error',
        })
      }

      const answer = extractAnswer(result)
      if (!answer) return json(502, { error: 'Miller Time AI returned an empty answer. Please try again.' })

      const sources = extractSources(result)
      if (memoryClient && userId && conversation) {
        const stored = await memoryClient.schema('travel_planner').from('ai_messages').insert([
          { conversation_id: conversation.id, user_id: userId, role: 'user', content: question, sources: [] },
          { conversation_id: conversation.id, user_id: userId, role: 'assistant', content: answer, sources },
        ])
        if (stored.error) throw stored.error

        const touched = await memoryClient
          .schema('travel_planner')
          .from('ai_conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', conversation.id)
        if (touched.error) throw touched.error
      }

      return json(200, {
        answer,
        sources,
        memory: memoryClient ? 'cloud' : 'local',
        searchedWeb: (result.usage?.server_tool_use?.web_search_requests ?? 0) > 0,
      })
    } catch (error) {
      console.error('Miller Time AI request failed', error instanceof Error ? error.message : 'unknown')
      return json(502, { error: 'Miller Time AI could not connect. Please try again.' })
    }
  }),
}
