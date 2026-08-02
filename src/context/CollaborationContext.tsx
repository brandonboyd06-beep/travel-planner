import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { CollaborationModal } from '../components/CollaborationModal'
import {
  CollaborationContext,
  type AuthMode,
  type CollaborationContextValue,
  type SharedTrip,
  type SyncStatus,
  type TripMember,
} from './collaboration'
import {
  LOCAL_PREFERENCE_EVENT,
  cloudPreferenceKeys,
  isCloudPreferenceKey,
  readLocalPreferences,
  writeLocalPreference,
  type LocalPreferenceChange,
} from '../lib/localPreferences'
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase'

function messageFrom(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

async function refreshMembers(client: SupabaseClient, tripId: string) {
  const { data, error } = await client
    .schema('travel_planner')
    .from('trip_members')
    .select('id, display_name, invited_email, role, accepted_at')
    .eq('trip_id', tripId)
    .order('created_at')

  if (error) throw error
  return (data ?? []) as TripMember[]
}

export function CollaborationProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [trip, setTrip] = useState<SharedTrip | null>(null)
  const [members, setMembers] = useState<TripMember[]>([])
  const [status, setStatus] = useState<SyncStatus>('local')
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [noticeVisible, setNoticeVisible] = useState(false)
  const clientRef = useRef<SupabaseClient | null>(null)

  const initializeCloud = useCallback(async (nextUser: User) => {
    const client = clientRef.current
    if (!client || !nextUser.email) return

    setStatus('syncing')
    setError('')

    try {
      const displayName = typeof nextUser.user_metadata?.display_name === 'string'
        ? nextUser.user_metadata.display_name
        : nextUser.email.split('@')[0]

      const profileResult = await client.schema('travel_planner').from('profiles').upsert({
        id: nextUser.id,
        display_name: displayName,
      })
      if (profileResult.error) throw profileResult.error

      const normalizedEmail = nextUser.email.toLowerCase()
      const pendingResult = await client
        .schema('travel_planner')
        .from('trip_members')
        .select('id')
        .is('user_id', null)
        .eq('invited_email', normalizedEmail)

      if (pendingResult.error) throw pendingResult.error
      const pendingIds = (pendingResult.data ?? []).map((member) => member.id as string)

      if (pendingIds.length > 0) {
        const acceptedResult = await client
          .schema('travel_planner')
          .from('trip_members')
          .update({ user_id: nextUser.id, accepted_at: new Date().toISOString() })
          .in('id', pendingIds)
        if (acceptedResult.error) throw acceptedResult.error
      }

      const membershipResult = await client
        .schema('travel_planner')
        .from('trip_members')
        .select('trip_id, role')
        .eq('user_id', nextUser.id)
        .not('accepted_at', 'is', null)
        .order('created_at')
        .limit(1)
        .maybeSingle()

      if (membershipResult.error) throw membershipResult.error

      let membership = membershipResult.data

      if (!membership) {
        const createdTrip = await client
          .schema('travel_planner')
          .from('trips')
          .insert({ owner_id: nextUser.id })
          .select('id, name')
          .single()
        if (createdTrip.error) throw createdTrip.error

        membership = { trip_id: createdTrip.data.id, role: 'owner' }
      }

      const tripId = membership.trip_id as string
      const role = membership.role as SharedTrip['role']
      const tripResult = await client.schema('travel_planner').from('trips').select('id, name').eq('id', tripId).single()
      if (tripResult.error) throw tripResult.error

      const stateResult = await client
        .schema('travel_planner')
        .from('trip_state')
        .select('preference_key, value')
        .eq('trip_id', tripId)
      if (stateResult.error) throw stateResult.error

      const remotePreferences = new Map(
        (stateResult.data ?? []).map((row) => [row.preference_key as string, row.value]),
      )
      const localPreferences = readLocalPreferences()
      const missingRemoteRows: Array<Record<string, unknown>> = []

      for (const key of cloudPreferenceKeys) {
        if (remotePreferences.has(key)) {
          writeLocalPreference(key, remotePreferences.get(key), 'cloud')
        } else if (Object.hasOwn(localPreferences, key)) {
          missingRemoteRows.push({
            trip_id: tripId,
            preference_key: key,
            value: localPreferences[key],
            updated_by: nextUser.id,
          })
        }
      }

      if (missingRemoteRows.length > 0 && role !== 'viewer') {
        const uploadResult = await client
          .schema('travel_planner')
          .from('trip_state')
          .upsert(missingRemoteRows, { onConflict: 'trip_id,preference_key' })
        if (uploadResult.error) throw uploadResult.error
      }

      const nextTrip = { id: tripResult.data.id as string, name: tripResult.data.name as string, role }
      const nextMembers = await refreshMembers(client, tripId)
      setTrip(nextTrip)
      setMembers(nextMembers)
      setStatus('synced')
    } catch (caught) {
      setStatus('error')
      setError(messageFrom(caught))
    }
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured) return

    let active = true
    let unsubscribe: () => void = () => {}
    setStatus('connecting')

    void getSupabaseClient().then(async (client) => {
      if (!client || !active) return
      clientRef.current = client
      const { data } = await client.auth.getSession()
      if (!active) return
      setUser(data.session?.user ?? null)
      setStatus(data.session?.user ? 'syncing' : 'local')

      const subscription = client.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null)
        if (!session?.user) {
          setTrip(null)
          setMembers([])
          setStatus('local')
        }
      })
      unsubscribe = () => subscription.data.subscription.unsubscribe()
    }).catch((caught) => {
      if (!active) return
      setStatus('error')
      setError(messageFrom(caught))
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (user) void initializeCloud(user)
  }, [initializeCloud, user])

  useEffect(() => {
    const client = clientRef.current
    if (!client || !trip) return

    const channel = client
      .channel(`trip-state-${trip.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'travel_planner',
        table: 'trip_state',
        filter: `trip_id=eq.${trip.id}`,
      }, (payload) => {
        const row = payload.new as { preference_key?: string; value?: unknown }
        if (row.preference_key) writeLocalPreference(row.preference_key, row.value, 'cloud')
      })
      .subscribe()

    return () => {
      void client.removeChannel(channel)
    }
  }, [trip])

  useEffect(() => {
    const pendingWrites = new Map<string, number>()

    const onPreferenceChange = (event: Event) => {
      const detail = (event as CustomEvent<LocalPreferenceChange>).detail
      if (!detail || detail.origin !== 'user') return

      // UI-only state and private helpers (for example the AI chat transcript)
      // remain browser-local even when collaboration is enabled.
      if (!isCloudPreferenceKey(detail.key)) return

      if (!user || !trip) {
        if (window.sessionStorage.getItem('banff-2026:local-notice-seen') !== 'true') {
          window.sessionStorage.setItem('banff-2026:local-notice-seen', 'true')
          setNoticeVisible(true)
        }
        return
      }

      if (trip.role === 'viewer') return
      const client = clientRef.current
      if (!client) return

      const previous = pendingWrites.get(detail.key)
      if (previous) window.clearTimeout(previous)
      const timeout = window.setTimeout(() => {
        pendingWrites.delete(detail.key)
        setStatus('syncing')
        void client.schema('travel_planner').from('trip_state').upsert({
          trip_id: trip.id,
          preference_key: detail.key,
          value: detail.value,
          updated_by: user.id,
        }, { onConflict: 'trip_id,preference_key' }).then(({ error: writeError }) => {
          if (writeError) {
            setStatus('error')
            setError(writeError.message)
          } else {
            setStatus('synced')
          }
        })
      }, 450)
      pendingWrites.set(detail.key, timeout)
    }

    window.addEventListener(LOCAL_PREFERENCE_EVENT, onPreferenceChange)
    return () => {
      window.removeEventListener(LOCAL_PREFERENCE_EVENT, onPreferenceChange)
      pendingWrites.forEach((timeout) => window.clearTimeout(timeout))
    }
  }, [trip, user])

  const sendMagicLink = useCallback(async (email: string, displayName: string, mode: AuthMode) => {
    const client = await getSupabaseClient()
    if (!client) throw new Error('Cloud collaboration is not configured on this deployment.')

    setStatus('connecting')
    const { error: authError } = await client.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: window.location.origin,
        shouldCreateUser: mode === 'signup',
        ...(mode === 'signup' ? { data: { display_name: displayName.trim() || email.split('@')[0] } } : {}),
      },
    })

    if (authError) {
      setStatus('error')
      throw authError
    }
    setStatus('local')
  }, [])

  const inviteMember = useCallback(async (email: string, displayName: string) => {
    const client = clientRef.current
    if (!client || !trip || !user) throw new Error('Sign in before adding a collaborator.')
    if (trip.role !== 'owner') throw new Error('Only the trip owner can add collaborators.')

    const { error: inviteError } = await client.schema('travel_planner').from('trip_members').insert({
      trip_id: trip.id,
      invited_email: email.trim().toLowerCase(),
      display_name: displayName.trim() || null,
      role: 'editor',
      invited_by: user.id,
    })
    if (inviteError) throw inviteError
    setMembers(await refreshMembers(client, trip.id))
  }, [trip, user])

  const signOut = useCallback(async () => {
    const client = clientRef.current
    if (client) await client.auth.signOut()
    setModalOpen(false)
  }, [])

  const contextValue = useMemo<CollaborationContextValue>(() => ({
    configured: isSupabaseConfigured,
    user,
    trip,
    members,
    status,
    error,
    modalOpen,
    noticeVisible,
    openModal: () => {
      setNoticeVisible(false)
      setModalOpen(true)
    },
    closeModal: () => setModalOpen(false),
    dismissNotice: () => setNoticeVisible(false),
    sendMagicLink,
    inviteMember,
    signOut,
  }), [error, inviteMember, members, modalOpen, noticeVisible, sendMagicLink, signOut, status, trip, user])

  return (
    <CollaborationContext.Provider value={contextValue}>
      {children}
      <CollaborationModal />
    </CollaborationContext.Provider>
  )
}
