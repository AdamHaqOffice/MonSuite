# MonSuite V38

MonSuite is an internal Abatement Technologies support/sales portal for monitor products, firmware, manuals, pressure monitoring guidance, AT Connect, AbateBot, setup planning, and air scrubber recommendations.

## V38 highlights

- Reorganized the combined Airflow Planner so it is usable as a real sales/support workspace.
- Left side is now the report form, center is the large planning canvas, and right side is the live recommendation/report panel.
- Moved scrubbers, monitors, sensors, and duct options into a clean equipment dock above the canvas.
- Made the layout canvas larger with clearer room sizing and visible resize handles.
- Placed equipment can now be dragged around after it is dropped, with a visible remove control.
- Added quick actions to place the recommended scrubber count and add an RPM when pressure monitoring is recommended.
- Added a layout check that compares the actual drawn plan against the recommended scrubber quantity.
- Kept the real scrubber list only and preserved site-condition filtering for residential/wet areas.

## Admin publishing

See `FIREBASE_ADMIN_MODE_SETUP.md` for Firestore collections and suggested rules.

## Build

```bash
npm install
npm run build
```
