import { createContext, useContext } from 'react'
import type { User } from '@supabase/supabase-js'

export interface SharedTrip {
  id: string
  name: string
  role: 'owner' | 'editor' | 'viewer'
}

export interface TripMember {
  id: string
  display_name: string | null
  invited_email: string
  role: 'owner' | 'editor' | 'viewer'
  accepted_at: string | null
}

export type SyncStatus = 'local' | 'connecting' | 'syncing' | 'synced' | 'error'
export type AuthMode = 'signin' | 'signup'

export interface CollaborationContextValue {
  configured: boolean
  user: User | null
  trip: SharedTrip | null
  members: TripMember[]
  status: SyncStatus
  error: string
  modalOpen: boolean
  noticeVisible: boolean
  openModal: () => void
  closeModal: () => void
  dismissNotice: () => void
  sendMagicLink: (email: string, displayName: string, mode: AuthMode) => Promise<void>
  inviteMember: (email: string, displayName: string) => Promise<void>
  signOut: () => Promise<void>
}

export const CollaborationContext = createContext<CollaborationContextValue | null>(null)

export function useCollaboration() {
  const context = useContext(CollaborationContext)
  if (!context) throw new Error('useCollaboration must be used within CollaborationProvider.')
  return context
}
