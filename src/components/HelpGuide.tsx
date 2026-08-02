import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CalendarCheck2,
  CalendarDays,
  CircleHelp,
  Home,
  MapPinned,
  UserPlus,
  X,
} from 'lucide-react'
import { useCollaboration } from '../context/collaboration'
import { AppLink } from './AppLink'

const GUIDE_SEEN_KEY = 'banff-2026:trip-help-seen-v1'

interface GuideStep {
  title: string
  body: string
  action?: { label: string; href: string }
  icon: ComponentType<{ size?: number; strokeWidth?: number }>
}

const steps: GuideStep[] = [
  {
    title: 'Start with the big picture',
    body: 'Tap Trip Overview when you feel lost. It shows the main plan, the next jobs, and the trip basics.',
    action: { label: 'Open Trip Overview', href: '/' },
    icon: Home,
  },
  {
    title: 'See or change a day',
    body: 'Tap Itinerary to see each day. Type what you want to change. Miller Time makes a draft. Look at the old plan and new plan. Tap Apply only if you like it.',
    action: { label: 'Open Itinerary', href: '/itinerary' },
    icon: CalendarDays,
  },
  {
    title: 'Know what to book',
    body: 'Tap Book & Reserve. Start with anything marked Book now. Use the real booking link. Tap the check when the job is done.',
    action: { label: 'Open Book & Reserve', href: '/book' },
    icon: CalendarCheck2,
  },
  {
    title: 'Find places and directions',
    body: 'Tap a map on any trip day to see its stops. Tap Open in Google Maps when you want directions on your phone.',
    action: { label: 'Open the trip map', href: '/map' },
    icon: MapPinned,
  },
  {
    title: 'Ask Miller Time',
    body: 'Tap Miller Time AI in the corner. Ask a simple question, or say exactly what you want changed. She will not change the trip until you review it and tap Apply.',
    icon: Bot,
  },
  {
    title: 'Plan with the group',
    body: 'You can look around without an account. Tap Invite when you want everyone to save and share changes together. You can open this Help guide again anytime.',
    icon: UserPlus,
  },
]

export function HelpGuide() {
  const { openModal: openCollaboration } = useCollaboration()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const current = steps[step]
  const Icon = current.icon
  const finalStep = step === steps.length - 1
  const rememberSeen = useCallback(() => {
    try { window.localStorage.setItem(GUIDE_SEEN_KEY, 'yes') } catch { /* no-op */ }
  }, [])
  const closeGuide = useCallback(() => {
    rememberSeen()
    setOpen(false)
    window.setTimeout(() => previousFocusRef.current?.focus(), 0)
  }, [rememberSeen])

  useEffect(() => {
    try {
      if (window.localStorage.getItem(GUIDE_SEEN_KEY) !== 'yes') setOpen(true)
    } catch {
      // The Help button still works when browser storage is unavailable.
    }
  }, [])

  useEffect(() => {
    if (!open) return
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    const appRoot = document.getElementById('root')
    const rootWasInert = appRoot?.inert ?? false
    const previousAriaHidden = appRoot?.getAttribute('aria-hidden')
    document.body.style.overflow = 'hidden'
    if (appRoot) {
      appRoot.inert = true
      appRoot.setAttribute('aria-hidden', 'true')
    }
    window.setTimeout(() => closeButtonRef.current?.focus(), 0)

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeGuide()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')]
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
      if (appRoot) {
        appRoot.inert = rootWasInert
        if (previousAriaHidden == null) appRoot.removeAttribute('aria-hidden')
        else appRoot.setAttribute('aria-hidden', previousAriaHidden)
      }
    }
  }, [closeGuide, open])

  const openGuide = () => {
    setStep(0)
    setOpen(true)
  }

  const openInvite = () => {
    closeGuide()
    window.setTimeout(openCollaboration, 0)
  }

  return (
    <>
      <button className="help-guide-button" type="button" onClick={openGuide} aria-label="Open Help guide" aria-haspopup="dialog" aria-controls="help-guide-dialog">
        <CircleHelp size={16} />
        <span>Help</span>
      </button>
      {open && typeof document !== 'undefined' ? createPortal(
        <div className="help-guide-layer">
          <button className="help-guide-scrim" type="button" onClick={closeGuide} aria-label="Close Help guide" tabIndex={-1} />
          <section ref={dialogRef} id="help-guide-dialog" className="help-guide-dialog" role="dialog" aria-modal="true" aria-labelledby="help-guide-title" aria-describedby="help-guide-copy">
            <header>
              <div className="help-guide-brand">
                <img src="/brand/mt-travel-logo-320.jpg" alt="" />
                <div><strong>How to use this trip</strong><span>Short and easy help</span></div>
              </div>
              <button ref={closeButtonRef} className="help-guide-close" type="button" onClick={closeGuide} aria-label="Close Help guide"><X size={19} /></button>
            </header>

            <div className="help-guide-progress" aria-label={`Step ${step + 1} of ${steps.length}`}>
              {steps.map((item, index) => (
                <button
                  key={item.title}
                  type="button"
                  className={index === step ? 'active' : index < step ? 'done' : ''}
                  onClick={() => setStep(index)}
                  aria-label={`Go to step ${index + 1}: ${item.title}`}
                  aria-current={index === step ? 'step' : undefined}
                >
                  <span>{index + 1}</span>
                </button>
              ))}
            </div>

            <div className="help-guide-content">
              <div className="help-guide-icon"><Icon size={30} strokeWidth={1.8} /></div>
              <div aria-live="polite">
                <span className="help-guide-step">Step {step + 1} of {steps.length}</span>
                <h2 id="help-guide-title">{current.title}</h2>
                <p id="help-guide-copy">{current.body}</p>
              </div>
            </div>

            <div className="help-guide-page-action">
              {current.action ? <AppLink className="button secondary" href={current.action.href} onClick={closeGuide}>{current.action.label}</AppLink> : null}
              {finalStep ? <button className="button secondary" type="button" onClick={openInvite}><UserPlus size={15} />Open Invite</button> : null}
            </div>

            <footer>
              <button className="button ghost" type="button" onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={step === 0}><ArrowLeft size={16} />Back</button>
              {finalStep
                ? <button className="button primary" type="button" onClick={closeGuide}>Done</button>
                : <button className="button primary" type="button" onClick={() => setStep((value) => Math.min(steps.length - 1, value + 1))}>Next<ArrowRight size={16} /></button>}
            </footer>
          </section>
        </div>,
        document.body,
      ) : null}
    </>
  )
}
