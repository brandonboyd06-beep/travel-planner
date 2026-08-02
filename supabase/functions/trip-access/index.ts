import '@supabase/functions-js/edge-runtime.d.ts'
import { createClient, type User } from '@supabase/supabase-js'

const allowedOrigins = new Set([
  'https://millertimetravel.xyz',
  'https://www.millertimetravel.xyz',
  'http://127.0.0.1:4173',
  'http://localhost:4173',
])
const MAX_BODY_BYTES = 2_000
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type AccessAction = 'invite' | 'reset'

interface AccessRequest {
  action?: AccessAction
  tripId?: string
  email?: string
  displayName?: string
}

function responseHeaders(request: Request) {
  const origin = request.headers.get('origin') ?? ''
  return {
    'access-control-allow-origin': allowedOrigins.has(origin) ? origin : 'https://millertimetravel.xyz',
    'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info',
    'access-control-allow-methods': 'POST, OPTIONS',
    'cache-control': 'no-store',
    'content-type': 'application/json; charset=utf-8',
    'vary': 'Origin',
  }
}

function json(request: Request, status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: responseHeaders(request) })
}

function temporaryPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%'
  const bytes = crypto.getRandomValues(new Uint8Array(18))
  return [...bytes].map((byte) => alphabet[byte % alphabet.length]).join('')
}

async function findUserByEmail(admin: ReturnType<typeof createClient>, email: string) {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 })
    if (error) throw error
    const match = data.users.find((candidate) => candidate.email?.toLowerCase() === email)
    if (match) return match
    if (data.users.length < 100) return null
  }
  throw new Error('The account list is unexpectedly large.')
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: responseHeaders(request) })
  if (request.method !== 'POST') return json(request, 405, { error: 'Use POST for trip access.' })

  const origin = request.headers.get('origin')
  if (origin && !allowedOrigins.has(origin)) return json(request, 403, { error: 'This site is not allowed to manage trip access.' })

  const contentLength = Number(request.headers.get('content-length') || 0)
  if (contentLength > MAX_BODY_BYTES) return json(request, 413, { error: 'That request is too large.' })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const authorization = request.headers.get('authorization')
  if (!supabaseUrl || !serviceRoleKey) return json(request, 503, { error: 'Trip access is not configured.' })
  if (!authorization?.toLowerCase().startsWith('bearer ')) return json(request, 401, { error: 'Sign in before managing the guest list.' })

  let payload: AccessRequest
  try {
    const body = await request.text()
    if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) return json(request, 413, { error: 'That request is too large.' })
    payload = JSON.parse(body) as AccessRequest
  } catch {
    return json(request, 400, { error: 'That guest-list request was not valid.' })
  }

  const action: AccessAction = payload.action === 'reset' ? 'reset' : 'invite'
  const tripId = typeof payload.tripId === 'string' ? payload.tripId : ''
  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : ''
  const displayName = typeof payload.displayName === 'string' ? payload.displayName.trim().slice(0, 80) : ''
  if (!/^[0-9a-f-]{36}$/i.test(tripId) || !EMAIL_PATTERN.test(email) || email.length > 320) {
    return json(request, 400, { error: 'Enter a valid guest email address.' })
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  try {
    const token = authorization.slice(7).trim()
    const { data: callerResult, error: callerError } = await admin.auth.getUser(token)
    const caller = callerResult.user
    if (callerError || !caller) return json(request, 401, { error: 'Your session expired. Sign in again.' })

    const { data: trip, error: tripError } = await admin
      .schema('travel_planner')
      .from('trips')
      .select('id, owner_id')
      .eq('id', tripId)
      .eq('owner_id', caller.id)
      .maybeSingle()
    if (tripError) throw tripError
    if (!trip) return json(request, 403, { error: 'Only the trip owner can manage guest passwords.' })

    const { data: membership, error: membershipError } = await admin
      .schema('travel_planner')
      .from('trip_members')
      .select('id, user_id, role, display_name')
      .eq('trip_id', tripId)
      .ilike('invited_email', email)
      .maybeSingle()
    if (membershipError) throw membershipError
    if (membership?.role === 'owner') return json(request, 400, { error: 'The owner password cannot be reset from the guest list.' })
    if (action === 'reset' && !membership) return json(request, 404, { error: 'That person is not on this trip yet.' })

    const nextPassword = temporaryPassword()
    let account: User | null = await findUserByEmail(admin, email)
    let createdAccount = false
    const metadata = {
      ...(account?.user_metadata ?? {}),
      display_name: displayName || membership?.display_name || email.split('@')[0].slice(0, 80),
      must_change_password: true,
      mt_travel_account: true,
    }

    if (account) {
      const updated = await admin.auth.admin.updateUserById(account.id, {
        password: nextPassword,
        email_confirm: true,
        user_metadata: metadata,
      })
      if (updated.error) throw updated.error
      account = updated.data.user
    } else {
      const created = await admin.auth.admin.createUser({
        email,
        password: nextPassword,
        email_confirm: true,
        user_metadata: metadata,
      })
      if (created.error) throw created.error
      account = created.data.user
      createdAccount = true
    }

    if (!account) throw new Error('The guest account could not be prepared.')

    const memberValues = {
      trip_id: tripId,
      user_id: account.id,
      invited_email: email,
      display_name: displayName || membership?.display_name || null,
      role: 'editor',
      invited_by: caller.id,
      accepted_at: new Date().toISOString(),
    }
    const memberResult = membership
      ? await admin.schema('travel_planner').from('trip_members').update(memberValues).eq('id', membership.id)
      : await admin.schema('travel_planner').from('trip_members').insert(memberValues)

    if (memberResult.error) {
      if (createdAccount) await admin.auth.admin.deleteUser(account.id)
      throw memberResult.error
    }

    return json(request, 200, {
      email,
      displayName: memberValues.display_name,
      temporaryPassword: nextPassword,
      accountCreated: createdAccount,
    })
  } catch (error) {
    console.error('Trip access failed', error instanceof Error ? error.message : 'unknown')
    return json(request, 500, { error: 'MT Travel could not prepare that login. Please try again.' })
  }
})
