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

export async function updateFirebaseUserProfile(user, { displayName, photoURL }) {
  if (!user || !firebaseConfig.apiKey) {
    throw new Error(firebaseConfigurationError)
  }

  const idToken = await user.getIdToken()
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${encodeURIComponent(firebaseConfig.apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idToken,
        displayName,
        photoUrl: photoURL,
        returnSecureToken: true,
      }),
    },
  )

  const result = await response.json().catch(() => ({}))

  if (!response.ok) {
    const profileError = new Error('Firebase could not update your profile.')
    profileError.code = result.error?.message ?? 'PROFILE_UPDATE_FAILED'
    throw profileError
  }

  await user.reload()

  return {
    displayName: result.displayName ?? displayName,
    photoURL: result.photoUrl ?? photoURL,
  }
}
