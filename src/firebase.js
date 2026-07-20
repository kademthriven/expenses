import { getApps, initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const realtimeDatabaseURL = import.meta.env.VITE_FIREBASE_DATABASE_URL?.replace(/\/+$/, '')

const requiredConfigValues = ['apiKey', 'authDomain', 'projectId', 'appId']
const hasFirebaseConfig = requiredConfigValues.every((key) => firebaseConfig[key])

export const firebaseConfigurationError =
  'Firebase is not configured yet. Add your Firebase web app values to a .env.local file and restart the app.'

export const databaseConfigurationError =
  'Firebase Realtime Database is not configured. Create the database, add VITE_FIREBASE_DATABASE_URL to your environment file, and restart the app.'

const firebaseApp = hasFirebaseConfig
  ? getApps()[0] ?? initializeApp(firebaseConfig)
  : null

export const auth = firebaseApp ? getAuth(firebaseApp) : null

async function getAuthenticatedDatabaseURL(user, path) {
  if (!user || !realtimeDatabaseURL) {
    throw new Error(databaseConfigurationError)
  }

  const idToken = await user.getIdToken()
  return `${realtimeDatabaseURL}/${path}.json?auth=${encodeURIComponent(idToken)}`
}

async function getExpenseCollectionURL(user) {
  return getAuthenticatedDatabaseURL(user, `expenses/${encodeURIComponent(user.uid)}`)
}

async function getExpenseURL(user, expenseId) {
  if (!expenseId) throw new Error('The expense identifier is missing.')

  return getAuthenticatedDatabaseURL(
    user,
    `expenses/${encodeURIComponent(user.uid)}/${encodeURIComponent(expenseId)}`,
  )
}

async function readDatabaseResponse(response, fallbackMessage) {
  const result = await response.json().catch(() => null)

  if (response.status !== 200) {
    const databaseError = new Error(
      typeof result?.error === 'string' ? result.error : fallbackMessage,
    )
    databaseError.code = response.status
    throw databaseError
  }

  return result
}

export async function createFirebaseExpense(user, expense) {
  const expenseURL = await getExpenseCollectionURL(user)
  const response = await fetch(expenseURL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(expense),
  })
  const result = await readDatabaseResponse(
    response,
    'Firebase could not save the expense.',
  )

  if (!result?.name) {
    throw new Error('Firebase saved the expense but did not return its identifier.')
  }

  return { id: result.name, ...expense }
}

export async function getFirebaseExpenses(user) {
  const expenseURL = await getExpenseCollectionURL(user)
  const response = await fetch(expenseURL, { method: 'GET' })
  const result = await readDatabaseResponse(
    response,
    'Firebase could not load your expenses.',
  )

  if (!result) return []

  return Object.entries(result)
    .filter(([, expense]) => expense && typeof expense === 'object')
    .map(([id, expense]) => ({ id, ...expense }))
    .sort((firstExpense, secondExpense) => (
      new Date(secondExpense.addedAt).getTime() - new Date(firstExpense.addedAt).getTime()
    ))
}

export async function updateFirebaseExpense(user, expenseId, expense) {
  const expenseURL = await getExpenseURL(user, expenseId)
  const response = await fetch(expenseURL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(expense),
  })
  const result = await readDatabaseResponse(
    response,
    'Firebase could not update the expense.',
  )

  if (!result || typeof result !== 'object') {
    throw new Error('Firebase updated the expense but did not return its values.')
  }

  return { id: expenseId, ...result }
}

export async function deleteFirebaseExpense(user, expenseId) {
  const expenseURL = await getExpenseURL(user, expenseId)
  const response = await fetch(expenseURL, { method: 'DELETE' })
  await readDatabaseResponse(
    response,
    'Firebase could not delete the expense.',
  )
}

export async function sendFirebasePasswordResetEmail(email) {
  if (!firebaseConfig.apiKey) {
    throw new Error(firebaseConfigurationError)
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${encodeURIComponent(firebaseConfig.apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestType: 'PASSWORD_RESET',
        email,
      }),
    },
  )

  const result = await response.json().catch(() => ({}))

  if (!response.ok) {
    const resetError = new Error('Firebase could not send the password reset email.')
    resetError.code = result.error?.message ?? 'PASSWORD_RESET_REQUEST_FAILED'
    throw resetError
  }

  return { email: result.email ?? email }
}

async function requestFirebaseAccount(user, endpoint, payload, errorMessage) {
  if (!user || !firebaseConfig.apiKey) {
    throw new Error(firebaseConfigurationError)
  }

  const idToken = await user.getIdToken()
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/${endpoint}?key=${encodeURIComponent(firebaseConfig.apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idToken,
        ...payload,
      }),
    },
  )

  const result = await response.json().catch(() => ({}))

  if (!response.ok) {
    const profileError = new Error(errorMessage)
    profileError.code = result.error?.message ?? 'FIREBASE_ACCOUNT_REQUEST_FAILED'
    throw profileError
  }

  return result
}

export async function getFirebaseUserProfile(user) {
  const result = await requestFirebaseAccount(
    user,
    'accounts:lookup',
    {},
    'Firebase could not load your account details.',
  )
  const account = result.users?.[0]

  if (!account) {
    const profileError = new Error('Firebase could not find your account details.')
    profileError.code = 'USER_NOT_FOUND'
    throw profileError
  }

  return {
    displayName: account.displayName ?? '',
    photoURL: account.photoUrl ?? '',
    emailVerified: Boolean(account.emailVerified),
  }
}

export async function sendFirebaseEmailVerification(user) {
  const result = await requestFirebaseAccount(
    user,
    'accounts:sendOobCode',
    { requestType: 'VERIFY_EMAIL' },
    'Firebase could not send the verification email.',
  )

  return { email: result.email ?? user.email }
}

export async function updateFirebaseUserProfile(user, { displayName, photoURL }) {
  const result = await requestFirebaseAccount(
    user,
    'accounts:update',
    {
      displayName,
      photoUrl: photoURL,
      returnSecureToken: true,
    },
    'Firebase could not update your profile.',
  )

  await user.reload()

  return {
    displayName: result.displayName ?? displayName,
    photoURL: result.photoUrl ?? photoURL,
  }
}
