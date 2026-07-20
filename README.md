# Pennywise signup

Responsive React expense tracker backed by Firebase Authentication and Firebase Realtime Database.

## Firebase setup

1. Create or open a Firebase project.
2. In **Authentication → Sign-in method**, enable **Email/Password**.
3. In **Project settings → Your apps**, register a Web app and copy its Firebase configuration.
4. In **Build → Realtime Database**, create a database and copy its exact database URL from the Firebase console. The region is part of this URL for databases outside `us-central1`.
5. Copy `.env.example` to `.env.local`, replace each placeholder with the matching configuration value, and set `VITE_FIREBASE_DATABASE_URL` to that exact URL.
6. Publish the rules in `database.rules.json` from the Realtime Database **Rules** tab, or deploy them with the Firebase CLI:

```powershell
npx firebase-tools deploy --only database --project your-project-id
```

7. Restart the development server after changing environment values.

```powershell
Copy-Item .env.example .env.local
npm run dev
```

New accounts appear in **Firebase console → Build → Authentication → Users**. Firebase Authentication stores the account identity, including its UID and email, in the Firebase project's managed user database; passwords are never exposed to this app.

Expenses are stored under `expenses/{uid}/{expenseId}`. Every REST request includes the signed-in user's Firebase ID token, and the supplied database rules restrict each user to their own expense records.

## Commands

```powershell
npm run dev
npm run lint
npm run build
```
