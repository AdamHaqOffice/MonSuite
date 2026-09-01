import { useMemo, useState } from 'react';
import AppShell from '../components/AppShell.jsx';
import {
  achTargets,
  externalPressureResources,
  pressureFailureChecks,
  pressureGlossary,
  pressureTargets,
} from '../data/pressureMonitoringGuide.js';

function formatNumber(value, digits = 0) {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(value);
}

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

  function updateCalc(field, value) {
    setCalc((current) => ({ ...current, [field]: value }));
  }

  return (
    <AppShell user={user} onLogout={onLogout} theme={theme} onToggleTheme={onToggleTheme}>
      <main className="page-wrap pressure-page">
        <section className="hero-card pressure-hero">
          <div>
            <p className="eyebrow">Pressure monitoring guide</p>
            <h1>Pressure Guide</h1>
            <p>
              Practical notes for explaining negative pressure, positive pressure, ACH, scrubbers, alarms, and what a monitor can prove on a job site.
            </p>
            <div className="hero-action-row">
              <a className="button primary" href="/at-connect">Connect a monitor</a>
              <a className="button secondary" href="/scrubber-selector">Open Scrubber Selector</a>
            </div>
          </div>
          <div className="hero-panel pressure-proof-panel">
            <span>Core purpose</span>
            <strong>Prove air direction</strong>
            <small>Live status · alarms · history · documentation</small>
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
              <input type="number" min="1" value={calc.length} onChange={(event) => updateCalc('length', event.target.value)} />
            </label>
            <label>
              Width ft
              <input type="number" min="1" value={calc.width} onChange={(event) => updateCalc('width', event.target.value)} />
            </label>
            <label>
              Height ft
              <input type="number" min="1" value={calc.height} onChange={(event) => updateCalc('height', event.target.value)} />
            </label>
            <label>
              Target ACH
              <input type="number" min="1" value={calc.targetAch} onChange={(event) => updateCalc('targetAch', event.target.value)} />
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
              HEPA filters are common in negative air machines, air scrubbers, isolation support, asbestos containment, mold remediation, and hospital construction zones.
              MERV ratings are mostly used for building HVAC filters. MERV 13 is commonly discussed for improved building ventilation; HEPA is higher-efficiency filtration for portable air cleaning and containment work.
            </p>
          </article>
        </section>

        <section className="workflow-grid">
          <article className="workflow-card hospital">
            <p className="eyebrow">Hospitals</p>
            <h2>How hospitals use pressure monitoring</h2>
            <p>
              Hospitals use pressure relationships to protect patients, staff, clean spaces, and occupied clinical areas. A pressure monitor gives infection control and facilities teams a visible, recordable answer to one question: is the room or work zone still in the correct pressure relationship?
            </p>
            <ul>
              <li>Airborne isolation rooms and temporary isolation</li>
              <li>Operating rooms and protective environments</li>
              <li>Construction zones beside occupied clinical areas</li>
              <li>Pressure alarms, daily/continuous logs, and documentation</li>
            </ul>
          </article>
          <article className="workflow-card construction">
            <p className="eyebrow">Construction + abatement</p>
            <h2>How job sites use pressure monitoring</h2>
            <p>
              Construction, remediation, and abatement sites use pressure monitoring to control contamination. The fan or negative air machine creates the pressure; the pressure monitor proves whether the setup is holding over time.
            </p>
            <ol>
              <li>Build and seal the containment area.</li>
              <li>Use HEPA negative air machines or scrubbers as specified.</li>
              <li>Maintain negative pressure to the surrounding clean area.</li>
              <li>Monitor continuously and keep logs for the project file.</li>
            </ol>
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
            <h2>Use AT Connect when alarm history and online pressure data matter.</h2>
            <p>
              For connected PPM4 or RPM jobs, use the AT Connect mobile app first so users can receive push alarm notifications on their phone. The web portal is useful for reviewing and downloading records online.
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
