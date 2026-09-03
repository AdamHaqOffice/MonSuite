import { useMemo, useRef, useState } from 'react';
import AppShell from './src/components/AppShell.jsx';
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
} from './src/data/scrubberSelectorData.js';
import { formatNumber, getScrubberRecommendation } from './src/utils/scrubberSelectorEngine.js';

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
  { id: 'power-bus', type: 'power', label: 'Power Bus', detail: 'Adds powered branch', busMa: -200, icon: '⚡' },
];

const ductItems = [
  { id: 'round', type: 'duct', label: 'Round duct', detail: 'Rigid/smooth round duct', icon: '○' },
  { id: 'square', type: 'duct', label: 'Square duct', detail: 'Rectangular duct', icon: '□' },
  { id: 'flexible', type: 'duct', label: 'Flexible duct', detail: 'Higher loss; keep short/taut', icon: '≈' },
];

const realPlannerScrubbers = scrubberProducts.filter((product) => (
  product.isRealProduct
  && product.id !== 'abatement_hc800fd_series'
  && !String(product.displayName || product.model || '').toLowerCase().includes('fake')
  && !String(product.displayName || product.model || '').toLowerCase().includes('demo')
));

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
    <div className="planner-stat planner-stat-v38">
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
  const sensorLoad = sensorItems.reduce((sum, item) => sum + Math.max(0, item.busMa || 0), 0);
  const effectiveLimit = 200 + powerBusCount * 200;
  return { scrubberCounts, monitorCount, sensorItems, powerBusCount, sensorLoad, effectiveLimit };
}

function getTopPlacedCount(placedSummary, top) {
  if (!top?.product?.id) return 0;
  return placedSummary.scrubberCounts[top.product.id] || 0;
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
  const topPlacedCount = getTopPlacedCount(placedSummary, top);
  const planStatus = topPlacedCount >= top.quantity
    ? `Plan currently includes the recommended ${top.quantity} × ${top.product.shortName}.`
    : `Plan is short ${top.quantity - topPlacedCount} × ${top.product.shortName}. Add recommended units before using this as the final layout.`;

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
    `Common planning basis selected: ${result.rule?.name || 'Project-specific'}`,
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
    `Layout status: ${planStatus}`,
    `Monitor/sensor bus load shown: ${placedSummary.sensorLoad}mA / ${placedSummary.effectiveLimit}mA planning capacity`,
    '',
    'Recommended accessories / notes:',
    ...top.accessories.map((item) => `- ${item}`),
    '- Confirm final ACH, pressure target, duct path, exhaust location, filters, circuits, facility/project spec, consultant/IPAC/IH direction, and AHJ requirements before final recommendation.',
    '- Field pressure must be verified with a calibrated pressure monitor whenever negative/positive pressure is required or claimed.',
  ];
  return lines.join('\n');
}

function EquipmentTile({ item, className = '' }) {
  return (
    <button className={`planner-palette-item planner-dock-item ${className}`} draggable onDragStart={(event) => startDrag(event, item)} type="button">
      <span className={`palette-icon ${item.type === 'scrubber' ? 'scrubber-icon' : ''}`}>{item.icon}</span>
      <strong>{item.label}</strong>
      <small>{item.detail}</small>
    </button>
  );
}

function ScrubberTile({ product }) {
  const item = paletteItemFromScrubber(product);
  return <EquipmentTile item={item} className="scrubber-palette-card" />;
}

function RoomCanvas({
  canvasRef,
  form,
  result,
  roomStyle,
  placedItems,
  beginResize,
  handleDrop,
  beginMovePlaced,
  movePlaced,
  endMovePlaced,
  removePlaced,
}) {
  return (
    <div
      className="planner-canvas planner-canvas-v38"
      ref={canvasRef}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
      onPointerMove={movePlaced}
      onPointerUp={endMovePlaced}
      onPointerLeave={endMovePlaced}
    >
      <div className="planner-room planner-room-v38" style={roomStyle}>
        <div className="room-label">
          <strong>Room / containment</strong>
          <span>{form.length} × {form.width} × {form.height} {form.unitSystem}</span>
          <b>{formatNumber(result.calculations.roomVolume, 0)} ft³</b>
        </div>
        <button className="room-resize-handle right" type="button" onMouseDown={(event) => beginResize(event, 'width')} aria-label="Resize room length" />
        <button className="room-resize-handle bottom" type="button" onMouseDown={(event) => beginResize(event, 'height')} aria-label="Resize room width" />
        <button className="room-resize-handle corner" type="button" onMouseDown={(event) => beginResize(event, 'corner')} aria-label="Resize room" />
      </div>

      {placedItems.map((item) => (
        <button
          key={item.uid}
          className={`placed-equipment placed-equipment-v38 placed-${item.type} ${item.type === 'duct' ? `duct-shape-${item.id}` : ''}`}
          type="button"
          style={{ left: item.x, top: item.y }}
          onPointerDown={(event) => beginMovePlaced(event, item)}
          title="Drag to move"
        >
          <span>{placedLabel(item)}</span>
          {item.type === 'sensor' ? <small>{item.busMa}mA</small> : null}
          {item.type === 'duct' ? <small>{item.id}</small> : null}
          <i
            role="button"
            tabIndex="0"
            className="placed-remove"
            aria-label={`Remove ${item.label}`}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => { event.stopPropagation(); removePlaced(item.uid); }}
          >×</i>
        </button>
      ))}
    </div>
  );
}

export default function ScrubberSelectorPage({ user, onLogout, theme, onToggleTheme, adminMode, canUseAdminMode }) {
  const [form, setForm] = useState(defaultForm);
  const [placedItems, setPlacedItems] = useState([]);
  const [selectedDuctType, setSelectedDuctType] = useState('round');
  const [showReport, setShowReport] = useState(false);
  const [copied, setCopied] = useState(false);
  const [draggingPlaced, setDraggingPlaced] = useState(null);
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
  const topPlacedCount = getTopPlacedCount(placedSummary, top);
  const hasRecommendedLayout = top && topPlacedCount >= top.quantity;
  const roomLength = Math.max(numberValue(form.length, 30), 1);
  const roomWidth = Math.max(numberValue(form.width, 20), 1);
  const roomHeight = Math.max(numberValue(form.height, 10), 1);
  const displayScale = Math.min(1040 / roomLength, 690 / roomWidth, 24);
  const roomStyle = {
    width: `${Math.max(360, roomLength * displayScale)}px`,
    height: `${Math.max(250, roomWidth * displayScale)}px`,
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
    const x = Math.max(12, Math.min(event.clientX - rect.left - 42, rect.width - 112));
    const y = Math.max(12, Math.min(event.clientY - rect.top - 28, rect.height - 72));
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

  function beginMovePlaced(event, item) {
    if (!canvasRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = canvasRef.current.getBoundingClientRect();
    setDraggingPlaced({
      uid: item.uid,
      offsetX: event.clientX - rect.left - item.x,
      offsetY: event.clientY - rect.top - item.y,
      pointerId: event.pointerId,
    });
    canvasRef.current.setPointerCapture?.(event.pointerId);
  }

  function movePlaced(event) {
    if (!draggingPlaced || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(8, Math.min(event.clientX - rect.left - draggingPlaced.offsetX, rect.width - 120));
    const y = Math.max(8, Math.min(event.clientY - rect.top - draggingPlaced.offsetY, rect.height - 74));
    setPlacedItems((current) => current.map((item) => (item.uid === draggingPlaced.uid ? { ...item, x, y } : item)));
  }

  function endMovePlaced(event) {
    if (draggingPlaced?.pointerId && canvasRef.current) {
      try {
        canvasRef.current.releasePointerCapture?.(draggingPlaced.pointerId);
      } catch {
        // Ignore if the browser already released it.
      }
    }
    setDraggingPlaced(null);
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
      displayScale,
    };
    window.addEventListener('mousemove', handleResizeMove);
    window.addEventListener('mouseup', endResize);
  }

  function handleResizeMove(event) {
    const resize = resizeRef.current;
    if (!resize) return;
    const ftPerPixel = 1 / resize.displayScale;
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

  function addRecommendedToPlan() {
    if (!top?.product) return;
    const base = paletteItemFromScrubber(top.product);
    const countNeeded = Math.max(0, top.quantity - topPlacedCount);
    if (!countNeeded) return;
    const newItems = Array.from({ length: countNeeded }).map((_, index) => ({
      ...base,
      uid: `${base.id}-auto-${Date.now()}-${index}`,
      x: 92 + (index % 3) * 124,
      y: 116 + Math.floor(index / 3) * 88,
    }));
    setPlacedItems((current) => [...current, ...newItems]);
  }

  function addPressureMonitorToPlan() {
    if (!placedMonitorNeeded) return;
    const item = monitorItems[0];
    setPlacedItems((current) => [...current, {
      ...item,
      uid: `${item.id}-auto-${Date.now()}`,
      x: 92,
      y: 58,
    }]);
    setForm((current) => ({ ...current, needDocumentation: 'yes' }));
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
      <main className="page-wrap airflow-planner-page airflow-planner-v39">
        <section className="planner-v39-shell">
          <aside className="planner-v39-sidebar" aria-label="Airflow planner report form">
            <div className="planner-v39-brand-card">
              <p className="eyebrow">Airflow planner</p>
              <h1>Setup report</h1>
              <p>Enter the job details on the left. Build the room and equipment plan on the right. MonSuite updates the scrubber and monitor recommendation as you work.</p>
            </div>

            <div className="planner-v39-form-card">
              <div className="planner-v39-form-head">
                <div>
                  <p className="eyebrow">Report form</p>
                  <h2>Job inputs</h2>
                </div>
                <button className="button primary small" type="button" onClick={() => setShowReport(true)}>Get report</button>
              </div>

              <div className="planner-v39-form-scroll">
                <details className="planner-v39-section" open>
                  <summary>1. Location</summary>
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
                  <Field label="City / facility" note="Optional. Used only in the report text.">
                    <input value={form.city} onChange={(event) => updateField('city', event.target.value)} placeholder="Optional" />
                  </Field>
                </details>

                <details className="planner-v39-section" open>
                  <summary>2. Application</summary>
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
                  <Field label="Site condition" note="Filters the equipment list. Wet/residential jobs hide metal-heavy dry-job units.">
                    <select value={form.siteEnvironment} onChange={(event) => updateField('siteEnvironment', event.target.value)}>
                      {siteEnvironmentOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                    </select>
                  </Field>
                </details>

                <details className="planner-v39-section" open>
                  <summary>3. Room size</summary>
                  <Field label="Known room volume" note="Optional. Enter ft³ and press Draw to resize the room box.">
                    <div className="planner-volume-input">
                      <input value={form.knownVolume} onChange={(event) => updateField('knownVolume', event.target.value)} placeholder="ft³" inputMode="decimal" />
                      <button className="button secondary small" type="button" onClick={applyKnownVolume}>Draw</button>
                    </div>
                  </Field>
                  <div className="planner-dimension-grid planner-v39-dims">
                    <Field label="Length"><input value={form.length} onChange={(event) => updateField('length', event.target.value)} inputMode="decimal" /></Field>
                    <Field label="Width"><input value={form.width} onChange={(event) => updateField('width', event.target.value)} inputMode="decimal" /></Field>
                    <Field label="Height"><input value={form.height} onChange={(event) => updateField('height', event.target.value)} inputMode="decimal" /></Field>
                    <Field label="Units">
                      <select value={form.unitSystem} onChange={(event) => updateField('unitSystem', event.target.value)}>
                        {unitSystemOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                      </select>
                    </Field>
                  </div>
                </details>

                <details className="planner-v39-section" open>
                  <summary>4. Ducting, power, documentation</summary>
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
                  <Field label="Exhaust setup">
                    <select value={form.exhaustSetup} onChange={(event) => updateField('exhaustSetup', event.target.value)}>
                      <option value="outside">Exhaust outside / out of containment</option>
                      <option value="adjacent">Exhaust to adjacent area</option>
                      <option value="recirculate">Recirculate in same space</option>
                    </select>
                  </Field>
                  <Field label="Power available">
                    <select value={form.powerAvailable} onChange={(event) => updateField('powerAvailable', event.target.value)}>
                      {powerOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                    </select>
                  </Field>
                  <div className="planner-two-col">
                    <Field label="Target ACH"><input value={form.targetAch} onChange={(event) => updateField('targetAch', event.target.value)} placeholder="Auto" inputMode="decimal" /></Field>
                    <Field label="Pressure target"><input value={form.targetPressure} onChange={(event) => updateField('targetPressure', event.target.value)} placeholder="Auto/spec" /></Field>
                  </div>
                  <Field label="Documentation required?">
                    <select value={form.needDocumentation} onChange={(event) => updateField('needDocumentation', event.target.value)}>
                      <option value="unknown">Unknown / decide from project</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </Field>
                </details>
              </div>

              <div className="planner-v39-left-actions">
                <button className="button primary full-width" type="button" onClick={() => setShowReport(true)}>Get report</button>
                <button className="button secondary full-width" type="button" onClick={copyReport}>{copied ? 'Copied' : 'Copy report'}</button>
                <button className="button secondary full-width" type="button" onClick={downloadReport}>Download .txt</button>
              </div>
            </div>
          </aside>

          <section className="planner-v39-workspace" aria-label="Airflow layout workspace">
            <div className="planner-v39-commandbar">
              <div className="planner-v39-live-card">
                <span>Lead recommendation</span>
                <strong>{top ? `${top.quantity} × ${top.product.shortName}` : 'Complete inputs'}</strong>
                <small>{top ? `${formatNumber(top.totalEffectiveCfm, 0)} CFM · ${formatNumber(top.estimatedAch, 1)} ACH` : 'Room and application required'}</small>
              </div>
              <div className="planner-v39-live-card">
                <span>Room volume</span>
                <strong>{formatNumber(result.calculations.roomVolume, 0)} ft³</strong>
                <small>{form.length} × {form.width} × {form.height} {form.unitSystem}</small>
              </div>
              <div className="planner-v39-live-card">
                <span>Monitor</span>
                <strong>{result.monitorRequirement === 'optional' ? 'Optional' : 'Recommended'}</strong>
                <small>{result.rule?.pressureDirection || 'Project-specific'}</small>
              </div>
              <div className="planner-v39-command-actions">
                <button className="button secondary small" type="button" onClick={addRecommendedToPlan} disabled={!top || hasRecommendedLayout}>Add recommended units</button>
                <button className="button secondary small" type="button" onClick={addPressureMonitorToPlan} disabled={!placedMonitorNeeded}>Add RPM</button>
                <button className="button secondary small" type="button" onClick={() => setPlacedItems([])}>Clear layout</button>
                <button className="button primary small" type="button" onClick={() => setShowReport(true)}>Get report</button>
              </div>
            </div>

            <div className="planner-v39-equipment-dock" aria-label="Draggable equipment">
              <div className="planner-v39-dock-row">
                <div className="planner-v39-dock-label">
                  <strong>Scrubbers</strong>
                  <span>{hiddenDryUnits ? 'Filtered for wet/residential work' : 'Real units only'}</span>
                </div>
                <div className="planner-v39-dock-items">
                  {allowedScrubbers.map((product) => <ScrubberTile key={product.id} product={product} />)}
                </div>
              </div>

              <div className="planner-v39-dock-row">
                <div className="planner-v39-dock-label">
                  <strong>Monitors + sensors</strong>
                  <span>Power warning updates from placed sensors</span>
                </div>
                <div className="planner-v39-dock-items">
                  {monitorItems.map((item) => <EquipmentTile key={item.id} item={item} />)}
                </div>
              </div>

              <div className="planner-v39-dock-row compact">
                <div className="planner-v39-dock-label">
                  <strong>Ducts</strong>
                  <span>Round, square, flexible</span>
                </div>
                <div className="planner-v39-dock-items ducts">
                  {ductItems.map((item) => (
                    <button key={item.id} className={`planner-palette-item planner-dock-item duct-${item.id} ${selectedDuctType === item.id ? 'active' : ''}`} draggable onClick={() => { setSelectedDuctType(item.id); updateField('ductType', item.id); }} onDragStart={(event) => startDrag(event, item)} type="button">
                      <span className="palette-icon">{item.icon}</span>
                      <strong>{item.label}</strong>
                      <small>{item.detail}</small>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="planner-v39-canvas-card">
              <RoomCanvas
                canvasRef={canvasRef}
                form={form}
                result={result}
                roomStyle={roomStyle}
                placedItems={placedItems}
                beginResize={beginResize}
                handleDrop={handleDrop}
                beginMovePlaced={beginMovePlaced}
                movePlaced={movePlaced}
                endMovePlaced={endMovePlaced}
                removePlaced={removePlaced}
              />
              <div className="planner-canvas-help planner-v39-help-row">
                <span>Drag equipment into the room. Drag placed items to move them. Use the blue handles to resize the room and update volume.</span>
                <span>{placedItems.length} item(s) on layout</span>
              </div>
            </div>

            <div className="planner-v39-report-strip">
              <div className={`planner-v39-strip-card ${hasRecommendedLayout ? 'ok' : 'needs-work'}`}>
                <strong>Layout check</strong>
                {top ? (
                  hasRecommendedLayout
                    ? <p>Plan includes the recommended {top.quantity} × {top.product.shortName}.</p>
                    : <p>Plan is short {Math.max(0, top.quantity - topPlacedCount)} × {top.product.shortName}. Add recommended units or drag units into the room.</p>
                ) : <p>Complete the inputs to check the layout.</p>}
              </div>
              <div className={`planner-v39-strip-card ${placedMonitorNeeded ? 'needs-work' : 'ok'}`}>
                <strong>{result.monitorRequirement === 'optional' ? 'Pressure monitor optional' : 'Pressure monitor recommended'}</strong>
                <p>{placedMonitorNeeded ? 'No PPM4/RPM is currently placed.' : result.monitorLabel}</p>
              </div>
              <div className={`planner-v39-strip-card ${placedSummary.sensorLoad > placedSummary.effectiveLimit ? 'needs-work' : ''}`}>
                <strong>Monitor/sensor bus load</strong>
                <p>{placedSummary.sensorLoad}mA shown / {placedSummary.effectiveLimit}mA planning capacity.</p>
              </div>
              <div className="planner-v39-strip-card basis">
                <strong>{form.stateProvince} planning basis</strong>
                <p>{result.rule?.name || 'Project-specific'} · {formatNumber(result.calculations.targetAch, 1)} ACH · {result.rule?.pressureDirection || 'Pressure direction varies'}</p>
              </div>
            </div>
          </section>
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
                <a className="button secondary" href={`${supportPortalUrl}?description=${encodeURIComponent(reportText)}`} target="_blank" rel="noreferrer">Open ticket</a>
              </div>
            </div>
          </div>
        ) : null}

        <p className="selector-disclaimer planner-disclaimer planner-v39-disclaimer">{selectorDisclaimer}</p>
      </main>
    </AppShell>
  );
}
