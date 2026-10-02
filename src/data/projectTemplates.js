export const PROJECTS_STORAGE_VERSION = 1;

export const projectStatuses = ['DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED'];

export const projectTypes = [
  {
    id: 'icra_healthcare_construction',
    name: 'ICRA / Healthcare Construction',
    shortName: 'ICRA',
    description: 'Healthcare construction monitoring project using imported Abatement Link CSV data as the historical data source.',
  },
];

export const futureProjectTypes = [
  'USP <797>',
  'USP <800>',
  'Cleanroom',
  'Isolation Room',
  'Asbestos Abatement',
  'Mold Remediation',
  'General Containment',
  'Other environmental monitoring project',
];

export const containmentTypes = [
  'Anteroom / negative containment',
  'Negative pressure barrier containment',
  'Positive pressure protected space',
  'Occupied adjacent area monitoring',
  'Temporary isolation support',
  'Other / project-defined',
];

export const pressureRelationships = ['NEGATIVE', 'POSITIVE', 'NEUTRAL / OBSERVATION'];

export const correctiveActionCauses = [
  'Door open',
  'HEPA stopped',
  'Filter issue',
  'HVAC issue',
  'Containment breach',
  'Sensor issue',
  'Maintenance',
  'Power interruption',
  'Unknown',
  'Other',
];

export const measurementLabels = {
  differential_pressure: 'Differential pressure',
  temperature: 'Temperature',
  relative_humidity: 'Relative humidity',
  pm1: 'PM1',
  pm25: 'PM2.5',
  pm10: 'PM10',
  velocity: 'Velocity / airflow',
};

export const measurementUnits = {
  differential_pressure: ['in. w.c.', 'Pa'],
  temperature: ['°F', '°C'],
  relative_humidity: ['%RH'],
  pm1: ['µg/m³', 'particles/ft³', 'particles/L'],
  pm25: ['µg/m³', 'particles/ft³', 'particles/L'],
  pm10: ['µg/m³', 'particles/ft³', 'particles/L'],
  velocity: ['ft/min', 'm/s', 'CFM'],
};

export function createEmptyRequirement(userEmail = '') {
  const now = new Date().toISOString();
  return {
    id: `req-${Date.now()}`,
    version: 1,
    effectiveAt: now,
    changedBy: userEmail || 'Unknown user',
    note: '',
    pressureRelationship: 'NEGATIVE',
    pressureTarget: '-0.010',
    pressureUnit: 'in. w.c.',
    pressureAlarmDelayMinutes: '0',
    temperatureMin: '',
    temperatureMax: '',
    temperatureUnit: '°F',
    humidityMin: '',
    humidityMax: '',
    particlePm1Max: '',
    particlePm25Max: '',
    particlePm10Max: '',
    particleUnit: 'µg/m³',
    velocityMin: '',
    velocityMax: '',
    velocityUnit: 'ft/min',
    otherRequirements: '',
  };
}

export function createEmptyProject(userEmail = '') {
  const now = new Date().toISOString();
  return {
    id: `project-${Date.now()}`,
    storageVersion: PROJECTS_STORAGE_VERSION,
    projectType: 'icra_healthcare_construction',
    projectName: '',
    projectNumber: '',
    facility: '',
    building: '',
    floor: '',
    department: '',
    roomArea: '',
    contractor: '',
    infectionPreventionContact: '',
    facilityContact: '',
    projectManager: '',
    startDateTime: '',
    endDateTime: '',
    status: 'DRAFT',
    containmentType: 'Negative pressure barrier containment',
    notes: '',
    requirements: [createEmptyRequirement(userEmail)],
    imports: [],
    measurements: [],
    equipment: [],
    correctiveActions: {},
    events: [
      {
        id: `evt-${Date.now()}`,
        timestamp: now,
        user: userEmail || 'Unknown user',
        action: 'project_created',
        label: 'Project created',
      },
    ],
    generatedReports: [],
    createdAt: now,
    updatedAt: now,
    createdBy: userEmail || 'Unknown user',
  };
}

export function createAuditEvent(action, label, userEmail = '', values = {}) {
  return {
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    user: userEmail || 'Unknown user',
    action,
    label,
    values,
  };
}
