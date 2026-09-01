# MonSuite V36

MonSuite is an internal Abatement Technologies support/sales portal for monitor products, firmware, manuals, pressure monitoring guidance, AT Connect, AbateBot, setup planning, and scrubber selection.

## V36 highlights

- Sales-ready Scrubber Selector using real Abatement scrubbers only.
- Copyable and downloadable scrubber sales summary for quotes, tickets, and follow-ups.
- Admin Mode can publish News, Downloads, and Firmware History to Firebase/Firestore when configured.
- Local admin staging fallback remains available when Firestore is not configured.
- Visible app version, update banner, refresh tool, and MonSuite-only cache clearing.
- Human design cleanup: smaller headers, less marketing copy, calmer cards and panels.

## Admin publishing

See `FIREBASE_ADMIN_MODE_SETUP.md` for Firestore collections and suggested rules.

## Build

```bash
npm install
npm run build
```
