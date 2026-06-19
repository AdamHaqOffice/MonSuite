# MonSuite V2

MonSuite V2 is a Netlify-ready React app for a secure monitor-product sales/support hub. This version adds the first working Setup Configurator MVP.

It includes:

- Google login using Firebase Authentication
- Protected hub routing
- Modern MonSuite hub page
- Product Knowledge starter page
- Manuals & Downloads starter page
- Firmware & Feature Updates starter page
- Support/ticketing link page
- Setup Configurator MVP with:
  - grid canvas
  - draggable monitors and sensors
  - wall drawing
  - ethernet connection drawing
  - tubing connection drawing
  - basic connection validation
  - generated parts list
  - save/load draft in the browser
  - JSON export
- Roadmap placeholders for Parts & Costing and AI Assistant

## Tech stack

- Vite
- React
- React Router
- Firebase Auth
- Plain CSS
- Netlify deploy config

## Browser-only deployment workflow

If you do not have npm on your machine, upload these files to GitHub through the browser and let Netlify build the app.

1. Create a GitHub repo.
2. Upload the contents of this folder to the repo.
3. Create/import the site in Netlify from that GitHub repo.
4. Use build command `npm run build`.
5. Use publish directory `dist`.
6. Add the environment variables below in Netlify.
7. Deploy.

`netlify.toml` is already included for build settings and SPA routing.

## Environment variables

Add these in Netlify Site configuration → Environment variables:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_ALLOWED_EMAIL_DOMAINS=abatement.ca,abatement.com
VITE_SUPPORT_TICKETING_URL=https://your-ticketing-system-link.com
```

The Firebase values come from Firebase Console → Project settings → General → Your apps → Web app config.

`VITE_ALLOWED_EMAIL_DOMAINS` is optional. Leave it blank during testing to allow any Google account. Use comma-separated domains with no `@` symbol.

## Setup Configurator MVP notes

The setup builder uses starter product data in:

```txt
src/data/setupInventory.js
```

Current device rules:

- PPM4, RPM, and all sensor modules have two ethernet ports.
- Sensors can daisy-chain sensor to sensor.
- PPM4, RPM, and the pressure sensor can start tubing runs.
- Tubing runs end at room/reference points on the grid.
- Cable lengths and cable SKUs are placeholders until final inventory data is added.

To update inventory, edit `src/data/setupInventory.js`.

## Important security note

This V2 protects the app in the browser using Firebase Auth. That is fine for an early internal prototype.

Before uploading sensitive files, firmware, pricing, or internal-only documents, add server-side access checks through secure storage rules, Netlify Functions, Supabase policies, or another backend authorization layer. Do not rely only on frontend hiding for sensitive content.

## Suggested next steps

1. Add real cable SKUs and tubing length logic.
2. Add pricing fields to inventory items.
3. Add product photos/icons for canvas items.
4. Add room labels, doors, and windows.
5. Add PDF export for customer-facing setup summaries.
6. Move saved layouts to a database after the MVP works.


## Netlify dependency install note

This clean package intentionally does not include `package-lock.json`. Netlify will install dependencies from the public npm registry using `.npmrc`:

```txt
registry=https://registry.npmjs.org/
```

If a previous deploy failed because `package-lock.json` referenced an internal registry, delete the old lockfile from GitHub and upload this clean version.
