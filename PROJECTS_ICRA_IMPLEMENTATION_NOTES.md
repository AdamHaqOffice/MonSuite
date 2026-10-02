# MonSuite Projects / ICRA Implementation Notes

Build: v40.0.0 — Projects ICRA CSV Foundation

## What was inspected before implementation

- Routing and navigation: `src/App.jsx`, `src/components/AppShell.jsx`, `src/data/hubSections.js`
- Existing storage/auth pattern: Firebase auth and optional Firestore in `src/firebase.js`; local fallback/admin content pattern in `src/utils/adminContent.js`
- Existing product/device/sensor data: `src/data/productCatalog.js`, `src/data/setupInventory.js`
- Existing reporting/export patterns: Scrubber/Airflow Planner summary export and local download approach
- Existing charting/UI approach: no formal chart library; existing pages use React/CSS/SVG, so Projects uses lightweight inline SVG trend charts
- Existing PWA/versioning: `src/data/appInfo.js`, `public/version.json`, `public/sw.js`

## Architecture added

New generic project framework pieces:

- `src/pages/ProjectsPage.jsx`
- `src/data/projectTemplates.js`
- `src/utils/projectStorage.js`
- `src/utils/projectCsvImport.js`

The current implementation uses browser local storage for project state, matching the app's existing fallback storage approach. It is structured so a future Firestore/IndexedDB backend can replace `projectStorage.js` without rewriting the page or CSV analysis engine.

## Implemented scope

- Projects navigation and hub card
- ICRA / Healthcare Construction as first project type
- Project creation fields: project name, number, facility, building, floor, department, room/area, contractor, infection prevention contact, facility contact, project manager, dates, status, containment type, notes
- Timestamped/versioned project requirements
- Abatement Link CSV import profile abstraction
- CSV preview before import
- SHA-256 hash preservation
- Raw CSV preservation inside the local import record
- Duplicate/overlap detection by normalized measurement key
- Normalized measurement model
- Data-quality warnings for unknown columns, timestamp problems, duplicate records, and likely data gaps
- Data availability and no-data handling
- Excursion detection against configured requirements
- Corrective action documentation stored separately from raw measurements
- Equipment list derived from imported devices, plus manual equipment entry
- Project dashboard and basic trend charts
- Final report HTML export designed for browser print/save-to-PDF
- Audit/event timeline and report-generation record

## Important limitation

This is the first implementation pass. It does not claim ICRA compliance and should not be used as a regulatory certification engine. It reports measured evidence against user-configured project requirements.

For large real projects with tens of thousands of records, a proper backend or IndexedDB storage layer should replace localStorage. The import/analysis architecture was kept separate so this can be upgraded without rebuilding the UI.
