import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Check, Cloud, Copy, Eye, EyeOff, HardDrive, KeyRound, LoaderCircle, LogIn, Mail, ShieldCheck, UserPlus, X } from 'lucide-react'
import { useCollaboration } from '../context/collaboration'
import type { PreparedTripAccess, TripMember } from '../context/collaboration'
import { Button } from './ui'

type AuthStep = 'credentials' | 'update-password'

function friendlyAuthError(caught: unknown, action: 'signin' | 'update') {
  const rawMessage = caught instanceof Error ? caught.message : ''
  const normalized = rawMessage.toLowerCase()

  if (normalized.includes('invalid login credentials')) return 'That email and password do not match. Try again, or ask Brandon for a new temporary password.'
  if (normalized.includes('email not confirmed')) return 'Ask Brandon to make you a fresh temporary password, then try again.'
  if (normalized.includes('password') && normalized.includes('weak')) return 'Choose a stronger password with at least 8 characters.'
  if (normalized.includes('rate limit') || normalized.includes('too many requests')) return 'Too many sign-in attempts were made. Wait a few minutes, then try again.'

  if (action === 'signin') return 'We could not sign you in. Check the email and password, then try again.'
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
  const canInvite = Boolean(user && trip?.role === 'owner')

  if (!configured || !canInvite) return null

  const openInvite = () => {
    openModal()
    window.setTimeout(() => {
      document.getElementById('trip-invite-email')?.focus()
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
    resetMemberPassword,
    signOut,
    status,
    trip,
    updatePassword,
    user,
  } = useCollaboration()
  const [email, setEmail] = useState('')
  const [authStep, setAuthStep] = useState<AuthStep>('credentials')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [authSubmitting, setAuthSubmitting] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [message, setMessage] = useState('')
  const [formError, setFormError] = useState('')
  const [readyInvite, setReadyInvite] = useState<PreparedTripAccess | null>(null)
  const [inviteSubmitting, setInviteSubmitting] = useState(false)
  const [resettingMemberId, setResettingMemberId] = useState<string | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)
  const dialogRef = useRef<HTMLElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  const mustChangePassword = user?.user_metadata?.must_change_password === true

  const closeCollaboration = () => {
    if (mustChangePassword) return
    setAuthStep('credentials')
    setPassword('')
    setFormError('')
    setMessage('')
    closeModal()
  }

  const openPasswordChange = () => {
    setAuthStep('update-password')
    setPassword('')
    setFormError('')
    setMessage('Choose a new password below. Your email stays the same.')
  }

  useEffect(() => {
    if (!mustChangePassword) return
    setAuthStep('update-password')
    setPassword('')
    setFormError('')
    setMessage('One quick step: choose your own password before planning with the group.')
    openModal()
  }, [mustChangePassword, openModal])

  useEffect(() => {
    if (!modalOpen) return
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.setTimeout(() => {
      if (mustChangePassword) document.getElementById('collaboration-new-password')?.focus()
      else closeButtonRef.current?.focus()
    }, 0)

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !mustChangePassword) {
        event.preventDefault()
        setAuthStep('credentials')
        setPassword('')
        setFormError('')
        setMessage('')
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
  }, [closeModal, modalOpen, mustChangePassword])

  const submitAuth = async (event: FormEvent) => {
    event.preventDefault()
    setFormError('')
    setMessage('')

    setAuthSubmitting(true)
    try {
      await authenticateWithPassword(email, password)
      setPassword('')
      setMessage('Signed in. Opening your shared trip…')
    } catch (caught) {
      setFormError(friendlyAuthError(caught, 'signin'))
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
      setMessage('Your password is saved. You are signed in and ready to plan.')
    } catch (caught) {
      setFormError(friendlyAuthError(caught, 'update'))
    } finally {
      setAuthSubmitting(false)
    }
  }

  const submitInvite = async (event: FormEvent) => {
    event.preventDefault()
    setFormError('')
    setMessage('')
    setReadyInvite(null)
    setLinkCopied(false)
    const normalizedEmail = inviteEmail.trim().toLowerCase()
    const normalizedName = inviteName.trim()
    setInviteSubmitting(true)
    try {
      const prepared = await inviteMember(normalizedEmail, normalizedName)
      setInviteEmail('')
      setInviteName('')
      setReadyInvite(prepared)
      setMessage('Login ready. Send the details below—no signup email or magic link is needed.')
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'Unable to add this collaborator.')
    } finally {
      setInviteSubmitting(false)
    }
  }

  const inviteLink = typeof window === 'undefined' ? '' : `${window.location.origin}/`
  const inviteEmailHref = readyInvite ? `mailto:${encodeURIComponent(readyInvite.email)}?${new URLSearchParams({
    subject: 'Join our Banff trip on MT Travel',
    body: `Hi${readyInvite.displayName ? ` ${readyInvite.displayName}` : ''},\n\nYou’re invited to help plan our Banff trip in MT Travel.\n\nOpen: ${inviteLink}\nEmail: ${readyInvite.email}\nTemporary password: ${readyInvite.temporaryPassword}\n\nTap Sign in. MT Travel will immediately ask you to replace the temporary password with your own.\n\nSee you in the Rockies!`,
  }).toString()}` : ''

  const copyInviteDetails = async () => {
    if (!readyInvite) return
    try {
      await navigator.clipboard.writeText(`MT Travel Banff trip\n${inviteLink}\nEmail: ${readyInvite.email}\nTemporary password: ${readyInvite.temporaryPassword}\n\nTap Sign in, then choose your own password.`)
      setLinkCopied(true)
      setFormError('')
    } catch {
      setFormError('Copy did not work in this browser. Use the email invite button instead.')
    }
  }

  const resetAccess = async (member: TripMember) => {
    setFormError('')
    setMessage('')
    setReadyInvite(null)
    setLinkCopied(false)
    setResettingMemberId(member.id)
    try {
      const prepared = await resetMemberPassword(member)
      setReadyInvite(prepared)
      setMessage(`Invite ready for ${member.display_name || member.invited_email}. Tap Email invite or Copy invite below before leaving this page.`)
      window.setTimeout(() => document.getElementById('ready-invite-card')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 0)
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'Unable to reset that login.')
    } finally {
      setResettingMemberId(null)
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
          <button className="collaboration-scrim" type="button" onClick={mustChangePassword ? undefined : closeCollaboration} aria-hidden="true" tabIndex={-1} />
          <section ref={dialogRef} className="collaboration-modal">
            {!mustChangePassword ? <button ref={closeButtonRef} className="modal-close" type="button" onClick={closeCollaboration} aria-label="Close collaboration dialog"><X size={18} /></button> : null}

            {authStep === 'update-password' ? (
              <>
                <CollaborationBrand shared />
                <span className="modal-eyebrow">MT Travel · Password setup</span>
                <h2 id="collaboration-title">Choose your own password</h2>
                <p className="modal-intro">Make it at least 8 characters. Your email is your username, and this will be the password you use from now on.</p>
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
                  <small><ShieldCheck size={13} />{mustChangePassword ? 'This replaces your one-time temporary password.' : 'This replaces your current password.'}</small>
                  {!mustChangePassword ? <Button className="ghost" type="button" onClick={() => { setAuthStep('credentials'); setPassword(''); setFormError(''); setMessage('') }}>Back to trip</Button> : null}
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
            ) : !user || !trip ? (
              <>
                <CollaborationBrand />
                <span className="modal-eyebrow">MT Travel group planning</span>
                <h2 id="collaboration-title">Sign in with email + password</h2>
                <p className="modal-intro"><strong>Your email is your username.</strong> On your first visit, use the temporary password you were given. MT Travel will then ask you to choose your own.</p>
                <div className="signin-steps" aria-label="How to sign in">
                  <article><span>1</span><div><strong>Enter your email</strong><small>This is your username.</small></div></article>
                  <article><span>2</span><div><strong>Enter your password</strong><small>First visit? Use the temporary one.</small></div></article>
                  <article><span>3</span><div><strong>Choose your own</strong><small>You only do this the first time.</small></div></article>
                </div>

                {configured ? (
                  <form className="collaboration-form signin" onSubmit={submitAuth}>
                    <div className="collaboration-form-heading"><strong>Your private trip login</strong><span>Only people on the trip’s guest list can sign in.</span></div>
                    <label htmlFor="collaboration-email"><span>Email (this is your username)</span><input id="collaboration-email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" type="email" autoComplete="username" required /></label>
                    <div className="password-field full-field">
                      <label htmlFor="collaboration-password"><span>Password</span></label>
                      <div>
                        <input
                          id="collaboration-password"
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          placeholder="Your password"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="current-password"
                          required
                        />
                        <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <Button className="primary" disabled={authSubmitting} type="submit">
                      {authSubmitting ? <LoaderCircle className="spin" size={16} /> : <LogIn size={16} />}
                      Sign in
                    </Button>
                    <p className="auth-manual-help"><KeyRound size={13} /><span><strong>Need a password?</strong> Ask the trip owner to tap “Reset password” beside your name and send you the new temporary one.</span></p>
                    <small><ShieldCheck size={13} />Passwords are securely handled by Supabase and never stored in this app.</small>
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
                  <div className="member-list-heading"><strong>People on this trip</strong><span>{members.length}</span></div>
                  {members.map((member) => {
                    const hasJoined = Boolean(member.accepted_at)
                    const memberStatus = member.role === 'owner' ? 'Trip owner' : hasJoined ? 'Joined the trip' : 'Has not signed in yet'
                    return (
                      <div className="member-row" key={member.id}>
                        <span className="member-avatar">{(member.display_name || member.invited_email).slice(0, 1).toUpperCase()}</span>
                        <div><strong>{member.display_name || member.invited_email}</strong><span>{member.invited_email}</span><small className={`member-status ${hasJoined ? 'joined' : 'waiting'}`}>{memberStatus}</small></div>
                        <div className="member-actions">
                          {trip.role === 'owner' && member.role !== 'owner' ? (
                            <button type="button" disabled={resettingMemberId === member.id} onClick={() => void resetAccess(member)}>
                              {resettingMemberId === member.id ? 'Making invite…' : hasJoined ? 'Make new login' : 'Send invite'}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {trip.role === 'owner' ? (
                  <>
                    {readyInvite ? (
                      <section id="ready-invite-card" className="invite-share-card" aria-label={`Share login with ${readyInvite.displayName || readyInvite.email}`}>
                        <div><Mail /><span><strong>Step 2 · Send this invite now</strong><small>This temporary password only appears here. If it gets lost, tap Send invite beside their name to make a new one.</small></span></div>
                        <dl className="invite-credentials"><div><dt>Email</dt><dd>{readyInvite.email}</dd></div><div><dt>Temporary password</dt><dd>{readyInvite.temporaryPassword}</dd></div></dl>
                        <div className="invite-share-actions">
                          <a className="button primary" href={inviteEmailHref}><Mail size={14} />Email invite</a>
                          <Button className="secondary" type="button" onClick={() => void copyInviteDetails()}><Copy size={14} />{linkCopied ? 'Invite copied' : 'Copy invite'}</Button>
                        </div>
                      </section>
                    ) : null}
                    <section className="invite-howto" aria-label="How to invite someone">
                      <strong>Adding somebody new?</strong>
                      <ol><li>Type their name and email below.</li><li>Tap <b>Create invite.</b></li><li>Use the big <b>Email invite</b> or <b>Copy invite</b> button that appears.</li></ol>
                    </section>
                    <form className="invite-form" onSubmit={submitInvite}>
                      <div><UserPlus size={17} /><div><strong>Step 1 · Who are you inviting?</strong><span>MT Travel will make their one-time password.</span></div></div>
                      <div className="invite-fields">
                        <input value={inviteName} onChange={(event) => setInviteName(event.target.value)} placeholder="Name" aria-label="Collaborator name" autoComplete="name" maxLength={80} />
                        <input id="trip-invite-email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="Email address" aria-label="Collaborator email" type="email" autoComplete="email" required />
                        <Button className="primary" disabled={inviteSubmitting} type="submit">{inviteSubmitting ? <LoaderCircle className="spin" size={15} /> : <UserPlus size={15} />}{inviteSubmitting ? 'Creating…' : 'Create invite'}</Button>
                      </div>
                    </form>
                  </>
                ) : null}

                <div className="account-actions">
                  <Button className="secondary" type="button" onClick={openPasswordChange}><KeyRound size={14} />Change my password</Button>
                  <Button className="ghost modal-signout" type="button" onClick={() => void signOut()}>Sign out · keep local copy</Button>
                </div>
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
