import { useMemo, useRef, useState } from 'react';
import AppShell from '../components/AppShell.jsx';
import {
  canadaProvinces,
  hazardOptions,
  powerOptions,
  primaryGoalOptions,
  projectTypes,
  scrubberProducts,
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
  knownVolume: '',
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
  ductType: 'round',
  filterPreference: 'unknown',
  needDocumentation: 'unknown',
  knownStandard: '',
  budgetPriority: 'best_fit',
};

const monitorItems = [
  { id: 'rpm', type: 'monitor', label: 'RPM', detail: 'Room pressure monitor', busMa: 0, icon: 'RPM' },
  { id: 'ppm4', type: 'monitor', label: 'PPM4', detail: 'Portable pressure monitor', busMa: 0, icon: 'P4' },
  { id: 'temp-rh', type: 'sensor', label: 'Temp/RH', detail: '50mA sensor', busMa: 50, icon: 'T/RH' },
  { id: 'pressure-sensor', type: 'sensor', label: 'Pressure sensor', detail: '65mA sensor', busMa: 65, icon: 'ΔP' },
  { id: 'ach-sensor', type: 'sensor', label: 'ACH / velocity', detail: '100mA sensor', busMa: 100, icon: 'ACH' },
  { id: 'particle-sensor', type: 'sensor', label: 'Particle', detail: '120mA sensor', busMa: 120, icon: 'PM' },
  { id: 'power-bus', type: 'power', label: 'Power Bus', detail: 'Powered branch', busMa: -200, icon: '⚡' },
];

const ductItems = [
  { id: 'round', type: 'duct', label: 'Round duct', detail: 'Rigid/smooth round duct', icon: '○' },
  { id: 'square', type: 'duct', label: 'Square duct', detail: 'Box/rectangular duct', icon: '□' },
  { id: 'flexible', type: 'duct', label: 'Flexible duct', detail: 'Higher loss; keep short/taut', icon: '≈' },
];

const realPlannerScrubbers = scrubberProducts.filter((product) => product.isRealProduct && product.id !== 'abatement_hc800fd_series');

function numberValue(value, fallback = 0) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function optionLabel(options, value) {
  return options.find((option) => option.id === value)?.label || value || '—';
}

function Field({ label, children, note, required = false }) {
  return (
    <label className="planner-field">
      <span>{label}{required ? <em> required</em> : null}</span>
      {children}
      {note ? <small>{note}</small> : null}
    </label>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div className="planner-stat">
      <span>{label}</span>
      <strong>{value}</strong>
      {sub ? <small>{sub}</small> : null}
    </div>
  );
}

function getSiteFilteredScrubbers(siteEnvironment) {
  if (siteEnvironment === 'wet_damp_restoration') {
    return realPlannerScrubbers.filter((product) => ['abatement_bd2k_xhp_xhpa', 'abatement_pred750'].includes(product.id));
  }
  if (siteEnvironment === 'residential_finished') {
    return realPlannerScrubbers.filter((product) => ['abatement_bd2k_xhp_xhpa', 'abatement_pred750'].includes(product.id));
  }
  if (siteEnvironment === 'tight_access_stairs') {
    return realPlannerScrubbers.filter((product) => ['abatement_pred750', 'abatement_bd2k_xhp_xhpa', 'abatement_pas2400'].includes(product.id));
  }
  if (siteEnvironment === 'large_containment') {
    return realPlannerScrubbers.filter((product) => ['abatement_h2km_h2kma', 'abatement_bd2k_xhp_xhpa', 'abatement_pas2400', 'abatement_pas5000'].includes(product.id));
  }
  if (siteEnvironment === 'commercial_industrial' || siteEnvironment === 'healthcare_construction') {
    return realPlannerScrubbers.filter((product) => product.id !== 'abatement_pred750' || siteEnvironment !== 'large_containment');
  }
  return realPlannerScrubbers;
}

function paletteItemFromScrubber(product) {
  return {
    id: product.id,
    type: 'scrubber',
    label: product.shortName || product.model,
    detail: `${formatNumber(product.airflow?.appDefaultCfm || product.airflow?.maxRatedCfm, 0)} CFM · ${product.physical?.cabinet || 'Cabinet TBD'}`,
    icon: product.shortName || product.model,
    scrubberId: product.id,
  };
}

function getDroppedPayload(event) {
  try {
    return JSON.parse(event.dataTransfer.getData('application/json'));
  } catch {
    return null;
  }
}

function startDrag(event, item) {
  event.dataTransfer.setData('application/json', JSON.stringify(item));
  event.dataTransfer.effectAllowed = 'copy';
}

function placedLabel(item) {
  if (item.type === 'scrubber') return item.label;
  if (item.type === 'duct') return item.label.replace(' duct', '');
  return item.label;
}

function buildPlacedSummary(placedItems) {
  const scrubberCounts = {};
  placedItems.filter((item) => item.type === 'scrubber').forEach((item) => {
    scrubberCounts[item.scrubberId] = (scrubberCounts[item.scrubberId] || 0) + 1;
  });
  const monitorCount = placedItems.filter((item) => item.type === 'monitor').length;
  const sensorItems = placedItems.filter((item) => item.type === 'sensor');
  const powerBusCount = placedItems.filter((item) => item.id === 'power-bus').length;
  const sensorLoad = sensorItems.reduce((sum, item) => sum + (item.busMa || 0), 0);
  const effectiveLimit = 200 + powerBusCount * 200;
  return { scrubberCounts, monitorCount, sensorItems, powerBusCount, sensorLoad, effectiveLimit };
}

function buildReport(form, result, top, placedItems, placedSummary) {
  if (!top || result.errors?.length) return 'Complete the job and room details to generate the report.';
  const placedScrubbers = Object.entries(placedSummary.scrubberCounts)
    .map(([id, count]) => {
      const product = realPlannerScrubbers.find((item) => item.id === id);
      return product ? `${count} × ${product.shortName || product.model}` : null;
    })
    .filter(Boolean)
    .join(', ') || 'None placed yet';

  const lines = [
    'MonSuite Airflow Planning Report',
    '',
    `Location: ${form.city ? `${form.city}, ` : ''}${form.stateProvince}, ${form.country}`,
    `Project/application: ${optionLabel(projectTypes, form.projectType)}`,
    `Hazard/concern: ${optionLabel(hazardOptions, form.hazard)}`,
    `Goal: ${optionLabel(primaryGoalOptions, form.primaryGoal)}`,
    `Site condition: ${optionLabel(siteEnvironmentOptions, form.siteEnvironment)}`,
    '',
    `Room: ${form.length} × ${form.width} × ${form.height} ${form.unitSystem}`,
    `Calculated volume: ${formatNumber(result.calculations.roomVolume, 0)} ft³`,
    `Common planning rule selected: ${result.rule?.name || 'Project-specific'}`,
    `Planning ACH target: ${formatNumber(result.calculations.targetAch, 1)} ACH`,
    `Pressure direction/target: ${result.rule?.pressureDirection || 'Project-specific'} / ${result.calculations.targetPressure || 'Confirm with project spec'}`,
    `Design CFM used: ${formatNumber(result.calculations.designCfm, 0)} CFM`,
    `Duct profile: ${result.calculations.ductProfile}; derating used: ${formatNumber(result.calculations.deratingFactor * 100, 0)}%`,
    '',
    `Recommended scrubbers: ${top.quantity} × ${top.product.displayName}`,
    `Estimated installed airflow: ${formatNumber(top.totalEffectiveCfm, 0)} CFM`,
    `Estimated achieved ACH: ${formatNumber(top.estimatedAch, 1)} ACH`,
    `Pressure monitor recommendation: ${result.monitorLabel}`,
    '',
    `Equipment currently drawn on plan: ${placedItems.length} item(s)`,
    `Scrubbers placed on plan: ${placedScrubbers}`,
    `Monitor/sensor bus load shown: ${placedSummary.sensorLoad}mA / ${placedSummary.effectiveLimit}mA planning capacity`,
    '',
    'Quote/report notes:',
    ...top.accessories.map((item) => `- ${item}`),
    '- Confirm final ACH, pressure target, duct path, exhaust location, filters, circuits, facility/project spec, consultant/IPAC/IH direction, and AHJ requirements before final recommendation.',
    '- Field pressure must be verified with a calibrated pressure monitor whenever negative/positive pressure is required or claimed.',
  ];
  return lines.join('\n');
}

function ScrubberTile({ product, onDragStart }) {
  const item = paletteItemFromScrubber(product);
  return (
    <button className="planner-palette-item scrubber-palette-card" draggable onDragStart={(event) => onDragStart(event, item)} type="button">
      <span className="palette-icon scrubber-icon">{product.shortName}</span>
      <strong>{product.shortName || product.model}</strong>
      <small>{formatNumber(product.airflow?.appDefaultCfm || product.airflow?.maxRatedCfm, 0)} CFM · {product.physical?.cabinet}</small>
    </button>
  );
}

export default function ScrubberSelectorPage({ user, onLogout, theme, onToggleTheme, adminMode, canUseAdminMode }) {
  const [form, setForm] = useState(defaultForm);
  const [placedItems, setPlacedItems] = useState([]);
  const [selectedDuctType, setSelectedDuctType] = useState('round');
  const [showReport, setShowReport] = useState(false);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef(null);
  const resizeRef = useRef(null);

  const locations = form.country === 'Canada' ? canadaProvinces : usStates;
  const result = useMemo(() => getScrubberRecommendation({ ...form, ductType: form.ductType === 'flexible' ? 'flex' : form.ductType }), [form]);
  const top = result.recommendations?.[0];
  const allowedScrubbers = useMemo(() => getSiteFilteredScrubbers(form.siteEnvironment), [form.siteEnvironment]);
  const placedSummary = useMemo(() => buildPlacedSummary(placedItems), [placedItems]);
  const reportText = useMemo(() => buildReport(form, result, top, placedItems, placedSummary), [form, result, top, placedItems, placedSummary]);
  const placedMonitorNeeded = result.monitorRequirement !== 'optional' && placedSummary.monitorCount === 0;
  const hiddenDryUnits = ['wet_damp_restoration', 'residential_finished'].includes(form.siteEnvironment);
  const roomLength = Math.max(numberValue(form.length, 30), 1);
  const roomWidth = Math.max(numberValue(form.width, 20), 1);
  const roomHeight = Math.max(numberValue(form.height, 10), 1);
  const displayScale = Math.min(560 / roomLength, 360 / roomWidth, 18);
  const roomStyle = {
    width: `${Math.max(220, roomLength * displayScale)}px`,
    height: `${Math.max(160, roomWidth * displayScale)}px`,
  };

  function updateField(field, value) {
    setCopied(false);
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
          next.needDocumentation = 'yes';
          next.targetAch = next.targetAch || '12';
        } else if (value === 'hospital_construction') {
          next.hazard = 'construction_dust';
          next.primaryGoal = 'clean_air_negative_pressure';
          next.siteEnvironment = 'healthcare_construction';
          next.exhaustSetup = 'outside';
          next.needDocumentation = 'yes';
          next.targetAch = next.targetAch || '12';
        } else if (value === 'healthcare_positive_pressure') {
          next.hazard = 'airborne_infection';
          next.primaryGoal = 'clean_air_positive_pressure';
          next.siteEnvironment = 'healthcare_construction';
          next.needDocumentation = 'yes';
          next.targetAch = next.targetAch || '12';
        } else if (value === 'asbestos') {
          next.hazard = 'asbestos';
          next.primaryGoal = 'negative_pressure';
          next.exhaustSetup = 'outside';
          next.needDocumentation = 'yes';
          next.targetAch = next.targetAch || '4';
        } else if (value === 'mold') {
          next.hazard = 'mold_spores';
          next.primaryGoal = 'clean_air_negative_pressure';
          next.siteEnvironment = 'wet_damp_restoration';
          next.exhaustSetup = 'outside';
          next.targetAch = next.targetAch || '6';
        } else if (value === 'silica' || value === 'general_construction_dust') {
          next.hazard = value === 'silica' ? 'silica_dust' : 'construction_dust';
          next.primaryGoal = 'clean_air_negative_pressure';
          next.exhaustSetup = 'outside';
          next.targetAch = next.targetAch || '6';
        } else if (value === 'general_air_cleaning') {
          next.hazard = 'general_particulate';
          next.primaryGoal = 'clean_air';
          next.exhaustSetup = 'recirculate';
          next.needDocumentation = 'no';
          next.targetAch = next.targetAch || '6';
        } else if (value === 'odor_voc') {
          next.hazard = 'odor_voc';
          next.primaryGoal = 'clean_air';
          next.exhaustSetup = 'recirculate';
          next.targetAch = next.targetAch || '6';
        }
      }
      if (field === 'siteEnvironment' && ['wet_damp_restoration', 'residential_finished'].includes(value)) {
        // The palette filters metal/dry cabinet options when finished or wet-sensitive conditions are selected.
      }
      return next;
    });
  }

  function applyKnownVolume() {
    const volume = numberValue(form.knownVolume, 0);
    const height = numberValue(form.height, 10);
    if (!volume || !height) return;
    const currentLength = Math.max(numberValue(form.length, 30), 1);
    const currentWidth = Math.max(numberValue(form.width, 20), 1);
    const ratio = currentLength / currentWidth;
    const area = volume / height;
    const newLength = Math.sqrt(area * ratio);
    const newWidth = area / newLength;
    setForm((current) => ({
      ...current,
      unitSystem: 'feet',
      length: newLength.toFixed(1),
      width: newWidth.toFixed(1),
    }));
  }

  function handleDrop(event) {
    event.preventDefault();
    const payload = getDroppedPayload(event);
    if (!payload || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(8, Math.min(event.clientX - rect.left - 36, rect.width - 80));
    const y = Math.max(8, Math.min(event.clientY - rect.top - 24, rect.height - 48));
    const item = { ...payload, uid: `${payload.id}-${Date.now()}-${Math.random().toString(16).slice(2)}`, x, y };
    setPlacedItems((current) => [...current, item]);
    if (item.type === 'duct') {
      setSelectedDuctType(item.id);
      setForm((current) => ({
        ...current,
        ductType: item.id,
        exhaustSetup: current.exhaustSetup === 'recirculate' ? 'outside' : current.exhaustSetup,
        ductLength: current.ductLength || '25',
        ductBends: current.ductBends || '2',
      }));
    }
    if (item.type === 'monitor') {
      setForm((current) => ({ ...current, needDocumentation: 'yes' }));
    }
  }

  function removePlaced(uid) {
    setPlacedItems((current) => current.filter((item) => item.uid !== uid));
  }

  function beginResize(event, mode) {
    event.preventDefault();
    resizeRef.current = {
      mode,
      startX: event.clientX,
      startY: event.clientY,
      length: numberValue(form.length, 30),
      width: numberValue(form.width, 20),
    };
    window.addEventListener('mousemove', handleResizeMove);
    window.addEventListener('mouseup', endResize);
  }

  function handleResizeMove(event) {
    const resize = resizeRef.current;
    if (!resize) return;
    const ftPerPixel = 1 / displayScale;
    const deltaX = (event.clientX - resize.startX) * ftPerPixel;
    const deltaY = (event.clientY - resize.startY) * ftPerPixel;
    const nextLength = resize.mode !== 'height' ? Math.max(6, resize.length + deltaX) : resize.length;
    const nextWidth = resize.mode !== 'width' ? Math.max(6, resize.width + deltaY) : resize.width;
    setForm((current) => ({ ...current, length: nextLength.toFixed(1), width: nextWidth.toFixed(1), knownVolume: '' }));
  }

  function endResize() {
    resizeRef.current = null;
    window.removeEventListener('mousemove', handleResizeMove);
    window.removeEventListener('mouseup', endResize);
  }

  async function copyReport() {
    try {
      await navigator.clipboard.writeText(reportText);
      setCopied(true);
    } catch {
      window.prompt('Copy report:', reportText);
    }
  }

  function downloadReport() {
    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `monsuite-airflow-report-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell user={user} onLogout={onLogout} theme={theme} onToggleTheme={onToggleTheme} adminMode={adminMode} canUseAdminMode={canUseAdminMode}>
      <main className="page-wrap airflow-planner-page">
        <section className="planner-toolbar">
          <div>
            <p className="eyebrow">Airflow planner</p>
            <h1>Scrubber + setup planner</h1>
            <p>Draw the room, place monitors, sensors, ducts, and scrubbers, then generate a report.</p>
          </div>
          <div className="planner-toolbar-actions">
            <button className="button primary" type="button" onClick={() => setShowReport(true)}>Get report</button>
            <button className="button secondary" type="button" onClick={() => setPlacedItems([])}>Clear layout</button>
          </div>
        </section>

        <section className="planner-shell-grid">
          <aside className="planner-left-panel">
            <div className="planner-section-heading">
              <p className="eyebrow">Report form</p>
              <h2>Job inputs</h2>
            </div>

            <Field label="Country / region">
              <div className="planner-two-col">
                <select value={form.country} onChange={(event) => updateField('country', event.target.value)}>
                  <option>United States</option>
                  <option>Canada</option>
                  <option>Other</option>
                </select>
                <select value={form.stateProvince} onChange={(event) => updateField('stateProvince', event.target.value)}>
                  {locations.map((location) => <option key={location} value={location}>{location}</option>)}
                  {form.country === 'Other' ? <option>Other / Not sure</option> : null}
                </select>
              </div>
            </Field>

            <Field label="Project/application" required>
              <select value={form.projectType} onChange={(event) => updateField('projectType', event.target.value)}>
                {projectTypes.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </Field>

            <Field label="Hazard / concern" required>
              <select value={form.hazard} onChange={(event) => updateField('hazard', event.target.value)}>
                {hazardOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </Field>

            <Field label="Goal" required>
              <select value={form.primaryGoal} onChange={(event) => updateField('primaryGoal', event.target.value)}>
                {primaryGoalOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </Field>

            <Field label="Site condition" note="This also filters which scrubbers can be dragged onto the layout.">
              <select value={form.siteEnvironment} onChange={(event) => updateField('siteEnvironment', event.target.value)}>
                {siteEnvironmentOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </Field>

            <div className="planner-section-heading small">
              <p className="eyebrow">Room</p>
              <h2>Size</h2>
            </div>

            <Field label="Known room volume" note="Optional. Enter ft³ and MonSuite will draw an estimated box from height and current shape ratio.">
              <div className="planner-volume-input">
                <input value={form.knownVolume} onChange={(event) => updateField('knownVolume', event.target.value)} placeholder="ft³" inputMode="decimal" />
                <button className="button secondary small" type="button" onClick={applyKnownVolume}>Draw box</button>
              </div>
            </Field>

            <div className="planner-dimension-grid">
              <Field label="Length"><input value={form.length} onChange={(event) => updateField('length', event.target.value)} inputMode="decimal" /></Field>
              <Field label="Width"><input value={form.width} onChange={(event) => updateField('width', event.target.value)} inputMode="decimal" /></Field>
              <Field label="Height"><input value={form.height} onChange={(event) => updateField('height', event.target.value)} inputMode="decimal" /></Field>
              <Field label="Units">
                <select value={form.unitSystem} onChange={(event) => updateField('unitSystem', event.target.value)}>
                  {unitSystemOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                </select>
              </Field>
            </div>

            <div className="planner-dimension-grid">
              <Field label="Target ACH"><input value={form.targetAch} onChange={(event) => updateField('targetAch', event.target.value)} placeholder="auto" inputMode="decimal" /></Field>
              <Field label="Power">
                <select value={form.powerAvailable} onChange={(event) => updateField('powerAvailable', event.target.value)}>
                  {powerOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                </select>
              </Field>
            </div>

            <Field label="Ducting">
              <div className="planner-three-col">
                <select value={form.ductType} onChange={(event) => { setSelectedDuctType(event.target.value); updateField('ductType', event.target.value); }}>
                  <option value="round">Round</option>
                  <option value="square">Square</option>
                  <option value="flexible">Flexible</option>
                </select>
                <input value={form.ductLength} onChange={(event) => updateField('ductLength', event.target.value)} placeholder="ft" inputMode="decimal" />
                <input value={form.ductBends} onChange={(event) => updateField('ductBends', event.target.value)} placeholder="bends" inputMode="numeric" />
              </div>
            </Field>

            <button className="button primary full-width" type="button" onClick={() => setShowReport(true)}>Get report</button>
          </aside>

          <section className="planner-canvas-panel">
            <div className="planner-live-summary">
              <Stat label="Volume" value={`${formatNumber(result.calculations.roomVolume, 0)} ft³`} sub={`${form.length} × ${form.width} × ${form.height} ${form.unitSystem}`} />
              <Stat label="Design CFM" value={`${formatNumber(result.calculations.designCfm, 0)} CFM`} sub={`${formatNumber(result.calculations.targetAch, 1)} ACH target`} />
              <Stat label="Monitor" value={result.monitorRequirement === 'optional' ? 'Optional' : 'Recommended'} sub={result.rule?.pressureDirection || 'Project-specific'} />
              <Stat label="Top pick" value={top ? `${top.quantity} × ${top.product.shortName}` : '—'} sub={top ? `${formatNumber(top.totalEffectiveCfm, 0)} CFM` : 'Complete inputs'} />
            </div>

            <div className="planner-work-area">
              <div className="planner-palette-column">
                <h3>Drag onto plan</h3>
                <p className="planner-muted">Palette changes with the site condition.</p>

                <div className="planner-palette-group">
                  <strong>Scrubbers</strong>
                  {allowedScrubbers.map((product) => <ScrubberTile key={product.id} product={product} onDragStart={startDrag} />)}
                  {hiddenDryUnits ? <small className="planner-filter-note">Metal/dry cabinet options are hidden for this site condition. Change Site condition to show them.</small> : null}
                </div>

                <div className="planner-palette-group">
                  <strong>Monitors + sensors</strong>
                  {monitorItems.map((item) => (
                    <button key={item.id} className="planner-palette-item" draggable onDragStart={(event) => startDrag(event, item)} type="button">
                      <span className="palette-icon">{item.icon}</span>
                      <strong>{item.label}</strong>
                      <small>{item.detail}</small>
                    </button>
                  ))}
                </div>

                <div className="planner-palette-group">
                  <strong>Ducts</strong>
                  {ductItems.map((item) => (
                    <button key={item.id} className={`planner-palette-item duct-${item.id} ${selectedDuctType === item.id ? 'active' : ''}`} draggable onClick={() => { setSelectedDuctType(item.id); updateField('ductType', item.id); }} onDragStart={(event) => startDrag(event, item)} type="button">
                      <span className="palette-icon">{item.icon}</span>
                      <strong>{item.label}</strong>
                      <small>{item.detail}</small>
                    </button>
                  ))}
                </div>
              </div>

              <div className="planner-canvas-wrap">
                <div
                  className="planner-canvas"
                  ref={canvasRef}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={handleDrop}
                >
                  <div className="planner-room" style={roomStyle}>
                    <div className="room-label">Room / containment<br />{formatNumber(result.calculations.roomVolume, 0)} ft³</div>
                    <button className="room-resize-handle right" type="button" onMouseDown={(event) => beginResize(event, 'width')} aria-label="Resize room length" />
                    <button className="room-resize-handle bottom" type="button" onMouseDown={(event) => beginResize(event, 'height')} aria-label="Resize room width" />
                    <button className="room-resize-handle corner" type="button" onMouseDown={(event) => beginResize(event, 'corner')} aria-label="Resize room" />
                  </div>

                  {placedItems.map((item) => (
                    <button
                      key={item.uid}
                      className={`placed-equipment placed-${item.type} ${item.type === 'duct' ? `duct-shape-${item.id}` : ''}`}
                      type="button"
                      style={{ left: item.x, top: item.y }}
                      onDoubleClick={() => removePlaced(item.uid)}
                      title="Double click to remove"
                    >
                      <span>{placedLabel(item)}</span>
                      {item.type === 'sensor' ? <small>{item.busMa}mA</small> : null}
                    </button>
                  ))}
                </div>
                <p className="planner-canvas-help">Drag items onto the room. Drag the right/bottom handles to resize the room. Double-click an item to remove it.</p>
              </div>
            </div>
          </section>

          <aside className="planner-report-panel">
            <div className="planner-section-heading">
              <p className="eyebrow">Live recommendation</p>
              <h2>Report</h2>
            </div>

            {result.errors?.length ? (
              <div className="planner-warning-box">
                {result.errors.map((error) => <p key={error}>⚠ {error}</p>)}
              </div>
            ) : (
              <>
                <div className="planner-primary-card">
                  <span>Recommended</span>
                  <h2>{top.quantity} × {top.product.shortName}</h2>
                  <p>{top.product.displayName}</p>
                  <div className="planner-mini-stats">
                    <span>{formatNumber(top.totalEffectiveCfm, 0)} CFM</span>
                    <span>{formatNumber(top.estimatedAch, 1)} ACH</span>
                    <span>{formatNumber(top.totalAmps, 1)}A</span>
                  </div>
                </div>

                <div className="planner-standard-box">
                  <strong>{form.stateProvince} planning basis</strong>
                  <p>{result.rule?.name || 'Project-specific'} · {formatNumber(result.calculations.targetAch, 1)} ACH · {result.rule?.pressureDirection || 'Pressure direction varies'}</p>
                  <small>{result.jurisdictionNote}</small>
                </div>

                <div className={`planner-monitor-box ${placedMonitorNeeded ? 'needs-monitor' : ''}`}>
                  <strong>{result.monitorRequirement === 'optional' ? 'Pressure monitor optional' : 'Quote a pressure monitor'}</strong>
                  <p>{result.monitorLabel}</p>
                  {placedMonitorNeeded ? <small>No monitor is currently placed on the layout.</small> : null}
                </div>

                <div className={`planner-power-box ${placedSummary.sensorLoad > placedSummary.effectiveLimit ? 'over-limit' : ''}`}>
                  <strong>Monitor/sensor bus load</strong>
                  <p>{placedSummary.sensorLoad}mA shown / {placedSummary.effectiveLimit}mA planning capacity</p>
                  {placedSummary.sensorLoad > placedSummary.effectiveLimit ? <small>Over limit. Add local power/Power Bus or reduce sensors.</small> : <small>Still confirm actual wiring and local power plan.</small>}
                </div>

                <div className="planner-warnings-list">
                  {[...(top.warnings || []), ...(placedMonitorNeeded ? ['Pressure monitoring is recommended but no PPM4/RPM has been placed on the plan.'] : [])].slice(0, 6).map((warning) => <p key={warning}>⚠ {warning}</p>)}
                </div>
              </>
            )}

            <div className="planner-report-actions">
              <button className="button primary full-width" type="button" onClick={() => setShowReport(true)}>Get report</button>
              <button className="button secondary full-width" type="button" onClick={copyReport}>{copied ? 'Copied' : 'Copy report'}</button>
              <button className="button secondary full-width" type="button" onClick={downloadReport}>Download .txt</button>
              <a className="button secondary full-width" href={`${supportPortalUrl}?description=${encodeURIComponent(reportText)}`} target="_blank" rel="noreferrer">Open ticket</a>
            </div>
          </aside>
        </section>

        {showReport ? (
          <div className="planner-report-modal" role="dialog" aria-modal="true" aria-label="MonSuite report">
            <div className="planner-report-modal-card">
              <div className="modal-header-row">
                <div>
                  <p className="eyebrow">Generated report</p>
                  <h2>Recommendation summary</h2>
                </div>
                <button className="button secondary small" type="button" onClick={() => setShowReport(false)}>Close</button>
              </div>
              <pre>{reportText}</pre>
              <div className="planner-report-actions horizontal">
                <button className="button primary" type="button" onClick={copyReport}>{copied ? 'Copied' : 'Copy report'}</button>
                <button className="button secondary" type="button" onClick={downloadReport}>Download .txt</button>
              </div>
            </div>
          </div>
        ) : null}

        <p className="selector-disclaimer planner-disclaimer">{selectorDisclaimer}</p>
      </main>
    </AppShell>
  );
}
