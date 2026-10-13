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
  filterLoading: 'normal',
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

const applicationStarters = [
  {
    id: 'healthcare-icra',
    label: 'Healthcare construction',
    detail: 'ICRA-style containment, reports, alerts',
    values: {
      projectType: 'hospital_construction', hazard: 'construction_dust', primaryGoal: 'clean_air_negative_pressure',
      siteEnvironment: 'healthcare_construction', exhaustSetup: 'outside', needDocumentation: 'yes', targetAch: '12', powerAvailable: 'unknown',
    },
  },
  {
    id: 'mold-wet',
    label: 'Mold / wet restoration',
    detail: 'Plastic cabinets, finished spaces, HEPA',
    values: {
      projectType: 'mold', hazard: 'mold_spores', primaryGoal: 'clean_air_negative_pressure',
      siteEnvironment: 'wet_damp_restoration', exhaustSetup: 'outside', needDocumentation: 'yes', targetAch: '6', powerAvailable: '120v15a',
    },
  },
  {
    id: 'abatement',
    label: 'Asbestos / hazardous dust',
    detail: 'Negative containment + pressure proof',
    values: {
      projectType: 'asbestos', hazard: 'asbestos', primaryGoal: 'negative_pressure',
      siteEnvironment: 'commercial_industrial', exhaustSetup: 'outside', needDocumentation: 'yes', targetAch: '4', powerAvailable: 'multiple',
    },
  },
  {
    id: 'large-air-cleaning',
    label: 'Large air cleaning',
    detail: 'High CFM, few machines, power review',
    values: {
      projectType: 'general_air_cleaning', hazard: 'general_particulate', primaryGoal: 'clean_air',
      siteEnvironment: 'large_containment', exhaustSetup: 'recirculate', needDocumentation: 'no', targetAch: '6', powerAvailable: 'multiple',
    },
  },
];

const customerQuestions = [
  'What is the project/application and what does the spec actually require?',
  'Is the goal recirculation, negative pressure, positive pressure, or both?',
  'What room size, ceiling height, duct path, and exhaust location should be assumed?',
  'What power is available: 120V 15A/20A, multiple circuits, or 230V?',
  'Do they need live alerts, reports, or a final project record in Abatement Link?',
];

const plannerFlowLabels = {
  job: { label: 'Job', detail: 'Use case + goal' },
  room: { label: 'Room', detail: 'Size + ACH' },
  select: { label: 'Select', detail: 'Scrubber choice' },
  layout: { label: 'Layout', detail: 'Units placed' },
  monitor: { label: 'Monitor', detail: 'Proof/reporting' },
  report: { label: 'Report', detail: 'Customer handoff' },
};

function buildPlannerReadiness({ form, result, top, placedSummary, hasRecommendedLayout, placedMonitorNeeded }) {
  const roomVolume = result.calculations?.roomVolume || 0;
  const hasJobInputs = !(result.errors || []).some((error) => /project type|hazard|primary goal/i.test(error));
  const hasRoom = roomVolume > 0;
  const hasRecommendation = Boolean(top);
  const monitorOptional = result.monitorRequirement === 'optional';
  const hasMonitorPlan = monitorOptional || !placedMonitorNeeded;
  const hasReport = hasJobInputs && hasRoom && hasRecommendation;
  const steps = [
    { id: 'job', done: hasJobInputs, value: optionLabel(projectTypes, form.projectType), action: 'Choose the closest real job type and goal.' },
    { id: 'room', done: hasRoom, value: hasRoom ? `${formatNumber(roomVolume, 0)} ft³` : 'Needs dimensions', action: 'Enter room length, width, height, and any ducting.' },
    { id: 'select', done: hasRecommendation, value: top ? `${top.quantity} × ${top.product.shortName}` : 'No selection yet', action: 'Review the scrubber cards and choose the best fit.' },
    { id: 'layout', done: Boolean(hasRecommendedLayout), value: hasRecommendedLayout ? 'Recommended units placed' : 'Layout not complete', action: 'Use “Build setup” or drag the selected units into the room.' },
    { id: 'monitor', done: hasMonitorPlan, value: monitorOptional ? 'Optional' : placedSummary.monitorCount ? 'Placed' : 'Needed', action: 'Add RPM/PPM4 when pressure or reporting is part of the job.' },
    { id: 'report', done: hasReport, value: hasReport ? 'Ready to generate' : 'Waiting on inputs', action: 'Generate the customer-facing report after the selected setup is reviewed.' },
  ];
  const completed = steps.filter((step) => step.done).length;
  const next = steps.find((step) => !step.done) || steps[steps.length - 1];
  const score = Math.round((completed / steps.length) * 100);
  const readyForCustomer = steps.every((step) => step.done || step.id === 'monitor' && monitorOptional);
  return { steps, completed, next, score, readyForCustomer };
}

function FlowStepRail({ readiness }) {
  return (
    <div className="planner-v44-flow-rail" aria-label="Planner workflow">
      {readiness.steps.map((step, index) => {
        const meta = plannerFlowLabels[step.id];
        return (
          <div key={step.id} className={`planner-v44-flow-step ${step.done ? 'done' : ''} ${readiness.next?.id === step.id ? 'current' : ''}`}>
            <b>{step.done ? '✓' : index + 1}</b>
            <span>{meta.label}</span>
            <small>{meta.detail}</small>
          </div>
        );
      })}
    </div>
  );
}

function ReadinessCard({ readiness, top, monitoringPackage, onBuildSetup, onOpenReport }) {
  return (
    <section className="planner-v44-readiness-card">
      <div className="planner-v44-readiness-head">
        <div>
          <p className="eyebrow">Setup flow</p>
          <h2>{readiness.score}% ready</h2>
        </div>
        <span className={readiness.readyForCustomer ? 'ready' : ''}>{readiness.readyForCustomer ? 'Customer-ready draft' : 'Working draft'}</span>
      </div>
      <div className="planner-v44-progress"><i style={{ width: `${readiness.score}%` }} /></div>
      <p><strong>Next:</strong> {readiness.next?.action}</p>
      {top ? <p><strong>Selected setup:</strong> {top.quantity} × {top.product.shortName} · {formatNumber(top.totalEffectiveCfm, 0)} CFM · {formatNumber(top.estimatedAch, 1)} ACH.</p> : null}
      <p><strong>Monitoring:</strong> {monitoringPackage.name}</p>
      <div className="planner-v44-readiness-actions">
        <button className="button primary small" type="button" onClick={onBuildSetup} disabled={!top}>Build setup</button>
        <button className="button secondary small" type="button" onClick={onOpenReport} disabled={!top}>Preview report</button>
      </div>
    </section>
  );
}

function SelectedSetupPanel({ form, result, top, monitoringPackage, hasRecommendedLayout, placedMonitorNeeded, placedSummary, onBuildSetup, onOpenReport }) {
  const watchouts = [];
  if (top?.warnings?.length) watchouts.push(...top.warnings.slice(0, 3));
  if (placedMonitorNeeded) watchouts.unshift('Pressure/reporting is expected, but no PPM4/RPM is currently placed on the layout.');
  if (!hasRecommendedLayout && top) watchouts.unshift(`Layout is short ${Math.max(0, top.quantity - (placedSummary.scrubberCounts[top.product.id] || 0))} × ${top.product.shortName}.`);

  return (
    <section className="planner-v44-selected-panel" aria-label="Selected setup summary">
      <div>
        <p className="eyebrow">Selected setup</p>
        <h2>{top ? `${top.quantity} × ${top.product.displayName}` : 'Complete the inputs to select a setup'}</h2>
        <p>{top ? top.product.bestUse || top.fitLabel : 'Start with a real job preset, enter room details, then pick the option that fits the site.'}</p>
      </div>
      <div className="planner-v44-selected-metrics">
        <span><b>{top ? formatNumber(top.totalEffectiveCfm, 0) : '—'}</b><small>effective CFM</small></span>
        <span><b>{top ? formatNumber(top.estimatedAch, 1) : '—'}</b><small>estimated ACH</small></span>
        <span><b>{top ? `${formatNumber(top.totalAmps, 1)}A` : '—'}</b><small>electrical load</small></span>
        <span><b>{formatNumber(result.calculations?.roomVolume || 0, 0)}</b><small>room ft³</small></span>
      </div>
      <div className="planner-v44-selected-body">
        <article>
          <strong>Why it fits</strong>
          <ul>{(top?.fitReasons?.length ? top.fitReasons : [top?.fitLabel || 'Recommendation updates as job inputs change.']).slice(0, 4).map((item) => <li key={item}>{item}</li>)}</ul>
        </article>
        <article>
          <strong>Monitoring/reporting</strong>
          <p>{monitoringPackage.reason}</p>
          <small>{monitoringPackage.include.join(' · ')}</small>
        </article>
        <article>
          <strong>Watchouts</strong>
          <ul>{(watchouts.length ? watchouts : ['No major watchouts from the current inputs. Confirm field conditions before final quote.']).slice(0, 4).map((item) => <li key={item}>{item}</li>)}</ul>
        </article>
      </div>
      <div className="planner-v44-selected-actions">
        <button className="button primary" type="button" onClick={onBuildSetup} disabled={!top}>Build recommended setup</button>
        <button className="button secondary" type="button" onClick={onOpenReport} disabled={!top}>Preview report</button>
      </div>
    </section>
  );
}

function ReportSnapshot({ form, result, top, monitoringPackage, placedSummary, compact = false }) {
  if (!top) return null;
  return (
    <section className={`planner-v44-report-snapshot ${compact ? 'compact' : ''}`}>
      <div>
        <span>Project</span>
        <strong>{optionLabel(projectTypes, form.projectType)}</strong>
        <small>{optionLabel(primaryGoalOptions, form.primaryGoal)}</small>
      </div>
      <div>
        <span>Scrubber setup</span>
        <strong>{top.quantity} × {top.product.shortName}</strong>
        <small>{formatNumber(top.totalEffectiveCfm, 0)} CFM · {formatNumber(top.estimatedAch, 1)} ACH</small>
      </div>
      <div>
        <span>Power / weight</span>
        <strong>{formatNumber(top.totalAmps, 1)}A · {formatNumber(top.totalWeightLb, 0)} lb</strong>
        <small>{top.circuitsNeeded ? `~${top.circuitsNeeded} circuit(s)` : 'Confirm circuit plan'}</small>
      </div>
      <div>
        <span>Monitoring</span>
        <strong>{monitoringPackage.level}</strong>
        <small>{placedSummary.monitorCount ? `${placedSummary.monitorCount} monitor(s) on layout` : result.monitorRequirement === 'optional' ? 'Optional' : 'Add monitor to layout'}</small>
      </div>
    </section>
  );
}


const realPlannerScrubbers = scrubberProducts.filter((product) => (
  product.isRealProduct
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

function orderProducts(products, preferredOrder) {
  const orderMap = new Map(preferredOrder.map((id, index) => [id, index]));
  return [...products].sort((a, b) => {
    const aRank = orderMap.has(a.id) ? orderMap.get(a.id) : 99;
    const bRank = orderMap.has(b.id) ? orderMap.get(b.id) : 99;
    return aRank - bRank;
  });
}

function getSiteFilteredScrubbers(siteEnvironment) {
  if (siteEnvironment === 'wet_damp_restoration') {
    return orderProducts(realPlannerScrubbers, ['abatement_bd2k_xhp_xhpa', 'abatement_pred750', 'abatement_hc800fd_series', 'abatement_pas2400', 'abatement_h2km_h2kma', 'abatement_pas5000']);
  }
  if (siteEnvironment === 'residential_finished') {
    return orderProducts(realPlannerScrubbers, ['abatement_bd2k_xhp_xhpa', 'abatement_pred750', 'abatement_hc800fd_series', 'abatement_pas2400', 'abatement_h2km_h2kma', 'abatement_pas5000']);
  }
  if (siteEnvironment === 'healthcare_construction') {
    return orderProducts(realPlannerScrubbers, ['abatement_hc800fd_series', 'abatement_h2km_h2kma', 'abatement_pas2400', 'abatement_bd2k_xhp_xhpa', 'abatement_pred750', 'abatement_pas5000']);
  }
  if (siteEnvironment === 'tight_access_stairs') {
    return orderProducts(realPlannerScrubbers, ['abatement_pred750', 'abatement_pas2400', 'abatement_bd2k_xhp_xhpa', 'abatement_hc800fd_series', 'abatement_h2km_h2kma', 'abatement_pas5000']);
  }
  if (siteEnvironment === 'large_containment') {
    return orderProducts(realPlannerScrubbers, ['abatement_pas5000', 'abatement_pas2400', 'abatement_h2km_h2kma', 'abatement_bd2k_xhp_xhpa', 'abatement_hc800fd_series', 'abatement_pred750']);
  }
  return orderProducts(realPlannerScrubbers, ['abatement_h2km_h2kma', 'abatement_bd2k_xhp_xhpa', 'abatement_pas2400', 'abatement_pred750', 'abatement_hc800fd_series', 'abatement_pas5000']);
}

function productRoleLabel(product) {
  const tier = product.productTier || '';
  if (tier.includes('healthcare')) return 'Healthcare / clean-space';
  if (tier.includes('plastic')) return 'Plastic 2,000 CFM';
  if (tier.includes('metal')) return 'Metal 2,000 CFM';
  if (tier.includes('large')) return 'Large containment';
  if (tier.includes('high')) return 'High-CFM 120V';
  return 'Compact / portable';
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

function getMonitoringPackage(form, result, placedSummary) {
  const pressureNeeded = result.monitorRequirement !== 'optional' || String(form.primaryGoal || '').includes('pressure');
  const documentationNeeded = form.needDocumentation === 'yes' || ['hospital_construction', 'hospital_airborne_isolation', 'asbestos'].includes(form.projectType);
  const needsMultiSensor = ['hospital_construction', 'hospital_airborne_isolation', 'healthcare_positive_pressure'].includes(form.projectType)
    || ['airborne_infection', 'construction_dust', 'mold_spores', 'asbestos', 'silica_dust'].includes(form.hazard);

  if (documentationNeeded && needsMultiSensor) {
    return {
      name: 'AGIM3 / RPM multi-sensor package',
      level: 'Full documentation package',
      reason: 'Use when pressure plus environmental/particle evidence, live alerts, and reporting matter.',
      include: ['RPM', 'pressure sensing', 'temp/RH', 'particle monitoring when required', 'Abatement Link Projects for reports and user tracking'],
    };
  }

  if (pressureNeeded && documentationNeeded) {
    return {
      name: 'RPM fixed pressure package',
      level: 'Fixed monitoring package',
      reason: 'Use when the project needs a more permanent wall-mounted pressure record and shared reporting path.',
      include: ['RPM', 'pressure tubing/reference point', 'AT Connect / Abatement Link', 'alarm history and report export'],
    };
  }

  if (pressureNeeded) {
    return {
      name: 'PPM4 portable pressure package',
      level: 'Portable pressure proof',
      reason: 'Use when the site needs portable pressure verification, alarm visibility, and quick deployment.',
      include: ['PPM4', 'room/reference tubing', 'AT Connect if remote alarms or downloads are needed'],
    };
  }

  return {
    name: placedSummary.monitorCount ? 'Monitor already placed' : 'Monitoring optional',
    level: 'Air cleaning only',
    reason: 'Pressure monitoring is optional when the plan is recirculating filtered air and no pressure relationship is claimed.',
    include: ['Add a monitor if the customer needs alarms, records, or proof of pressure relationship'],
  };
}

function getPlannerValueNotes(form, result, top) {
  const notes = [];
  if (top?.product?.bestUse) notes.push(top.product.bestUse);
  if (form.siteEnvironment === 'wet_damp_restoration' || form.siteEnvironment === 'residential_finished') {
    notes.push('Wet/residential/finished-space jobs prioritize plastic/portable units such as BD2K or PRED750 before heavy metal cabinets.');
  }
  if (form.powerAvailable === '120v15a' || form.powerAvailable === '120v20a') {
    notes.push('Power availability is limiting selection. Confirm dedicated circuits before quoting multiple units.');
  }
  if (result.calculations?.ductProfile === 'long') {
    notes.push('Long/flexible ducting adds conservative airflow derating. Shorten and straighten ducting where practical.');
  }
  if (result.monitorRequirement !== 'optional') {
    notes.push('Pressure must be verified with a calibrated pressure monitor; airflow and ACH estimates do not prove the pressure relationship.');
  }
  return notes;
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

  const monitoringPackage = getMonitoringPackage(form, result, placedSummary);
  const valueNotes = getPlannerValueNotes(form, result, top);
  const lines = [
    'MONSUITE AIRFLOW PLANNING REPORT',
    'Planning estimate — not a final engineering, regulatory, or compliance determination.',
    '',
    '1. JOB SUMMARY',
    `Location: ${form.city ? `${form.city}, ` : ''}${form.stateProvince}, ${form.country}`,
    `Project/application: ${optionLabel(projectTypes, form.projectType)}`,
    `Hazard/concern: ${optionLabel(hazardOptions, form.hazard)}`,
    `Primary goal: ${optionLabel(primaryGoalOptions, form.primaryGoal)}`,
    `Site condition: ${optionLabel(siteEnvironmentOptions, form.siteEnvironment)}`,
    `Documentation/reporting need: ${form.needDocumentation === 'yes' ? 'Yes' : form.needDocumentation === 'no' ? 'No' : 'Confirm'}`,
    '',
    '2. ROOM AND AIRFLOW BASIS',
    `Room/containment: ${form.length} × ${form.width} × ${form.height} ${form.unitSystem}`,
    `Room count: ${form.roomCount || '1'}`,
    `Calculated volume: ${formatNumber(result.calculations.roomVolume, 0)} ft³`,
    `Planning basis: ${result.rule?.name || 'Project-specific'}`,
    `Target ACH: ${formatNumber(result.calculations.targetAch, 1)} ACH`,
    `Pressure direction/target: ${result.rule?.pressureDirection || 'Project-specific'} / ${result.calculations.targetPressure || 'Confirm with project spec'}`,
    `Required CFM before safety factor: ${formatNumber(result.calculations.requiredCfm, 0)} CFM`,
    `Design CFM after safety factor: ${formatNumber(result.calculations.designCfm, 0)} CFM`,
    `Duct profile: ${result.calculations.ductProfile}; derating used: ${formatNumber(result.calculations.deratingFactor * 100, 0)}%`,
    '',
    '3. SELECTED SCRUBBER SETUP',
    `Selected recommendation: ${top.quantity} × ${top.product.displayName}`,
    `Product fit: ${top.fitLabel || 'Meets design target'}`,
    `Estimated installed airflow: ${formatNumber(top.totalEffectiveCfm, 0)} CFM`,
    `Estimated achieved ACH: ${formatNumber(top.estimatedAch, 1)} ACH`,
    `Estimated electrical load: ${formatNumber(top.totalAmps, 1)}A${top.circuitsNeeded ? `; roughly ${top.circuitsNeeded} circuit(s) depending on site limits` : ''}`,
    `Estimated equipment weight: ${top.totalWeightLb ? `${formatNumber(top.totalWeightLb, 0)} lb` : 'Confirm'}`,
    '',
    '4. WHY THIS OPTION FITS',
    ...(top.fitReasons?.length ? top.fitReasons.map((item) => `- ${item}`) : valueNotes.length ? valueNotes.map((item) => `- ${item}`) : ['- Recommendation is based on the entered application, hazard, room size, ducting, power, and site condition.']),
    '',
    '5. MONITORING AND REPORTING PACKAGE',
    `Pressure monitor recommendation: ${result.monitorLabel}`,
    `Recommended monitoring package: ${monitoringPackage.name} (${monitoringPackage.level})`,
    `Reason: ${monitoringPackage.reason}`,
    `Includes: ${monitoringPackage.include.join('; ')}`,
    '',
    '6. LAYOUT CHECK',
    `Equipment currently drawn on plan: ${placedItems.length} item(s)`,
    `Scrubbers placed on plan: ${placedScrubbers}`,
    `Layout status: ${planStatus}`,
    `Monitor/sensor bus load shown: ${placedSummary.sensorLoad}mA / ${placedSummary.effectiveLimit}mA planning capacity`,
    '',
    '7. OTHER SCRUBBER OPTIONS CONSIDERED',
    ...(result.recommendations || []).filter((rec) => rec.product.id !== top.product.id).slice(0, 4).map((rec) => `- ${rec.quantity} × ${rec.product.shortName || rec.product.model}: ${formatNumber(rec.totalEffectiveCfm, 0)} CFM, ${formatNumber(rec.estimatedAch, 1)} ACH, ${rec.fitLabel || 'review fit'}`),
    '',
    '8. ACCESSORIES / NOTES',
    ...top.accessories.map((item) => `- ${item}`),
    '- Confirm final ACH, pressure target, duct path, exhaust location, filters, circuits, facility/project spec, consultant/IPAC/IH direction, and AHJ requirements before final recommendation.',
    '- Field pressure must be verified with a calibrated pressure monitor whenever negative/positive pressure is required or claimed.',
    '',
    '9. QUESTIONS TO CONFIRM BEFORE FINAL QUOTE',
    ...customerQuestions.map((item) => `- ${item}`),
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

function RecommendationCard({ rec, index, selected, onSelect, onAdd }) {
  const powerText = rec.circuitsNeeded
    ? `${formatNumber(rec.totalAmps, 1)}A · ~${rec.circuitsNeeded} circuit(s)`
    : `${formatNumber(rec.totalAmps, 1)}A`;
  return (
    <article className={`planner-v43-rec-card ${selected ? 'selected' : ''}`}>
      <button type="button" className="planner-v43-rec-main" onClick={onSelect}>
        <span className="planner-v43-rec-rank">#{index + 1}</span>
        <strong>{rec.quantity} × {rec.product.shortName || rec.product.model}</strong>
        <small>{rec.fitLabel}</small>
      </button>
      <div className="planner-v43-rec-metrics">
        <span><b>{formatNumber(rec.totalEffectiveCfm, 0)}</b><small>effective CFM</small></span>
        <span><b>{formatNumber(rec.estimatedAch, 1)}</b><small>ACH</small></span>
        <span><b>{powerText}</b><small>power estimate</small></span>
      </div>
      <p>{rec.fitReasons?.[0] || rec.product.bestUse || rec.product.salesRole}</p>
      <div className="planner-v43-rec-actions">
        <button className="button secondary small" type="button" onClick={onSelect}>Use this option</button>
        <button className="button primary small" type="button" onClick={onAdd}>Add to layout</button>
      </div>
    </article>
  );
}

function ProductFitCard({ product }) {
  return (
    <article className="planner-v43-product-fit-card">
      <div>
        <span>{productRoleLabel(product)}</span>
        <h3>{product.shortName || product.model}</h3>
      </div>
      <p>{product.bestUse || product.salesRole}</p>
      <dl>
        <div><dt>Airflow</dt><dd>{formatNumber(product.airflow?.appDefaultCfm || product.airflow?.maxRatedCfm, 0)} CFM planning</dd></div>
        <div><dt>Power</dt><dd>{product.electrical?.voltageVac || 120}V · {product.electrical?.normalOperatingAmpsMax || '—'}A</dd></div>
        <div><dt>Cabinet</dt><dd>{product.physical?.cabinet || 'Confirm'}</dd></div>
      </dl>
    </article>
  );
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
  const [selectedRecommendationId, setSelectedRecommendationId] = useState(null);
  const [draggingPlaced, setDraggingPlaced] = useState(null);
  const canvasRef = useRef(null);
  const resizeRef = useRef(null);

  const locations = form.country === 'Canada' ? canadaProvinces : usStates;
  const result = useMemo(() => getScrubberRecommendation({ ...form, ductType: form.ductType === 'flexible' ? 'flex' : form.ductType }), [form]);
  const leadRecommendation = result.recommendations?.[0];
  const selectedRecommendation = result.recommendations?.find((rec) => rec.product.id === selectedRecommendationId) || leadRecommendation;
  const top = selectedRecommendation;
  const allowedScrubbers = useMemo(() => getSiteFilteredScrubbers(form.siteEnvironment), [form.siteEnvironment]);
  const placedSummary = useMemo(() => buildPlacedSummary(placedItems), [placedItems]);
  const monitoringPackage = useMemo(() => getMonitoringPackage(form, result, placedSummary), [form, result, placedSummary]);
  const valueNotes = useMemo(() => getPlannerValueNotes(form, result, top), [form, result, top]);
  const reportText = useMemo(() => buildReport(form, result, top, placedItems, placedSummary), [form, result, top, placedItems, placedSummary]);
  const placedMonitorNeeded = result.monitorRequirement !== 'optional' && placedSummary.monitorCount === 0;
  const hiddenDryUnits = ['wet_damp_restoration', 'residential_finished'].includes(form.siteEnvironment);
  const topPlacedCount = getTopPlacedCount(placedSummary, top);
  const hasRecommendedLayout = top && topPlacedCount >= top.quantity;
  const flowReadiness = useMemo(() => buildPlannerReadiness({ form, result, top, placedSummary, hasRecommendedLayout, placedMonitorNeeded }), [form, result, top, placedSummary, hasRecommendedLayout, placedMonitorNeeded]);
  const roomLength = Math.max(numberValue(form.length, 30), 1);
  const roomWidth = Math.max(numberValue(form.width, 20), 1);
  const roomHeight = Math.max(numberValue(form.height, 10), 1);
  const displayScale = Math.min(1040 / roomLength, 690 / roomWidth, 24);
  const roomStyle = {
    width: `${Math.max(360, roomLength * displayScale)}px`,
    height: `${Math.max(250, roomWidth * displayScale)}px`,
  };

  function applyStarter(starter) {
    setCopied(false);
    setSelectedRecommendationId(null);
    setForm((current) => ({ ...current, ...starter.values }));
  }

  function selectRecommendation(rec) {
    if (!rec?.product?.id) return;
    setSelectedRecommendationId(rec.product.id);
    setCopied(false);
  }

  function updateField(field, value) {
    setCopied(false);
    setSelectedRecommendationId(null);
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

  function addRecommendedToPlan(recommendation = top) {
    if (!recommendation?.product) return;
    const existingCount = placedSummary.scrubberCounts[recommendation.product.id] || 0;
    const base = paletteItemFromScrubber(recommendation.product);
    const countNeeded = Math.max(0, recommendation.quantity - existingCount);
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

  function buildRecommendedSetup() {
    if (!top?.product) return;
    const base = paletteItemFromScrubber(top.product);
    const monitorItem = monitorItems[0];
    setPlacedItems((current) => {
      const summary = buildPlacedSummary(current);
      const missingScrubbers = Math.max(0, top.quantity - (summary.scrubberCounts[top.product.id] || 0));
      const addedScrubbers = Array.from({ length: missingScrubbers }).map((_, index) => ({
        ...base,
        uid: `${base.id}-flow-${Date.now()}-${index}`,
        x: 92 + ((summary.scrubberCounts[top.product.id] || 0) + index) % 3 * 124,
        y: 126 + Math.floor(((summary.scrubberCounts[top.product.id] || 0) + index) / 3) * 88,
      }));
      const addedMonitor = result.monitorRequirement !== 'optional' && summary.monitorCount === 0
        ? [{ ...monitorItem, uid: `${monitorItem.id}-flow-${Date.now()}`, x: 92, y: 58 }]
        : [];
      return [...current, ...addedScrubbers, ...addedMonitor];
    });
    if (result.monitorRequirement !== 'optional') setForm((current) => ({ ...current, needDocumentation: 'yes' }));
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
              <h1>Setup planner</h1>
              <p>Follow the setup flow from job info to customer report. MonSuite updates scrubber, monitoring, power, and layout checks as you work.</p>
              <FlowStepRail readiness={flowReadiness} />
            </div>

            <ReadinessCard readiness={flowReadiness} top={top} monitoringPackage={monitoringPackage} onBuildSetup={buildRecommendedSetup} onOpenReport={() => setShowReport(true)} />

            <div className="planner-starter-card">
              <div>
                <p className="eyebrow">Start with a real job</p>
                <h2>Pick the closest use case</h2>
              </div>
              <div className="planner-starter-grid">
                {applicationStarters.map((starter) => (
                  <button key={starter.id} type="button" onClick={() => applyStarter(starter)}>
                    <strong>{starter.label}</strong>
                    <small>{starter.detail}</small>
                  </button>
                ))}
              </div>
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
                    <Field label="Rooms/areas"><input value={form.roomCount} onChange={(event) => updateField('roomCount', event.target.value)} inputMode="numeric" /></Field>
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
                    <Field label="Filter/loading assumption">
                      <select value={form.filterLoading} onChange={(event) => updateField('filterLoading', event.target.value)}>
                        <option value="normal">Normal / clean-to-moderate filters</option>
                        <option value="heavy">Heavy loading / conservative airflow</option>
                      </select>
                    </Field>
                    <Field label="Planner priority">
                      <select value={form.budgetPriority} onChange={(event) => updateField('budgetPriority', event.target.value)}>
                        <option value="best_fit">Best sales fit</option>
                        <option value="fewest_machines">Fewest machines</option>
                        <option value="lowest_electrical_load">Lowest electrical load</option>
                        <option value="quietest">Quietest</option>
                        <option value="most_conservative">Most conservative</option>
                        <option value="smallest_footprint">Smallest footprint</option>
                      </select>
                    </Field>
                  </div>
                  <div className="planner-two-col">
                    <Field label="Occupied adjacent area?">
                      <select value={form.occupiedAdjacentArea} onChange={(event) => updateField('occupiedAdjacentArea', event.target.value)}>
                        <option value="unknown">Unknown</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                    </Field>
                    <Field label="Patient occupied adjacent?">
                      <select value={form.patientOccupiedAdjacent} onChange={(event) => updateField('patientOccupiedAdjacent', event.target.value)}>
                        <option value="unknown">Unknown</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                    </Field>
                  </div>
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
                <button className="button primary full-width" type="button" onClick={buildRecommendedSetup} disabled={!top}>Build recommended setup</button>
                <button className="button secondary full-width" type="button" onClick={() => setShowReport(true)}>Preview report</button>
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
              <div className="planner-v39-live-card package">
                <span>Package</span>
                <strong>{monitoringPackage.level}</strong>
                <small>{monitoringPackage.name}</small>
              </div>
              <div className="planner-v39-command-actions">
                <button className="button primary small" type="button" onClick={buildRecommendedSetup} disabled={!top}>Build setup</button>
                <button className="button secondary small" type="button" onClick={() => addRecommendedToPlan(top)} disabled={!top || hasRecommendedLayout}>Add units only</button>
                <button className="button secondary small" type="button" onClick={addPressureMonitorToPlan} disabled={!placedMonitorNeeded}>Add RPM</button>
                <button className="button secondary small" type="button" onClick={() => setPlacedItems([])}>Clear layout</button>
                <button className="button secondary small" type="button" onClick={() => setShowReport(true)}>Report</button>
              </div>
            </div>

            <SelectedSetupPanel
              form={form}
              result={result}
              top={top}
              monitoringPackage={monitoringPackage}
              hasRecommendedLayout={hasRecommendedLayout}
              placedMonitorNeeded={placedMonitorNeeded}
              placedSummary={placedSummary}
              onBuildSetup={buildRecommendedSetup}
              onOpenReport={() => setShowReport(true)}
            />

            <section className="planner-v43-recommendation-lab" aria-label="Scrubber recommendation comparison">
              <div className="planner-v43-section-head">
                <div>
                  <p className="eyebrow">V44 guided selection</p>
                  <h2>Choose the setup to build around</h2>
                  <p>Review the best-fit option first, then compare alternatives. The selected card drives the layout check and customer report.</p>
                </div>
                <div className="planner-v43-section-metrics">
                  <span>Required: <strong>{formatNumber(result.calculations.requiredCfm, 0)} CFM</strong></span>
                  <span>Design: <strong>{formatNumber(result.calculations.designCfm, 0)} CFM</strong></span>
                  <span>Derating: <strong>{formatNumber(result.calculations.deratingFactor * 100, 0)}%</strong></span>
                </div>
              </div>
              <div className="planner-v43-rec-grid">
                {result.recommendations?.length ? result.recommendations.map((rec, index) => (
                  <RecommendationCard
                    key={rec.product.id}
                    rec={rec}
                    index={index}
                    selected={top?.product?.id === rec.product.id}
                    onSelect={() => selectRecommendation(rec)}
                    onAdd={() => { selectRecommendation(rec); addRecommendedToPlan(rec); }}
                  />
                )) : <p className="planner-empty-note">Complete the required job inputs to see scrubber options.</p>}
              </div>
            </section>

            <ReportSnapshot form={form} result={result} top={top} monitoringPackage={monitoringPackage} placedSummary={placedSummary} />

            <div className="planner-v39-equipment-dock" aria-label="Draggable equipment">
              <div className="planner-v39-dock-row">
                <div className="planner-v39-dock-label">
                  <strong>Scrubbers</strong>
                  <span>{hiddenDryUnits ? 'Sorted for wet/residential work' : 'Real units only'}</span>
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

            <div className="planner-intelligence-grid">
              <article>
                <span>Monitoring package</span>
                <h3>{monitoringPackage.name}</h3>
                <p>{monitoringPackage.reason}</p>
                <ul>{monitoringPackage.include.map((item) => <li key={item}>{item}</li>)}</ul>
              </article>
              <article>
                <span>Sales fit notes</span>
                <h3>Why this recommendation fits</h3>
                <ul>{valueNotes.slice(0, 4).map((item) => <li key={item}>{item}</li>)}</ul>
              </article>
              <article>
                <span>Before final quote</span>
                <h3>Questions to confirm</h3>
                <ul>{customerQuestions.slice(0, 4).map((item) => <li key={item}>{item}</li>)}</ul>
              </article>
            </div>

            <details className="planner-v43-product-matrix planner-v44-product-guide">
              <summary>
                <span>Product fit cheat sheet</span>
                <strong>Which unit is what</strong>
                <small>Open when sales needs a quick product-positioning reminder.</small>
              </summary>
              <div className="planner-v43-product-grid">
                {realPlannerScrubbers.map((product) => <ProductFitCard key={product.id} product={product} />)}
              </div>
            </details>

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
              <div className="planner-v39-strip-card basis">
                <strong>{monitoringPackage.level}</strong>
                <p>{monitoringPackage.name}: {monitoringPackage.reason}</p>
              </div>
            </div>
          </section>
        </section>

        {showReport ? (
          <div className="planner-report-modal" role="dialog" aria-modal="true" aria-label="MonSuite report">
            <div className="planner-report-modal-card">
              <div className="modal-header-row">
                <div>
                  <p className="eyebrow">Report preview</p>
                  <h2>Customer handoff report</h2>
                </div>
                <button className="button secondary small" type="button" onClick={() => setShowReport(false)}>Close</button>
              </div>
              <ReportSnapshot form={form} result={result} top={top} monitoringPackage={monitoringPackage} placedSummary={placedSummary} compact />
              <div className="planner-v44-report-note">This report is written as a planning handoff. It gives sales/support a clear starting recommendation, assumptions, watchouts, and quote-confirmation questions.</div>
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
