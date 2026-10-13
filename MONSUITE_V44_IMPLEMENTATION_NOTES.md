# MonSuite V44 — Airflow Planner Flow Polish

V44 is a usability pass on the V43 scrubber/airflow planner. The goal was to make the setup workflow feel like a guided sales/customer tool from first input through final report.

## Main improvements

- Added a clear planner flow: Job → Room → Select → Layout → Monitor → Report.
- Added setup readiness scoring and next-action guidance.
- Added a selected setup panel that explains the recommended setup in plain language.
- Added one-click **Build recommended setup** to place the selected scrubber quantity and add an RPM when pressure/reporting is expected.
- Added a report snapshot so users see the report summary before opening the full text.
- Improved the generated report format with numbered sections and clearer customer handoff language.
- Collapsed the product-fit cheat sheet so it supports the workflow without overwhelming it.
- Updated app version/cache to v44.0.0.

## Intended user flow

1. Pick the closest real job preset.
2. Confirm the project/application, hazard, goal, site condition, and location.
3. Enter room dimensions or known volume.
4. Confirm ducting, power, filter loading, adjacent occupied/patient areas, and documentation need.
5. Review scrubber recommendation cards.
6. Select the setup to build around.
7. Use Build recommended setup or drag equipment manually.
8. Check layout, monitoring, and bus load status.
9. Preview/copy/download the customer handoff report.

## Important limits

This remains a planning/sales-support tool. It does not certify compliance, replace engineering review, or prove a pressure relationship. Field pressure must be verified with a calibrated monitor whenever negative or positive pressure is required or claimed.
