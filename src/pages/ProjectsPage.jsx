import '../projects.css';
import { useMemo, useState } from 'react';
import AppShell from '../components/AppShell.jsx';
import {
  containmentTypes,
  correctiveActionCauses,
  createAuditEvent,
  createEmptyProject,
  createEmptyRequirement,
  futureProjectTypes,
  measurementLabels,
  projectStatuses,
  projectTypes,
} from '../data/projectTemplates.js';
import { getProjects, saveProjects, upsertProject, deleteProject } from '../utils/projectStorage.js';
import {
  analyzeProject,
  formatDuration,
  formatNumber,
  formatPercent,
  measurementKey,
  previewCsvImport,
} from '../utils/projectCsvImport.js';

function isoForInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function toIso(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

function StatCard({ label, value, note }) {
  return (
    <article className="project-stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {note ? <small>{note}</small> : null}
    </article>
  );
}

function ProjectForm({ draft, onChange, onSave, onCancel }) {
  function field(name, value) {
    onChange({ ...draft, [name]: value });
  }

  return (
    <form className="project-form-card" onSubmit={(event) => { event.preventDefault(); onSave(); }}>
      <div className="section-subhead compact-admin-head">
        <div>
          <p className="eyebrow">New project</p>
          <h2>ICRA / Healthcare Construction</h2>
        </div>
        <p>Creates a project shell. CSV imports and requirements can be added after saving.</p>
      </div>
      <div className="project-form-grid">
        <label><span>Project name</span><input value={draft.projectName} onChange={(e) => field('projectName', e.target.value)} placeholder="North Wing OR renovation" required /></label>
        <label><span>Project number</span><input value={draft.projectNumber} onChange={(e) => field('projectNumber', e.target.value)} placeholder="HC-2026-014" /></label>
        <label><span>Facility / hospital</span><input value={draft.facility} onChange={(e) => field('facility', e.target.value)} /></label>
        <label><span>Building</span><input value={draft.building} onChange={(e) => field('building', e.target.value)} /></label>
        <label><span>Floor</span><input value={draft.floor} onChange={(e) => field('floor', e.target.value)} /></label>
        <label><span>Department</span><input value={draft.department} onChange={(e) => field('department', e.target.value)} /></label>
        <label><span>Room / area</span><input value={draft.roomArea} onChange={(e) => field('roomArea', e.target.value)} /></label>
        <label><span>Contractor</span><input value={draft.contractor} onChange={(e) => field('contractor', e.target.value)} /></label>
        <label><span>Infection Prevention contact</span><input value={draft.infectionPreventionContact} onChange={(e) => field('infectionPreventionContact', e.target.value)} /></label>
        <label><span>Facility contact</span><input value={draft.facilityContact} onChange={(e) => field('facilityContact', e.target.value)} /></label>
        <label><span>Project manager</span><input value={draft.projectManager} onChange={(e) => field('projectManager', e.target.value)} /></label>
        <label><span>Status</span><select value={draft.status} onChange={(e) => field('status', e.target.value)}>{projectStatuses.map((status) => <option key={status}>{status}</option>)}</select></label>
        <label><span>Start date/time</span><input type="datetime-local" value={isoForInput(draft.startDateTime)} onChange={(e) => field('startDateTime', toIso(e.target.value))} /></label>
        <label><span>End date/time</span><input type="datetime-local" value={isoForInput(draft.endDateTime)} onChange={(e) => field('endDateTime', toIso(e.target.value))} /></label>
        <label className="full-span"><span>Containment type</span><select value={draft.containmentType} onChange={(e) => field('containmentType', e.target.value)}>{containmentTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
        <label className="full-span"><span>Notes</span><textarea value={draft.notes} onChange={(e) => field('notes', e.target.value)} placeholder="Project notes, special conditions, facility expectations, AHJ/spec notes." /></label>
      </div>
      <div className="settings-action-row">
        <button className="button primary" type="submit">Save project</button>
        <button className="button secondary" type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function RequirementEditor({ project, userEmail, onProjectChange }) {
  const active = project.requirements?.[project.requirements.length - 1] || createEmptyRequirement(userEmail);
  const [draft, setDraft] = useState(active);

  function update(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function saveRequirement() {
    const nextRequirement = {
      ...draft,
      id: `req-${Date.now()}`,
      version: (project.requirements?.length || 0) + 1,
      effectiveAt: draft.effectiveAt || new Date().toISOString(),
      changedBy: userEmail || 'Unknown user',
    };
    onProjectChange({
      ...project,
      requirements: [...(project.requirements || []), nextRequirement],
      events: [...(project.events || []), createAuditEvent('requirement_changed', 'Monitoring requirement changed', userEmail, { requirementVersion: nextRequirement.version })],
    }, 'Monitoring requirement version saved', 'requirement_changed');
  }

  return (
    <section className="project-panel">
      <div className="section-subhead compact-admin-head">
        <div>
          <p className="eyebrow">Requirements</p>
          <h2>Configured project limits</h2>
        </div>
        <p>Do not hard-code compliance. Enter the limits required by the project, facility, consultant, or AHJ.</p>
      </div>
      <div className="project-form-grid tight-grid">
        <label><span>Effective date/time</span><input type="datetime-local" value={isoForInput(draft.effectiveAt)} onChange={(e) => update('effectiveAt', toIso(e.target.value))} /></label>
        <label><span>Pressure relationship</span><select value={draft.pressureRelationship} onChange={(e) => update('pressureRelationship', e.target.value)}><option>NEGATIVE</option><option>POSITIVE</option><option>NEUTRAL / OBSERVATION</option></select></label>
        <label><span>Pressure target</span><input value={draft.pressureTarget} onChange={(e) => update('pressureTarget', e.target.value)} placeholder="-0.010" /></label>
        <label><span>Pressure unit</span><select value={draft.pressureUnit} onChange={(e) => update('pressureUnit', e.target.value)}><option>in. w.c.</option><option>Pa</option></select></label>
        <label><span>Alarm delay, minutes</span><input value={draft.pressureAlarmDelayMinutes} onChange={(e) => update('pressureAlarmDelayMinutes', e.target.value)} placeholder="0" /></label>
        <label><span>Temperature min</span><input value={draft.temperatureMin} onChange={(e) => update('temperatureMin', e.target.value)} /></label>
        <label><span>Temperature max</span><input value={draft.temperatureMax} onChange={(e) => update('temperatureMax', e.target.value)} /></label>
        <label><span>Temp unit</span><select value={draft.temperatureUnit} onChange={(e) => update('temperatureUnit', e.target.value)}><option>°F</option><option>°C</option></select></label>
        <label><span>RH min</span><input value={draft.humidityMin} onChange={(e) => update('humidityMin', e.target.value)} /></label>
        <label><span>RH max</span><input value={draft.humidityMax} onChange={(e) => update('humidityMax', e.target.value)} /></label>
        <label><span>PM1 max</span><input value={draft.particlePm1Max} onChange={(e) => update('particlePm1Max', e.target.value)} /></label>
        <label><span>PM2.5 max</span><input value={draft.particlePm25Max} onChange={(e) => update('particlePm25Max', e.target.value)} /></label>
        <label><span>PM10 max</span><input value={draft.particlePm10Max} onChange={(e) => update('particlePm10Max', e.target.value)} /></label>
        <label><span>Particle unit</span><input value={draft.particleUnit} onChange={(e) => update('particleUnit', e.target.value)} /></label>
        <label><span>Velocity min</span><input value={draft.velocityMin} onChange={(e) => update('velocityMin', e.target.value)} /></label>
        <label><span>Velocity max</span><input value={draft.velocityMax} onChange={(e) => update('velocityMax', e.target.value)} /></label>
        <label><span>Velocity unit</span><input value={draft.velocityUnit} onChange={(e) => update('velocityUnit', e.target.value)} /></label>
        <label className="full-span"><span>Other requirements</span><textarea value={draft.otherRequirements} onChange={(e) => update('otherRequirements', e.target.value)} /></label>
        <label className="full-span"><span>Reason / notes for this version</span><textarea value={draft.note} onChange={(e) => update('note', e.target.value)} /></label>
      </div>
      <button className="button primary" type="button" onClick={saveRequirement}>Save as new requirement version</button>
      <div className="project-timeline mini-timeline">
        {(project.requirements || []).map((requirement) => (
          <div key={requirement.id}><strong>v{requirement.version}</strong><span>{new Date(requirement.effectiveAt).toLocaleString()} · {requirement.changedBy}</span><small>{requirement.pressureRelationship} {requirement.pressureTarget} {requirement.pressureUnit}</small></div>
        ))}
      </div>
    </section>
  );
}

function ImportPanel({ project, userEmail, onProjectChange }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [importError, setImportError] = useState('');

  async function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setImportError('');
    try {
      const text = await file.text();
      const result = await previewCsvImport({ fileName: file.name, text, existingMeasurements: project.measurements || [] });
      setPreview(result);
    } catch (error) {
      setImportError(error.message || 'Could not read CSV file.');
    } finally {
      setLoading(false);
    }
  }

  function commitImport() {
    if (!preview || preview.warnings.some((warning) => warning.includes('No timestamp') || warning.includes('No supported measurement'))) return;
    const existingKeys = new Set((project.measurements || []).map(measurementKey));
    const newMeasurements = preview.measurements.filter((measurement) => !existingKeys.has(measurementKey(measurement))).map((measurement) => ({
      ...measurement,
      sourceImportId: `import-${preview.hash.slice(0, 12)}`,
      projectId: project.id,
    }));
    const importRecord = {
      id: `import-${preview.hash.slice(0, 12)}`,
      originalFileName: preview.fileName,
      importedBy: userEmail || 'Unknown user',
      importTimestamp: new Date().toISOString(),
      sha256: preview.hash,
      recordCount: preview.totalRows,
      normalizedMeasurementCount: preview.normalizedMeasurementCount,
      addedMeasurementCount: newMeasurements.length,
      duplicateMeasurementCount: preview.duplicateCount,
      earliestTimestamp: preview.earliestTimestamp,
      latestTimestamp: preview.latestTimestamp,
      parserProfile: preview.profile.profile,
      parserVersion: preview.profile.parserVersion,
      detectedDevices: preview.detectedDevices,
      detectedSensorTypes: preview.detectedSensorTypes,
      warnings: preview.warnings,
      dataGaps: preview.gaps,
      rawCsvText: preview.rawCsvText,
    };
    const derivedEquipment = preview.detectedDevices.map((device) => ({
      id: `eq-${device}`.replace(/[^a-zA-Z0-9-]/g, '-'),
      deviceType: 'Monitor / imported device',
      model: 'Detected from CSV',
      serialNumber: device,
      sensorType: preview.detectedSensorTypes.join(', '),
      calibrationDate: '',
      calibrationReference: '',
      installDate: preview.earliestTimestamp,
      removalDate: preview.latestTimestamp,
      derived: true,
    }));
    const existingEquipmentKeys = new Set((project.equipment || []).map((item) => item.id));
    const newEquipment = derivedEquipment.filter((item) => !existingEquipmentKeys.has(item.id));
    onProjectChange({
      ...project,
      imports: [...(project.imports || []), importRecord],
      measurements: [...(project.measurements || []), ...newMeasurements],
      equipment: [...(project.equipment || []), ...newEquipment],
      events: [...(project.events || []), createAuditEvent('csv_imported', `CSV imported: ${preview.fileName}`, userEmail, { addedMeasurements: newMeasurements.length, duplicatesIgnored: preview.duplicateCount })],
    }, 'CSV imported', 'csv_imported');
    setPreview(null);
  }

  return (
    <section className="project-panel">
      <div className="section-subhead compact-admin-head">
        <div>
          <p className="eyebrow">CSV import</p>
          <h2>Import monitoring data</h2>
        </div>
        <p>Use CSV exports from Abatement Link. The original CSV is preserved, and raw imported measurements are not editable.</p>
      </div>
      <input className="project-file-input" type="file" accept=".csv,text/csv" onChange={handleFile} />
      {loading ? <p>Reading CSV…</p> : null}
      {importError ? <p className="form-warning">{importError}</p> : null}
      {preview ? (
        <div className="import-preview-card">
          <h3>Abatement Link data import preview</h3>
          <dl className="project-definition-list">
            <div><dt>File</dt><dd>{preview.fileName}</dd></div>
            <div><dt>Detected period</dt><dd>{preview.earliestTimestamp ? `${new Date(preview.earliestTimestamp).toLocaleString()} through ${new Date(preview.latestTimestamp).toLocaleString()}` : 'Not detected'}</dd></div>
            <div><dt>Rows</dt><dd>{preview.totalRows.toLocaleString()}</dd></div>
            <div><dt>Normalized measurements</dt><dd>{preview.normalizedMeasurementCount.toLocaleString()}</dd></div>
            <div><dt>Duplicates ignored</dt><dd>{preview.duplicateCount.toLocaleString()}</dd></div>
            <div><dt>Detected devices</dt><dd>{preview.detectedDevices.join(', ') || 'None detected'}</dd></div>
            <div><dt>Detected measurements</dt><dd>{preview.detectedSensorTypes.map((type) => measurementLabels[type] || type).join(', ') || 'None detected'}</dd></div>
            <div><dt>Data gaps</dt><dd>{preview.gaps.length}</dd></div>
          </dl>
          {preview.warnings.length ? <ul className="warning-list">{preview.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul> : null}
          <button className="button primary" type="button" onClick={commitImport}>Import valid measurements</button>
        </div>
      ) : null}
      {(project.imports || []).length ? (
        <div className="project-table-wrap">
          <table className="project-table"><thead><tr><th>File</th><th>Period</th><th>Records</th><th>Added</th><th>SHA-256</th></tr></thead><tbody>{project.imports.map((item) => <tr key={item.id}><td>{item.originalFileName}</td><td>{item.earliestTimestamp ? `${new Date(item.earliestTimestamp).toLocaleDateString()}–${new Date(item.latestTimestamp).toLocaleDateString()}` : '—'}</td><td>{item.recordCount}</td><td>{item.addedMeasurementCount}</td><td><code>{item.sha256?.slice(0, 16)}…</code></td></tr>)}</tbody></table>
        </div>
      ) : null}
    </section>
  );
}

function TrendChart({ measurements, type, analysis }) {
  const records = measurements.filter((record) => record.measurementType === type).sort((a, b) => a.timestamp.localeCompare(b.timestamp)).slice(-220);
  if (!records.length) return null;
  const values = records.map((record) => Number(record.value)).filter(Number.isFinite);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = Math.max((max - min) * 0.1, 0.1);
  const yMin = min - pad;
  const yMax = max + pad;
  const width = 640;
  const height = 180;
  const points = records.map((record, index) => {
    const x = records.length === 1 ? 0 : (index / (records.length - 1)) * width;
    const y = height - ((Number(record.value) - yMin) / (yMax - yMin || 1)) * height;
    return `${x},${y}`;
  }).join(' ');
  const summary = analysis.summaries[type];
  return (
    <article className="project-chart-card">
      <div><strong>{measurementLabels[type] || type}</strong><small>{records.length} plotted points · latest {records[records.length - 1]?.unit || summary?.unit || ''}</small></div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${measurementLabels[type] || type} trend`}>
        <polyline points={points} fill="none" strokeWidth="3" />
      </svg>
      <small>Min {formatNumber(summary?.min)} · Avg {formatNumber(summary?.average)} · Max {formatNumber(summary?.max)} {summary?.unit}</small>
    </article>
  );
}

function Dashboard({ project, onProjectChange, userEmail }) {
  const analysis = useMemo(() => analyzeProject(project), [project]);
  const pressure = analysis.pressureSummary;
  const undocumented = analysis.excursions.filter((excursion) => !project.correctiveActions?.[excursion.id]);

  function updateCorrectiveAction(excursion, patch) {
    const nextActions = {
      ...(project.correctiveActions || {}),
      [excursion.id]: {
        ...(project.correctiveActions?.[excursion.id] || {}),
        excursionId: excursion.id,
        updatedAt: new Date().toISOString(),
        ...patch,
      },
    };
    onProjectChange({ ...project, correctiveActions: nextActions }, 'Corrective action documented', 'corrective_action_added', { excursionId: excursion.id });
  }

  function downloadReport() {
    const reportVersion = `report-${Date.now()}`;
    const html = buildReportHtml(project, analysis, reportVersion, userEmail);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.projectNumber || project.projectName || 'project'}-monitoring-report.html`.replace(/[^a-zA-Z0-9._-]/g, '-');
    link.click();
    URL.revokeObjectURL(url);
    const generatedReport = {
      id: reportVersion,
      reportVersion,
      generatedAt: new Date().toISOString(),
      generatedBy: userEmail || 'Unknown user',
      requirementVersionsUsed: (project.requirements || []).map((req) => req.version),
      importedDataSourcesUsed: (project.imports || []).map((item) => item.id),
      calculationVersion: 'monsuite-project-analysis-v1',
    };
    onProjectChange({
      ...project,
      generatedReports: [...(project.generatedReports || []), generatedReport],
      events: [...(project.events || []), createAuditEvent('report_generated', 'Project report generated', userEmail, { reportVersion })],
    }, 'Project report generated', 'report_generated', { reportVersion });
  }

  return (
    <section className="project-dashboard-grid">
      <div className="project-banner csv-banner"><strong>CSV DATA — NOT LIVE</strong><span>Measurements below come from imported CSV exports, not a live Abatement Link connection.</span></div>
      <StatCard label="Data availability" value={formatPercent(pressure?.dataAvailability)} note="Pressure valid monitored time vs configured period" />
      <StatCard label="Within pressure limits" value={formatPercent(pressure?.withinValidPercent)} note="Of valid pressure-monitored time only" />
      <StatCard label="No data" value={formatDuration(pressure?.noDataMs || 0)} note="Never counted as within-limit time" />
      <StatCard label="Pressure excursions" value={analysis.excursions.filter((e) => e.measurementType === 'differential_pressure').length} note={`${undocumented.length} undocumented`} />
      <StatCard label="Pressure average" value={`${formatNumber(pressure?.average)} ${pressure?.unit || ''}`} note={`Min ${formatNumber(pressure?.min)} · Max ${formatNumber(pressure?.max)}`} />
      <StatCard label="Imported devices" value={analysis.devices.length || '—'} note={analysis.devices.slice(0, 2).join(', ')} />

      <section className="project-panel full-span">
        <div className="section-subhead compact-admin-head"><div><p className="eyebrow">Trends</p><h2>Imported measurement charts</h2></div><p>Thresholds, gaps, and requirement-change overlays can be expanded later using this same normalized data model.</p></div>
        <div className="project-chart-grid">
          {Object.keys(measurementLabels).map((type) => <TrendChart key={type} type={type} measurements={project.measurements || []} analysis={analysis} />)}
        </div>
      </section>

      <section className="project-panel full-span">
        <div className="section-subhead compact-admin-head"><div><p className="eyebrow">Excursions</p><h2>Detected excursions and corrective actions</h2></div><p>Document the cause and response without modifying the historical measurements.</p></div>
        {analysis.excursions.length ? (
          <div className="project-table-wrap">
            <table className="project-table excursion-table"><thead><tr><th>Type</th><th>Start</th><th>Duration</th><th>Limit</th><th>Observed</th><th>Corrective action</th></tr></thead><tbody>{analysis.excursions.map((excursion) => {
              const action = project.correctiveActions?.[excursion.id] || {};
              return <tr key={excursion.id}><td>{measurementLabels[excursion.measurementType] || excursion.measurementType}</td><td>{new Date(excursion.startTimestamp).toLocaleString()}</td><td>{formatDuration(excursion.durationMs)}</td><td>{excursion.configuredLimit}</td><td>{formatNumber(excursion.minObserved)} to {formatNumber(excursion.maxObserved)}</td><td><select value={action.cause || ''} onChange={(e) => updateCorrectiveAction(excursion, { cause: e.target.value })}><option value="">Select cause</option>{correctiveActionCauses.map((cause) => <option key={cause}>{cause}</option>)}</select><input value={action.respondedBy || ''} onChange={(e) => updateCorrectiveAction(excursion, { respondedBy: e.target.value })} placeholder="Responded by" /><textarea value={action.correctiveAction || ''} onChange={(e) => updateCorrectiveAction(excursion, { correctiveAction: e.target.value })} placeholder="Corrective action / notes" /></td></tr>;
            })}</tbody></table>
          </div>
        ) : <p>No excursions detected against the currently configured project requirements.</p>}
      </section>

      <section className="project-panel full-span">
        <div className="section-subhead compact-admin-head"><div><p className="eyebrow">Equipment</p><h2>Equipment history</h2></div><button className="button secondary" type="button" onClick={() => addManualEquipment(project, onProjectChange, userEmail)}>Add equipment</button></div>
        {(project.equipment || []).length ? <div className="project-table-wrap"><table className="project-table"><thead><tr><th>Type</th><th>Model</th><th>Serial</th><th>Sensors</th><th>Calibration</th><th>History</th></tr></thead><tbody>{project.equipment.map((item) => <tr key={item.id}><td>{item.deviceType}</td><td>{item.model}</td><td>{item.serialNumber}</td><td>{item.sensorType}</td><td>{item.calibrationDate || '—'} {item.calibrationReference ? `· ${item.calibrationReference}` : ''}</td><td>{item.installDate ? new Date(item.installDate).toLocaleDateString() : '—'} {item.removalDate ? `to ${new Date(item.removalDate).toLocaleDateString()}` : ''}</td></tr>)}</tbody></table></div> : <p>No equipment recorded yet. Imported CSVs will derive device identifiers where possible.</p>}
      </section>

      <section className="project-panel full-span">
        <div className="section-subhead compact-admin-head"><div><p className="eyebrow">Report</p><h2>Generate project report</h2></div><button className="button primary" type="button" onClick={downloadReport}>Download report HTML</button></div>
        <p>The report uses factual language only. It does not state that a project is “ICRA compliant.” Use the browser print dialog to save the generated HTML report as PDF.</p>
      </section>
    </section>
  );
}

function addManualEquipment(project, onProjectChange, userEmail) {
  const model = window.prompt('Equipment model/name? Example: PPM4, RPM, PAS2400, HEPA unit');
  if (!model) return;
  const serial = window.prompt('Serial number or equipment ID?') || '';
  const nextEquipment = {
    id: `eq-manual-${Date.now()}`,
    deviceType: window.prompt('Device type? Example: pressure monitor, sensor, negative-air equipment') || 'Project equipment',
    model,
    serialNumber: serial,
    sensorType: window.prompt('Sensor type(s), if applicable?') || '',
    calibrationDate: window.prompt('Calibration date, if known?') || '',
    calibrationReference: window.prompt('Calibration certificate/reference, if known?') || '',
    installDate: new Date().toISOString(),
    removalDate: '',
    derived: false,
  };
  onProjectChange({ ...project, equipment: [...(project.equipment || []), nextEquipment] }, 'Equipment added', 'equipment_added', { model, serial });
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
}

function buildReportHtml(project, analysis, reportVersion, userEmail) {
  const pressure = analysis.pressureSummary;
  const rows = analysis.excursions.map((excursion) => {
    const action = project.correctiveActions?.[excursion.id] || {};
    return `<tr><td>${escapeHtml(measurementLabels[excursion.measurementType] || excursion.measurementType)}</td><td>${escapeHtml(new Date(excursion.startTimestamp).toLocaleString())}</td><td>${escapeHtml(formatDuration(excursion.durationMs))}</td><td>${escapeHtml(excursion.configuredLimit)}</td><td>${escapeHtml(`${formatNumber(excursion.minObserved)} to ${formatNumber(excursion.maxObserved)}`)}</td><td>${escapeHtml(action.cause || '')}</td><td>${escapeHtml(action.correctiveAction || '')}</td></tr>`;
  }).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(project.projectName)} Monitoring Report</title><style>body{font-family:Arial,sans-serif;line-height:1.45;color:#111;margin:40px}h1,h2{color:#0b2f4f}table{width:100%;border-collapse:collapse;margin:16px 0}td,th{border:1px solid #ccc;padding:8px;text-align:left;vertical-align:top}.note{background:#f2f6fa;padding:12px;border-left:4px solid #1c6ea4}.small{font-size:12px;color:#555}</style></head><body><h1>${escapeHtml(project.projectName || 'Monitoring Project Report')}</h1><p class="note">This report presents measured evidence against the configured project requirements. MonSuite does not determine regulatory compliance solely from sensor measurements.</p><h2>Project identification</h2><table><tbody><tr><th>Project number</th><td>${escapeHtml(project.projectNumber)}</td></tr><tr><th>Facility/location</th><td>${escapeHtml([project.facility, project.building, project.floor, project.department, project.roomArea].filter(Boolean).join(' / '))}</td></tr><tr><th>Contractor</th><td>${escapeHtml(project.contractor)}</td></tr><tr><th>Contacts</th><td>${escapeHtml([project.infectionPreventionContact, project.facilityContact, project.projectManager].filter(Boolean).join(' / '))}</td></tr><tr><th>Monitoring period</th><td>${escapeHtml(analysis.monitoringWindow.start ? `${new Date(analysis.monitoringWindow.start).toLocaleString()} to ${new Date(analysis.monitoringWindow.end).toLocaleString()}` : 'No imported data')}</td></tr></tbody></table><h2>Configured monitoring requirements</h2><table><thead><tr><th>Version</th><th>Effective</th><th>Pressure</th><th>Temperature</th><th>RH</th><th>Particle</th></tr></thead><tbody>${(project.requirements || []).map((req) => `<tr><td>v${req.version}</td><td>${escapeHtml(new Date(req.effectiveAt).toLocaleString())}</td><td>${escapeHtml(`${req.pressureRelationship} ${req.pressureTarget} ${req.pressureUnit}`)}</td><td>${escapeHtml(`${req.temperatureMin || '—'} to ${req.temperatureMax || '—'} ${req.temperatureUnit || ''}`)}</td><td>${escapeHtml(`${req.humidityMin || '—'} to ${req.humidityMax || '—'} %RH`)}</td><td>${escapeHtml(`PM1≤${req.particlePm1Max || '—'}, PM2.5≤${req.particlePm25Max || '—'}, PM10≤${req.particlePm10Max || '—'} ${req.particleUnit || ''}`)}</td></tr>`).join('')}</tbody></table><h2>Overall monitoring summary</h2><table><tbody><tr><th>Project duration</th><td>${escapeHtml(analysis.projectDurationLabel)}</td></tr><tr><th>Data availability</th><td>${escapeHtml(formatPercent(pressure?.dataAvailability))}</td></tr><tr><th>Within configured pressure limits</th><td>${escapeHtml(formatPercent(pressure?.withinValidPercent))} of valid monitored time</td></tr><tr><th>No-data duration</th><td>${escapeHtml(formatDuration(pressure?.noDataMs || 0))}</td></tr><tr><th>Pressure average/min/max</th><td>${escapeHtml(`${formatNumber(pressure?.average)} / ${formatNumber(pressure?.min)} / ${formatNumber(pressure?.max)} ${pressure?.unit || ''}`)}</td></tr><tr><th>Excursions</th><td>${analysis.excursions.length}</td></tr></tbody></table><h2>Data-source information</h2><table><thead><tr><th>File</th><th>Imported</th><th>Records</th><th>Period</th><th>Hash</th></tr></thead><tbody>${(project.imports || []).map((item) => `<tr><td>${escapeHtml(item.originalFileName)}</td><td>${escapeHtml(new Date(item.importTimestamp).toLocaleString())}</td><td>${escapeHtml(item.recordCount)}</td><td>${escapeHtml(item.earliestTimestamp ? `${new Date(item.earliestTimestamp).toLocaleString()} to ${new Date(item.latestTimestamp).toLocaleString()}` : '')}</td><td>${escapeHtml(item.sha256)}</td></tr>`).join('')}</tbody></table><h2>Excursion table</h2><table><thead><tr><th>Type</th><th>Start</th><th>Duration</th><th>Limit</th><th>Observed</th><th>Cause</th><th>Corrective action</th></tr></thead><tbody>${rows || '<tr><td colspan="7">No excursions detected.</td></tr>'}</tbody></table><h2>Audit history</h2><table><thead><tr><th>Time</th><th>User</th><th>Action</th></tr></thead><tbody>${(project.events || []).map((event) => `<tr><td>${escapeHtml(new Date(event.timestamp).toLocaleString())}</td><td>${escapeHtml(event.user)}</td><td>${escapeHtml(event.label || event.action)}</td></tr>`).join('')}</tbody></table><h2>Report reproducibility</h2><p class="small">Report version: ${escapeHtml(reportVersion)}<br>Generated: ${escapeHtml(new Date().toISOString())}<br>Generated by: ${escapeHtml(userEmail || 'Unknown user')}<br>Calculation version: monsuite-project-analysis-v1</p><h2>Completion / sign-off</h2><p>Reviewed by: __________________________ Date: __________________________</p></body></html>`;
}

function ProjectDetail({ project, userEmail, onProjectChange, onBack, onDelete }) {
  const type = projectTypes.find((item) => item.id === project.projectType);
  const [editingMeta, setEditingMeta] = useState(false);
  const [metaDraft, setMetaDraft] = useState(project);

  function saveMeta() {
    onProjectChange(metaDraft, 'Project details updated', 'project_configuration_changed');
    setEditingMeta(false);
  }

  return (
    <div className="project-detail-stack">
      <section className="project-detail-hero">
        <button className="button secondary small" type="button" onClick={onBack}>← Projects</button>
        <div>
          <p className="eyebrow">{type?.name || 'Project'}</p>
          <h1>{project.projectName || 'Untitled project'}</h1>
          <p>{[project.facility, project.building, project.floor, project.department, project.roomArea].filter(Boolean).join(' · ') || 'No location entered yet.'}</p>
        </div>
        <span className={`project-status-pill status-${String(project.status).toLowerCase()}`}>{project.status}</span>
      </section>

      <section className="project-panel">
        <div className="section-subhead compact-admin-head"><div><p className="eyebrow">Project details</p><h2>Identification and contacts</h2></div><div className="settings-action-row"><button className="button secondary small" type="button" onClick={() => setEditingMeta((value) => !value)}>{editingMeta ? 'Close' : 'Edit'}</button><button className="button secondary small danger" type="button" onClick={onDelete}>Delete</button></div></div>
        {editingMeta ? <ProjectForm draft={metaDraft} onChange={setMetaDraft} onSave={saveMeta} onCancel={() => { setMetaDraft(project); setEditingMeta(false); }} /> : (
          <dl className="project-definition-list"><div><dt>Project #</dt><dd>{project.projectNumber || '—'}</dd></div><div><dt>Contractor</dt><dd>{project.contractor || '—'}</dd></div><div><dt>Project manager</dt><dd>{project.projectManager || '—'}</dd></div><div><dt>Infection Prevention</dt><dd>{project.infectionPreventionContact || '—'}</dd></div><div><dt>Facility contact</dt><dd>{project.facilityContact || '—'}</dd></div><div><dt>Containment</dt><dd>{project.containmentType || '—'}</dd></div></dl>
        )}
      </section>

      <RequirementEditor project={project} userEmail={userEmail} onProjectChange={onProjectChange} />
      <ImportPanel project={project} userEmail={userEmail} onProjectChange={onProjectChange} />
      <Dashboard project={project} userEmail={userEmail} onProjectChange={onProjectChange} />
    </div>
  );
}

export default function ProjectsPage({ user, onLogout, theme, onToggleTheme, adminMode, canUseAdminMode, updateAvailable, onRefreshApp }) {
  const userEmail = user?.email || '';
  const [projects, setProjects] = useState(() => getProjects());
  const [selectedId, setSelectedId] = useState(projects[0]?.id || '');
  const [showNew, setShowNew] = useState(false);
  const [draft, setDraft] = useState(() => createEmptyProject(userEmail));

  const selectedProject = projects.find((project) => project.id === selectedId) || null;

  function refresh() {
    const next = getProjects();
    setProjects(next);
    if (!selectedId && next[0]) setSelectedId(next[0].id);
  }

  function saveNewProject() {
    const next = {
      ...draft,
      projectName: draft.projectName.trim() || 'Untitled ICRA Project',
      createdBy: userEmail || 'Unknown user',
      updatedAt: new Date().toISOString(),
    };
    saveProjects([next, ...getProjects()]);
    setShowNew(false);
    setDraft(createEmptyProject(userEmail));
    refresh();
    setSelectedId(next.id);
  }

  function handleProjectChange(project, label, action, values) {
    const saved = upsertProject(project, userEmail, label, action, values);
    const nextProjects = getProjects();
    setProjects(nextProjects);
    setSelectedId(saved.id);
  }

  function handleDelete(project) {
    const ok = window.confirm(`Delete project "${project.projectName}" from this browser? Imported raw data and annotations for this local project will be removed.`);
    if (!ok) return;
    deleteProject(project.id);
    const next = getProjects();
    setProjects(next);
    setSelectedId(next[0]?.id || '');
  }

  return (
    <AppShell user={user} onLogout={onLogout} theme={theme} onToggleTheme={onToggleTheme} adminMode={adminMode} canUseAdminMode={canUseAdminMode} updateAvailable={updateAvailable} onRefreshApp={onRefreshApp}>
      <main className="page-wrap projects-page">
        <section className="section-heading page-title compact-human-hero projects-hero">
          <div>
            <p className="eyebrow">Projects</p>
            <h1>Projects</h1>
            <p>Create an ICRA / healthcare construction monitoring project, import Abatement Link CSV exports, document excursions, and generate a factual report.</p>
          </div>
          <button className="button primary" type="button" onClick={() => setShowNew(true)}>New project</button>
        </section>

        <section className="project-architecture-card">
          <strong>PPM4 / RPM / Sensors → Abatement Link → CSV Export → MonSuite → Project Analysis → Project Report</strong>
          <span>CSV is the historical data source for this feature. MonSuite reports evidence against configured requirements; it does not automatically claim ICRA compliance.</span>
        </section>

        <section className="project-page-grid">
          <aside className="project-list-panel">
            <div className="section-subhead compact-admin-head"><div><p className="eyebrow">Project list</p><h2>{projects.length} saved</h2></div></div>
            <div className="project-type-note"><strong>First project type</strong><span>ICRA / Healthcare Construction</span><small>Future framework: {futureProjectTypes.slice(0, 5).join(', ')}…</small></div>
            {projects.length ? projects.map((project) => (
              <button className={`project-list-item ${selectedId === project.id ? 'active' : ''}`} key={project.id} type="button" onClick={() => setSelectedId(project.id)}>
                <strong>{project.projectName || 'Untitled project'}</strong>
                <span>{project.facility || 'No facility'} · {project.status}</span>
                <small>{(project.imports || []).length} import(s) · {(project.measurements || []).length.toLocaleString()} measurements</small>
              </button>
            )) : <p className="panel-help">No projects yet. Create a project, configure requirements, then import monitoring CSVs.</p>}
          </aside>

          <section className="project-workspace">
            {showNew ? <ProjectForm draft={draft} onChange={setDraft} onSave={saveNewProject} onCancel={() => setShowNew(false)} /> : selectedProject ? (
              <ProjectDetail project={selectedProject} userEmail={userEmail} onProjectChange={handleProjectChange} onBack={() => setSelectedId('')} onDelete={() => handleDelete(selectedProject)} />
            ) : (
              <div className="project-empty-state"><h2>Select or create a project</h2><p>Projects keep requirements, CSV imports, immutable raw data, excursions, corrective actions, equipment history, and generated report history together.</p><button className="button primary" type="button" onClick={() => setShowNew(true)}>Create ICRA project</button></div>
            )}
          </section>
        </section>
      </main>
    </AppShell>
  );
}
