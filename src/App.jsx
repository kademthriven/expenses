import { useEffect, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import {
  auth,
  createFirebaseExpense,
  deleteFirebaseExpense,
  firebaseConfigurationError,
  getFirebaseExpenses,
  getFirebaseUserProfile,
  sendFirebaseEmailVerification,
  sendFirebasePasswordResetEmail,
  updateFirebaseExpense,
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

const EMAIL_VERIFICATION_ERROR_MESSAGES = {
  INVALID_ID_TOKEN: 'Your session is no longer valid. Log out, then log in again before requesting a new verification email.',
  TOKEN_EXPIRED: 'Your session has expired. Log out, then log in again before requesting a new verification email.',
  USER_NOT_FOUND: 'This account no longer exists. Please log out and create or use another account.',
}

const PASSWORD_RESET_ERROR_MESSAGES = {
  EMAIL_NOT_FOUND: 'We could not find an account registered with that email address.',
  INVALID_EMAIL: 'Please enter a valid email address.',
  USER_DISABLED: 'This account has been disabled. Please contact support.',
  TOO_MANY_ATTEMPTS_TRY_LATER: 'Too many reset requests were made. Please wait a moment and try again.',
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

function readableEmailVerificationError(error) {
  if (error?.name === 'TypeError') {
    return 'We could not reach Firebase. Check your connection and try again.'
  }

  return EMAIL_VERIFICATION_ERROR_MESSAGES[error?.code]
    ?? error?.message
    ?? 'We could not send the verification email. Please try again.'
}

function readablePasswordResetError(error) {
  if (error?.name === 'TypeError') {
    return 'We could not reach Firebase. Check your connection and try again.'
  }

  return PASSWORD_RESET_ERROR_MESSAGES[error?.code]
    ?? error?.message
    ?? 'We could not send the password reset email. Please try again.'
}

function readableExpenseError(error) {
  if (error?.name === 'TypeError') {
    return 'We could not reach Firebase. Check your connection and try again.'
  }

  if (error?.code === 401 || error?.code === 403) {
    return 'Firebase denied access to your expenses. Check the Realtime Database security rules and try again.'
  }

  if (error?.code === 404) {
    return 'The Firebase Realtime Database could not be found. Check VITE_FIREBASE_DATABASE_URL and try again.'
  }

  if (error?.code === 429) {
    return 'Firebase received too many requests. Wait a moment and try again.'
  }

  return error?.message ?? 'Firebase could not process your expenses. Please try again.'
}

function ForgotPasswordForm({ initialEmail, onBackToLogin }) {
  const [resetEmail, setResetEmail] = useState(initialEmail)
  const [resetError, setResetError] = useState('')
  const [sentToEmail, setSentToEmail] = useState('')
  const [isSendingReset, setIsSendingReset] = useState(false)

  const handleResetSubmit = async (event) => {
    event.preventDefault()
    const cleanEmail = resetEmail.trim()
    setResetError('')

    if (!cleanEmail) {
      setResetError('Please enter the email address registered to your account.')
      return
    }

    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setResetError('Please enter a valid email address.')
      return
    }

    setIsSendingReset(true)

    try {
      const result = await sendFirebasePasswordResetEmail(cleanEmail)
      setSentToEmail(result.email)
    } catch (passwordResetError) {
      setResetError(readablePasswordResetError(passwordResetError))
    } finally {
      setIsSendingReset(false)
    }
  }

  if (sentToEmail) {
    return (
      <div className="reset-success" role="status">
        <span className="reset-success-icon" aria-hidden="true">✓</span>
        <h3>Check your email</h3>
        <p>
          A password reset link was sent to <strong>{sentToEmail}</strong>. Open the link,
          choose a new password, then return here to log in.
        </p>
        <button className="primary-button" type="button" onClick={onBackToLogin}>
          Back to login
        </button>
        <button
          className="reset-text-button"
          type="button"
          onClick={() => setSentToEmail('')}
        >
          Send another link
        </button>
      </div>
    )
  }

  return (
    <>
      <form className="reset-form" onSubmit={handleResetSubmit} noValidate>
        <label htmlFor="reset-email">Email</label>
        <div className="input-wrap">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m3.5 6.5 8.5 6 8.5-6M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2Z" />
          </svg>
          <input
            id="reset-email"
            name="reset-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={resetEmail}
            onChange={(event) => {
              setResetEmail(event.target.value)
              setResetError('')
            }}
            disabled={isSendingReset}
            required
          />
        </div>

        {resetError && <div className="message error-message" role="alert">{resetError}</div>}

        <button className="primary-button" type="submit" disabled={isSendingReset}>
          <span>{isSendingReset ? 'Sending link…' : 'Send reset link'}</span>
          {!isSendingReset && <span aria-hidden="true">→</span>}
        </button>
      </form>

      <p className="switch-mode reset-login-link">
        Remembered your password?{' '}
        <button type="button" onClick={onBackToLogin}>Log in</button>
      </p>

      {isSendingReset && (
        <div className="reset-loader-overlay" role="status" aria-live="polite">
          <span className="loading-spinner" aria-hidden="true" />
          <p>Requesting your reset link…</p>
        </div>
      )}
    </>
  )
}

function AuthPage() {
  const [mode, setMode] = useState(() => {
    const requestedMode = new URLSearchParams(window.location.search).get('mode')
    return ['login', 'forgot'].includes(requestedMode) ? requestedMode : 'signup'
  })
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isSignup = mode === 'signup'
  const isForgotPassword = mode === 'forgot'
  const allFieldsFilled = Boolean(
    email.trim() && password && (!isSignup || confirmPassword),
  )
  const passwordsMatch = !isSignup || password === confirmPassword
  const canSubmit = allFieldsFilled && passwordsMatch && !isSubmitting

  const resetFeedback = () => setError('')

  const changeMode = () => {
    const nextMode = isSignup ? 'login' : 'signup'
    setMode(nextMode)
    setPassword('')
    setConfirmPassword('')
    resetFeedback()
    window.history.replaceState(null, '', nextMode === 'login' ? '/?mode=login' : '/')
  }

  const showForgotPassword = () => {
    setMode('forgot')
    setPassword('')
    resetFeedback()
    window.history.replaceState(null, '', '/?mode=forgot')
  }

  const showLogin = () => {
    setMode('login')
    setPassword('')
    setConfirmPassword('')
    resetFeedback()
    window.history.replaceState(null, '', '/?mode=login')
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
              <span className="card-icon" aria-hidden="true">{isForgotPassword ? '?' : '↗'}</span>
              <h2 id="auth-title">
                {isForgotPassword
                  ? 'Reset your password'
                  : isSignup
                    ? 'Create your account'
                    : 'Welcome back'}
              </h2>
              <p>
                {isForgotPassword
                  ? 'Enter the email address registered to your account.'
                  : isSignup
                    ? 'Start tracking your money in minutes.'
                    : 'Log in to continue to Pennywise.'}
              </p>
            </div>

            {isForgotPassword ? (
              <ForgotPasswordForm initialEmail={email} onBackToLogin={showLogin} />
            ) : (
              <>
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

              {!isSignup && (
                <div className="forgot-password-row">
                  <button type="button" onClick={showForgotPassword}>Forgot password?</button>
                </div>
              )}

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
              </>
            )}
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

const EXPENSE_CATEGORIES = [
  { value: 'food', label: 'Food', icon: 'F', color: '#ef7d55' },
  { value: 'petrol', label: 'Petrol', icon: 'P', color: '#6b74e6' },
  { value: 'transport', label: 'Transport', icon: 'T', color: '#288fbd' },
  { value: 'shopping', label: 'Shopping', icon: 'S', color: '#b36ad4' },
  { value: 'bills', label: 'Bills', icon: 'B', color: '#d19b36' },
  { value: 'entertainment', label: 'Entertainment', icon: 'E', color: '#e45e86' },
  { value: 'healthcare', label: 'Healthcare', icon: 'H', color: '#27a886' },
  { value: 'salary', label: 'Salary', icon: '$', color: '#13946b' },
  { value: 'other', label: 'Other', icon: 'O', color: '#718496' },
]

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

function DailyExpenses({ user }) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [expenses, setExpenses] = useState([])
  const [expenseError, setExpenseError] = useState('')
  const [expenseLoadError, setExpenseLoadError] = useState('')
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(true)
  const [isSavingExpense, setIsSavingExpense] = useState(false)
  const [expenseRefreshKey, setExpenseRefreshKey] = useState(0)
  const [editingExpense, setEditingExpense] = useState(null)
  const [isUpdatingExpense, setIsUpdatingExpense] = useState(false)
  const [deletingExpenseId, setDeletingExpenseId] = useState('')
  const [expenseActionError, setExpenseActionError] = useState('')

  useEffect(() => {
    let isCurrentRequest = true

    async function loadExpenses() {
      setIsLoadingExpenses(true)
      setExpenseLoadError('')

      try {
        const savedExpenses = await getFirebaseExpenses(user)
        const normalizedExpenses = savedExpenses
          .map((expense) => {
            const expenseAmount = Number(expense.amount)
            const expenseCategory = EXPENSE_CATEGORIES.find(
              (item) => item.value === expense.category,
            ) ?? EXPENSE_CATEGORIES.at(-1)
            const addedAt = new Date(expense.addedAt)

            if (
              !Number.isFinite(expenseAmount)
              || typeof expense.description !== 'string'
              || Number.isNaN(addedAt.getTime())
            ) {
              return null
            }

            return {
              ...expense,
              amount: expenseAmount,
              category: expenseCategory,
              addedAt,
            }
          })
          .filter(Boolean)

        if (isCurrentRequest) setExpenses(normalizedExpenses)
      } catch (loadError) {
        if (isCurrentRequest) setExpenseLoadError(readableExpenseError(loadError))
      } finally {
        if (isCurrentRequest) setIsLoadingExpenses(false)
      }
    }

    loadExpenses()

    return () => {
      isCurrentRequest = false
    }
  }, [expenseRefreshKey, user])

  const totalSpent = expenses.reduce((total, expense) => total + expense.amount, 0)

  const handleExpenseSubmit = async (event) => {
    event.preventDefault()
    const parsedAmount = Number(amount)
    const cleanDescription = description.trim()
    setExpenseError('')

    if (!amount || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setExpenseError('Enter an amount greater than zero.')
      return
    }

    if (!cleanDescription) {
      setExpenseError('Add a short description of the expense.')
      return
    }

    const selectedCategory = EXPENSE_CATEGORIES.find((item) => item.value === category)
    if (!selectedCategory) {
      setExpenseError('Choose a category for this expense.')
      return
    }

    setIsSavingExpense(true)

    try {
      const savedExpense = await createFirebaseExpense(user, {
        amount: Math.round(parsedAmount * 100) / 100,
        description: cleanDescription,
        category: selectedCategory.value,
        addedAt: new Date().toISOString(),
      })

      setExpenses((currentExpenses) => [
        {
          ...savedExpense,
          category: selectedCategory,
          addedAt: new Date(savedExpense.addedAt),
        },
        ...currentExpenses,
      ])
      setExpenseLoadError('')
      setAmount('')
      setDescription('')
      setCategory('')
    } catch (saveError) {
      setExpenseError(readableExpenseError(saveError))
    } finally {
      setIsSavingExpense(false)
    }
  }

  const startEditingExpense = (expense) => {
    setExpenseActionError('')
    setEditingExpense({
      id: expense.id,
      amount: String(expense.amount),
      description: expense.description,
      category: expense.category.value,
    })
  }

  const handleEditExpenseSubmit = async (event, originalExpense) => {
    event.preventDefault()
    const parsedAmount = Number(editingExpense.amount)
    const cleanDescription = editingExpense.description.trim()
    const selectedCategory = EXPENSE_CATEGORIES.find(
      (item) => item.value === editingExpense.category,
    )
    setExpenseActionError('')

    if (!editingExpense.amount || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setExpenseActionError('Enter an amount greater than zero before submitting the edit.')
      return
    }

    if (!cleanDescription) {
      setExpenseActionError('Add a short description before submitting the edit.')
      return
    }

    if (!selectedCategory) {
      setExpenseActionError('Choose a category before submitting the edit.')
      return
    }

    setIsUpdatingExpense(true)

    try {
      const updatedExpense = await updateFirebaseExpense(user, originalExpense.id, {
        amount: Math.round(parsedAmount * 100) / 100,
        description: cleanDescription,
        category: selectedCategory.value,
        addedAt: originalExpense.addedAt.toISOString(),
      })

      setExpenses((currentExpenses) => currentExpenses.map((expense) => (
        expense.id === originalExpense.id
          ? {
              ...updatedExpense,
              category: selectedCategory,
              addedAt: new Date(updatedExpense.addedAt),
            }
          : expense
      )))
      setEditingExpense(null)
    } catch (updateError) {
      setExpenseActionError(readableExpenseError(updateError))
    } finally {
      setIsUpdatingExpense(false)
    }
  }

  const handleDeleteExpense = async (expenseId) => {
    setExpenseActionError('')
    setDeletingExpenseId(expenseId)

    try {
      await deleteFirebaseExpense(user, expenseId)
      setExpenses((currentExpenses) => (
        currentExpenses.filter((expense) => expense.id !== expenseId)
      ))
      if (editingExpense?.id === expenseId) setEditingExpense(null)
      console.log('Expense successfuly deleted')
    } catch (deleteError) {
      setExpenseActionError(readableExpenseError(deleteError))
    } finally {
      setDeletingExpenseId('')
    }
  }

  return (
    <section className="expenses-panel" aria-labelledby="daily-expenses-title">
      <div className="expenses-heading">
        <div>
          <span className="eyebrow">QUICK ENTRY</span>
          <h2 id="daily-expenses-title">Daily expenses</h2>
          <p>Record what you spent today and keep every purchase in view.</p>
        </div>
        <div className="expense-total" aria-label={`Total recorded: ${currencyFormatter.format(totalSpent)}`}>
          <span>Recorded total</span>
          <strong>{currencyFormatter.format(totalSpent)}</strong>
        </div>
      </div>

      <form className="expense-form" onSubmit={handleExpenseSubmit} noValidate>
        <div className="expense-field expense-amount-field">
          <label htmlFor="expense-amount">Money spent</label>
          <div className="expense-control amount-control">
            <span aria-hidden="true">$</span>
            <input
              id="expense-amount"
              name="expense-amount"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={amount}
              disabled={isSavingExpense || isLoadingExpenses}
              onChange={(event) => {
                setAmount(event.target.value)
                setExpenseError('')
              }}
              required
            />
          </div>
        </div>

        <div className="expense-field expense-description-field">
          <label htmlFor="expense-description">Description</label>
          <div className="expense-control">
            <input
              id="expense-description"
              name="expense-description"
              type="text"
              maxLength="100"
              placeholder="e.g. Lunch with the team"
              value={description}
              disabled={isSavingExpense || isLoadingExpenses}
              onChange={(event) => {
                setDescription(event.target.value)
                setExpenseError('')
              }}
              required
            />
          </div>
        </div>

        <div className="expense-field expense-category-field">
          <label htmlFor="expense-category">Category</label>
          <div className="expense-control select-control">
            <select
              id="expense-category"
              name="expense-category"
              value={category}
              disabled={isSavingExpense || isLoadingExpenses}
              onChange={(event) => {
                setCategory(event.target.value)
                setExpenseError('')
              }}
              required
            >
              <option value="">Choose category</option>
              {EXPENSE_CATEGORIES.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          className="add-expense-button"
          type="submit"
          disabled={isSavingExpense || isLoadingExpenses}
        >
          {isSavingExpense || isLoadingExpenses ? (
            <span className="expense-button-spinner" aria-hidden="true" />
          ) : (
            <span aria-hidden="true">+</span>
          )}
          {isSavingExpense ? 'Saving…' : isLoadingExpenses ? 'Loading…' : 'Add expense'}
        </button>

        {expenseError && (
          <div className="message error-message expense-form-error" role="alert">
            {expenseError}
          </div>
        )}
      </form>

      <div className="expense-list-heading">
        <h3>Saved expenses</h3>
        <span>
          {isLoadingExpenses
            ? 'Loading…'
            : `${expenses.length} ${expenses.length === 1 ? 'expense' : 'expenses'}`}
        </span>
      </div>

      {expenseActionError && (
        <div className="message error-message expense-action-error" role="alert">
          {expenseActionError}
        </div>
      )}

      {isLoadingExpenses ? (
        <div className="expenses-loading" aria-live="polite">
          <span className="expense-loading-spinner" aria-hidden="true" />
          <p>Loading your saved expenses…</p>
        </div>
      ) : expenseLoadError ? (
        <div className="expenses-load-error" role="alert">
          <p>{expenseLoadError}</p>
          <button type="button" onClick={() => setExpenseRefreshKey((key) => key + 1)}>
            Try again
          </button>
        </div>
      ) : expenses.length === 0 ? (
        <div className="expenses-empty-state">
          <span aria-hidden="true">$</span>
          <h3>No expenses added yet</h3>
          <p>Use the form above to record your first expense for today.</p>
        </div>
      ) : (
        <ul className="expense-list">
          {expenses.map((expense) => (
            <li
              className={editingExpense?.id === expense.id ? 'expense-editing-row' : ''}
              key={expense.id}
            >
              {editingExpense?.id === expense.id ? (
                <form
                  className="expense-edit-form"
                  onSubmit={(event) => handleEditExpenseSubmit(event, expense)}
                  noValidate
                >
                  <div className="expense-field">
                    <label htmlFor={`edit-expense-amount-${expense.id}`}>Money spent</label>
                    <div className="expense-control amount-control">
                      <span aria-hidden="true">$</span>
                      <input
                        id={`edit-expense-amount-${expense.id}`}
                        type="number"
                        inputMode="decimal"
                        min="0.01"
                        step="0.01"
                        value={editingExpense.amount}
                        disabled={isUpdatingExpense}
                        onChange={(event) => {
                          setEditingExpense((currentExpense) => ({
                            ...currentExpense,
                            amount: event.target.value,
                          }))
                          setExpenseActionError('')
                        }}
                        required
                      />
                    </div>
                  </div>

                  <div className="expense-field">
                    <label htmlFor={`edit-expense-description-${expense.id}`}>Description</label>
                    <div className="expense-control">
                      <input
                        id={`edit-expense-description-${expense.id}`}
                        type="text"
                        maxLength="100"
                        value={editingExpense.description}
                        disabled={isUpdatingExpense}
                        onChange={(event) => {
                          setEditingExpense((currentExpense) => ({
                            ...currentExpense,
                            description: event.target.value,
                          }))
                          setExpenseActionError('')
                        }}
                        required
                      />
                    </div>
                  </div>

                  <div className="expense-field">
                    <label htmlFor={`edit-expense-category-${expense.id}`}>Category</label>
                    <div className="expense-control select-control">
                      <select
                        id={`edit-expense-category-${expense.id}`}
                        value={editingExpense.category}
                        disabled={isUpdatingExpense}
                        onChange={(event) => {
                          setEditingExpense((currentExpense) => ({
                            ...currentExpense,
                            category: event.target.value,
                          }))
                          setExpenseActionError('')
                        }}
                        required
                      >
                        <option value="">Choose category</option>
                        {EXPENSE_CATEGORIES.map((item) => (
                          <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="expense-edit-actions">
                    <button
                      className="expense-cancel-button"
                      type="button"
                      disabled={isUpdatingExpense}
                      onClick={() => {
                        setEditingExpense(null)
                        setExpenseActionError('')
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      className="expense-submit-edit-button"
                      type="submit"
                      disabled={isUpdatingExpense}
                    >
                      {isUpdatingExpense ? 'Updating…' : 'Submit'}
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <span
                    className="expense-category-icon"
                    style={{ '--category-color': expense.category.color }}
                    aria-hidden="true"
                  >
                    {expense.category.icon}
                  </span>
                  <div className="expense-details">
                    <strong>{expense.description}</strong>
                    <span>
                      {expense.category.label} · {expense.addedAt.toLocaleString([], {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>
                  <strong className="expense-amount">
                    −{currencyFormatter.format(expense.amount)}
                  </strong>
                  <div className="expense-row-actions">
                    <button
                      className="expense-edit-button"
                      type="button"
                      disabled={
                        isUpdatingExpense
                        || Boolean(deletingExpenseId)
                        || Boolean(editingExpense)
                      }
                      onClick={() => startEditingExpense(expense)}
                    >
                      Edit
                    </button>
                    <button
                      className="expense-delete-button"
                      type="button"
                      disabled={
                        isUpdatingExpense
                        || Boolean(deletingExpenseId)
                        || Boolean(editingExpense)
                      }
                      onClick={() => handleDeleteExpense(expense.id)}
                    >
                      {deletingExpenseId === expense.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function AccountPage({ user }) {
  const [profile, setProfile] = useState({
    displayName: user.displayName ?? '',
    photoURL: user.photoURL ?? '',
    emailVerified: Boolean(user.emailVerified),
  })
  const [isProfileLoading, setIsProfileLoading] = useState(true)
  const [profileLoadError, setProfileLoadError] = useState('')
  const [profileRefreshKey, setProfileRefreshKey] = useState(0)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [isSendingVerification, setIsSendingVerification] = useState(false)
  const [verificationEmailSent, setVerificationEmailSent] = useState('')
  const [verificationError, setVerificationError] = useState('')
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState('')

  const isProfileIncomplete = !profile.displayName || !profile.photoURL

  useEffect(() => {
    let isCurrentRequest = true

    const loadSavedProfile = async () => {
      setIsProfileLoading(true)
      setProfileLoadError('')

      try {
        const savedProfile = await getFirebaseUserProfile(user)
        if (isCurrentRequest) setProfile(savedProfile)
      } catch (profileError) {
        if (isCurrentRequest) setProfileLoadError(readableProfileError(profileError))
      } finally {
        if (isCurrentRequest) setIsProfileLoading(false)
      }
    }

    loadSavedProfile()

    return () => {
      isCurrentRequest = false
    }
  }, [profileRefreshKey, user])

  useEffect(() => {
    if (!verificationEmailSent || profile.emailVerified) return undefined

    const refreshVerificationStatus = () => {
      setProfileRefreshKey((currentKey) => currentKey + 1)
    }

    window.addEventListener('focus', refreshVerificationStatus)
    return () => window.removeEventListener('focus', refreshVerificationStatus)
  }, [profile.emailVerified, verificationEmailSent])

  const openProfileForm = () => {
    setProfileSaved(false)
    setIsEditingProfile(true)
  }

  const handleProfileUpdated = (updatedProfile) => {
    setProfile((currentProfile) => ({ ...currentProfile, ...updatedProfile }))
    setProfileSaved(true)
    setIsEditingProfile(false)
  }

  const handleSendVerificationEmail = async () => {
    setVerificationError('')
    setIsSendingVerification(true)

    try {
      const result = await sendFirebaseEmailVerification(user)
      setVerificationEmailSent(result.email)
    } catch (emailVerificationError) {
      setVerificationError(readableEmailVerificationError(emailVerificationError))
    } finally {
      setIsSendingVerification(false)
    }
  }

  const handleLogout = async () => {
    setLogoutError('')
    setIsLoggingOut(true)

    // Remove any app-managed token immediately; Firebase signOut clears the
    // SDK's persisted authentication state and cached ID token.
    window.localStorage.removeItem('idToken')

    try {
      await signOut(auth)
      window.location.replace('/?mode=login')
    } catch {
      setLogoutError('We could not log you out. Please try again.')
      setIsLoggingOut(false)
    }
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
          {!isProfileLoading && !profileLoadError && !isProfileIncomplete && (
            <button className="edit-profile-button" type="button" onClick={openProfileForm}>
              Edit profile
            </button>
          )}
          <button
            className="sign-out-button"
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? 'Logging out…' : 'Log out'}
          </button>
        </div>
      </header>

      {logoutError && (
        <div className="logout-error" role="alert">{logoutError}</div>
      )}

      {isEditingProfile ? (
        <ProfileForm
          user={user}
          profile={profile}
          onCancel={() => setIsEditingProfile(false)}
          onUpdated={handleProfileUpdated}
        />
      ) : isProfileLoading ? (
        <main className="profile-state-main" aria-live="polite">
          <span className="loading-spinner" aria-hidden="true" />
          <p>Loading your saved profile…</p>
        </main>
      ) : profileLoadError ? (
        <main className="profile-state-main profile-load-error" role="alert">
          <h1>We couldn’t load your profile</h1>
          <p>{profileLoadError}</p>
          <button type="button" onClick={() => setProfileRefreshKey((currentKey) => currentKey + 1)}>
            Try again
          </button>
        </main>
      ) : (
        <main className="dashboard-main">
          {!profile.emailVerified && (
            <section className="email-verification-alert" aria-labelledby="email-verification-title">
              <span className="email-verification-icon" aria-hidden="true">@</span>
              <div className="email-verification-copy">
                <h1 id="email-verification-title">Verify your email address</h1>
                <p>Confirm that <strong>{user.email}</strong> belongs to you and keep your account recoverable.</p>
              </div>
              <button
                type="button"
                onClick={handleSendVerificationEmail}
                disabled={isSendingVerification}
              >
                {isSendingVerification
                  ? 'Sending…'
                  : verificationEmailSent
                    ? 'Resend verification email'
                    : 'Verify email address'}
              </button>

              {verificationEmailSent && !verificationError && (
                <div className="email-verification-feedback success-message" role="status">
                  Check your email at <strong>{verificationEmailSent}</strong>. You might have received a verification link. Click it to verify your email address.
                </div>
              )}

              {verificationError && (
                <div className="email-verification-feedback error-message" role="alert">
                  {verificationError}
                </div>
              )}
            </section>
          )}

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

          <DailyExpenses user={user} />
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
