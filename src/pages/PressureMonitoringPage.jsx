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
  abatementLinkProjectValue,
  calculateRoi,
  competitorMatrix,
  formatCurrency,
  marketValuePillars,
  roiDefaultInputs,
  salesPlaybooks,
  sampleReports,
} from '../data/salesGuideData.js';

function formatNumber(value, digits = 0) {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(value);
}

function updateNumberField(setter, field, value) {
  setter((current) => ({ ...current, [field]: value }));
}

export default function PressureMonitoringPage({ user, onLogout, theme, onToggleTheme }) {
  const [calc, setCalc] = useState({ length: 12, width: 16, height: 9, targetAch: 12 });
  const [roi, setRoi] = useState(roiDefaultInputs);

  const achMath = useMemo(() => {
    const length = Number(calc.length) || 0;
    const width = Number(calc.width) || 0;
    const height = Number(calc.height) || 0;
    const targetAch = Number(calc.targetAch) || 0;
    const volume = length * width * height;
    const cfm = volume > 0 && targetAch > 0 ? (targetAch * volume) / 60 : 0;
    return { volume, cfm };
  }, [calc]);

  const roiMath = useMemo(() => calculateRoi(roi), [roi]);

  return (
    <AppShell user={user} onLogout={onLogout} theme={theme} onToggleTheme={onToggleTheme}>
      <main className="page-wrap pressure-page sales-guide-page">
        <section className="hero-card pressure-hero sales-guide-hero">
          <div>
            <p className="eyebrow">Applications + sales guide</p>
            <h1>Pressure, reporting, and competitor-backed sales value.</h1>
            <p>
              A consolidated guide for explaining pressure monitoring, Abatement Link Projects, competitor positioning, reports, ROI, and job-specific playbooks without adding more top-level sections to MonSuite.
            </p>
            <div className="hero-action-row">
              <a className="button primary" href="/scrubber-selector">Open Airflow Planner</a>
              <a className="button secondary" href="https://connect.abatement.com" target="_blank" rel="noreferrer">Open Abatement Link ↗</a>
            </div>
          </div>
          <div className="hero-panel pressure-proof-panel">
            <span>Sales position</span>
            <strong>Sell proof, not just readings.</strong>
            <small>Live status · alerts · reports · accountability</small>
          </div>
        </section>

        <section className="sales-guide-cutout-card">
          <img src="/sales-guides/market-proof-cutout.svg" alt="Market proof infographic for connected monitoring and reports" />
        </section>

        <section className="section-heading">
          <p className="eyebrow">Market-backed value</p>
          <h2>What customers are already being trained to expect</h2>
          <p>
            Competitors are not only selling pressure monitors. They are selling visibility, automatic documentation, response workflows, and professional reports. MonSuite should help sales explain that value, while Abatement Link owns the live data and project record.
          </p>
        </section>

        <section className="sales-pillar-grid">
          {marketValuePillars.map((pillar) => (
            <article className="sales-pillar-card" key={pillar.title}>
              <h3>{pillar.title}</h3>
              <p>{pillar.description}</p>
              <small>{pillar.proof}</small>
            </article>
          ))}
        </section>

        <section className="section-heading">
          <p className="eyebrow">Abatement Link Projects</p>
          <h2>The live monitoring and reporting story belongs in Abatement Link</h2>
          <p>
            MonSuite should point customers toward Abatement Link Projects for live project dashboards, alerts, acknowledgements, escalation, corrective actions, user tracking, and report history.
          </p>
        </section>

        <section className="feature-comparison-grid">
          {abatementLinkProjectValue.map((item) => (
            <article className="feature-comparison-card" key={item.feature}>
              <span>Abatement Link</span>
              <h3>{item.feature}</h3>
              <p>{item.customerValue}</p>
              <small>{item.salesNote}</small>
            </article>
          ))}
        </section>

        <section className="section-heading">
          <p className="eyebrow">Competitive battlecard</p>
          <h2>Competitor-backed reasons to build and sell the system</h2>
          <p>
            Use this as an internal talk track. It is not a legal claim or public comparison sheet; it is a practical reminder of what the market is already offering or clearly moving toward.
          </p>
        </section>

        <section className="competitor-grid">
          {competitorMatrix.map((competitor) => (
            <article className="competitor-card" key={competitor.company}>
              <div className="competitor-card-head">
                <span>Competitor</span>
                <h3>{competitor.company}</h3>
              </div>
              <p>{competitor.marketSignal}</p>
              <div className="tag-row">
                {competitor.offers.map((offer) => <span key={offer}>{offer}</span>)}
              </div>
              <div className="battlecard-note">
                <strong>Our response</strong>
                <p>{competitor.monsuiteResponse}</p>
              </div>
              <small>{competitor.battlecard}</small>
            </article>
          ))}
        </section>

        <section className="section-heading">
          <p className="eyebrow">Report gallery</p>
          <h2>Reports customers understand before they buy</h2>
          <p>
            These should ultimately be generated by Abatement Link, but MonSuite can show sales what the customer is actually buying: daily records, excursion documentation, data availability, corrective actions, and final handoff packages.
          </p>
        </section>

        <section className="report-gallery-grid">
          {sampleReports.map((report) => (
            <article className="report-gallery-card" key={report.title}>
              <h3>{report.title}</h3>
              <p>{report.bestFor}</p>
              <ul>
                {report.includes.map((line) => <li key={line}>{line}</li>)}
              </ul>
              <strong>{report.whyItSells}</strong>
            </article>
          ))}
        </section>

        <section className="calculator-card roi-calculator-card">
          <div>
            <p className="eyebrow">Labor-savings calculator</p>
            <h2>Estimate the cost of manual rounds and paper/admin work</h2>
            <p>
              This is a sales conversation tool, not an accounting model. It helps show why connected monitoring, automatic records, alerts, and reports have real value beyond the device hardware.
            </p>
          </div>
          <div className="calc-grid roi-input-grid">
            <label>
              Projects / year
              <input type="number" min="0" value={roi.projectsPerYear} onChange={(event) => updateNumberField(setRoi, 'projectsPerYear', event.target.value)} />
            </label>
            <label>
              Days / project
              <input type="number" min="0" value={roi.daysPerProject} onChange={(event) => updateNumberField(setRoi, 'daysPerProject', event.target.value)} />
            </label>
            <label>
              Rounds / day
              <input type="number" min="0" value={roi.roundsPerDay} onChange={(event) => updateNumberField(setRoi, 'roundsPerDay', event.target.value)} />
            </label>
            <label>
              Minutes / round
              <input type="number" min="0" value={roi.minutesPerRound} onChange={(event) => updateNumberField(setRoi, 'minutesPerRound', event.target.value)} />
            </label>
            <label>
              Admin minutes / day
              <input type="number" min="0" value={roi.adminMinutesPerDay} onChange={(event) => updateNumberField(setRoi, 'adminMinutesPerDay', event.target.value)} />
            </label>
            <label>
              Loaded hourly cost
              <input type="number" min="0" value={roi.hourlyRate} onChange={(event) => updateNumberField(setRoi, 'hourlyRate', event.target.value)} />
            </label>
          </div>
          <div className="calc-result-strip roi-result-strip">
            <div>
              <span>Manual rounds</span>
              <strong>{formatNumber(roiMath.yearlyMonitoringHours, 1)} hr/yr</strong>
            </div>
            <div>
              <span>Admin/report work</span>
              <strong>{formatNumber(roiMath.yearlyAdminHours, 1)} hr/yr</strong>
            </div>
            <div>
              <span>Estimated labor value</span>
              <strong>{formatCurrency(roiMath.laborCost)}</strong>
            </div>
          </div>
        </section>

        <section className="section-heading">
          <p className="eyebrow">Use-case playbooks</p>
          <h2>Question lists and sales guidance by job type</h2>
        </section>

        <section className="playbook-grid">
          {salesPlaybooks.map((playbook) => (
            <article className="playbook-card" key={playbook.id}>
              <p className="eyebrow">Playbook</p>
              <h3>{playbook.title}</h3>
              <p>{playbook.pain}</p>
              <div className="playbook-columns">
                <div>
                  <strong>Ask</strong>
                  <ul>{playbook.ask.map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
                <div>
                  <strong>Recommend</strong>
                  <ul>{playbook.recommend.map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
              </div>
              <small><b>Do not promise:</b> {playbook.doNotPromise}</small>
            </article>
          ))}
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
