import { useMemo, useState } from 'react';
import AppShell from '../components/AppShell.jsx';
import {
  budgetPriorities,
  canadaProvinces,
  exhaustSetupOptions,
  hazardOptions,
  powerOptions,
  primaryGoalOptions,
  projectTypes,
  selectorDisclaimer,
  siteEnvironmentOptions,
  supportPortalUrl,
  unitSystemOptions,
  usStates,
} from '../data/scrubberSelectorData.js';
import { formatNumber, getScrubberRecommendation } from '../utils/scrubberSelectorEngine.js';

const defaultForm = {
  country: 'United States',
  stateProvince: 'California',
  city: '',
  projectType: 'hospital_construction',
  hazard: 'construction_dust',
  primaryGoal: 'clean_air_negative_pressure',
  siteEnvironment: 'commercial_industrial',
  length: '30',
  width: '20',
  height: '10',
  unitSystem: 'feet',
  roomCount: '1',
  occupiedAdjacentArea: 'unknown',
  patientOccupiedAdjacent: 'unknown',
  exhaustSetup: 'outside',
  powerAvailable: 'unknown',
  targetAch: '',
  targetPressure: '',
  roomType: 'temporary_containment',
  ductLength: '',
  ductBends: '',
  ductType: 'unknown',
  ductDiameter: '',
  filterPreference: 'unknown',
  needDocumentation: 'unknown',
  knownStandard: '',
  noiseSensitivity: 'medium',
  budgetPriority: 'best_fit',
  contactName: '',
  contactCompany: '',
  contactEmail: '',
  contactPhone: '',
  contactNotes: '',
};

function optionLabel(options, value) {
  return options.find((option) => option.id === value)?.label || value || '—';
}

function Field({ label, children, note, required = false }) {
  return (
    <label className="selector-field">
      <span>{label}{required ? <em className="required-dot"> required</em> : null}</span>
      {children}
      {note ? <small>{note}</small> : null}
    </label>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div className="selector-stat">
      <span>{label}</span>
      <strong>{value}</strong>
      {sub ? <small>{sub}</small> : null}
    </div>
  );
}

function ProductFitNote({ product }) {
  return (
    <div className="product-fit-note">
      <strong>{product.shortName || product.model}</strong>
      <span>{product.salesRole || product.bestUse}</span>
    </div>
  );
}

function ResultCard({ rec, rank }) {
  const topPick = rank === 0;
  return (
    <article className={`scrubber-result-card ${topPick ? 'top-pick' : ''}`}>
      <div className="result-card-top">
        <div>
          <p className="eyebrow">{topPick ? 'Recommended quote setup' : `Backup option ${rank + 1}`}</p>
          <h2>{rec.quantity} × {rec.product.displayName}</h2>
          <p>{rec.product.shortName || rec.product.model} · {rec.product.productFamily}</p>
        </div>
        <span className={rec.meetsTarget ? 'status-pill success' : 'status-pill warning'}>
          {rec.meetsTarget ? 'Meets design airflow' : 'Review airflow'}
        </span>
      </div>

      <div className="selector-stats-grid compact real-sales-stats">
        <Stat label="Scrubbers needed" value={rec.quantity} />
        <Stat label="Effective CFM / unit" value={`${formatNumber(rec.effectiveCfm, 0)} CFM`} sub={`Rated ${formatNumber(rec.ratedCfm, 0)} CFM`} />
        <Stat label="Total effective CFM" value={`${formatNumber(rec.totalEffectiveCfm, 0)} CFM`} />
        <Stat label="Estimated ACH" value={formatNumber(rec.estimatedAch, 1)} sub={`Target ${formatNumber(rec.targetAch, 1)} ACH`} />
        <Stat label="Electrical estimate" value={`${formatNumber(rec.totalAmps, 1)}A`} sub={`${formatNumber(rec.estimatedWatts, 0)}W`} />
      </div>

      <div className="selector-detail-grid">
        <div>
          <strong>Why this unit</strong>
          <ul>
            <li>{rec.product.bestUse}</li>
            <li>{rec.product.cabinetGuidance}</li>
            <li>{rec.product.filtration?.hepaClass || 'HEPA'}: {rec.product.filtration?.hepaEfficiency}</li>
            {rec.product.filtration?.carbonOption ? <li>Carbon option available for odor/VOC support.</li> : null}
            <li>{rec.product.airflow?.ratingBasis}</li>
          </ul>
        </div>
        <div>
          <strong>Quote notes / accessories</strong>
          <ul>
            {rec.accessories.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      </div>

      {rec.warnings.length ? (
        <div className="selector-warning-list compact-warning-list">
          {rec.warnings.slice(0, topPick ? 8 : 5).map((warning) => <p key={warning}>⚠ {warning}</p>)}
        </div>
      ) : null}
    </article>
  );
}

export default function ScrubberSelectorPage({ user, onLogout, theme, onToggleTheme }) {
  const [form, setForm] = useState(defaultForm);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);

  const locations = form.country === 'Canada' ? canadaProvinces : usStates;
  const result = useMemo(() => getScrubberRecommendation(form), [form]);
  const top = result.recommendations?.[0];

  function updateField(field, value) {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === 'country') {
        next.stateProvince = value === 'Canada' ? 'Ontario' : value === 'Other' ? 'Other / Not sure' : 'California';
      }
      if (field === 'projectType') {
        if (value === 'hospital_airborne_isolation') {
          next.hazard = 'airborne_infection';
          next.primaryGoal = 'clean_air_negative_pressure';
          next.siteEnvironment = 'healthcare_construction';
          next.exhaustSetup = 'outside';
        } else if (value === 'hospital_construction') {
          next.hazard = 'construction_dust';
          next.primaryGoal = 'clean_air_negative_pressure';
          next.siteEnvironment = 'healthcare_construction';
          next.exhaustSetup = 'outside';
        } else if (value === 'healthcare_positive_pressure') {
          next.hazard = 'airborne_infection';
          next.primaryGoal = 'clean_air_positive_pressure';
          next.siteEnvironment = 'healthcare_construction';
        } else if (value === 'asbestos') {
          next.hazard = 'asbestos';
          next.primaryGoal = 'negative_pressure';
          next.exhaustSetup = 'outside';
        } else if (value === 'mold') {
          next.hazard = 'mold_spores';
          next.primaryGoal = 'clean_air_negative_pressure';
          next.siteEnvironment = 'wet_damp_restoration';
        } else if (value === 'silica' || value === 'general_construction_dust') {
          next.hazard = value === 'silica' ? 'silica_dust' : 'construction_dust';
          next.primaryGoal = 'clean_air_negative_pressure';
          next.exhaustSetup = 'outside';
        } else if (value === 'general_air_cleaning') {
          next.hazard = 'general_particulate';
          next.primaryGoal = 'clean_air';
          next.exhaustSetup = 'recirculate';
        } else if (value === 'odor_voc') {
          next.hazard = 'odor_voc';
          next.primaryGoal = 'clean_air';
          next.exhaustSetup = 'recirculate';
        }
      }
      return next;
    });
  }

  function requestQuoteText() {
    const parts = [
      'Scrubber Selector result',
      `Name: ${form.contactName || '—'}`,
      `Company: ${form.contactCompany || '—'}`,
      `Email: ${form.contactEmail || '—'}`,
      `Country: ${form.country}`,
      `Location: ${form.stateProvince}${form.city ? `, ${form.city}` : ''}`,
      `Project type: ${optionLabel(projectTypes, form.projectType)}`,
      `Hazard: ${optionLabel(hazardOptions, form.hazard)}`,
      `Primary goal: ${optionLabel(primaryGoalOptions, form.primaryGoal)}`,
      `Room: ${form.length} × ${form.width} × ${form.height} ${form.unitSystem}`,
      top ? `Top recommendation: ${top.quantity} × ${top.product.displayName}` : 'No recommendation generated yet',
      top ? `Estimated installed airflow: ${formatNumber(top.totalEffectiveCfm, 0)} CFM` : '',
      top ? `Estimated ACH: ${formatNumber(top.estimatedAch, 1)}` : '',
      `Monitor: ${result.monitorLabel || '—'}`,
      `Notes: ${form.contactNotes || '—'}`,
    ].filter(Boolean);
    return encodeURIComponent(parts.join('\n'));
  }

  return (
    <AppShell user={user} onLogout={onLogout} theme={theme} onToggleTheme={onToggleTheme}>
      <main className="page-wrap scrubber-selector-page real-scrubber-selector-page">
        <section className="hero-card scrubber-hero real-selector-hero">
          <div>
            <p className="eyebrow">Scrubber Selector</p>
            <h1>Real scrubber recommendations for sales conversations.</h1>
            <p>
              Enter the job type, room size, hazard, pressure goal, power, and site conditions. MonSuite estimates how many Abatement scrubbers are needed and whether a pressure monitor should be quoted.
            </p>
          </div>
          <div className="hero-panel selector-mini-panel">
            <span>Real products only</span>
            <strong>{top ? `${top.quantity} × ${top.product.shortName || top.product.model}` : 'Awaiting inputs'}</strong>
            <small>{top ? result.monitorLabel : 'PRED750 · HC800FD · BD2K · H2KM · PAS2400 · PAS5000'}</small>
          </div>
        </section>

        <section className="status-callout warning selector-disclaimer">
          <strong>Sales estimator — verify before quoting as final.</strong>
          <p>{selectorDisclaimer}</p>
        </section>

        <section className="real-selector-grid">
          <form className="selector-form real-selector-form" onSubmit={(event) => event.preventDefault()}>
            <div className="section-heading compact-heading">
              <p className="eyebrow">Inputs</p>
              <h2>What does the customer need?</h2>
            </div>

            <div className="selector-form-grid two-column-inputs">
              <Field label="Project type" required>
                <select value={form.projectType} onChange={(event) => updateField('projectType', event.target.value)}>
                  {projectTypes.map((type) => <option value={type.id} key={type.id}>{type.label}</option>)}
                </select>
              </Field>
              <Field label="Hazard / concern" required>
                <select value={form.hazard} onChange={(event) => updateField('hazard', event.target.value)}>
                  {hazardOptions.map((hazard) => <option value={hazard.id} key={hazard.id}>{hazard.label}</option>)}
                </select>
              </Field>
              <Field label="Main goal" required>
                <select value={form.primaryGoal} onChange={(event) => updateField('primaryGoal', event.target.value)}>
                  {primaryGoalOptions.map((goal) => <option value={goal.id} key={goal.id}>{goal.label}</option>)}
                </select>
              </Field>
              <Field label="Site / cabinet fit" note="BD2K for residential/wet/scratch-sensitive work; H2KM metal for general commercial/industrial work.">
                <select value={form.siteEnvironment} onChange={(event) => updateField('siteEnvironment', event.target.value)}>
                  {siteEnvironmentOptions.map((option) => <option value={option.id} key={option.id}>{option.label}</option>)}
                </select>
              </Field>
            </div>

            <div className="section-heading compact-heading input-subsection">
              <p className="eyebrow">Space</p>
              <h2>Room / containment size</h2>
            </div>
            <div className="selector-form-grid compact-dimension-grid">
              <Field label="Unit" required>
                <select value={form.unitSystem} onChange={(event) => updateField('unitSystem', event.target.value)}>
                  {unitSystemOptions.map((option) => <option value={option.id} key={option.id}>{option.label}</option>)}
                </select>
              </Field>
              <Field label={`Length ${form.unitSystem === 'meters' ? 'm' : 'ft'}`} required>
                <input type="number" min="0" step="0.1" value={form.length} onChange={(event) => updateField('length', event.target.value)} />
              </Field>
              <Field label={`Width ${form.unitSystem === 'meters' ? 'm' : 'ft'}`} required>
                <input type="number" min="0" step="0.1" value={form.width} onChange={(event) => updateField('width', event.target.value)} />
              </Field>
              <Field label={`Height ${form.unitSystem === 'meters' ? 'm' : 'ft'}`} required>
                <input type="number" min="0" step="0.1" value={form.height} onChange={(event) => updateField('height', event.target.value)} />
              </Field>
              <Field label="Areas / rooms">
                <input type="number" min="1" step="1" value={form.roomCount} onChange={(event) => updateField('roomCount', event.target.value)} />
              </Field>
              <Field label="Occupied adjacent space?">
                <select value={form.occupiedAdjacentArea} onChange={(event) => updateField('occupiedAdjacentArea', event.target.value)}>
                  <option value="unknown">Unknown</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </Field>
            </div>

            <div className="section-heading compact-heading input-subsection">
              <p className="eyebrow">Setup</p>
              <h2>Air route and power</h2>
            </div>
            <div className="selector-form-grid two-column-inputs">
              <Field label="Air route" required>
                <select value={form.exhaustSetup} onChange={(event) => updateField('exhaustSetup', event.target.value)}>
                  {exhaustSetupOptions.map((setup) => <option value={setup.id} key={setup.id}>{setup.label}</option>)}
                </select>
              </Field>
              <Field label="Power available">
                <select value={form.powerAvailable} onChange={(event) => updateField('powerAvailable', event.target.value)}>
                  {powerOptions.map((option) => <option value={option.id} key={option.id}>{option.label}</option>)}
                </select>
              </Field>
              <Field label="Priority">
                <select value={form.budgetPriority} onChange={(event) => updateField('budgetPriority', event.target.value)}>
                  {budgetPriorities.map((priority) => <option value={priority.id} key={priority.id}>{priority.label}</option>)}
                </select>
              </Field>
              <Field label="Country / region">
                <select value={form.country} onChange={(event) => updateField('country', event.target.value)}>
                  <option>United States</option>
                  <option>Canada</option>
                  <option>Other</option>
                </select>
              </Field>
              <Field label="State / province">
                {form.country === 'Other' ? (
                  <input value={form.stateProvince} onChange={(event) => updateField('stateProvince', event.target.value)} />
                ) : (
                  <select value={form.stateProvince} onChange={(event) => updateField('stateProvince', event.target.value)}>
                    {locations.map((item) => <option key={item}>{item}</option>)}
                  </select>
                )}
              </Field>
              <Field label="City"><input value={form.city} onChange={(event) => updateField('city', event.target.value)} /></Field>
            </div>

            <button className="button secondary small advanced-toggle" type="button" onClick={() => setShowAdvanced((current) => !current)}>
              {showAdvanced ? 'Hide advanced details' : 'Add known ACH, pressure, ducting, or spec'}
            </button>

            {showAdvanced ? (
              <div className="advanced-options-panel polished-advanced-panel">
                <div className="selector-form-grid two-column-inputs">
                  <Field label="Known target ACH" note="Leave blank to use MonSuite defaults by job type.">
                    <input type="number" min="0" step="0.1" value={form.targetAch} onChange={(event) => updateField('targetAch', event.target.value)} />
                  </Field>
                  <Field label="Known target pressure" note="Example: -2.5 Pa or -0.02 inWC">
                    <input value={form.targetPressure} onChange={(event) => updateField('targetPressure', event.target.value)} />
                  </Field>
                  <Field label="Known standard/specification">
                    <input value={form.knownStandard} onChange={(event) => updateField('knownStandard', event.target.value)} placeholder="Facility ICRA, CSA Z317.13, project spec..." />
                  </Field>
                  <Field label="Existing or temporary">
                    <select value={form.roomType} onChange={(event) => updateField('roomType', event.target.value)}>
                      <option value="temporary_containment">Temporary containment</option>
                      <option value="existing_room">Existing room</option>
                      <option value="new_or_renovated">New/renovated room</option>
                    </select>
                  </Field>
                  <Field label="Duct length ft"><input type="number" min="0" step="1" value={form.ductLength} onChange={(event) => updateField('ductLength', event.target.value)} /></Field>
                  <Field label="Duct bends"><input type="number" min="0" step="1" value={form.ductBends} onChange={(event) => updateField('ductBends', event.target.value)} /></Field>
                  <Field label="Duct type">
                    <select value={form.ductType} onChange={(event) => updateField('ductType', event.target.value)}>
                      <option value="unknown">Unknown</option>
                      <option value="rigid">Rigid</option>
                      <option value="flex">Flex</option>
                    </select>
                  </Field>
                  <Field label="Need logs/reports?">
                    <select value={form.needDocumentation} onChange={(event) => updateField('needDocumentation', event.target.value)}>
                      <option value="unknown">Unknown</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </Field>
                </div>
              </div>
            ) : null}
          </form>

          <aside className="selector-summary-card real-sales-answer-card">
            <p className="eyebrow">Sales answer</p>
            {result.errors?.length ? (
              <div className="selector-warning-list">
                {result.errors.map((error) => <p key={error}>⚠ {error}</p>)}
              </div>
            ) : (
              <>
                <h2>{top ? `${top.quantity} × ${top.product.shortName || top.product.model}` : 'Enter project details'}</h2>
                <p className="sales-answer-line">{result.salesAnswer}</p>
                <div className="selector-stats-grid compact">
                  <Stat label="Room volume" value={`${formatNumber(result.calculations.roomVolume, 0)} ft³`} sub={`${result.calculations.rooms || 1} room/area`} />
                  <Stat label="Design airflow" value={`${formatNumber(result.calculations.designCfm, 0)} CFM`} sub={`${formatNumber(result.calculations.targetAch, 1)} ACH × ${formatNumber(result.calculations.safetyFactor, 2)} safety`} />
                  <Stat label="Installed estimate" value={top ? `${formatNumber(top.totalEffectiveCfm, 0)} CFM` : '—'} sub={`${formatNumber(result.calculations.deratingFactor * 100, 0)}% airflow derating`} />
                  <Stat label="Monitor" value={result.monitorRequirement === 'optional' ? 'Optional' : 'Quote it'} sub={result.monitorLabel} />
                </div>
                <div className="selector-rule-card real-rule-card">
                  <strong>{result.rule?.name}</strong>
                  <p>{result.rule?.note}</p>
                  <ul>
                    <li>Project: {optionLabel(projectTypes, form.projectType)}</li>
                    <li>Hazard: {optionLabel(hazardOptions, form.hazard)}</li>
                    <li>Goal: {optionLabel(primaryGoalOptions, form.primaryGoal)}</li>
                    <li>Pressure: {result.rule?.pressureDirection} · {result.calculations.targetPressure}</li>
                    <li>Filter: {result.rule?.filter}</li>
                  </ul>
                </div>
              </>
            )}
          </aside>
        </section>

        <section className="selector-results-section">
          <div className="section-heading">
            <p className="eyebrow">Real Abatement equipment only</p>
            <h2>Recommended scrubber setup</h2>
            <p>MonSuite ranks real scrubbers by design airflow, job type, cabinet/site fit, power, ducting derating, and whether pressure monitoring is expected.</p>
          </div>
          <div className="scrubber-results-list">
            {result.recommendations?.map((rec, index) => <ResultCard rec={rec} rank={index} key={rec.product.id} />)}
          </div>
        </section>

        <section className="selector-bottom-grid">
          <article className="selector-info-card product-lineup-card">
            <p className="eyebrow">Lineup logic</p>
            <h2>How MonSuite thinks</h2>
            <div className="product-fit-grid">
              {result.recommendations?.map((rec) => <ProductFitNote product={rec.product} key={rec.product.id} />)}
            </div>
            <p className="muted-copy">Small spaces lean toward PRED750 or HC800FD. Main containment work leans toward BD2K/H2KM. Larger 120V jobs lean toward PAS2400. Large 230V containments can use PAS5000 after power and access are confirmed.</p>
          </article>

          <article className="selector-info-card">
            <p className="eyebrow">Compliance/context note</p>
            <h2>{form.stateProvince}</h2>
            <p>{result.jurisdictionNote}</p>
            <p className="muted-copy">This selector estimates equipment for airflow, filtration, and pressure intent. It does not determine legal compliance. Final requirements depend on facility policy, project specification, consultant, and authority having jurisdiction.</p>
          </article>

          <article className="selector-info-card quote-card">
            <p className="eyebrow">Quote / review</p>
            <h2>Send this setup to the team</h2>
            <p>Use this when a customer needs review, pricing, final SKU selection, or confirmation from sales/support.</p>
            <button className="button secondary small" type="button" onClick={() => setShowLeadForm((current) => !current)}>
              {showLeadForm ? 'Hide contact fields' : 'Add customer/contact notes'}
            </button>
            {showLeadForm ? (
              <div className="selector-lead-form">
                <input placeholder="Name" value={form.contactName} onChange={(event) => updateField('contactName', event.target.value)} />
                <input placeholder="Company" value={form.contactCompany} onChange={(event) => updateField('contactCompany', event.target.value)} />
                <input placeholder="Email" value={form.contactEmail} onChange={(event) => updateField('contactEmail', event.target.value)} />
                <input placeholder="Phone" value={form.contactPhone} onChange={(event) => updateField('contactPhone', event.target.value)} />
                <textarea placeholder="Project notes" value={form.contactNotes} onChange={(event) => updateField('contactNotes', event.target.value)} />
              </div>
            ) : null}
            <a className="button primary full" href={`${supportPortalUrl}?description=${requestQuoteText()}`} target="_blank" rel="noreferrer">
              Request review / make a ticket
            </a>
          </article>
        </section>
      </main>
    </AppShell>
  );
}
