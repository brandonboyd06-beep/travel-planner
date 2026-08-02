import { useState, type FormEvent } from 'react'
import { Check, Cloud, Copy, HardDrive, LoaderCircle, LogIn, Mail, ShieldCheck, UserPlus, Users, X } from 'lucide-react'
import { useCollaboration } from '../context/collaboration'
import type { AuthMode } from '../context/collaboration'
import { Button } from './ui'

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

  return (
    <button
      aria-label={cloudActive ? 'Manage shared trip' : 'Sign in to MT Travel'}
      aria-controls="collaboration-dialog"
      className={`collaboration-status ${cloudActive ? 'cloud' : 'signin'}`}
      onClick={openModal}
      type="button"
    >
      {status === 'connecting' || status === 'syncing'
        ? <LoaderCircle className="spin" size={15} />
        : cloudActive ? <Cloud size={15} /> : <LogIn size={15} />}
      <span>{cloudActive ? 'Shared trip' : 'Sign in'}</span>
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
    closeModal,
    configured,
    dismissNotice,
    error,
    inviteMember,
    members,
    modalOpen,
    noticeVisible,
    openModal,
    sendMagicLink,
    signOut,
    status,
    trip,
    user,
  } = useCollaboration()
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [authMode, setAuthMode] = useState<AuthMode>('signin')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [message, setMessage] = useState('')
  const [formError, setFormError] = useState('')
  const [readyInvite, setReadyInvite] = useState<{ email: string; name: string } | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)

  const submitAuth = async (event: FormEvent) => {
    event.preventDefault()
    setFormError('')
    setMessage('')
    try {
      await sendMagicLink(email, displayName, authMode)
      setMessage(authMode === 'signin'
        ? 'Your MT Travel sign-in link is on its way. Open it on this device to connect your local trip choices.'
        : 'Your account link is on its way. Open it on this device to finish creating your MT Travel account.')
    } catch (caught) {
      const fallback = authMode === 'signin'
        ? 'We could not send a sign-in link. Check the email, or choose Create account if this is your first visit.'
        : 'We could not create that account just now. Please try again.'
      setFormError(authMode === 'signin' ? fallback : caught instanceof Error && caught.message ? caught.message : fallback)
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
    try {
      await inviteMember(normalizedEmail, normalizedName)
      setInviteEmail('')
      setInviteName('')
      setReadyInvite({ email: normalizedEmail, name: normalizedName })
      setMessage('Invite ready. Share this MT Travel site link with them; they can join with that email.')
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'Unable to add this collaborator.')
    }
  }

  const inviteLink = typeof window === 'undefined' ? '' : `${window.location.origin}/`
  const inviteEmailHref = readyInvite ? `mailto:${encodeURIComponent(readyInvite.email)}?${new URLSearchParams({
    subject: 'Join our Banff trip on MT Travel',
    body: `Hi${readyInvite.name ? ` ${readyInvite.name}` : ''},\n\nYou’re invited to help plan our Banff trip in MT Travel.\n\nOpen ${inviteLink} and sign in with ${readyInvite.email} so the shared trip appears automatically.\n\nSee you in the Rockies!`,
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
          <button className="collaboration-scrim" type="button" onClick={closeModal} aria-label="Close collaboration dialog" />
          <section className="collaboration-modal">
            <button className="modal-close" type="button" onClick={closeModal} aria-label="Close collaboration dialog"><X size={18} /></button>

            {!user || !trip ? (
              <>
                <CollaborationBrand />
                <span className="modal-eyebrow">MT Travel group planning</span>
                <h2 id="collaboration-title">{authMode === 'signin' ? 'Sign in to MT Travel' : 'Create your MT Travel account'}</h2>
                <p className="modal-intro">{authMode === 'signin'
                  ? 'Already have an account? Enter your email and we’ll send a one-time sign-in link. No password needed.'
                  : 'New to MT Travel? Create an account so the group can share edits. You can still look around without one.'}</p>
                <div className="storage-choice-grid">
                  <article><HardDrive /><div><strong>Guest mode is ready</strong><span>Private to this device. No account and no shared writes.</span></div><Check /></article>
                  <article><Users /><div><strong>Invite when ready</strong><span>Share notes, lists, lodging, itinerary choices, and budget estimates.</span></div></article>
                </div>

                {configured ? (
                  <form className={`collaboration-form ${authMode}`} onSubmit={submitAuth}>
                    <div className="auth-mode-switch" role="group" aria-label="Choose sign in or create account">
                      <button type="button" aria-pressed={authMode === 'signin'} className={authMode === 'signin' ? 'active' : ''} onClick={() => { setAuthMode('signin'); setFormError(''); setMessage('') }}><LogIn size={15} />Sign in</button>
                      <button type="button" aria-pressed={authMode === 'signup'} className={authMode === 'signup' ? 'active' : ''} onClick={() => { setAuthMode('signup'); setFormError(''); setMessage('') }}><UserPlus size={15} />Create account</button>
                    </div>
                    <div className="collaboration-form-heading"><strong>{authMode === 'signin' ? 'Welcome back' : 'Make your account'}</strong><span>{authMode === 'signin' ? 'Use the same email you used before.' : 'Use the email that received the trip invitation.'}</span></div>
                    {authMode === 'signup' ? <label htmlFor="collaboration-name"><span>Your name</span><input id="collaboration-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Alex" autoComplete="name" /></label> : null}
                    <label htmlFor="collaboration-email"><span>Email</span><input id="collaboration-email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" type="email" autoComplete="email" required /></label>
                    <Button className="primary" disabled={status === 'connecting'} type="submit">
                      {status === 'connecting' ? <LoaderCircle className="spin" size={16} /> : authMode === 'signin' ? <LogIn size={16} /> : <Mail size={16} />}
                      {authMode === 'signin' ? 'Email me a sign-in link' : 'Create my account'}
                    </Button>
                    <small><ShieldCheck size={13} />Secure, password-free email link. Your private trip stays yours.</small>
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
                <p className="modal-intro">Signed in as {user.email}. Changes are kept locally and synced to this shared trip.</p>
                <div className="sync-summary"><span><Check />Synced</span><span>{trip.role}</span></div>
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
                        <input value={inviteName} onChange={(event) => setInviteName(event.target.value)} placeholder="Name" aria-label="Collaborator name" autoComplete="name" />
                        <input id="trip-invite-email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="Email address" aria-label="Collaborator email" type="email" autoComplete="email" required />
                        <Button className="primary" type="submit"><UserPlus size={15} />Invite member</Button>
                      </div>
                    </form>
                    {readyInvite ? (
                      <section className="invite-share-card" aria-label={`Share invite with ${readyInvite.name || readyInvite.email}`}>
                        <div><Check /><span><strong>{readyInvite.name || readyInvite.email} is on the guest list</strong><small>Send the MT Travel link and remind them to sign in with {readyInvite.email}.</small></span></div>
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

            {message ? <p className="form-message success">{message}</p> : null}
            {formError || error ? <p className="form-message error">{formError || error}</p> : null}
          </section>
        </div>
      ) : null}
    </>
  )
}
