export const pressureTargets = [
  {
    application: 'US airborne infection isolation room',
    target: '-2.5 Pa / -0.01 in. w.g.',
    note: 'Common US healthcare reference point. Confirm with facility policy, design documents, and AHJ.',
  },
  {
    application: 'Canadian airborne isolation / temporary isolation',
    target: '-7.5 Pa / approx. -0.03 in. w.g.',
    note: 'Common Canadian healthcare reference point used in temporary isolation and healthcare guidance.',
  },
  {
    application: 'Construction or abatement containment',
    target: 'about -5 Pa / -0.02 in. w.g.',
    note: 'Common containment/asbestos reference point. Job specs may require different targets.',
  },
  {
    application: 'Canadian healthcare construction containment',
    target: 'often -7.5 Pa',
    note: 'Common CSA-style healthcare construction containment reference. Verify project risk level and facility standard.',
  },
];

export const achTargets = [
  {
    space: 'Existing airborne isolation room',
    ach: '6 ACH',
    note: 'Common CDC healthcare reference for existing AII rooms.',
  },
  {
    space: 'New or renovated airborne isolation room',
    ach: '12 ACH',
    note: 'Common CDC healthcare reference for new/renovated AII rooms.',
  },
  {
    space: 'Temporary isolation setup',
    ach: 'often 12 ACH',
    note: 'Frequently used as a conservative planning target for temporary setups.',
  },
  {
    space: 'General air cleaning',
    ach: '5–6 ACH starting point',
    note: 'Estimate only; not a compliance value unless a project/spec defines it.',
  },
];

export const pressureFailureChecks = [
  'Doors left open or too much traffic through the opening.',
  'Bad seals, torn plastic barriers, or uncontrolled gaps.',
  'Pressure tubing installed backward, kinked, blocked, or placed in the wrong reference area.',
  'Clogged prefilters/HEPA filters or undersized negative air machines.',
  'Failed fan, blocked duct, collapsed flex duct, or too many duct bends.',
  'HVAC supply/return imbalance, dampers/fans fighting the containment, or building stack/wind effects.',
  'Room setup changed after balancing, such as added openings, removed barriers, or different exhaust route.',
];

export const externalPressureResources = [
  {
    title: 'CDC — Environmental Infection Control: Air',
    organization: 'CDC',
    url: 'https://www.cdc.gov/infection-control/hcp/environmental-control/air.html',
    description: 'Healthcare infection-control air guidance, including ventilation and airborne isolation context.',
  },
  {
    title: 'CDC — Protective Environment table',
    organization: 'CDC',
    url: 'https://www.cdc.gov/infection-control/hcp/isolation-precautions/appendix-a-table-5.html',
    description: 'Positive-pressure protective environment guidance and daily monitoring/documentation language.',
  },
  {
    title: 'ASHE — Room Pressurization',
    organization: 'ASHE',
    url: 'https://www.ashe.org/compliance/ec_02_05_01/01/roompressurization',
    description: 'Plain-language healthcare room pressurization overview for positive and negative pressure spaces.',
  },
  {
    title: 'ASHRAE — Healthcare technical resources',
    organization: 'ASHRAE',
    url: 'https://www.ashrae.org/technical-resources/healthcare',
    description: 'Healthcare HVAC technical resource hub, including pressure/ventilation topics.',
  },
  {
    title: 'CSA Z317.2:24 — HVAC systems in health care facilities',
    organization: 'CSA / SCC listing',
    url: 'https://ccn-scc.ca/standardsdb/standards/4033526',
    description: 'Canadian healthcare HVAC standard listing for design, commissioning, operation, and maintenance.',
  },
  {
    title: 'CSA Z317.13:22 — Infection control during construction',
    organization: 'CSA / SCC listing',
    url: 'https://scc-ccn.ca/standardsdb/standards/4031479',
    description: 'Canadian healthcare construction, renovation, and maintenance infection-control standard listing.',
  },
  {
    title: 'OSHA — Asbestos construction standard 1926.1101',
    organization: 'OSHA',
    url: 'https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.1101',
    description: 'US asbestos construction standard including NPE requirements for air changes and pressure differential.',
  },
  {
    title: 'OSHA — Respirable crystalline silica standard 1926.1153',
    organization: 'OSHA',
    url: 'https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.1153',
    description: 'US silica construction standard with exposure limits and control requirements.',
  },
  {
    title: 'Government of Canada — Asbestos exposure management technical guideline',
    organization: 'Government of Canada',
    url: 'https://www.canada.ca/en/employment-social-development/services/health-safety/reports/asbestos-exposure-management-programs.html',
    description: 'Canadian asbestos guidance with negative-pressure containment example values.',
  },
  {
    title: 'AT Connect mobile app',
    organization: 'Abatement Technologies',
    url: 'https://play.google.com/store/apps/details?id=com.app.atconnect&hl=en_CA',
    description: 'Mobile app for connected monitor data, alarm history, and push notifications.',
  },
  {
    title: 'AT Connect web portal',
    organization: 'Abatement Technologies',
    url: 'https://connect.abatement.com',
    description: 'Web access for connected monitor data review and downloads.',
  },
];

export const pressureGlossary = [
  {
    term: 'Negative pressure',
    description: 'Air is pulled into the monitored room or containment area. Used to keep dirty, dusty, infectious, or hazardous air from escaping.',
  },
  {
    term: 'Positive pressure',
    description: 'Air is pushed out of the protected space. Used to help keep outside contaminants from entering clean, sterile, or sensitive areas.',
  },
  {
    term: 'ACH',
    description: 'Air Changes per Hour. It describes how many times room air is replaced or cleaned in one hour. ACH is about dilution/air cleaning, not pressure proof.',
  },
  {
    term: 'CFM',
    description: 'Cubic feet per minute. Airflow rate used to estimate ACH and scrubber sizing.',
  },
  {
    term: 'HEPA',
    description: 'High-efficiency filtration used in air scrubbers, negative air machines, isolation support, abatement, and remediation.',
  },
  {
    term: 'MERV',
    description: 'A filter rating mostly used for building HVAC filters. MERV 13 is commonly discussed for improved building ventilation; HEPA is higher-efficiency filtration for portable containment/air cleaning.',
  },
];
