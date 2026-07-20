import { useState } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth'
import { auth, firebaseConfigurationError } from './firebase'
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

function App() {
  const [mode, setMode] = useState('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isSignup = mode === 'signup'
  const allFieldsFilled = Boolean(
    email.trim() && password && (!isSignup || confirmPassword),
  )
  const passwordsMatch = !isSignup || password === confirmPassword
  const canSubmit = allFieldsFilled && passwordsMatch && !isSubmitting

  const resetFeedback = () => {
    setError('')
    setSuccess('')
  }

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
        console.log('User has successfully signed up.')
        setSuccess('Your account was created successfully. You are now signed in.')
        setPassword('')
        setConfirmPassword('')
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password)
        setSuccess('Welcome back! You have successfully logged in.')
        setPassword('')
      }
    } catch (authError) {
      setError(readableAuthError(authError))
    } finally {
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
              {success && <div className="message success-message" role="status">{success}</div>}

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

export default App
