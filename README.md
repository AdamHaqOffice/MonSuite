# MonSuite V1

MonSuite V1 is a Netlify-ready starter web app for a secure monitor-product sales/support hub.

It includes:

- Google login using Firebase Authentication
- Protected hub routing
- Modern MonSuite hub page
- Product Knowledge starter page
- Manuals & Downloads starter page
- Firmware & Feature Updates starter page
- Support/ticketing link page
- Roadmap placeholders for Setup Configurator, Parts & Costing, and AI Assistant

## Tech stack

- Vite
- React
- React Router
- Firebase Auth
- Plain CSS
- Netlify deploy config

## First-time setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Firebase project

In Firebase:

1. Create a new project.
2. Add a web app.
3. Enable Authentication.
4. Enable the Google sign-in provider.
5. Copy the Firebase web app config values.

### 3. Add environment variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Fill in your Firebase values:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_APP_ID=your_app_id
```

Optional domain lock:

```env
VITE_ALLOWED_EMAIL_DOMAIN=yourcompany.com
```

Optional support/ticketing link:

```env
VITE_SUPPORT_TICKING_URL=https://your-ticketing-system-link.com
```

Note: The app code uses `VITE_SUPPORT_TICKETING_URL`. Make sure the variable is spelled exactly like this:

```env
VITE_SUPPORT_TICKETING_URL=https://your-ticketing-system-link.com
```

### 4. Run locally

```bash
npm run dev
```

### 5. Build for production

```bash
npm run build
```

## Deploying to Netlify

1. Push this project to GitHub.
2. Create a new Netlify site from the repo.
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Add the same environment variables in Netlify Site settings.
6. Deploy.

`netlify.toml` is already included for build settings and SPA routing.

## Important security note

This V1 protects the app in the browser using Firebase Auth. That is fine for an early internal hub prototype.

Before uploading sensitive files, firmware, pricing, or internal-only documents, add server-side access checks through secure storage rules, Netlify Functions, Supabase policies, or another backend authorization layer. Do not rely only on frontend hiding for sensitive content.

## Suggested next steps

1. Replace starter data in `src/data/hubSections.js` with real products, documents, and firmware records.
2. Add real document storage.
3. Add admin upload/edit pages.
4. Add database-backed product records.
5. Add search.
6. Add setup builder and parts/costing logic.
7. Add AI assistant after documents and product data are clean.
