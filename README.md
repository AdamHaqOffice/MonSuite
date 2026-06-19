# MonSuite V3

MonSuite V3 is a Netlify-hosted React/Vite sales support portal with Google login and a CAD-lite setup builder.

## V3 setup builder updates

- Fixed ethernet/tubing line anchoring so lines connect to the placed item edges instead of drifting away from the units/sensors.
- Added **Power Bus** inventory item.
- Added power draw data:
  - PPM4 / RPM expansion bus capacity: 200mA
  - Pressure Sensor Module: 65mA
  - Velocity / ACH Sensor Module: 100mA
  - Temp/RH Sensor Module: 50mA
  - Particle Sensor Module: 120mA
  - Cellular Module: 365mA
- Added lightning bolt warnings when a chain exceeds expansion bus limits.
- Added advisory warnings for devices above 90mA unless a Power Bus is present on the ethernet chain.
- Export JSON now includes power warnings.

## Netlify setup

Build command:

```txt
npm run build
```

Publish directory:

```txt
dist
```

Keep this environment variable in Netlify to force public npm registry installs:

```txt
NPM_CONFIG_REGISTRY=https://registry.npmjs.org/
```

## Required environment variables

```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
VITE_ALLOWED_EMAIL_DOMAINS=abatement.ca,abatement.com
VITE_SUPPORT_TICKETING_URL=https://your-ticketing-system-link.com
```

## Deploying browser-only

1. Unzip this project.
2. Upload the project contents to your GitHub repo root.
3. Make sure `package-lock.json` is not in the repo.
4. Make sure `.npmrc` is in the repo root.
5. In Netlify, run **Clear cache and deploy site**.

