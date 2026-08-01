import { useState, type FormEvent } from 'react'
import { Check, Cloud, HardDrive, LoaderCircle, Mail, ShieldCheck, UserPlus, Users, X } from 'lucide-react'
import { useCollaboration } from '../context/collaboration'
import { Button } from './ui'

export function CollaborationStatusButton() {
  const { openModal, status, trip, user } = useCollaboration()
  const cloudActive = Boolean(user && trip)

  return (
    <button
      aria-label={cloudActive ? 'Manage shared trip' : 'Open collaboration options'}
      className={`collaboration-status ${cloudActive ? 'cloud' : ''}`}
      onClick={openModal}
      type="button"
    >
      {status === 'connecting' || status === 'syncing'
        ? <LoaderCircle className="spin" size={15} />
        : cloudActive ? <Cloud size={15} /> : <HardDrive size={15} />}
      <span>{cloudActive ? 'Shared trip' : 'Local only'}</span>
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
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [message, setMessage] = useState('')
  const [formError, setFormError] = useState('')

  const submitAuth = async (event: FormEvent) => {
    event.preventDefault()
    setFormError('')
    setMessage('')
    try {
      await sendMagicLink(email, displayName)
      setMessage('Magic link sent. Open it on this device to connect your local trip choices.')
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'Unable to send the sign-in link.')
    }
  }

  const submitInvite = async (event: FormEvent) => {
    event.preventDefault()
    setFormError('')
    setMessage('')
    try {
      await inviteMember(inviteEmail, inviteName)
      setInviteEmail('')
      setInviteName('')
      setMessage('Collaborator added. Send them this site link and have them sign in with that email.')
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'Unable to add this collaborator.')
    }
  }

  return (
    <>
      {noticeVisible ? (
        <aside className="local-save-notice" aria-live="polite">
          <div className="local-save-icon"><HardDrive size={18} /></div>
          <div><strong>Saved on this device</strong><span>No account needed. Want the group to edit together?</span></div>
          <button type="button" onClick={openModal}>Collaborate</button>
          <button className="notice-close" type="button" onClick={dismissNotice} aria-label="Dismiss local save message"><X size={15} /></button>
        </aside>
      ) : null}

      {modalOpen ? (
        <div className="collaboration-layer" role="dialog" aria-modal="true" aria-labelledby="collaboration-title">
          <button className="collaboration-scrim" type="button" onClick={closeModal} aria-label="Close collaboration dialog" />
          <section className="collaboration-modal">
            <button className="modal-close" type="button" onClick={closeModal} aria-label="Close collaboration dialog"><X size={18} /></button>

            {!user || !trip ? (
              <>
                <div className="modal-icon"><Users /></div>
                <span className="modal-eyebrow">Optional cloud collaboration</span>
                <h2 id="collaboration-title">Plan together when you’re ready</h2>
                <p className="modal-intro">Everything works without an account and stays in this browser. Create an account only if you want the group to share edits.</p>
                <div className="storage-choice-grid">
                  <article><HardDrive /><div><strong>Local by default</strong><span>Private to this device. No login, tracking, or cloud writes.</span></div><Check /></article>
                  <article><Cloud /><div><strong>Shared when invited</strong><span>Sync notes, lists, lodging, itinerary choices, and budget estimates.</span></div></article>
                </div>

                {configured ? (
                  <form className="collaboration-form" onSubmit={submitAuth}>
                    <label><span>Your name</span><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Brandon" autoComplete="name" /></label>
                    <label><span>Email</span><input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" type="email" autoComplete="email" required /></label>
                    <Button className="primary" disabled={status === 'connecting'} type="submit">
                      {status === 'connecting' ? <LoaderCircle className="spin" size={16} /> : <Mail size={16} />}
                      Send secure magic link
                    </Button>
                    <small><ShieldCheck size={13} />No password required. Supabase Auth protects shared trip data.</small>
                  </form>
                ) : (
                  <div className="collaboration-unavailable"><HardDrive /><div><strong>Local mode is active</strong><span>Cloud collaboration has not been configured for this deployment.</span></div></div>
                )}
              </>
            ) : (
              <>
                <div className="modal-icon cloud"><Cloud /></div>
                <span className="modal-eyebrow">Cloud sync active</span>
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
                  <form className="invite-form" onSubmit={submitInvite}>
                    <div><UserPlus size={17} /><div><strong>Add a collaborator</strong><span>They join after signing in with the same email.</span></div></div>
                    <div className="invite-fields">
                      <input value={inviteName} onChange={(event) => setInviteName(event.target.value)} placeholder="Name" aria-label="Collaborator name" />
                      <input value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="Email address" aria-label="Collaborator email" type="email" required />
                      <Button className="secondary" type="submit">Add</Button>
                    </div>
                  </form>
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
