import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowLeft, Check, Cloud, Copy, Eye, EyeOff, HardDrive, KeyRound, LoaderCircle, LogIn, Mail, ShieldCheck, UserPlus, Users, X } from 'lucide-react'
import { useCollaboration } from '../context/collaboration'
import type { AuthMode } from '../context/collaboration'
import { getSupabaseClient } from '../lib/supabase'
import { Button } from './ui'

type AuthStep = 'credentials' | 'forgot-password' | 'update-password'

const MT_TRAVEL_URL = 'https://millertimetravel.xyz/'

function getAuthReturnUrl() {
  const isLocal = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost'
  return isLocal ? `${window.location.origin}/` : MT_TRAVEL_URL
}

function friendlyAuthError(caught: unknown, action: 'signin' | 'signup' | 'reset' | 'update') {
  const rawMessage = caught instanceof Error ? caught.message : ''
  const normalized = rawMessage.toLowerCase()

  if (normalized.includes('invalid login credentials')) return 'That email and password do not match. Try again, or tap “Set or reset password.”'
  if (normalized.includes('email not confirmed')) return 'Please confirm your email once, then come back and sign in with your password.'
  if (normalized.includes('user already registered')) return 'That email already has an account. Choose Sign in, or set a new password.'
  if (normalized.includes('password') && normalized.includes('weak')) return 'Choose a stronger password with at least 8 characters.'
  if (normalized.includes('rate limit') || normalized.includes('too many requests')) return 'Too many email requests were made. Wait a few minutes, then try again.'

  if (action === 'signin') return 'We could not sign you in. Check the email and password, then try again.'
  if (action === 'signup') return 'We could not create that account. Check the details, then try again.'
  if (action === 'reset') return 'We could not send the password email. Check the address, then try again.'
  return 'We could not save that password. Try again.'
}

function CollaborationBrand({ shared = false }: { shared?: boolean }) {
  return (
    <div className={`collaboration-brand ${shared ? 'shared' : ''}`}>
      <img src="/brand/mt-travel-logo-320.jpg" alt="" />
      <div><strong>MT Travel</strong><span>{shared ? 'Shared trip workspace' : 'Private group planning'}</span></div>
    </div>
  )
}

export function CollaborationStatusButton() {
  const { openModal, status, trip, user } = useCollaboration()
  const cloudActive = Boolean(user && trip)
  const label = status === 'connecting'
    ? 'Signing in…'
    : status === 'syncing'
      ? cloudActive ? 'Saving…' : 'Connecting…'
    : status === 'error' ? 'Needs attention' : cloudActive ? 'Shared trip' : 'Sign in'

  return (
    <button
      aria-label={status === 'error' ? 'Open MT Travel sync error' : cloudActive ? 'Manage shared trip' : 'Sign in to MT Travel'}
      aria-controls="collaboration-dialog"
      className={`collaboration-status ${cloudActive ? 'cloud' : 'signin'}`}
      onClick={openModal}
      type="button"
    >
      {status === 'connecting' || status === 'syncing'
        ? <LoaderCircle className="spin" size={15} />
        : cloudActive ? <Cloud size={15} /> : <LogIn size={15} />}
      <span>{label}</span>
    </button>
  )
}

export function InviteTripButton() {
  const { configured, openModal, trip, user } = useCollaboration()
  const canInvite = !user || !trip || trip.role === 'owner'

  if (!configured || !canInvite) return null

  const openInvite = () => {
    openModal()
    window.setTimeout(() => {
      const targetId = user && trip ? 'trip-invite-email' : 'collaboration-email'
      document.getElementById(targetId)?.focus()
    }, 0)
  }

  return (
    <button className="invite-trip-button" type="button" onClick={openInvite} aria-label="Invite trip members" aria-controls="collaboration-dialog">
      <UserPlus size={16} />
      <span>Invite</span>
    </button>
  )
}

export function CollaborationModal() {
  const {
    authenticateWithPassword,
    closeModal,
    configured,
    dismissNotice,
    error,
    inviteMember,
    members,
    modalOpen,
    noticeVisible,
    openModal,
    retrySync,
    signOut,
    status,
    trip,
    updatePassword,
    user,
  } = useCollaboration()
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [authMode, setAuthMode] = useState<AuthMode>('signin')
  const [authStep, setAuthStep] = useState<AuthStep>('credentials')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [authSubmitting, setAuthSubmitting] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [message, setMessage] = useState('')
  const [formError, setFormError] = useState('')
  const [readyInvite, setReadyInvite] = useState<{ email: string; name: string } | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)
  const dialogRef = useRef<HTMLElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    let active = true
    let unsubscribe: (() => void) | undefined

    void getSupabaseClient().then((client) => {
      if (!active || !client) return
      const { data } = client.auth.onAuthStateChange((event) => {
        if (event !== 'PASSWORD_RECOVERY') return
        setAuthMode('signin')
        setAuthStep('update-password')
        setPassword('')
        setFormError('')
        setMessage('Your email is confirmed. Choose your new MT Travel password.')
        openModal()
      })
      unsubscribe = () => data.subscription.unsubscribe()
    })

    return () => {
      active = false
      unsubscribe?.()
    }
  }, [openModal])

  useEffect(() => {
    if (!modalOpen) return
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.setTimeout(() => closeButtonRef.current?.focus(), 0)

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeModal()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )]
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
  }, [closeModal, modalOpen])

  const submitAuth = async (event: FormEvent) => {
    event.preventDefault()
    setFormError('')
    setMessage('')

    if (authMode === 'signup' && password.length < 8) {
      setFormError('Use at least 8 characters for your password.')
      return
    }

    setAuthSubmitting(true)
    try {
      const result = await authenticateWithPassword(email, password, displayName, authMode)
      setPassword('')
      setMessage(result === 'signed-in'
        ? authMode === 'signin' ? 'Signed in. Opening your shared trip…' : 'Your account is ready. Opening the shared trip…'
        : 'Almost done! Check your email once to confirm this new account. If no email arrives, choose Sign in or set/reset the password—this email may already have an account.')
    } catch (caught) {
      setFormError(friendlyAuthError(caught, authMode))
    } finally {
      setAuthSubmitting(false)
    }
  }

  const submitPasswordReset = async (event: FormEvent) => {
    event.preventDefault()
    setFormError('')
    setMessage('')
    setAuthSubmitting(true)
    try {
      const client = await getSupabaseClient()
      if (!client) throw new Error('Cloud collaboration is not configured on this deployment.')
      const { error: authError } = await client.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: getAuthReturnUrl(),
      })
      if (authError) throw authError
      setMessage('Password email sent. Open it, choose a new password here, then future sign-ins are instant.')
    } catch (caught) {
      setFormError(friendlyAuthError(caught, 'reset'))
    } finally {
      setAuthSubmitting(false)
    }
  }

  const submitNewPassword = async (event: FormEvent) => {
    event.preventDefault()
    setFormError('')
    setMessage('')
    if (password.length < 8) {
      setFormError('Use at least 8 characters for your password.')
      return
    }

    setAuthSubmitting(true)
    try {
      await updatePassword(password)
      setPassword('')
      setAuthStep('credentials')
      setMessage('Password saved. You are signed in and ready to plan.')
    } catch (caught) {
      setFormError(friendlyAuthError(caught, 'update'))
    } finally {
      setAuthSubmitting(false)
    }
  }

  const changeAuthMode = (mode: AuthMode) => {
    setAuthMode(mode)
    setAuthStep('credentials')
    setPassword('')
    setShowPassword(false)
    setFormError('')
    setMessage('')
  }

  const submitInvite = async (event: FormEvent) => {
    event.preventDefault()
    setFormError('')
    setMessage('')
    setReadyInvite(null)
    setLinkCopied(false)
    const normalizedEmail = inviteEmail.trim().toLowerCase()
    const normalizedName = inviteName.trim()
    try {
      await inviteMember(normalizedEmail, normalizedName)
      setInviteEmail('')
      setInviteName('')
      setReadyInvite({ email: normalizedEmail, name: normalizedName })
      setMessage('Guest added. Send the invite below. First visit: Create account and choose a password. Returning members: Sign in.')
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'Unable to add this collaborator.')
    }
  }

  const inviteLink = typeof window === 'undefined' ? '' : `${window.location.origin}/`
  const inviteEmailHref = readyInvite ? `mailto:${encodeURIComponent(readyInvite.email)}?${new URLSearchParams({
    subject: 'Join our Banff trip on MT Travel',
    body: `Hi${readyInvite.name ? ` ${readyInvite.name}` : ''},\n\nYou’re invited to help plan our Banff trip in MT Travel.\n\nOpen ${inviteLink} and use ${readyInvite.email}. First visit: choose Create account and make a password. Returning visit: choose Sign in and use that password.\n\nSee you in the Rockies!`,
  }).toString()}` : ''

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setLinkCopied(true)
      setFormError('')
    } catch {
      setFormError('Copy did not work in this browser. Use the email invite button or copy the link from the address bar.')
    }
  }

  return (
    <>
      {noticeVisible ? (
        <aside className="local-save-notice" aria-live="polite">
          <div className="local-save-icon"><HardDrive size={18} /></div>
          <div><strong>Saved on this device</strong><span>No account needed. Want the group to edit together?</span></div>
          <button type="button" onClick={openModal}>Invite the crew</button>
          <button className="notice-close" type="button" onClick={dismissNotice} aria-label="Dismiss local save message"><X size={15} /></button>
        </aside>
      ) : null}

      {modalOpen ? (
        <div id="collaboration-dialog" className="collaboration-layer" role="dialog" aria-modal="true" aria-labelledby="collaboration-title">
          <button className="collaboration-scrim" type="button" onClick={closeModal} aria-hidden="true" tabIndex={-1} />
          <section ref={dialogRef} className="collaboration-modal">
            <button ref={closeButtonRef} className="modal-close" type="button" onClick={closeModal} aria-label="Close collaboration dialog"><X size={18} /></button>

            {authStep === 'update-password' ? (
              <>
                <CollaborationBrand shared />
                <span className="modal-eyebrow">MT Travel · Password setup</span>
                <h2 id="collaboration-title">Choose your new password</h2>
                <p className="modal-intro">Make it at least 8 characters. You’ll use this with your email from now on—no sign-in link needed.</p>
                <form className="collaboration-form single-column" onSubmit={submitNewPassword}>
                  <div className="password-field full-field">
                    <label htmlFor="collaboration-new-password"><span>New password</span></label>
                    <div>
                      <input
                        id="collaboration-new-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="8 or more characters"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        minLength={8}
                        required
                      />
                      <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <Button className="primary" disabled={authSubmitting} type="submit">
                    {authSubmitting ? <LoaderCircle className="spin" size={16} /> : <KeyRound size={16} />}
                    Save password
                  </Button>
                  <button className="auth-back-button" type="button" onClick={() => { setAuthStep('credentials'); setPassword(''); setMessage(''); setFormError('') }}><ArrowLeft size={14} />Back</button>
                </form>
              </>
            ) : user && !trip ? (
              <>
                <CollaborationBrand shared />
                <span className="modal-eyebrow">MT Travel · Connecting</span>
                <h2 id="collaboration-title">Opening your shared trip…</h2>
                <p className="modal-intro">We found your account. MT Travel is loading the group’s newest itinerary and saved choices.</p>
                <div className="collaboration-unavailable"><LoaderCircle className="spin" /><div><strong>{status === 'error' ? 'Could not connect' : 'Just a moment'}</strong><span>{status === 'error' ? error : 'Your local choices stay on this device while we connect.'}</span></div></div>
                {status === 'error' ? <Button className="primary" type="button" onClick={() => void retrySync()}><Cloud size={15} />Try again</Button> : null}
              </>
            ) : !user || !trip ? authStep === 'forgot-password' ? (
              <>
                <CollaborationBrand />
                <span className="modal-eyebrow">MT Travel · Password help</span>
                <h2 id="collaboration-title">Set or reset your password</h2>
                <p className="modal-intro">Enter your account email. We’ll send one secure setup link, then you can sign in with your password every time.</p>
                {configured ? (
                  <form className="collaboration-form single-column" onSubmit={submitPasswordReset}>
                    <label htmlFor="collaboration-reset-email"><span>Email</span><input id="collaboration-reset-email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" type="email" autoComplete="email" required /></label>
                    <Button className="primary" disabled={authSubmitting} type="submit">
                      {authSubmitting ? <LoaderCircle className="spin" size={16} /> : <Mail size={16} />}
                      Send password setup email
                    </Button>
                    <button className="auth-back-button" type="button" onClick={() => { setAuthStep('credentials'); setMessage(''); setFormError('') }}><ArrowLeft size={14} />Back to sign in</button>
                    <small><ShieldCheck size={13} />This is only for password setup. Normal sign-in does not use an email link.</small>
                  </form>
                ) : (
                  <div className="collaboration-unavailable"><HardDrive /><div><strong>Guest mode is active</strong><span>Password setup is not available in this preview.</span></div></div>
                )}
              </>
            ) : (
              <>
                <CollaborationBrand />
                <span className="modal-eyebrow">MT Travel group planning</span>
                <h2 id="collaboration-title">{authMode === 'signin' ? 'Sign in to MT Travel' : 'Create your MT Travel account'}</h2>
                <p className="modal-intro">{authMode === 'signin'
                  ? 'Enter your email and password. You’ll go straight to the shared trip—no email link.'
                  : 'Make an account with the email that received your invite. If you used that email here before, choose Sign in instead.'}</p>
                <div className="storage-choice-grid">
                  <article><HardDrive /><div><strong>Guest mode is ready</strong><span>Private to this device. No account and no shared writes.</span></div><Check /></article>
                  <article><Users /><div><strong>Invite when ready</strong><span>Share notes, lists, lodging, itinerary choices, and budget estimates.</span></div></article>
                </div>

                {configured ? (
                  <form className={`collaboration-form ${authMode}`} onSubmit={submitAuth}>
                    <div className="auth-mode-switch" role="group" aria-label="Choose sign in or create account">
                      <button type="button" aria-pressed={authMode === 'signin'} className={authMode === 'signin' ? 'active' : ''} onClick={() => changeAuthMode('signin')}><LogIn size={15} />Sign in</button>
                      <button type="button" aria-pressed={authMode === 'signup'} className={authMode === 'signup' ? 'active' : ''} onClick={() => changeAuthMode('signup')}><UserPlus size={15} />Create account</button>
                    </div>
                    <div className="collaboration-form-heading"><strong>{authMode === 'signin' ? 'Welcome back' : 'Make your account'}</strong><span>{authMode === 'signin' ? 'Use the same email you used before.' : 'Use the email that received the trip invitation.'}</span></div>
                    {authMode === 'signup' ? <label htmlFor="collaboration-name"><span>Your name</span><input id="collaboration-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Alex" autoComplete="name" maxLength={80} /></label> : null}
                    <label htmlFor="collaboration-email"><span>Email</span><input id="collaboration-email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" type="email" autoComplete={authMode === 'signin' ? 'username' : 'email'} required /></label>
                    <div className="password-field full-field">
                      <label htmlFor="collaboration-password"><span>Password</span></label>
                      <div>
                        <input
                          id="collaboration-password"
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          placeholder={authMode === 'signin' ? 'Your password' : '8 or more characters'}
                          type={showPassword ? 'text' : 'password'}
                          autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'}
                          minLength={authMode === 'signup' ? 8 : undefined}
                          required
                        />
                        <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <Button className="primary" disabled={authSubmitting} type="submit">
                      {authSubmitting ? <LoaderCircle className="spin" size={16} /> : authMode === 'signin' ? <LogIn size={16} /> : <UserPlus size={16} />}
                      {authMode === 'signin' ? 'Sign in' : 'Create account with password'}
                    </Button>
                    {authMode === 'signin' ? <button className="auth-help-button" type="button" onClick={() => { setAuthStep('forgot-password'); setPassword(''); setMessage(''); setFormError('') }}>New here or forgot your password?</button> : null}
                    <small><ShieldCheck size={13} />Your password is securely handled by Supabase and is never stored in this app.</small>
                  </form>
                ) : (
                  <div className="collaboration-unavailable"><HardDrive /><div><strong>Guest mode is active</strong><span>Group planning is not available in this preview, but your trip still saves on this device.</span></div></div>
                )}
              </>
            ) : (
              <>
                <CollaborationBrand shared />
                <span className="modal-eyebrow">MT Travel · Shared trip</span>
                <h2 id="collaboration-title">{trip.name}</h2>
                <p className="modal-intro">Signed in as {user.email}. The newest saved choices stay on this device and sync to this shared trip.</p>
                <div className={`sync-summary ${status}`} aria-live="polite"><span>{status === 'syncing' ? <LoaderCircle className="spin" /> : status === 'error' ? <X /> : <Check />}{status === 'syncing' ? 'Saving…' : status === 'error' ? 'Not saved to the group' : 'Synced'}</span><span>{trip.role}</span></div>
                {status === 'error' ? <div className="form-message error"><span>{error || 'The last change is still on this device but did not reach the group.'}</span><button type="button" onClick={() => void retrySync()}>Try again</button></div> : null}
                <div className="member-list">
                  <div className="member-list-heading"><strong>Trip members</strong><span>{members.length}</span></div>
                  {members.map((member) => (
                    <div className="member-row" key={member.id}>
                      <span className="member-avatar">{(member.display_name || member.invited_email).slice(0, 1).toUpperCase()}</span>
                      <div><strong>{member.display_name || member.invited_email}</strong><span>{member.accepted_at ? member.invited_email : 'Invitation pending'}</span></div>
                      <small>{member.role}</small>
                    </div>
                  ))}
                </div>

                {trip.role === 'owner' ? (
                  <>
                    <form className="invite-form" onSubmit={submitInvite}>
                      <div><UserPlus size={17} /><div><strong>Invite a trip member</strong><span>Add their email, then share this MT Travel link. They’ll join after secure sign-in.</span></div></div>
                      <div className="invite-fields">
                        <input value={inviteName} onChange={(event) => setInviteName(event.target.value)} placeholder="Name" aria-label="Collaborator name" autoComplete="name" maxLength={80} />
                        <input id="trip-invite-email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="Email address" aria-label="Collaborator email" type="email" autoComplete="email" required />
                        <Button className="primary" type="submit"><UserPlus size={15} />Add to guest list</Button>
                      </div>
                    </form>
                    {readyInvite ? (
                      <section className="invite-share-card" aria-label={`Share invite with ${readyInvite.name || readyInvite.email}`}>
                        <div><Check /><span><strong>{readyInvite.name || readyInvite.email} is on the guest list</strong><small>Send the link. First visit: Create account and choose a password. Returning visit: Sign in with {readyInvite.email}.</small></span></div>
                        <div className="invite-share-actions">
                          <Button className="secondary" type="button" onClick={() => void copyInviteLink()}><Copy size={14} />{linkCopied ? 'Link copied' : 'Copy trip link'}</Button>
                          <a className="button primary" href={inviteEmailHref}><Mail size={14} />Email invite</a>
                        </div>
                        <code>{inviteLink}</code>
                      </section>
                    ) : null}
                  </>
                ) : null}

                <Button className="ghost modal-signout" type="button" onClick={() => void signOut()}>Sign out · keep local copy</Button>
              </>
            )}

            {message ? <p className="form-message success" role="status">{message}</p> : null}
            {formError ? <p className="form-message error" role="alert">{formError}</p> : null}
            {!formError && error && !user ? <p className="form-message error">{error}</p> : null}
          </section>
        </div>
      ) : null}
    </>
  )
}
