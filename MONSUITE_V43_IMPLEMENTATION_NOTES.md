# MonSuite V43 Implementation Notes

## Goal

Make the Airflow Planner / scrubber setup section feel like a real sales and planning tool, not just a calculator.

## What changed

- The planner now compares multiple real Abatement scrubber options instead of only presenting one hidden top answer.
- The user can select a recommendation card and build the room layout around that selected option.
- The report now follows the selected option, shows other options considered, and includes sales-fit reasoning.
- HC800FD / HC800FDUV is included in the planner for healthcare/occupied-space use cases.
- The planner now shows what each scrubber is for:
  - PRED750: compact / portable / small rooms
  - HC800FD: healthcare / clean-space / occupied environment
  - BD2K: plastic 2,000 CFM class / residential / wet / finished spaces
  - H2KM: metal 2,000 CFM workhorse / commercial / industrial / abatement / healthcare construction
  - PAS2400: high-CFM 120V / larger containments / mobility/stairs
  - PAS5000: large containment / 230V / 30A class power
- Added planning inputs for filter-loading, room count, adjacent occupied areas, patient-adjacent areas, and planner priority.
- Added power/circuit estimates, total-weight estimate, and fit-labels such as "Clean single-unit fit", "Power must be confirmed", and "High airflow / possible overkill".

## Files changed

- `src/pages/ScrubberSelectorPage.jsx`
- `src/utils/scrubberSelectorEngine.js`
- `src/styles.css`
- `src/data/appInfo.js`
- `public/version.json`
- `public/sw.js`
- `package.json`
- `README.md`

## Validation performed

- Transpiled the changed JSX/JS files with TypeScript's JSX transpiler to catch syntax errors.
- Ran Node-based recommendation checks for healthcare, wet mold/restoration, and large-containment scenarios.

## Limitations

- This is still an estimating/sales planning tool. It does not replace field airflow testing, pressure verification, commissioning, project specifications, consultant/IH/IPAC direction, or AHJ requirements.
- A full Vite production build was not run in the sandbox because dependency installation is not reliable in this environment.
