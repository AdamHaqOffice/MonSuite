import '../technicalRefresh.css';
import { useMemo, useState } from 'react';
import AppShell from '../components/AppShell.jsx';
import {
  achTargets,
  externalPressureResources,
  pressureFailureChecks,
  pressureGlossary,
  pressureTargets,
} from '../data/pressureMonitoringGuide.js';
import {
  competitorMatrix,
} from '../data/salesGuideData.js';

function formatNumber(value, digits = 0) {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(value);
}

const technicalFeatures = [
  { label: 'Differential pressure monitoring', detail: 'Direct measurement of room-to-reference pressure', ours: 'Available', pattern: /pressure|multi.room environmental/i },
  { label: 'Remote / cloud dashboard', detail: 'Remote status visibility and trends', ours: 'Available', pattern: /cloud|dashboard|remote|real.time data|connected pressure|shared projects/i },
  { label: 'Alarm notifications', detail: 'Configured alarms sent to responsible users', ours: 'Available', pattern: /alert|alarm|escalation/i },
  { label: 'Environmental sensors', detail: 'Temperature and RH as monitored parameters', ours: 'Available', pattern: /temperature|environmental|multi.parameter/i },
  { label: 'Particle monitoring', detail: 'Particle sensing supported in the system', ours: 'Available', pattern: /particle/i },
  { label: 'PDF / scheduled reporting', detail: 'Automated formatted project reports', ours: 'Verify release', pattern: /report|documentation|records/i },
  { label: 'Alarm acknowledgement / escalation', detail: 'Response ownership and escalation history', ours: 'Verify release', pattern: /acknowledg|escalat|monitored service/i },
  { label: 'CSV / data export', detail: 'Historical data export and interoperability', ours: 'Verify release', pattern: /csv|excel|export/i },
  { label: 'Audit trail / corrective action', detail: 'Timestamped project response history', ours: 'Verify release', pattern: /audit|corrective|documentation|records/i },
  { label: 'BACnet / third-party integration', detail: 'Building-management and integration protocols', ours: 'Model dependent', pattern: /bacnet|third.party/i },
];

export default function PressureMonitoringPage({ user, onLogout, theme, onToggleTheme }) {
  const [calc, setCalc] = useState({ length: 12, width: 16, height: 9, targetAch: 12 });

  const achMath = useMemo(() => {
    const length = Number(calc.length) || 0;
    const width = Number(calc.width) || 0;
    const height = Number(calc.height) || 0;
    const targetAch = Number(calc.targetAch) || 0;
    const volume = length * width * height;
    const cfm = volume > 0 && targetAch > 0 ? (targetAch * volume) / 60 : 0;
    return { volume, cfm };
  }, [calc]);


  return (
    <AppShell user={user} onLogout={onLogout} theme={theme} onToggleTheme={onToggleTheme}>
      <main className="page-wrap pressure-page technical-comparison-page">
        <section className="technical-compare-hero">
          <p className="eyebrow">PRODUCT INTELLIGENCE / ENGINEERING REFERENCE</p>
          <h1>Technical Feature Comparison</h1>
          <p>Compare documented competitor capabilities against our current monitor and Abatement Link ecosystem. This is a technical capability reference—not a sales script.</p>
          <div className="technical-compare-stats">
            <span><strong>{competitorMatrix.length}</strong> Competitor platforms reviewed</span>
            <span><strong>{technicalFeatures.length}</strong> Capability categories</span>
            <span><strong>Evidence</strong> Vendor-described functions; verify before quoting</span>
          </div>
        </section>

        <section className="technical-matrix-section">
          <div className="section-heading">
            <p className="eyebrow">CAPABILITY MATRIX / FEATURE COVERAGE</p>
            <h2>What exists, what differs, and what needs verification</h2>
            <p>“Listed” means the existing competitor research identifies the feature. “Unconfirmed” does not mean absent. Our platform column separates documented hardware/cloud functions from features requiring confirmation or development.</p>
          </div>
          <div className="technical-matrix-scroll" role="region" aria-label="Technical competitor comparison" tabIndex={0}>
            <table className="technical-matrix">
              <thead><tr><th scope="col">Feature / capability</th><th scope="col">Abatement platform</th>{competitorMatrix.map((c) => <th scope="col" key={c.company}>{c.company}</th>)}</tr></thead>
              <tbody>{technicalFeatures.map((feature) => <tr key={feature.label}>
                <th scope="row">{feature.label}<small>{feature.detail}</small></th>
                <td><span className={'tech-status ' + (feature.ours === 'Available' ? 'available' : 'review')}>{feature.ours}</span></td>
                {competitorMatrix.map((c) => {
                  const offered = c.offers.some((item) => feature.pattern.test(item));
                  return <td key={c.company}><span className={'tech-status ' + (offered ? 'available':'unknown')}>{offered ? 'Listed' : 'Unconfirmed'}</span></td>;
                })}
              </tr>)}</tbody>
            </table>
          </div>
          <p className="technical-evidence-note">Status is based on the feature descriptions currently maintained in MonSuite, not independent certification or a live audit of vendors. Confirm model, software tier, integrations and current release before treating any capability as a procurement requirement.</p>
        </section>

        <section className="technical-competitor-review">
          <div className="section-heading"><p className="eyebrow">VENDOR BREAKDOWN</p><h2>Competitor architecture and differentiation</h2></div>
          <div className="technical-competitor-grid">
            {competitorMatrix.map((c) => <article key={c.company} className="technical-competitor-card">
              <p className="eyebrow">COMPETITOR PROFILE</p><h3>{c.company}</h3>
              <p>{c.marketSignal}</p>
              <strong>Documented feature set</strong>
              <ul>{c.offers.map((feature)=><li key={feature}>{feature}</li>)}</ul>
              <div className="technical-response"><strong>Product response / engineering consideration</strong><p>{c.monsuiteResponse}</p></div>
            </article>)}
          </div>
        </section>

        <section className="technical-gap-panel">
          <p className="eyebrow">GAPS / CONFIRMATION BACKLOG</p>
          <h2>Priority areas to validate in Abatement Link</h2>
          <div className="technical-gap-grid">
            <article><strong>Alarm escalation and acknowledgement</strong><p>Confirm workflow, escalation rules, assigned responder, and retained timestamps—not merely alert delivery.</p></article>
            <article><strong>Report generation</strong><p>Check scheduled PDFs, excursion summaries, data completeness, and final closeout packages by release.</p></article>
            <article><strong>Audit and integration</strong><p>Confirm change history, corrective-action traceability, export formats and future API/ERP integration support.</p></article>
          </div>
        </section>

        <section className="pressure-principle-grid">
          <article className="pressure-principle-card negative">
            <span>Negative pressure</span>
            <h2>Keep contaminated air from escaping.</h2>
            <p>
              Negative pressure means air is being pulled into a room or containment area. It is used when air inside the space may be dirty, infectious, dusty, or hazardous.
            </p>
            <ul>
              <li>Airborne infection isolation rooms</li>
              <li>Hospital construction zones</li>
              <li>Asbestos, mold, lead, and silica containment</li>
              <li>Temporary isolation or dirty utility spaces</li>
            </ul>
          </article>
          <article className="pressure-principle-card positive">
            <span>Positive pressure</span>
            <h2>Keep dirty air from entering.</h2>
            <p>
              Positive pressure means air is being pushed out of the protected space. It is used when the room itself needs protection from surrounding contamination.
            </p>
            <ul>
              <li>Operating rooms</li>
              <li>Sterile storage</li>
              <li>Protective environments</li>
              <li>Clean rooms, pharmacies, and sensitive clinical areas</li>
            </ul>
          </article>
        </section>

        <section className="section-heading">
          <p className="eyebrow">Reference points</p>
          <h2>Common pressure and ACH targets</h2>
          <p>
            These are planning reference points only. The required target depends on the job, facility policy, project specification, and authority having jurisdiction.
          </p>
        </section>

        <section className="reference-grid two-col">
          <article className="data-card">
            <h3>Pressure targets</h3>
            <div className="reference-table">
              {pressureTargets.map((item) => (
                <div className="reference-row" key={item.application}>
                  <strong>{item.application}</strong>
                  <span>{item.target}</span>
                  <small>{item.note}</small>
                </div>
              ))}
            </div>
          </article>
          <article className="data-card">
            <h3>ACH targets</h3>
            <div className="reference-table">
              {achTargets.map((item) => (
                <div className="reference-row" key={item.space}>
                  <strong>{item.space}</strong>
                  <span>{item.ach}</span>
                  <small>{item.note}</small>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="calculator-card ach-calculator-card">
          <div>
            <p className="eyebrow">Basic ACH math</p>
            <h2>Estimate airflow needed for a target ACH</h2>
            <p>
              Room volume = length × width × height. CFM needed = target ACH × room volume ÷ 60. This estimates airflow only; it does not prove pressure, containment, or code compliance.
            </p>
          </div>
          <div className="calc-grid">
            <label>
              Length ft
              <input type="number" min="1" value={calc.length} onChange={(event) => updateNumberField(setCalc, 'length', event.target.value)} />
            </label>
            <label>
              Width ft
              <input type="number" min="1" value={calc.width} onChange={(event) => updateNumberField(setCalc, 'width', event.target.value)} />
            </label>
            <label>
              Height ft
              <input type="number" min="1" value={calc.height} onChange={(event) => updateNumberField(setCalc, 'height', event.target.value)} />
            </label>
            <label>
              Target ACH
              <input type="number" min="1" value={calc.targetAch} onChange={(event) => updateNumberField(setCalc, 'targetAch', event.target.value)} />
            </label>
          </div>
          <div className="calc-result-strip">
            <div>
              <span>Room volume</span>
              <strong>{formatNumber(achMath.volume)} ft³</strong>
            </div>
            <div>
              <span>Required effective airflow</span>
              <strong>{formatNumber(achMath.cfm)} CFM</strong>
            </div>
          </div>
        </section>

        <section className="info-band pressure-relationship-band">
          <article>
            <h2>Pressure and ACH are related, but not the same.</h2>
            <p>
              ACH is about dilution and air cleaning. Pressure is about air direction. A room can be negative but still have poor ventilation, and a room can have strong filtration but fail pressure if doors are open, barriers leak, filters clog, fans fail, or HVAC systems fight each other.
            </p>
          </article>
          <article>
            <h3>HEPA vs MERV</h3>
            <p>
              HEPA filters are common in negative air machines, air scrubbers, isolation support, asbestos containment, mold remediation, and hospital construction zones. MERV ratings are mostly used for building HVAC filters.
            </p>
          </article>
        </section>

        <section className="section-heading">
          <p className="eyebrow">Troubleshooting</p>
          <h2>What causes pressure failure?</h2>
          <p>A manual reading shows one moment. Continuous monitoring and logs show what happened over time.</p>
        </section>

        <section className="checklist-grid">
          {pressureFailureChecks.map((check) => (
            <div className="check-card" key={check}>
              <span>✓</span>
              <p>{check}</p>
            </div>
          ))}
        </section>

        <section className="connect-pressure-card">
          <div>
            <p className="eyebrow">Remote alarms + records</p>
            <h2>Use AT Connect and Abatement Link when alarm history and online pressure data matter.</h2>
            <p>
              Use the AT Connect mobile app first for connected monitor setup and phone push alarm notifications. Abatement Link is the right home for live projects, project reports, user tracking, and audit records.
            </p>
          </div>
          <div className="connect-action-stack">
            <a className="button primary" href="https://play.google.com/store/apps/details?id=com.app.atconnect&hl=en_CA" target="_blank" rel="noreferrer">Get AT Connect app ↗</a>
            <a className="button secondary" href="https://connect.abatement.com" target="_blank" rel="noreferrer">Open web portal ↗</a>
          </div>
        </section>

        <section className="section-heading">
          <p className="eyebrow">Glossary</p>
          <h2>Plain-language definitions</h2>
        </section>

        <section className="glossary-grid">
          {pressureGlossary.map((item) => (
            <article className="glossary-card" key={item.term}>
              <h3>{item.term}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </section>

        <section className="resources-card">
          <div className="section-heading flush">
            <p className="eyebrow">More information</p>
            <h2>External reference links</h2>
            <p>
              These links are for background and training. Final requirements must come from the facility, project specification, consultant, infection prevention/control team, and AHJ.
            </p>
          </div>
          <div className="resource-link-grid">
            {externalPressureResources.map((resource) => (
              <a className="resource-link-card" href={resource.url} target="_blank" rel="noreferrer" key={resource.title}>
                <span>{resource.organization}</span>
                <strong>{resource.title}</strong>
                <small>{resource.description}</small>
              </a>
            ))}
          </div>
        </section>

        <section className="status-callout warning pressure-disclaimer">
          <strong>Important limitation</strong>
          <p>
            This section is educational and does not replace standards, HVAC design, commissioning, infection-control planning, pressure verification, exposure monitoring, or AHJ review. Pressure monitoring helps show whether the required pressure relationship was maintained over time; it does not prove the space is safe by itself.
          </p>
        </section>
      </main>
    </AppShell>
  );
}
