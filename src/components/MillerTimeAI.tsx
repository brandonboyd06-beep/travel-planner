import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowUp, Cloud, HardDrive, RotateCcw, Sparkles, X } from 'lucide-react'
import { navigate, usePathname } from './AppLink'
import { readLocalPreferences } from '../lib/localPreferences'
import { getSupabaseClient } from '../lib/supabase'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useCollaboration } from '../context/collaboration'
import { useItinerary } from '../context/itinerary'
import { itineraryForChat } from '../lib/itineraryPlan'

interface SourceLink {
  title: string
  url: string
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: SourceLink[]
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

function parseSources(value: unknown): SourceLink[] {
  if (!Array.isArray(value)) return []
  return value.filter((source): source is SourceLink => Boolean(
    source
    && typeof source === 'object'
    && 'url' in source
    && typeof source.url === 'string'
    && 'title' in source
    && typeof source.title === 'string',
  )).filter((source) => {
    try {
      return ['https:', 'http:'].includes(new URL(source.url).protocol)
    } catch {
      return false
    }
  }).slice(0, 6)
}

export function MillerTimeAI() {
  const pathname = usePathname()
  const { user, trip, openModal } = useCollaboration()
  const { plan } = useItinerary()
  const [open, setOpen] = useState(false)
  const [localMessages, setLocalMessages] = useLocalStorage<ChatMessage[]>('miller-time-ai-chat', [welcome])
  const [cloudMessages, setCloudMessages] = useState<ChatMessage[]>([welcome])
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState(false)
  const [memoryLoading, setMemoryLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const cloudMemory = Boolean(user && trip)
  const messages = cloudMemory ? cloudMessages : localMessages

  useEffect(() => {
    setLocalMessages((current) => current.map((message) => message.id === 'welcome' ? welcome : message))
  }, [setLocalMessages])

  useEffect(() => {
    if (!user || !trip) {
      setCloudMessages([welcome])
      setMemoryLoading(false)
      return
    }

    let active = true
    setMemoryLoading(true)
    setError('')
    void getSupabaseClient().then(async (client) => {
      if (!client) throw new Error('Cloud memory is not configured on this deployment.')
      const { data, error: functionError } = await client.functions.invoke('miller-time-ai', {
        body: { action: 'load', tripId: trip.id },
      })
      if (functionError) throw functionError
      if (!active) return

      const storedMessages: unknown[] = Array.isArray(data?.messages) ? data.messages : []
      const restored = storedMessages
        .filter((message): message is Record<string, unknown> => Boolean(
          message && typeof message === 'object'
          && 'role' in message && (message.role === 'user' || message.role === 'assistant')
          && 'content' in message && typeof message.content === 'string',
        )).map((message) => ({
          id: String(message.id ?? newId()),
          role: message.role as ChatMessage['role'],
          content: message.content as string,
          sources: parseSources(message.sources),
        }))
      setCloudMessages([welcome, ...restored])
    }).catch((caught) => {
      if (active) setError(caught instanceof Error ? caught.message : 'Miller Time could not restore your saved chat.')
    }).finally(() => {
      if (active) setMemoryLoading(false)
    })

    return () => { active = false }
  }, [trip, user])

  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [messages, open, pending])

  const ask = async (question: string) => {
    const content = question.trim()
    if (!content || pending || memoryLoading) return

    const updateMessages = cloudMemory ? setCloudMessages : setLocalMessages
    const userMessage: ChatMessage = { id: newId(), role: 'user', content }
    const nextMessages = [...messages, userMessage]
    updateMessages(nextMessages)
    setDraft('')
    setPending(true)
    setError('')

    try {
      const client = await getSupabaseClient()
      if (!client) throw new Error('Miller Time AI’s secure connection is not configured on this deployment yet.')
      const preferences = readLocalPreferences()
      delete preferences['itinerary-plan-v1']

      const { data, error: functionError } = await client.functions.invoke('miller-time-ai', {
        body: {
          messages: nextMessages.filter((message) => message.id !== 'welcome').map(({ role, content: messageContent }) => ({ role, content: messageContent })),
          tripId: cloudMemory ? trip?.id : undefined,
          pageContext: { page: pageNames[pathname] ?? pathname, preferences, currentItinerary: itineraryForChat(plan) },
        },
      })

      if (functionError) {
        const context = (functionError as { context?: Response }).context
        const result = context ? await context.clone().json().catch(() => ({})) as { error?: string } : {}
        throw new Error(result.error || functionError.message || 'Miller Time AI could not answer just now.')
      }
      if (!data || typeof data.answer !== 'string') throw new Error('Miller Time AI returned an empty answer. Please try again.')
      updateMessages((current) => [...current, {
        id: newId(),
        role: 'assistant',
        content: data.answer,
        sources: parseSources(data.sources),
      }])
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Miller Time AI could not answer just now.')
    } finally {
      setPending(false)
    }
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    void ask(draft)
  }

  const resetChat = () => {
    setError('')
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
    }).catch((caught) => setError(caught instanceof Error ? caught.message : 'Miller Time could not clear your saved chat.'))
  }

  return (
    <>
      <button className={`miller-launcher ${open ? 'active' : ''}`} type="button" onClick={() => setOpen((value) => !value)} aria-label="Open Miller Time AI virtual travel agent" aria-expanded={open} aria-controls="miller-time-panel">
        <span className="miller-launcher-icon"><img src="/brand/mt-travel-logo-320.jpg" alt="" /></span>
        <span><strong>Miller Time AI</strong><small>Your virtual travel agent</small></span>
      </button>
      {open ? <button className="miller-scrim" type="button" aria-label="Close Miller Time AI" onClick={() => setOpen(false)} /> : null}
      <aside id="miller-time-panel" className={`miller-panel ${open ? 'open' : ''}`} aria-hidden={!open} aria-label="Miller Time AI virtual travel agent">
        <header className="miller-header">
          <div className="miller-avatar"><img src="/brand/mt-travel-logo-320.jpg" alt="" /></div>
          <div><span><i />Ready to plan</span><strong>Miller Time AI</strong><small>Brewery scout · trip expert · live web search</small></div>
          <button type="button" onClick={resetChat} aria-label="Start a fresh chat"><RotateCcw /></button>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close Miller Time AI"><X /></button>
        </header>
        <div className="miller-context">
          <Sparkles />
          <span>
            You’re viewing <strong>{pageNames[pathname] ?? 'the trip planner'}</strong>.
            {cloudMemory
              ? <small><Cloud /> Private cloud memory is on</small>
              : <small><HardDrive /> Saved on this device only · <button type="button" onClick={openModal}>Sign in to remember across devices</button></small>}
            <button className="miller-change-link" type="button" onClick={() => { if (draft.trim()) window.sessionStorage.setItem('banff-2026:itinerary-idea', draft.trim()); setOpen(false); navigate('/itinerary') }}><Sparkles />Plan an itinerary change</button>
          </span>
        </div>
        <div className="miller-messages" aria-live="polite">
          {messages.map((message) => (
            <div className={`miller-message ${message.role}`} key={message.id}>
              <span>{message.role === 'assistant' ? 'Miller Time AI' : 'You'}</span>
              <p>{message.content}</p>
              {message.sources?.length ? <div className="miller-sources"><span>Live sources</span>{message.sources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.url}>{source.title}</a>)}</div> : null}
            </div>
          ))}
          {messages.length === 1 && !memoryLoading ? <div className="miller-suggestions">{suggestions.map((suggestion) => <button type="button" key={suggestion} onClick={() => void ask(suggestion)}>{suggestion}</button>)}</div> : null}
          {memoryLoading ? <div className="miller-thinking"><i /><i /><i /><span>Restoring your conversation…</span></div> : null}
          {pending ? <div className="miller-thinking"><i /><i /><i /><span>Miller Time is researching…</span></div> : null}
          {error ? <div className="miller-error"><p>{error}</p><button type="button" onClick={() => setError('')}>Dismiss</button></div> : null}
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
          <small>Web results and tap lists can change. Always verify bookings, conditions, and who’s driving.</small>
        </form>
      </aside>
    </>
  )
}
