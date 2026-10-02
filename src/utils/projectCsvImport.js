import { measurementLabels } from '../data/projectTemplates.js';

export const ABATEMENT_LINK_PROFILE_VERSION = 'abatement-link-csv-v1';

const typeSynonyms = [
  { type: 'timestamp', terms: ['timestamp', 'date time', 'datetime', 'date/time', 'time stamp', 'recorded at', 'time'] },
  { type: 'device_identifier', terms: ['serial number', 'serial', 'device serial', 'device id', 'device identifier', 'unit serial', 'monitor serial'] },
  { type: 'sensor_identifier', terms: ['sensor id', 'sensor identifier', 'sensor name', 'sensor number', 'sensor'] },
  { type: 'differential_pressure', terms: ['differential pressure', 'pressure', 'room pressure', 'pres', 'dp'] },
  { type: 'temperature', terms: ['temperature', 'temp'] },
  { type: 'relative_humidity', terms: ['relative humidity', 'humidity', 'rh', '%rh'] },
  { type: 'pm1', terms: ['pm1', 'pm 1', 'particle 1'] },
  { type: 'pm25', terms: ['pm2.5', 'pm 2.5', 'pm25', 'particle 2.5'] },
  { type: 'pm10', terms: ['pm10', 'pm 10', 'particle 10'] },
  { type: 'velocity', terms: ['velocity', 'air velocity', 'airflow', 'air flow', 'ach'] },
];

function normalizeHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[()\[\]_/-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseCsv(text) {
  const rows = [];
  let current = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      current.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1;
      current.push(cell);
      if (current.some((value) => String(value).trim() !== '')) rows.push(current);
      current = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  current.push(cell);
  if (current.some((value) => String(value).trim() !== '')) rows.push(current);
  return rows;
}

function detectColumnType(header) {
  const normalized = normalizeHeader(header);
  if (!normalized) return null;
  const exact = typeSynonyms.find((entry) => entry.terms.includes(normalized));
  if (exact) return exact.type;
  return typeSynonyms.find((entry) => entry.terms.some((term) => normalized.includes(term)))?.type || null;
}

function inferUnit(header, type) {
  const h = String(header || '').toLowerCase();
  if (type === 'differential_pressure') {
    if (h.includes('pa')) return 'Pa';
    if (h.includes('wc') || h.includes('w.c') || h.includes('in')) return 'in. w.c.';
  }
  if (type === 'temperature') {
    if (h.includes('°c') || h.includes(' c') || h.includes('celsius')) return '°C';
    if (h.includes('°f') || h.includes(' f') || h.includes('fahrenheit')) return '°F';
  }
  if (type === 'relative_humidity') return '%RH';
  if (['pm1', 'pm25', 'pm10'].includes(type)) {
    if (h.includes('ug') || h.includes('µg')) return 'µg/m³';
    if (h.includes('/ft') || h.includes('ft3')) return 'particles/ft³';
    if (h.includes('/l')) return 'particles/L';
  }
  if (type === 'velocity') {
    if (h.includes('m/s')) return 'm/s';
    if (h.includes('cfm')) return 'CFM';
    if (h.includes('ft/min') || h.includes('fpm')) return 'ft/min';
  }
  return '';
}

export function detectAbatementLinkProfile(headers) {
  const mappings = headers.map((header, index) => ({
    sourceColumn: header,
    index,
    mappedType: detectColumnType(header),
    unit: inferUnit(header, detectColumnType(header)),
  }));
  const timestampColumn = mappings.find((mapping) => mapping.mappedType === 'timestamp');
  const deviceColumn = mappings.find((mapping) => mapping.mappedType === 'device_identifier');
  const measurementColumns = mappings.filter((mapping) => measurementLabels[mapping.mappedType]);
  const unknownColumns = mappings.filter((mapping) => !mapping.mappedType).map((mapping) => mapping.sourceColumn);
  return {
    profile: 'ABATEMENT LINK CSV',
    parserVersion: ABATEMENT_LINK_PROFILE_VERSION,
    mappings,
    timestampColumn,
    deviceColumn,
    measurementColumns,
    unknownColumns,
  };
}

function parseTimestamp(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();

  const match = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!match) return null;
  let [, month, day, year, hour, minute, second = '0', ampm] = match;
  let h = Number(hour);
  if (ampm?.toUpperCase() === 'PM' && h < 12) h += 12;
  if (ampm?.toUpperCase() === 'AM' && h === 12) h = 0;
  const fullYear = Number(year) < 100 ? 2000 + Number(year) : Number(year);
  const iso = new Date(fullYear, Number(month) - 1, Number(day), h, Number(minute), Number(second));
  return Number.isNaN(iso.getTime()) ? null : iso.toISOString();
}

function numberOrNull(value) {
  const cleaned = String(value ?? '').replace(/[^0-9.+-]/g, '').trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

async function sha256Hex(text) {
  if (!globalThis.crypto?.subtle) return `unavailable-${text.length}-${Date.now()}`;
  const buffer = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function measurementKey(measurement) {
  return [measurement.timestamp, measurement.deviceIdentifier, measurement.sensorIdentifier || '', measurement.measurementType, measurement.value, measurement.unit || ''].join('|');
}

function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)));
  return sorted[index];
}

export function inferSamplingIntervalMs(measurements) {
  const byTypeDevice = new Map();
  measurements.forEach((measurement) => {
    const key = `${measurement.measurementType}|${measurement.deviceIdentifier}|${measurement.sensorIdentifier || ''}`;
    if (!byTypeDevice.has(key)) byTypeDevice.set(key, []);
    byTypeDevice.get(key).push(new Date(measurement.timestamp).getTime());
  });
  const deltas = [];
  byTypeDevice.forEach((times) => {
    const sorted = [...new Set(times)].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i += 1) {
      const delta = sorted[i] - sorted[i - 1];
      if (delta > 0) deltas.push(delta);
    }
  });
  return percentile(deltas, 0.5) || 5 * 60 * 1000;
}

function detectGaps(measurements) {
  const interval = inferSamplingIntervalMs(measurements);
  const maxExpectedGap = interval * 2.5;
  const groups = new Map();
  measurements.forEach((measurement) => {
    const key = `${measurement.measurementType}|${measurement.deviceIdentifier}|${measurement.sensorIdentifier || ''}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(measurement);
  });
  const gaps = [];
  groups.forEach((records, key) => {
    const sorted = records.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    for (let i = 1; i < sorted.length; i += 1) {
      const prev = new Date(sorted[i - 1].timestamp).getTime();
      const current = new Date(sorted[i].timestamp).getTime();
      const delta = current - prev;
      if (delta > maxExpectedGap) {
        gaps.push({
          key,
          start: sorted[i - 1].timestamp,
          end: sorted[i].timestamp,
          durationMs: delta,
        });
      }
    }
  });
  return gaps;
}

export async function previewCsvImport({ fileName, text, existingMeasurements = [] }) {
  const rows = parseCsv(text);
  const headers = rows[0] || [];
  const profile = detectAbatementLinkProfile(headers);
  const warnings = [];
  if (!rows.length) warnings.push('CSV appears to be empty.');
  if (!profile.timestampColumn) warnings.push('No timestamp column could be detected. Map/rename the CSV before importing.');
  if (!profile.measurementColumns.length) warnings.push('No supported measurement columns were detected.');
  if (profile.unknownColumns.length) warnings.push(`${profile.unknownColumns.length} unknown column(s) will be preserved only in the raw CSV: ${profile.unknownColumns.slice(0, 6).join(', ')}${profile.unknownColumns.length > 6 ? '…' : ''}`);

  const existingKeys = new Set(existingMeasurements.map(measurementKey));
  const measurements = [];
  const malformedRows = [];
  const devices = new Set();
  const sensorTypes = new Set();
  const units = new Set();
  let duplicateCount = 0;

  rows.slice(1).forEach((row, rowIndex) => {
    const timestamp = parseTimestamp(row[profile.timestampColumn?.index]);
    if (!timestamp) {
      malformedRows.push(rowIndex + 2);
      return;
    }
    const deviceIdentifier = String(row[profile.deviceColumn?.index] || 'Unknown device').trim() || 'Unknown device';
    const sensorIdentifier = String(row[profile.mappings.find((m) => m.mappedType === 'sensor_identifier')?.index] || '').trim();
    devices.add(deviceIdentifier);
    profile.measurementColumns.forEach((column) => {
      const value = numberOrNull(row[column.index]);
      if (value === null) return;
      const measurement = {
        id: `m-${timestamp}-${rowIndex}-${column.index}`,
        timestamp,
        deviceIdentifier,
        sensorIdentifier,
        measurementType: column.mappedType,
        value,
        unit: column.unit,
        sourceColumn: column.sourceColumn,
        quality: 'imported',
      };
      if (existingKeys.has(measurementKey(measurement))) duplicateCount += 1;
      measurements.push(measurement);
      sensorTypes.add(column.mappedType);
      if (column.unit) units.add(column.unit);
    });
  });

  const sortedTimes = measurements.map((measurement) => measurement.timestamp).sort();
  const gaps = detectGaps(measurements);
  const hash = await sha256Hex(text);

  if (malformedRows.length) warnings.push(`${malformedRows.length} row(s) have missing or malformed timestamps.`);
  if (duplicateCount) warnings.push(`${duplicateCount} measurement(s) appear to duplicate data already imported into this project.`);
  if (gaps.length) warnings.push(`${gaps.length} likely data gap(s) detected based on the inferred sampling interval.`);

  return {
    fileName,
    profile,
    hash,
    totalRows: Math.max(0, rows.length - 1),
    normalizedMeasurementCount: measurements.length,
    duplicateCount,
    measurements,
    earliestTimestamp: sortedTimes[0] || '',
    latestTimestamp: sortedTimes[sortedTimes.length - 1] || '',
    detectedDevices: [...devices],
    detectedSensorTypes: [...sensorTypes],
    detectedUnits: [...units],
    gaps,
    warnings,
    malformedRows,
    rawCsvText: text,
  };
}

function activeRequirementFor(project, timestamp) {
  const requirements = [...(project.requirements || [])].sort((a, b) => String(a.effectiveAt).localeCompare(String(b.effectiveAt)));
  let active = requirements[0] || null;
  requirements.forEach((requirement) => {
    if (String(requirement.effectiveAt || '') <= String(timestamp || '')) active = requirement;
  });
  return active;
}

function finiteNumber(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function evaluateMeasurementAgainstRequirement(measurement, requirement) {
  if (!requirement) return { configured: false, within: true, limitLabel: 'No configured requirement' };
  const value = finiteNumber(measurement.value);
  if (value === null) return { configured: false, within: true, limitLabel: 'Malformed value' };

  if (measurement.measurementType === 'differential_pressure') {
    const target = finiteNumber(requirement.pressureTarget || requirement.pressureAlarmThreshold);
    if (target === null) return { configured: false, within: true, limitLabel: 'No pressure limit configured' };
    const relationship = requirement.pressureRelationship || 'NEGATIVE';
    if (relationship === 'POSITIVE') return { configured: true, within: value >= target, limitLabel: `≥ ${target} ${requirement.pressureUnit || measurement.unit || ''}` };
    if (relationship === 'NEGATIVE') return { configured: true, within: value <= target, limitLabel: `≤ ${target} ${requirement.pressureUnit || measurement.unit || ''}` };
    return { configured: false, within: true, limitLabel: 'Pressure observation only' };
  }

  if (measurement.measurementType === 'temperature') {
    const min = finiteNumber(requirement.temperatureMin);
    const max = finiteNumber(requirement.temperatureMax);
    if (min === null && max === null) return { configured: false, within: true, limitLabel: 'No temperature range configured' };
    return {
      configured: true,
      within: (min === null || value >= min) && (max === null || value <= max),
      limitLabel: `${min ?? '—'} to ${max ?? '—'} ${requirement.temperatureUnit || measurement.unit || ''}`,
    };
  }

  if (measurement.measurementType === 'relative_humidity') {
    const min = finiteNumber(requirement.humidityMin);
    const max = finiteNumber(requirement.humidityMax);
    if (min === null && max === null) return { configured: false, within: true, limitLabel: 'No humidity range configured' };
    return {
      configured: true,
      within: (min === null || value >= min) && (max === null || value <= max),
      limitLabel: `${min ?? '—'} to ${max ?? '—'} %RH`,
    };
  }

  const maxFields = {
    pm1: 'particlePm1Max',
    pm25: 'particlePm25Max',
    pm10: 'particlePm10Max',
  };
  if (maxFields[measurement.measurementType]) {
    const max = finiteNumber(requirement[maxFields[measurement.measurementType]]);
    if (max === null) return { configured: false, within: true, limitLabel: `No ${measurementLabels[measurement.measurementType]} limit configured` };
    return { configured: true, within: value <= max, limitLabel: `≤ ${max} ${requirement.particleUnit || measurement.unit || ''}` };
  }

  if (measurement.measurementType === 'velocity') {
    const min = finiteNumber(requirement.velocityMin);
    const max = finiteNumber(requirement.velocityMax);
    if (min === null && max === null) return { configured: false, within: true, limitLabel: 'No velocity/airflow range configured' };
    return {
      configured: true,
      within: (min === null || value >= min) && (max === null || value <= max),
      limitLabel: `${min ?? '—'} to ${max ?? '—'} ${requirement.velocityUnit || measurement.unit || ''}`,
    };
  }

  return { configured: false, within: true, limitLabel: 'No configured requirement' };
}

function durationLabel(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return '0m';
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days) return `${days}d ${hours % 24}h`;
  if (hours) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

function getProjectWindow(project, measurements) {
  const sortedTimes = measurements.map((m) => m.timestamp).sort();
  const start = project.startDateTime ? new Date(project.startDateTime).toISOString() : sortedTimes[0];
  const end = project.endDateTime ? new Date(project.endDateTime).toISOString() : sortedTimes[sortedTimes.length - 1];
  return { start, end };
}

export function analyzeProject(project) {
  const measurements = [...(project.measurements || [])].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const window = getProjectWindow(project, measurements);
  const projectDurationMs = window.start && window.end ? Math.max(0, new Date(window.end) - new Date(window.start)) : 0;
  const intervalMs = inferSamplingIntervalMs(measurements);
  const cappedSampleMs = Math.min(intervalMs * 1.5, 15 * 60 * 1000);
  const groups = new Map();
  measurements.forEach((measurement) => {
    const key = measurement.measurementType;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(measurement);
  });

  const summaries = {};
  const excursions = [];

  groups.forEach((records, type) => {
    const sorted = records.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    let validMs = 0;
    let withinMs = 0;
    let outsideMs = 0;
    let currentExcursion = null;
    const values = sorted.map((r) => Number(r.value)).filter(Number.isFinite);

    sorted.forEach((record, index) => {
      const next = sorted[index + 1];
      const thisTime = new Date(record.timestamp).getTime();
      const nextTime = next ? new Date(next.timestamp).getTime() : thisTime + intervalMs;
      const sampleMs = Math.max(0, Math.min(nextTime - thisTime, cappedSampleMs));
      validMs += sampleMs;
      const requirement = activeRequirementFor(project, record.timestamp);
      const evaluation = evaluateMeasurementAgainstRequirement(record, requirement);
      if (!evaluation.configured || evaluation.within) {
        withinMs += sampleMs;
        if (currentExcursion) {
          currentExcursion.endTimestamp = record.timestamp;
          currentExcursion.durationMs = Math.max(0, new Date(currentExcursion.endTimestamp) - new Date(currentExcursion.startTimestamp));
          excursions.push(currentExcursion);
          currentExcursion = null;
        }
      } else {
        outsideMs += sampleMs;
        if (!currentExcursion) {
          currentExcursion = {
            id: `exc-${type}-${record.timestamp}-${record.deviceIdentifier}`.replace(/[^a-zA-Z0-9-]/g, '-'),
            measurementType: type,
            startTimestamp: record.timestamp,
            endTimestamp: record.timestamp,
            durationMs: sampleMs,
            configuredLimit: evaluation.limitLabel,
            minObserved: record.value,
            maxObserved: record.value,
            deviceIdentifier: record.deviceIdentifier,
            sensorIdentifier: record.sensorIdentifier,
            requirementId: requirement?.id,
          };
        } else {
          currentExcursion.endTimestamp = record.timestamp;
          currentExcursion.durationMs += sampleMs;
          currentExcursion.minObserved = Math.min(currentExcursion.minObserved, record.value);
          currentExcursion.maxObserved = Math.max(currentExcursion.maxObserved, record.value);
        }
      }
    });
    if (currentExcursion) excursions.push(currentExcursion);

    summaries[type] = {
      type,
      label: measurementLabels[type] || type,
      count: sorted.length,
      validMs,
      noDataMs: Math.max(0, projectDurationMs - validMs),
      withinMs,
      outsideMs,
      dataAvailability: projectDurationMs ? (validMs / projectDurationMs) * 100 : null,
      withinValidPercent: validMs ? (withinMs / validMs) * 100 : null,
      average: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null,
      min: values.length ? Math.min(...values) : null,
      max: values.length ? Math.max(...values) : null,
      unit: sorted.find((record) => record.unit)?.unit || '',
    };
  });

  const pressureSummary = summaries.differential_pressure;
  return {
    projectDurationMs,
    projectDurationLabel: durationLabel(projectDurationMs),
    monitoringWindow: window,
    inferredSamplingIntervalMs: intervalMs,
    summaries,
    excursions: excursions.sort((a, b) => a.startTimestamp.localeCompare(b.startTimestamp)),
    pressureSummary,
    dataGaps: detectGaps(measurements),
    devices: [...new Set(measurements.map((m) => m.deviceIdentifier))].filter(Boolean),
    sensorTypes: [...new Set(measurements.map((m) => m.measurementType))].filter(Boolean),
    latestMeasurement: measurements[measurements.length - 1] || null,
    missingDataNote: 'NO DATA is reported separately and is not counted as within configured limits.',
  };
}

export function formatDuration(ms) {
  return durationLabel(ms);
}

export function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${value.toFixed(2)}%`;
}

export function formatNumber(value, digits = 3) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return Number(value).toFixed(digits).replace(/\.0+$/, '');
}
