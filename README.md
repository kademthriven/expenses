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

## Redux state

The app uses Redux Toolkit and React Redux. The root store combines two focused reducers:

- `auth`: login status, Firebase ID/bearer token, user ID, email, and auth loading state.
- `expenses`: all fetched and newly created expenses plus load/save/update/delete request state.
- `theme`: premium activation and the current light/dark appearance.

Protected Firebase REST calls read the current user ID and bearer token from the auth reducer. Expense totals and premium eligibility are selectors derived from the expense reducer; the **Activate Premium** button appears when recorded expenses reach ₹10,000. Activating premium enables the reducer-backed theme toggle and CSV expense download.

## Commands

```powershell
npm run dev
npm test
npm run test:watch
npm run lint
npm run build
```

The automated test suite uses Vitest with React Testing Library, jest-dom, user-event, and jsdom. It contains 20 tests covering authentication state and interactions, connected forms, expense state and premium eligibility, theme behavior, rendering, and user interaction.
