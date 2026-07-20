# Pennywise signup

Responsive React signup and login experience backed by Firebase Authentication.

## Firebase setup

1. Create or open a Firebase project.
2. In **Authentication → Sign-in method**, enable **Email/Password**.
3. In **Project settings → Your apps**, register a Web app and copy its Firebase configuration.
4. Copy `.env.example` to `.env.local` and replace each placeholder with the matching configuration value.
5. Restart the development server after changing environment values.

```powershell
Copy-Item .env.example .env.local
npm run dev
```

New accounts appear in **Firebase console → Build → Authentication → Users**. Firebase Authentication stores the account identity, including its UID and email, in the Firebase project's managed user database; passwords are never exposed to this app.

## Commands

```powershell
npm run dev
npm run lint
npm run build
```
