import { useEffect, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import {
  auth,
  firebaseConfigurationError,
  updateFirebaseUserProfile,
} from './firebase'
import './App.css'

const AUTH_ERROR_MESSAGES = {
  'auth/email-already-in-use': 'An account already exists for this email. Try logging in instead.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/weak-password': 'Your password must be at least 6 characters long.',
  'auth/invalid-credential': 'The email or password you entered is incorrect.',
  'auth/user-disabled': 'This account has been disabled. Please contact support.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/network-request-failed': 'We could not reach Firebase. Check your connection and try again.',
  'auth/operation-not-allowed': 'Email/password authentication is not enabled for this Firebase project.',
}

const PROFILE_ERROR_MESSAGES = {
  INVALID_ID_TOKEN: 'Your session is no longer valid. Please log in again.',
  TOKEN_EXPIRED: 'Your session has expired. Please log in again.',
  USER_NOT_FOUND: 'We could not find this account. Please log in again.',
}

function Logo() {
  return (
    <a className="brand" href="/" aria-label="Pennywise home">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 42 42">
          <path d="M8 14.5 21 7l13 7.5v13L21 35 8 27.5z" />
          <path d="M14.5 22.5h13M17.5 17.5h7M18 27.5h6" />
        </svg>
      </span>
      <span>Pennywise</span>
    </a>
  )
}

function readableAuthError(error) {
  return AUTH_ERROR_MESSAGES[error?.code] ?? 'Something went wrong. Please try again.'
}

function readableProfileError(error) {
  if (error?.name === 'TypeError') {
    return 'We could not reach Firebase. Check your connection and try again.'
  }

  return PROFILE_ERROR_MESSAGES[error?.code]
    ?? error?.message
    ?? 'Firebase could not update your profile. Please try again.'
}

function AuthPage() {
  const [mode, setMode] = useState('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isSignup = mode === 'signup'
  const allFieldsFilled = Boolean(
    email.trim() && password && (!isSignup || confirmPassword),
  )
  const passwordsMatch = !isSignup || password === confirmPassword
  const canSubmit = allFieldsFilled && passwordsMatch && !isSubmitting

  const resetFeedback = () => setError('')

  const changeMode = () => {
    setMode((currentMode) => (currentMode === 'signup' ? 'login' : 'signup'))
    setPassword('')
    setConfirmPassword('')
    resetFeedback()
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    resetFeedback()

    if (!allFieldsFilled) {
      setError('Please fill in every field.')
      return
    }

    if (isSignup && password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (password.length < 6) {
      setError('Your password must be at least 6 characters long.')
      return
    }

    if (!auth) {
      setError(firebaseConfigurationError)
      return
    }

    setIsSubmitting(true)

    try {
      if (isSignup) {
        await createUserWithEmailAndPassword(auth, email.trim(), password)
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password)
      }
    } catch (authError) {
      setError(readableAuthError(authError))
      setIsSubmitting(false)
    }
  }

  return (
    <main className="page-shell">
      <div className="decorative-shape" aria-hidden="true" />

      <header className="site-header">
        <Logo />
        <nav aria-label="Main navigation">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#about">About</a>
        </nav>
      </header>

      <section className="auth-section" aria-labelledby="auth-title">
        <div className="intro-copy">
          <span className="eyebrow">SMARTER MONEY STARTS HERE</span>
          <h1>Make every dollar<br />count.</h1>
          <p>Create an account and bring calm, clarity, and confidence to your everyday spending.</p>
          <div className="mini-proof" aria-label="Pennywise benefits">
            <span>Free to start</span>
            <span>Secure by design</span>
          </div>
        </div>

        <div className="auth-wrap">
          <div className="auth-card">
            <div className="card-heading">
              <span className="card-icon" aria-hidden="true">↗</span>
              <h2 id="auth-title">{isSignup ? 'Create your account' : 'Welcome back'}</h2>
              <p>{isSignup ? 'Start tracking your money in minutes.' : 'Log in to continue to Pennywise.'}</p>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <label htmlFor="email">Email</label>
              <div className="input-wrap">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m3.5 6.5 8.5 6 8.5-6M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2Z" />
                </svg>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    resetFeedback()
                  }}
                  required
                />
              </div>

              <label htmlFor="password">Password</label>
              <div className="input-wrap">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="4" y="10" width="16" height="11" rx="2" />
                  <path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" />
                </svg>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    resetFeedback()
                  }}
                  minLength="6"
                  required
                />
              </div>

              {isSignup && (
                <>
                  <label htmlFor="confirm-password">Confirm password</label>
                  <div className="input-wrap">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <rect x="4" y="10" width="16" height="11" rx="2" />
                      <path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" />
                    </svg>
                    <input
                      id="confirm-password"
                      name="confirm-password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Enter your password again"
                      value={confirmPassword}
                      onChange={(event) => {
                        setConfirmPassword(event.target.value)
                        resetFeedback()
                      }}
                      minLength="6"
                      aria-invalid={Boolean(confirmPassword && !passwordsMatch)}
                      aria-describedby={confirmPassword && !passwordsMatch ? 'password-match-error' : undefined}
                      required
                    />
                  </div>
                  {confirmPassword && !passwordsMatch && (
                    <p className="inline-error" id="password-match-error">Passwords do not match.</p>
                  )}
                </>
              )}

              {error && <div className="message error-message" role="alert">{error}</div>}

              <button className="primary-button" type="submit" disabled={!canSubmit}>
                <span>{isSubmitting ? 'Please wait…' : isSignup ? 'Create account' : 'Log in'}</span>
                {!isSubmitting && <span aria-hidden="true">→</span>}
              </button>
            </form>

            <p className="switch-mode">
              {isSignup ? 'Already have an account?' : 'New to Pennywise?'}{' '}
              <button type="button" onClick={changeMode}>{isSignup ? 'Log in' : 'Create an account'}</button>
            </p>
          </div>
          <p className="privacy-note">Protected by Firebase Authentication</p>
        </div>
      </section>
    </main>
  )
}

function ProfileForm({ user, profile, onCancel, onUpdated }) {
  const [fullName, setFullName] = useState(profile.displayName)
  const [photoURL, setPhotoURL] = useState(profile.photoURL)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    const cleanName = fullName.trim()
    const cleanPhotoURL = photoURL.trim()
    setError('')

    if (!cleanName || !cleanPhotoURL) {
      setError('Please add your full name and a profile photo URL.')
      return
    }

    try {
      const parsedPhotoURL = new URL(cleanPhotoURL)
      if (!['http:', 'https:'].includes(parsedPhotoURL.protocol)) {
        throw new Error('Unsupported URL protocol')
      }
    } catch {
      setError('Please enter a valid http or https URL for your profile photo.')
      return
    }

    setIsSubmitting(true)

    try {
      const updatedProfile = await updateFirebaseUserProfile(user, {
        displayName: cleanName,
        photoURL: cleanPhotoURL,
      })
      onUpdated(updatedProfile)
    } catch (profileError) {
      setError(readableProfileError(profileError))
      setIsSubmitting(false)
    }
  }

  return (
    <main className="profile-main">
      <section className="profile-card" aria-labelledby="profile-title">
        <div className="profile-card-heading">
          <span className="eyebrow">CONTACT DETAILS</span>
          <h1 id="profile-title">Complete your profile</h1>
          <p>Add the details below so your Pennywise account feels like yours.</p>
        </div>

        <form className="profile-form" onSubmit={handleSubmit} noValidate>
          <div className="profile-field">
            <label htmlFor="full-name">Full name</label>
            <div className="input-wrap">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="8" r="4" />
                <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
              </svg>
              <input
                id="full-name"
                name="full-name"
                type="text"
                autoComplete="name"
                placeholder="Your full name"
                value={fullName}
                onChange={(event) => {
                  setFullName(event.target.value)
                  setError('')
                }}
                required
              />
            </div>
          </div>

          <div className="profile-field">
            <label htmlFor="photo-url">Profile photo URL</label>
            <div className="input-wrap">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M3 12h18M12 3c2.5 2.5 3.7 5.5 3.7 9s-1.2 6.5-3.7 9c-2.5-2.5-3.7-5.5-3.7-9S9.5 5.5 12 3Z" />
              </svg>
              <input
                id="photo-url"
                name="photo-url"
                type="url"
                inputMode="url"
                placeholder="https://example.com/photo.jpg"
                value={photoURL}
                onChange={(event) => {
                  setPhotoURL(event.target.value)
                  setError('')
                }}
                required
              />
            </div>
          </div>

          {error && <div className="message error-message profile-message" role="alert">{error}</div>}

          <div className="profile-actions">
            <button className="secondary-button" type="button" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </button>
            <button className="primary-button profile-update-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Updating…' : 'Update profile'}
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}

function AccountPage({ user }) {
  const [profile, setProfile] = useState({
    displayName: user.displayName ?? '',
    photoURL: user.photoURL ?? '',
  })
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)

  const isProfileIncomplete = !profile.displayName || !profile.photoURL

  const openProfileForm = () => {
    setProfileSaved(false)
    setIsEditingProfile(true)
  }

  const handleProfileUpdated = (updatedProfile) => {
    setProfile(updatedProfile)
    setProfileSaved(true)
    setIsEditingProfile(false)
  }

  return (
    <div className="account-page">
      <header className="account-header">
        <Logo />
        <div className="account-actions">
          {profile.photoURL && (
            <img className="profile-avatar" src={profile.photoURL} alt="" referrerPolicy="no-referrer" />
          )}
          <span className="account-email">{user.email}</span>
          <button className="sign-out-button" type="button" onClick={() => signOut(auth)}>Log out</button>
        </div>
      </header>

      {isEditingProfile ? (
        <ProfileForm
          user={user}
          profile={profile}
          onCancel={() => setIsEditingProfile(false)}
          onUpdated={handleProfileUpdated}
        />
      ) : (
        <main className="dashboard-main">
          {isProfileIncomplete && (
            <section className="profile-alert" aria-labelledby="profile-alert-title">
              <span className="profile-alert-icon" aria-hidden="true">!</span>
              <div className="profile-alert-copy">
                <h1 id="profile-alert-title">Your profile is incomplete</h1>
                <p>Add your name and profile photo to finish setting up your account.</p>
              </div>
              <button type="button" onClick={openProfileForm}>Complete profile</button>
            </section>
          )}

          {profileSaved && (
            <div className="message success-message dashboard-message" role="status">
              Your profile has been updated successfully.
            </div>
          )}

          <section className="welcome-panel">
            <div>
              <span className="eyebrow">YOUR MONEY, MADE CLEAR</span>
              <h2>Welcome{profile.displayName ? `, ${profile.displayName}` : ''}.</h2>
              <p>Your Pennywise dashboard is ready whenever you are.</p>
            </div>
            <div className="welcome-graphic" aria-hidden="true">
              <span>$</span>
            </div>
          </section>
        </main>
      )}
    </div>
  )
}

function App() {
  const [user, setUser] = useState(null)
  const [isAuthLoading, setIsAuthLoading] = useState(Boolean(auth))

  useEffect(() => {
    if (!auth) return undefined

    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      setIsAuthLoading(false)
    })
  }, [])

  if (isAuthLoading) {
    return (
      <main className="loading-page" aria-live="polite">
        <Logo />
        <span className="loading-spinner" aria-hidden="true" />
        <p>Loading your account…</p>
      </main>
    )
  }

  return user ? <AccountPage key={user.uid} user={user} /> : <AuthPage />
}

export default App
