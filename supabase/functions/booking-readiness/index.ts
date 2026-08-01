import '@supabase/functions-js/edge-runtime.d.ts'
import { withSupabase } from '@supabase/server'

const ANTHROPIC_MESSAGES_URL = 'https://api.anthropic.com/v1/messages'
const DEFAULT_MODEL = 'claude-sonnet-5'
const CACHE_MS = 15 * 60 * 1000
const WINDOW_MS = 60_000
const REQUESTS_PER_WINDOW = 5

type BookingStatus = 'open' | 'limited' | 'sold_out' | 'not_open' | 'verify'

interface BookingStatusItem {
  id: string
  status: BookingStatus
  headline: string
  detail: string
}

interface BookingReadiness {
  checkedAt: string
  overall: string
  items: BookingStatusItem[]
  searchedWeb: boolean
}

interface AnthropicContentBlock {
  type?: string
  text?: string
}

interface AnthropicResponse {
  content?: AnthropicContentBlock[]
  error?: { type?: string }
  usage?: { server_tool_use?: { web_search_requests?: number } }
}

const requestWindows = new Map<string, number[]>()
let cached: { expiresAt: number; value: BookingReadiness } | null = null

const outputSchema = {
  type: 'object',
  properties: {
    overall: { type: 'string' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            enum: [
              'parks-lakes-shuttle',
              'roam-super-pass',
              'banff-gondola',
              'sky-bistro',
              'columbia-icefield',
              'lake-minnewanka',
            ],
          },
          status: { type: 'string', enum: ['open', 'limited', 'sold_out', 'not_open', 'verify'] },
          headline: { type: 'string' },
          detail: { type: 'string' },
        },
        required: ['id', 'status', 'headline', 'detail'],
        additionalProperties: false,
      },
    },
  },
  required: ['overall', 'items'],
  additionalProperties: false,
}

const prompt = `Today is ${new Date().toISOString().slice(0, 10)}. Check current, official booking guidance for this fixed Banff trip for four adults in October 2026.

Items and target dates:
- parks-lakes-shuttle: Parks Canada Lake Louise/Moraine Lake shuttle, Sunday October 4, 2026.
- roam-super-pass: Roam Reservable Super Pass from Banff to Lake Louise with Moraine Lake connector, Sunday October 4, 2026.
- banff-gondola: Banff Gondola, Monday October 5, 2026.
- sky-bistro: Sky Bistro, Monday October 5, 2026.
- columbia-icefield: Columbia Icefield Adventure, Tuesday October 6, 2026.
- lake-minnewanka: Lake Minnewanka Classic Cruise, Friday October 9, 2026.

Search only official sources: parks.canada.ca, reservation.pc.gc.ca, roamtransit.com, roamtransit.betterez.com, and banffjaspercollection.com. Check reservation-window status, seasonal operating dates, current warnings, and any date-specific inventory signal visible in official results.

Established 2026 official guidance to verify for changes:
- Parks Canada released 40% of 2026 shuttle seats on April 15 and releases the remaining 60% at 8 a.m. Mountain Time two days before departure.
- Roam opened September/October Super Pass inventory on July 27. Roam does not use the Parks Canada two-day rolling release; do not attribute that rule to Roam.
- Roam and the Moraine Lake road are scheduled through October 12, weather permitting.
- Banff Gondola is year-round. Columbia Icefield is scheduled May 1–October 12. Lake Minnewanka Cruise is scheduled May 8–October 12, with Classic Cruise hours 10 a.m.–5 p.m. from September 18–October 12. The latter two are weather dependent.

Status rules:
- open: the official booking window or ticket calendar is open. This does NOT mean a particular time has seats.
- limited: an official source explicitly reports limited inventory for the target date.
- sold_out: an official source explicitly confirms the target date is sold out.
- not_open: the booking window is not open or the attraction is outside its season.
- verify: the booking calendar or date-specific inventory cannot be confirmed from searchable official pages.

Never claim seats are available unless an official date-specific result confirms it. Keep each headline under 70 characters and each detail under 180 characters. Return exactly one item for every ID above, in the same order. The overall summary should be under 220 characters and tell the group the single most important next action without combining one provider's release rules with another provider.`

function json(status: number, body: Record<string, unknown>) {
  return Response.json(body, { status, headers: { 'cache-control': 'no-store' } })
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

function parseResult(result: AnthropicResponse): Omit<BookingReadiness, 'checkedAt' | 'searchedWeb'> {
  const text = (result.content ?? [])
    .filter((block) => block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('')
    .trim()
  if (!text) throw new Error('Anthropic returned no structured booking status.')

  const parsed = JSON.parse(text) as { overall?: unknown; items?: unknown }
  if (typeof parsed.overall !== 'string' || !Array.isArray(parsed.items) || parsed.items.length !== 6) {
    throw new Error('Anthropic returned an incomplete booking status.')
  }

  const allowedStatuses = new Set<BookingStatus>(['open', 'limited', 'sold_out', 'not_open', 'verify'])
  const items = parsed.items.map((item) => {
    if (!item || typeof item !== 'object') throw new Error('Invalid booking item.')
    const value = item as Record<string, unknown>
    const status = String(value.status).toLowerCase() as BookingStatus
    if (!allowedStatuses.has(status)) throw new Error('Invalid booking status.')
    if (typeof value.id !== 'string' || typeof value.headline !== 'string' || typeof value.detail !== 'string') {
      throw new Error('Invalid booking item fields.')
    }
    return { id: value.id, status, headline: value.headline, detail: value.detail }
  })

  return { overall: parsed.overall, items }
}

export default {
  fetch: withSupabase({ auth: ['user', 'publishable', 'secret'] }, async (request) => {
    if (request.method !== 'POST') return json(405, { error: 'Use POST to refresh booking guidance.' })
    if (isRateLimited(request)) return json(429, { error: 'Live booking checks are busy. Please wait a minute and try again.' })

    const force = await request.json().then((body) => body?.force === true).catch(() => false)
    if (!force && cached && cached.expiresAt > Date.now()) return json(200, { ...cached.value, cached: true })

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) return json(503, { error: 'Live booking checks have not been connected to Anthropic yet.' })

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
          max_tokens: 1200,
          thinking: { type: 'disabled' },
          messages: [{ role: 'user', content: prompt }],
          tools: [{
            type: 'web_search_20250305',
            name: 'web_search',
            max_uses: 4,
            allowed_domains: [
              'parks.canada.ca',
              'reservation.pc.gc.ca',
              'roamtransit.com',
              'roamtransit.betterez.com',
              'banffjaspercollection.com',
            ],
            user_location: {
              type: 'approximate',
              city: 'Banff',
              region: 'Alberta',
              country: 'CA',
              timezone: 'America/Edmonton',
            },
          }],
          output_config: { format: { type: 'json_schema', schema: outputSchema } },
        }),
      })

      const result = await response.json().catch(() => ({})) as AnthropicResponse
      if (!response.ok) {
        console.error('Anthropic booking check failed', response.status, result.error?.type || 'unknown')
        return json(response.status === 429 ? 429 : 502, {
          error: response.status === 429
            ? 'The live source checker is temporarily busy. Please try again shortly.'
            : 'Official booking guidance could not be refreshed just now.',
        })
      }

      const parsed = parseResult(result)
      const value: BookingReadiness = {
        ...parsed,
        checkedAt: new Date().toISOString(),
        searchedWeb: (result.usage?.server_tool_use?.web_search_requests ?? 0) > 0,
      }
      cached = { value, expiresAt: Date.now() + CACHE_MS }
      return json(200, { ...value, cached: false })
    } catch (error) {
      console.error('Live booking check failed', error instanceof Error ? error.message : 'unknown')
      return json(502, { error: 'Official booking guidance could not be refreshed just now.' })
    }
  }),
}
