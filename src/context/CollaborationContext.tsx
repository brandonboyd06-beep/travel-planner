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
  LOCAL_STORAGE_ERROR_EVENT,
  applyCloudPreferenceForTrip,
  associateLocalPreferenceWithTrip,
  cloudPreferenceKeys,
  isCloudPreferenceKey,
  isLocalPreferenceDirty,
  isValidCloudPreference,
  markLocalPreferenceSyncedToTrip,
  readLocalPreferences,
  readLocalPreferenceSyncedTrip,
  readLocalPreferenceUpdatedAt,
  restoreLocalPreferenceForTrip,
  type LocalPreferenceChange,
} from '../lib/localPreferences'
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase'

const MT_TRAVEL_URL = 'https://millertimetravel.xyz/'

function getAuthReturnUrl() {
  const isLocal = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost'
  return isLocal ? `${window.location.origin}/` : MT_TRAVEL_URL
}

function messageFrom(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

interface RemotePreferenceRow {
  preference_key: string
  value: unknown
  updated_at?: string
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
  const initializationGenerationRef = useRef(0)
  const currentUserIdRef = useRef<string | null>(null)
  const deferredRemoteRowsRef = useRef(new Map<string, RemotePreferenceRow>())
  const lastAppliedRemoteAtRef = useRef(new Map<string, string>())

  const queueRemoteRow = useCallback((row: RemotePreferenceRow) => {
    const current = deferredRemoteRowsRef.current.get(row.preference_key)
    if (!current || String(row.updated_at ?? '') >= String(current.updated_at ?? '')) {
      deferredRemoteRowsRef.current.set(row.preference_key, row)
    }
  }, [])

  const initializeCloud = useCallback(async (nextUser: User) => {
    const client = clientRef.current
    if (!client || !nextUser.email) return
    const generation = ++initializationGenerationRef.current
    const stillCurrent = () => initializationGenerationRef.current === generation

    setStatus('syncing')
    setError('')

    try {
      const metadataName = typeof nextUser.user_metadata?.display_name === 'string'
        ? nextUser.user_metadata.display_name.trim().slice(0, 80)
        : ''
      const displayName = metadataName || nextUser.email.split('@')[0].slice(0, 80)

      const profileResult = await client.schema('travel_planner').from('profiles').upsert({
        id: nextUser.id,
        display_name: displayName,
      })
      if (profileResult.error) throw profileResult.error

      const normalizedEmail = nextUser.email.toLowerCase()
      const pendingResult = await client
        .schema('travel_planner')
        .from('trip_members')
        .select('id, trip_id, role, created_at')
        .is('user_id', null)
        .eq('invited_email', normalizedEmail)
        .order('created_at', { ascending: false })

      if (pendingResult.error) throw pendingResult.error
      const pendingIds = (pendingResult.data ?? []).map((member) => member.id as string)
      const acceptedMembership = pendingResult.data?.[0]

      if (pendingIds.length > 0) {
        const acceptedResult = await client
          .schema('travel_planner')
          .from('trip_members')
          .update({ user_id: nextUser.id, accepted_at: new Date().toISOString() })
          .in('id', pendingIds)
        if (acceptedResult.error) throw acceptedResult.error
      }

      let membership = acceptedMembership
        ? { trip_id: acceptedMembership.trip_id, role: acceptedMembership.role }
        : null

      if (!membership) {
        const membershipResult = await client
          .schema('travel_planner')
          .from('trip_members')
          .select('trip_id, role')
          .eq('user_id', nextUser.id)
          .not('accepted_at', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (membershipResult.error) throw membershipResult.error
        membership = membershipResult.data
      }

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
        .select('preference_key, value, updated_at')
        .eq('trip_id', tripId)
      if (stateResult.error) throw stateResult.error
      if (!stillCurrent()) return

      const remotePreferences = new Map(
        (stateResult.data ?? []).flatMap((row) => {
          const key = row.preference_key as string
          if (!isCloudPreferenceKey(key) || !isValidCloudPreference(key, row.value)) return []
          return [[key, { value: row.value, updatedAt: String(row.updated_at ?? '') }] as const]
        }),
      )
      const localPreferences = readLocalPreferences()
      const missingRemoteRows: Array<Record<string, unknown>> = []
      const uploadTimestamps = new Map<string, string>()

      for (const key of cloudPreferenceKeys) {
        const remote = remotePreferences.get(key)
        let hasLocal = Object.hasOwn(localPreferences, key)
        let localValue = localPreferences[key]
        const associatedTrip = readLocalPreferenceSyncedTrip(key)
        const belongsToThisTrip = associatedTrip === tripId
        const localNeedsSync = Boolean(remote && hasLocal && belongsToThisTrip && isLocalPreferenceDirty(key))

        if (remote && !(role !== 'viewer' && localNeedsSync)) {
          applyCloudPreferenceForTrip(key, tripId, remote.value, remote.updatedAt)
        } else {
          if (!hasLocal || (associatedTrip && associatedTrip !== tripId)) {
            localValue = restoreLocalPreferenceForTrip(key, tripId)
            hasLocal = true
          }
          if (!hasLocal || role === 'viewer') continue
          uploadTimestamps.set(key, readLocalPreferenceUpdatedAt(key))
          missingRemoteRows.push({
            trip_id: tripId,
            preference_key: key,
            value: localValue,
            updated_by: nextUser.id,
          })
        }
      }

      if (missingRemoteRows.length > 0 && role !== 'viewer') {
        const uploadResult = await client
          .schema('travel_planner')
          .from('trip_state')
          .upsert(missingRemoteRows, { onConflict: 'trip_id,preference_key' })
          .select('preference_key, value, updated_at')
        if (uploadResult.error) throw uploadResult.error
        ;(uploadResult.data ?? []).forEach((row) => {
          const key = String(row.preference_key)
          if (isCloudPreferenceKey(key) && markLocalPreferenceSyncedToTrip(key, tripId, uploadTimestamps.get(key))) {
            applyCloudPreferenceForTrip(key, tripId, row.value, String(row.updated_at ?? ''))
          }
        })
      }

      const nextTrip = { id: tripResult.data.id as string, name: tripResult.data.name as string, role }
      const nextMembers = await refreshMembers(client, tripId)
      if (!stillCurrent()) return
      setTrip(nextTrip)
      setMembers(nextMembers)
      // The realtime subscription performs one final snapshot before marking
      // this trip synced, closing the initial SELECT/subscription race.
      setStatus('syncing')
    } catch (caught) {
      if (!stillCurrent()) return
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
      currentUserIdRef.current = data.session?.user.id ?? null
      setUser(data.session?.user ?? null)
      setStatus(data.session?.user ? 'syncing' : 'local')

      const subscription = client.auth.onAuthStateChange((_event, session) => {
        const nextUser = session?.user ?? null
        const nextUserId = nextUser?.id ?? null
        if (currentUserIdRef.current !== nextUserId) {
          initializationGenerationRef.current += 1
          currentUserIdRef.current = nextUserId
          setUser(nextUser)
        }
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
    const onStorageError = () => {
      setStatus('error')
      setError('This browser could not save that change on this device. Free a little browser storage or use a normal browsing window, then try again.')
    }
    window.addEventListener(LOCAL_STORAGE_ERROR_EVENT, onStorageError)
    return () => window.removeEventListener(LOCAL_STORAGE_ERROR_EVENT, onStorageError)
  }, [])

  useEffect(() => {
    const client = clientRef.current
    if (!client || !trip) return
    let active = true

    const handleRemoteRow = (candidate: RemotePreferenceRow) => {
      const key = candidate.preference_key
      if (!isCloudPreferenceKey(key) || !isValidCloudPreference(key, candidate.value)) return
      if (isLocalPreferenceDirty(key)) {
        queueRemoteRow(candidate)
        return
      }
      const timestamp = String(candidate.updated_at ?? '')
      const appliedKey = `${trip.id}:${key}`
      if (timestamp && timestamp < (lastAppliedRemoteAtRef.current.get(appliedKey) ?? '')) return
      deferredRemoteRowsRef.current.delete(key)
      lastAppliedRemoteAtRef.current.set(appliedKey, timestamp)
      applyCloudPreferenceForTrip(key, trip.id, candidate.value, timestamp)
    }

    const channel = client
      .channel(`trip-state-${trip.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'travel_planner',
        table: 'trip_state',
        filter: `trip_id=eq.${trip.id}`,
      }, (payload) => {
        const row = payload.new as Partial<RemotePreferenceRow>
        if (typeof row.preference_key === 'string') handleRemoteRow(row as RemotePreferenceRow)
      })
      .subscribe((channelStatus) => {
        if (channelStatus === 'CHANNEL_ERROR' || channelStatus === 'TIMED_OUT') {
          if (!active) return
          setStatus('error')
          setError('Live trip updates disconnected. Check your connection, then try syncing again.')
          return
        }
        if (channelStatus !== 'SUBSCRIBED') return
        void client
          .schema('travel_planner')
          .from('trip_state')
          .select('preference_key, value, updated_at')
          .eq('trip_id', trip.id)
          .then(({ data, error: snapshotError }) => {
            if (!active) return
            if (snapshotError) {
              setStatus('error')
              setError(snapshotError.message)
              return
            }
            ;(data ?? []).forEach((row) => handleRemoteRow(row as RemotePreferenceRow))
            setError('')
            setStatus('synced')
          })
      })

    return () => {
      active = false
      void client.removeChannel(channel)
    }
  }, [queueRemoteRow, trip])

  useEffect(() => {
    const pendingWrites = new Map<string, number>()
    let active = true
    let inFlightWrites = 0
    let writeFailed = false

    const onPreferenceChange = (event: Event) => {
      const detail = (event as CustomEvent<LocalPreferenceChange>).detail
      if (!detail || detail.origin !== 'user') return

      // UI-only state and private helpers (for example the AI chat transcript)
      // remain browser-local even when collaboration is enabled.
      if (!isCloudPreferenceKey(detail.key)) return
      const preferenceKey = detail.key

      if (!user || !trip) {
        if (window.sessionStorage.getItem('banff-2026:local-notice-seen') !== 'true') {
          window.sessionStorage.setItem('banff-2026:local-notice-seen', 'true')
          setNoticeVisible(true)
        }
        return
      }

      if (trip.role === 'viewer') return
      associateLocalPreferenceWithTrip(preferenceKey, trip.id)
      const client = clientRef.current
      if (!client) return

      if (pendingWrites.size === 0 && inFlightWrites === 0) {
        writeFailed = false
        setError('')
      }

      const previous = pendingWrites.get(preferenceKey)
      if (previous) window.clearTimeout(previous)
      const timeout = window.setTimeout(() => {
        pendingWrites.delete(preferenceKey)
        inFlightWrites += 1
        setStatus('syncing')
        void client.schema('travel_planner').from('trip_state').upsert({
          trip_id: trip.id,
          preference_key: preferenceKey,
          value: detail.value,
          updated_by: user.id,
        }, { onConflict: 'trip_id,preference_key' })
          .select('preference_key, value, updated_at')
          .single()
          .then(({ data: savedRow, error: writeError }) => {
            inFlightWrites -= 1
            if (!active) return
            if (writeError) {
              writeFailed = true
              setStatus('error')
              setError(writeError.message)
            } else {
              if (savedRow) queueRemoteRow(savedRow as RemotePreferenceRow)
              const acknowledgedLatestLocalValue = markLocalPreferenceSyncedToTrip(preferenceKey, trip.id, detail.updatedAt)
              if (acknowledgedLatestLocalValue) {
                const newestRemote = deferredRemoteRowsRef.current.get(preferenceKey)
                deferredRemoteRowsRef.current.delete(preferenceKey)
                if (newestRemote && isValidCloudPreference(preferenceKey, newestRemote.value)) {
                  const timestamp = String(newestRemote.updated_at ?? '')
                  lastAppliedRemoteAtRef.current.set(`${trip.id}:${preferenceKey}`, timestamp)
                  applyCloudPreferenceForTrip(preferenceKey, trip.id, newestRemote.value, timestamp)
                }
              }
              if (!writeFailed && inFlightWrites === 0 && pendingWrites.size === 0) {
                setError('')
                setStatus('synced')
              }
            }
          })
      }, 450)
      pendingWrites.set(preferenceKey, timeout)
    }

    window.addEventListener(LOCAL_PREFERENCE_EVENT, onPreferenceChange)
    return () => {
      active = false
      window.removeEventListener(LOCAL_PREFERENCE_EVENT, onPreferenceChange)
      pendingWrites.forEach((timeout) => window.clearTimeout(timeout))
    }
  }, [queueRemoteRow, trip, user])

  const authenticateWithPassword = useCallback(async (email: string, password: string, displayName: string, mode: AuthMode) => {
    const client = await getSupabaseClient()
    if (!client) throw new Error('Cloud collaboration is not configured on this deployment.')

    const normalizedEmail = email.trim().toLowerCase()
    setError('')
    setStatus('connecting')

    const result = mode === 'signin'
      ? await client.auth.signInWithPassword({ email: normalizedEmail, password })
      : await client.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: getAuthReturnUrl(),
          data: { display_name: displayName.trim().slice(0, 80) || normalizedEmail.split('@')[0].slice(0, 80) },
        },
      })

    if (result.error) {
      // Credential errors belong to this form, not the shared-trip sync
      // indicator in the app header.
      setStatus('local')
      setError('')
      throw result.error
    }

    if (!result.data.session) {
      setStatus('local')
      return 'confirmation-required' as const
    }

    setError('')
    setStatus('syncing')
    return 'signed-in' as const
  }, [])

  const updatePassword = useCallback(async (password: string) => {
    const client = await getSupabaseClient()
    if (!client) throw new Error('Cloud collaboration is not configured on this deployment.')
    setError('')
    setStatus('connecting')
    const { error: passwordError } = await client.auth.updateUser({ password })
    if (passwordError) {
      setStatus(trip ? 'synced' : 'syncing')
      setError('')
      throw passwordError
    }
    setError('')
    setStatus(trip ? 'synced' : 'syncing')
  }, [trip])

  const inviteMember = useCallback(async (email: string, displayName: string) => {
    const client = clientRef.current
    if (!client || !trip || !user) throw new Error('Sign in before adding a collaborator.')
    if (trip.role !== 'owner') throw new Error('Only the trip owner can add collaborators.')

    const { error: inviteError } = await client.schema('travel_planner').from('trip_members').insert({
      trip_id: trip.id,
      invited_email: email.trim().toLowerCase(),
      display_name: displayName.trim().slice(0, 80) || null,
      role: 'editor',
      invited_by: user.id,
    })
    if (inviteError) throw inviteError
    setMembers(await refreshMembers(client, trip.id))
  }, [trip, user])

  const signOut = useCallback(async () => {
    initializationGenerationRef.current += 1
    const client = clientRef.current
    if (client) await client.auth.signOut({ scope: 'local' })
    deferredRemoteRowsRef.current.clear()
    lastAppliedRemoteAtRef.current.clear()
    currentUserIdRef.current = null
    setUser(null)
    setTrip(null)
    setMembers([])
    setStatus('local')
    setError('')
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
    retrySync: async () => {
      if (!user) return
      await initializeCloud(user)
    },
    authenticateWithPassword,
    updatePassword,
    inviteMember,
    signOut,
  }), [authenticateWithPassword, error, initializeCloud, inviteMember, members, modalOpen, noticeVisible, signOut, status, trip, updatePassword, user])

  return (
    <CollaborationContext.Provider value={contextValue}>
      {children}
      <CollaborationModal />
    </CollaborationContext.Provider>
  )
}
