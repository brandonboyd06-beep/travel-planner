import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { ArrowUp, Cloud, HardDrive, RotateCcw, Sparkles, X } from 'lucide-react'
import { navigate, usePathname } from './AppLink'
import { readLocalPreferences } from '../lib/localPreferences'
import { getSupabaseClient } from '../lib/supabase'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useCollaboration } from '../context/collaboration'
import { useItinerary } from '../context/itinerary'
import { compactItinerary } from '../lib/itineraryPlan'
import { parseItineraryProposal, parseProposalSources, proposalRevision, type ProposalSourceLink } from '../lib/itineraryProposal'
import type { ItineraryPlan, ItineraryProposal } from '../types'
import { ItineraryComparisonModal } from './ItineraryComparisonModal'
import { MillerProposalCard, type MillerProposalState } from './MillerProposalCard'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: ProposalSourceLink[]
  proposal?: ItineraryProposal
  proposalState?: MillerProposalState
  proposalError?: string
}

const welcome: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: 'Hey! I’m Miller Time AI—your Banff trip sidekick, itinerary fixer, and enthusiastic brewery scout. I know the trip, and I can search the web for current menus, hours, and the IPA worth ordering. What are we plotting?',
}

const suggestions = [
  'Add the Plain of Six Glaciers Tea House where it makes the most sense.',
  'Which brewery fits our itinerary best, and what IPA should I order?',
  'Which lodging scenario should we choose?',
  'What should we do if Tuesday has bad weather?',
]

const MAX_LOCAL_MESSAGES = 30

function capChatMessages(messages: ChatMessage[]) {
  const conversation = messages.filter((message) => message.id !== 'welcome').slice(-(MAX_LOCAL_MESSAGES - 1))
  return [welcome, ...conversation]
}

function parseStoredChatMessages(value: unknown) {
  if (!Array.isArray(value)) return [welcome]
  const parsed = value.flatMap((item): ChatMessage[] => {
    if (!item || typeof item !== 'object') return []
    const record = item as Record<string, unknown>
    if ((record.role !== 'user' && record.role !== 'assistant') || typeof record.content !== 'string') return []
    const sources = parseProposalSources(record.sources)
    const revision = proposalRevision(record.proposal) ?? -1
    const proposal = parseItineraryProposal(record.proposal, revision, sources)
    return [{
      id: typeof record.id === 'string' ? record.id : newId(),
      role: record.role,
      content: record.content.slice(0, 4_000),
      sources,
      proposal: proposal ?? undefined,
      proposalState: proposal ? restoredProposalState(record.proposalState) : undefined,
      proposalError: typeof record.proposalError === 'string' ? record.proposalError.slice(0, 500) : undefined,
    }]
  })
  return capChatMessages(parsed.some((message) => message.id === 'welcome') ? parsed : [welcome, ...parsed])
}

const pageNames: Record<string, string> = {
  '/': 'Trip Overview',
  '/itinerary': 'Itinerary',
  '/book': 'Book & Reserve',
  '/lodging': 'Lodging',
  '/transportation': 'Transportation & Shuttles',
  '/dining': 'Dining & Drinks',
  '/activities': 'Things To Do',
  '/map': 'Map',
  '/budget': 'Budget & Expenses',
  '/notes': 'Notes & Lists',
}

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function restoredProposalState(value: unknown): MillerProposalState {
  return value === 'applied' || value === 'dismissed' || value === 'stale' ? value : 'pending'
}

export function MillerTimeAI() {
  const pathname = usePathname()
  const { user, trip, openModal } = useCollaboration()
  const { plan, canEdit, applyAiProposal } = useItinerary()
  const [open, setOpen] = useState(false)
  const [storedLocalMessages, setStoredLocalMessages] = useLocalStorage<unknown>('miller-time-ai-chat', [welcome])
  const localMessages = useMemo(() => parseStoredChatMessages(storedLocalMessages), [storedLocalMessages])
  const [cloudMessages, setCloudMessages] = useState<ChatMessage[]>([welcome])
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState(false)
  const [memoryLoading, setMemoryLoading] = useState(false)
  const [error, setError] = useState('')
  const [retryQuestion, setRetryQuestion] = useState('')
  const [reviewMessageId, setReviewMessageId] = useState<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const pendingRef = useRef(false)
  const requestGenerationRef = useRef(0)
  const comparisonBasesRef = useRef(new Map<string, ItineraryPlan>())
  const cloudMemory = Boolean(user && trip)
  const messages = cloudMemory ? cloudMessages : localMessages
  const reviewMessage = reviewMessageId ? messages.find((message) => message.id === reviewMessageId) : undefined
  const setLocalMessages = useCallback((update: ChatMessage[] | ((current: ChatMessage[]) => ChatMessage[])) => {
    setStoredLocalMessages((current: unknown) => {
      const safeCurrent = parseStoredChatMessages(current)
      return capChatMessages(typeof update === 'function' ? update(safeCurrent) : update)
    })
  }, [setStoredLocalMessages])
  const updateMessages = (update: ChatMessage[] | ((current: ChatMessage[]) => ChatMessage[])) => {
    if (cloudMemory) setCloudMessages(update)
    else setLocalMessages((current) => capChatMessages(typeof update === 'function' ? update(current) : update))
  }

  useEffect(() => {
    setLocalMessages((current) => capChatMessages(current.map((message) => message.id === 'welcome' ? welcome : message)))
  }, [setLocalMessages])

  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<{ draft?: unknown }>).detail
      if (typeof detail?.draft === 'string') setDraft(detail.draft.slice(0, 1600))
      setOpen(true)
    }
    window.addEventListener('miller-time:open', onOpen)
    return () => window.removeEventListener('miller-time:open', onOpen)
  }, [])

  useEffect(() => {
    if (!user || !trip) {
      setCloudMessages([welcome])
      setMemoryLoading(false)
      return
    }
    if (!open || pendingRef.current) {
      setMemoryLoading(false)
      return
    }

    let active = true
    const generation = requestGenerationRef.current
    setMemoryLoading(true)
    setError('')
    void getSupabaseClient().then(async (client) => {
      if (!client) throw new Error('Cloud memory is not configured on this deployment.')
      const { data, error: functionError } = await client.functions.invoke('miller-time-ai', {
        body: { action: 'load', tripId: trip.id },
      })
      if (functionError) throw functionError
      if (!active || generation !== requestGenerationRef.current) return

      const storedMessages: unknown[] = Array.isArray(data?.messages) ? data.messages : []
      const restored: ChatMessage[] = storedMessages
        .filter((message): message is Record<string, unknown> => Boolean(
          message && typeof message === 'object'
          && 'role' in message && (message.role === 'user' || message.role === 'assistant')
          && 'content' in message && typeof message.content === 'string',
        )).map((message) => {
          const sources = parseProposalSources(message.sources)
          const metadata = message.metadata && typeof message.metadata === 'object'
            ? message.metadata as Record<string, unknown>
            : {}
          const rawProposal = metadata.proposal
          const revision = proposalRevision(rawProposal) ?? -1
          const proposal = parseItineraryProposal(rawProposal, revision, sources)
          return {
            id: String(message.id ?? newId()),
            role: message.role as ChatMessage['role'],
            content: message.content as string,
            sources,
            proposal: proposal ?? undefined,
            proposalState: proposal ? restoredProposalState(metadata.proposalState) : undefined,
          }
        })
      setCloudMessages([welcome, ...restored.slice(-30)])
    }).catch((caught) => {
      if (active && generation === requestGenerationRef.current) {
        setRetryQuestion('')
        setError(caught instanceof Error ? caught.message : 'Miller Time could not restore your saved chat.')
      }
    }).finally(() => {
      if (active && generation === requestGenerationRef.current) setMemoryLoading(false)
    })

    return () => { active = false }
  }, [open, pending, trip, user])

  useEffect(() => {
    if (!open) return
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    inputRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !reviewMessageId && !event.defaultPrevented) {
        event.preventDefault()
        setOpen(false)
        return
      }
      if (event.key !== 'Tab' || reviewMessageId || !panelRef.current) return
      const focusable = [...panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )].filter((element) => element.getAttribute('aria-hidden') !== 'true')
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      window.setTimeout(() => previousFocus?.focus(), 0)
    }
  }, [open, reviewMessageId])

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [messages, open, pending])

  const ask = async (question: string) => {
    const content = question.trim()
    if (!content || pendingRef.current || memoryLoading) return

    pendingRef.current = true
    const requestGeneration = requestGenerationRef.current
    const requestedRevision = plan.revision
    const requestedItinerary = compactItinerary(plan)
    const userMessage: ChatMessage = { id: newId(), role: 'user', content }
    const nextMessages = [...messages, userMessage]
    updateMessages(nextMessages)
    setDraft('')
    setPending(true)
    setError('')
    setRetryQuestion('')

    try {
      const client = await getSupabaseClient()
      if (!client) throw new Error('Miller Time AI’s secure connection is not configured on this deployment yet.')
      const allPreferences = readLocalPreferences()
      const preferences = Object.fromEntries([
        'preferred-lodging',
        'lodging-selections-v1',
        'lodging-scenario',
        'budget-estimates',
        'booking-progress',
      ].flatMap((key) => Object.hasOwn(allPreferences, key) ? [[key, allPreferences[key]]] : []))

      const { data, error: functionError } = await client.functions.invoke('miller-time-ai', {
        body: {
          messages: nextMessages.filter((message) => message.id !== 'welcome').slice(-12).map(({ role, content: messageContent }) => ({ role, content: messageContent })),
          tripId: cloudMemory ? trip?.id : undefined,
          baseRevision: requestedRevision,
          itinerary: requestedItinerary,
          pageContext: { page: pageNames[pathname] ?? pathname, preferences },
        },
      })

      if (requestGeneration !== requestGenerationRef.current) return
      if (functionError) {
        const context = (functionError as { context?: Response }).context
        const result = context ? await context.clone().json().catch(() => ({})) as { error?: string } : {}
        throw new Error(result.error || functionError.message || 'Miller Time AI could not answer just now.')
      }
      if (!data || typeof data.answer !== 'string') throw new Error('Miller Time AI returned an empty answer. Please try again.')
      const sources = parseProposalSources(data.sources)
      const proposal = parseItineraryProposal(data.proposal, requestedRevision, sources)
      if (data.resolution === 'proposal' && !proposal) throw new Error('Miller Time returned a plan I could not safely validate. Ask her to try that change again.')
      const storedMessageId = Number(data.messageId)
      const assistantMessageId = cloudMemory && Number.isSafeInteger(storedMessageId) && storedMessageId > 0
        ? String(storedMessageId)
        : newId()
      updateMessages((current) => [...current, {
        id: assistantMessageId,
        role: 'assistant',
        content: `${data.answer}${typeof data.memoryWarning === 'string' ? `\n\nNote: ${data.memoryWarning}` : ''}`,
        sources,
        proposal: proposal ?? undefined,
        proposalState: proposal ? 'pending' : undefined,
      }])
    } catch (caught) {
      if (requestGeneration === requestGenerationRef.current) {
        setRetryQuestion(content)
        setError(caught instanceof Error ? caught.message : 'Miller Time AI could not answer just now.')
      }
    } finally {
      if (requestGeneration === requestGenerationRef.current) {
        pendingRef.current = false
        setPending(false)
      }
    }
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    void ask(draft)
  }

  const updateProposalMessage = (messageId: string, patch: Pick<ChatMessage, 'proposalState' | 'proposalError'>) => {
    updateMessages((current) => current.map((message) => message.id === messageId ? { ...message, ...patch } : message))
  }

  const persistProposalState = (messageId: string, proposalState: 'applied' | 'dismissed') => {
    if (!cloudMemory || !trip) return
    const numericMessageId = Number(messageId)
    if (!Number.isSafeInteger(numericMessageId) || numericMessageId <= 0) return

    void getSupabaseClient().then(async (client) => {
      if (!client) throw new Error('Cloud memory is not configured on this deployment.')
      const { error: functionError } = await client.functions.invoke('miller-time-ai', {
        body: {
          action: 'update_proposal_state',
          tripId: trip.id,
          messageId: numericMessageId,
          proposalState,
        },
      })
      if (functionError) throw functionError
    }).catch(() => {
      setRetryQuestion('')
      setError('That review status is updated here, but Miller Time could not sync it across devices.')
    })
  }

  const displayProposalState = (message: ChatMessage): MillerProposalState => {
    if (!message.proposal) return 'dismissed'
    if (plan.appliedProposalIds.includes(message.proposal.id)) return 'applied'
    if (message.proposalState === 'dismissed') return 'dismissed'
    if (message.proposalState === 'stale' || message.proposal.baseRevision !== plan.revision) return 'stale'
    return 'pending'
  }

  const applyChatProposal = (message: ChatMessage) => {
    if (!message.proposal || !canEdit) return false
    try {
      comparisonBasesRef.current.set(message.id, plan)
      applyAiProposal(message.proposal)
      updateProposalMessage(message.id, { proposalState: 'applied', proposalError: undefined })
      persistProposalState(message.id, 'applied')
      setError('')
      return true
    } catch (caught) {
      const messageText = caught instanceof Error ? caught.message : 'That suggestion could not be applied.'
      const stale = /changed|no longer|before it could/i.test(messageText)
      updateProposalMessage(message.id, { proposalState: stale ? 'stale' : 'pending', proposalError: messageText })
      return false
    }
  }

  const adjustChatProposal = (message: ChatMessage) => {
    if (!message.proposal) return
    const stale = displayProposalState(message) === 'stale'
    setDraft(`${stale ? 'Refresh' : 'Tweak'} this itinerary suggestion: ${message.proposal.summary}. `)
    updateProposalMessage(message.id, { proposalState: message.proposalState ?? 'pending', proposalError: undefined })
    window.setTimeout(() => inputRef.current?.focus(), 0)
  }

  const dismissChatProposal = (message: ChatMessage) => {
    updateProposalMessage(message.id, { proposalState: 'dismissed', proposalError: undefined })
    persistProposalState(message.id, 'dismissed')
  }

  const resetChat = () => {
    if (pending || memoryLoading) return
    if (messages.length > 1 && !window.confirm(cloudMemory
      ? 'Start a fresh chat? This permanently clears Miller Time’s saved conversation for your account.'
      : 'Start a fresh chat? This clears Miller Time’s conversation from this device.')) return
    requestGenerationRef.current += 1
    pendingRef.current = false
    setPending(false)
    setError('')
    setRetryQuestion('')
    setReviewMessageId(null)
    comparisonBasesRef.current.clear()
    if (!cloudMemory || !trip) {
      setLocalMessages([welcome])
      return
    }

    setCloudMessages([welcome])
    void getSupabaseClient().then(async (client) => {
      if (!client) throw new Error('Cloud memory is not configured on this deployment.')
      const { error: functionError } = await client.functions.invoke('miller-time-ai', {
        body: { action: 'reset', tripId: trip.id },
      })
      if (functionError) throw functionError
    }).catch((caught) => {
      setRetryQuestion('')
      setError(caught instanceof Error ? caught.message : 'Miller Time could not clear your saved chat.')
    })
  }

  return (
    <>
      <button className={`miller-launcher ${open ? 'active' : ''}`} type="button" onClick={() => setOpen((value) => !value)} aria-label="Open Miller Time AI virtual travel agent" aria-expanded={open} aria-controls="miller-time-panel">
        <span className="miller-launcher-icon"><img src="/brand/mt-travel-logo-320.jpg" alt="" /></span>
        <span><strong>Miller Time AI</strong><small>Your virtual travel agent</small></span>
      </button>
      {open ? <button className="miller-scrim" type="button" aria-hidden="true" tabIndex={-1} onClick={() => setOpen(false)} /> : null}
      <aside ref={panelRef} id="miller-time-panel" className={`miller-panel ${open ? 'open' : ''}`} role="dialog" aria-modal={open || undefined} aria-hidden={!open} aria-label="Miller Time AI virtual travel agent">
        <header className="miller-header">
          <div className="miller-avatar"><img src="/brand/mt-travel-logo-320.jpg" alt="" /></div>
          <div><span><i />Ready to plan</span><strong>Miller Time AI</strong><small>Brewery scout · trip expert · live web search</small></div>
          <button type="button" onClick={resetChat} disabled={pending || memoryLoading} aria-label="Start a fresh chat"><RotateCcw /></button>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close Miller Time AI"><X /></button>
        </header>
        <div className="miller-context">
          <Sparkles />
          <span>
            You’re viewing <strong>{pageNames[pathname] ?? 'the trip planner'}</strong>.
            {cloudMemory
              ? <small><Cloud /> Private cloud memory is on</small>
              : <small><HardDrive /> Saved on this device only · <button type="button" onClick={() => { setOpen(false); openModal() }}>Sign in to remember across devices</button></small>}
            <button className="miller-change-link" type="button" onClick={() => {
              if (draft.trim()) window.sessionStorage.setItem('banff-2026:itinerary-idea', draft.trim())
              window.sessionStorage.setItem('banff-2026:focus-itinerary-change', 'true')
              setOpen(false)
              navigate('/itinerary')
              let attempts = 0
              const focusChangeInput = () => {
                const input = document.getElementById('itinerary-change-input')
                if (input instanceof HTMLInputElement) {
                  window.sessionStorage.removeItem('banff-2026:focus-itinerary-change')
                  input.focus()
                  input.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  return
                }
                attempts += 1
                if (attempts < 20) window.setTimeout(focusChangeInput, 50)
              }
              window.setTimeout(focusChangeInput, 50)
            }}><Sparkles />Plan an itinerary change</button>
          </span>
        </div>
        <div className="miller-messages" aria-live="polite">
          {messages.map((message) => {
            const proposalState = displayProposalState(message)
            const hasProposal = Boolean(message.proposal && proposalState !== 'dismissed')
            const canReviewComparison = proposalState !== 'applied' || comparisonBasesRef.current.has(message.id)
            return (
              <div className={`miller-message ${message.role}${hasProposal ? ' with-proposal' : ''}`} key={message.id}>
                <span>{message.role === 'assistant' ? 'Miller Time AI' : 'You'}</span>
                <p>{message.content}</p>
                {message.sources?.length ? <div className="miller-sources"><span>Live sources</span>{message.sources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.url}>{source.title}</a>)}</div> : null}
                {message.proposal ? <MillerProposalCard
                  proposal={message.proposal}
                  state={proposalState}
                  compact
                  canApply={canEdit}
                  showSources={false}
                  error={message.proposalError}
                  onReview={canReviewComparison ? () => setReviewMessageId(message.id) : undefined}
                  onAdjust={() => adjustChatProposal(message)}
                  onDismiss={() => dismissChatProposal(message)}
                  onViewItinerary={() => { setOpen(false); navigate('/itinerary') }}
                /> : null}
              </div>
            )
          })}
          {messages.length === 1 && !memoryLoading ? <div className="miller-suggestions">{suggestions.map((suggestion) => <button type="button" key={suggestion} onClick={() => void ask(suggestion)}>{suggestion}</button>)}</div> : null}
          {memoryLoading ? <div className="miller-thinking"><i /><i /><i /><span>Restoring your conversation…</span></div> : null}
          {pending ? <div className="miller-thinking"><i /><i /><i /><span>Miller Time is researching…</span></div> : null}
          {error ? <div className="miller-error"><p>{error}{retryQuestion ? ' Large itinerary rebuilds can take a little over a minute.' : ''}</p><div>{retryQuestion ? <button type="button" onClick={() => { setError(''); void ask(retryQuestion) }}>Try again</button> : null}<button type="button" onClick={() => { setError(''); setRetryQuestion('') }}>Dismiss</button></div></div> : null}
          <div ref={endRef} />
        </div>
        <form className="miller-compose" onSubmit={submit}>
          <textarea ref={inputRef} value={draft} maxLength={1600} rows={2} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              if (draft.trim()) void ask(draft)
            }
          }} placeholder="Ask about the trip, a brewery, or an easy change…" aria-label="Message Miller Time AI" />
          <button type="submit" disabled={!draft.trim() || pending || memoryLoading} aria-label="Send message"><ArrowUp /></button>
          <small>Questions and trip context are sent securely to OpenAI. Personal notes and packing lists are never included. Always verify bookings, conditions, and who’s driving.</small>
        </form>
      </aside>
      {reviewMessage?.proposal ? <ItineraryComparisonModal
        proposal={reviewMessage.proposal}
        currentPlan={comparisonBasesRef.current.get(reviewMessage.id) ?? plan}
        canApply={canEdit}
        applied={displayProposalState(reviewMessage) === 'applied'}
        onApply={() => { if (applyChatProposal(reviewMessage)) setReviewMessageId(null) }}
        onClose={() => setReviewMessageId(null)}
      /> : null}
    </>
  )
}
