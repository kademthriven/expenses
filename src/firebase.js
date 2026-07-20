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

const requiredConfigValues = ['apiKey', 'authDomain', 'projectId', 'appId']
const hasFirebaseConfig = requiredConfigValues.every((key) => firebaseConfig[key])

export const firebaseConfigurationError =
  'Firebase is not configured yet. Add your Firebase web app values to a .env.local file and restart the app.'

const firebaseApp = hasFirebaseConfig
  ? getApps()[0] ?? initializeApp(firebaseConfig)
  : null

export const auth = firebaseApp ? getAuth(firebaseApp) : null

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
