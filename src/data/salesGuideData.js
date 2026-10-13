export const guideTabs = [
  { id: 'overview', label: 'Sales overview' },
  { id: 'abatement-link', label: 'Abatement Link Projects' },
  { id: 'competitors', label: 'Competitor matrix' },
  { id: 'reports', label: 'Report gallery' },
  { id: 'roi', label: 'ROI calculator' },
  { id: 'playbooks', label: 'Use-case playbooks' },
];

export const marketValuePillars = [
  {
    title: 'Live status, not paper logs',
    description: 'Competitors are moving the sale away from simple monitors and toward connected visibility, status history, alerts, and project records.',
    proof: 'Omni IQ, Rapid Room BarrierLink, INCUE, eGate, TSI Link, and Setra CEMS all sell some form of dashboard/reporting/alert workflow.',
  },
  {
    title: 'Reports are the deliverable',
    description: 'Customers do not only buy a device. They buy evidence for infection prevention, facilities, contractors, consultants, and customer records.',
    proof: 'Daily reports, project reports, exportable history, and custom report templates are visible competitor messages.',
  },
  {
    title: 'Response workflow is the differentiator',
    description: 'The strongest competitors emphasize who was alerted, who acknowledged, what action happened, and whether the project record is defensible.',
    proof: 'Alarm acknowledgement, escalation, corrective-action documentation, user tracking, and audit-ready records are the important gaps to close in Abatement Link.',
  },
  {
    title: 'MonSuite should help sell the system',
    description: 'MonSuite should not become a second monitoring platform. It should explain the value, help select equipment, and generate clean handoff summaries.',
    proof: 'The live records and reports belong in Abatement Link; the sales planner and product guidance belong in MonSuite.',
  },
];

export const abatementLinkProjectValue = [
  {
    feature: 'Live project dashboard',
    customerValue: 'The hospital, contractor, facility team, and project manager can see current containment/room status without waiting for manual rounds.',
    salesNote: 'Position against dashboards from Omni IQ, Rapid Room BarrierLink, eGate Cloud, TSI Link, and Setra CEMS.',
  },
  {
    feature: 'Alerts + acknowledgement',
    customerValue: 'Shows not only that an alarm happened, but whether the right person saw it and responded.',
    salesNote: 'This is stronger than a device-only alarm or a CSV after the job is over.',
  },
  {
    feature: 'Escalation',
    customerValue: 'If nobody acknowledges the alarm, the system can keep pushing it to the next responsible contact.',
    salesNote: 'Matches the market direction around smart escalation and accountability.',
  },
  {
    feature: 'Corrective actions',
    customerValue: 'Documents cause, response, responder, notes, and follow-up without changing raw measurement data.',
    salesNote: 'This turns monitoring into an audit-ready project workflow.',
  },
  {
    feature: 'Daily + final reports',
    customerValue: 'Reduces manual logging and gives infection prevention/facilities a record they can actually file.',
    salesNote: 'Daily report, excursion report, data availability report, and final report should be standard packages.',
  },
  {
    feature: 'User tracking + audit history',
    customerValue: 'Shows who changed requirements, added notes, acknowledged alarms, generated reports, and completed the project.',
    salesNote: 'This is the difference between a chart and a defensible record.',
  },
];

export const competitorMatrix = [
  {
    company: 'Omni IQ / Omni CleanAir',
    marketSignal: 'Strongest direct pressure-monitoring/reporting competitor.',
    offers: ['Connected pressure monitoring', 'shared projects', 'daily/project reports', 'alarm acknowledgement', 'smart escalation', 'TriZone on G720', 'audit-ready records'],
    monsuiteResponse: 'Use MonSuite to explain the system value, then push live records/reports into Abatement Link Projects.',
    battlecard: 'Do not sell only a monitor. Sell connected pressure proof, alerts, response history, and the final project record.',
  },
  {
    company: 'INCUE',
    marketSignal: 'Sells ICRA automation, documentation, accountability, and stakeholder reporting.',
    offers: ['remote monitoring', 'automatic documentation', 'scheduled PDF reports', 'project/phasing workflow', 'training/services'],
    monsuiteResponse: 'Create clear healthcare-construction playbooks and Abatement Link Projects positioning.',
    battlecard: 'INCUE is selling reduced risk and less admin work. Match that language with labor savings and report examples.',
  },
  {
    company: 'Rapid Room / BarrierLink',
    marketSignal: 'Bundles containment walls, install/rental services, pressure monitoring, alerts, records, and CSV exports.',
    offers: ['temporary walls', 'cellular pressure monitors', 'browser dashboard', 'email alerts', 'one-year records', 'CSV export', '24/7 monitored service option'],
    monsuiteResponse: 'Use planner outputs and handoff reports to make Abatement equipment look like a complete containment-support package.',
    battlecard: 'Rapid Room sells turnkey simplicity. MonSuite needs to make our recommendation and handoff just as easy to understand.',
  },
  {
    company: 'eGate ICRA GUARD',
    marketSignal: 'Closest bundled ICRA kit message: particles + pressure + temperature/RH + cloud + reports + alerts.',
    offers: ['particle monitoring', 'differential pressure', 'temperature/RH', 'cloud dashboard', 'reports', 'alerts', 'gateway/SIM'],
    monsuiteResponse: 'Position AGIM3/RPM packages with particle + pressure + environmental sensing and Abatement Link reporting.',
    battlecard: 'Customers understand a kit. MonSuite should package monitors/sensors/scrubbers into job-specific bundles.',
  },
  {
    company: 'TSI Link',
    marketSignal: 'Strong environmental data/reporting message around CSV upload, custom reports, dashboards, and smart visualization.',
    offers: ['real-time data access', 'email/SMS alerts', 'CSV uploads', 'custom visualization', 'Excel report creator', 'environmental monitoring workflows'],
    monsuiteResponse: 'Make MonSuite customer reports clean and make Abatement Link report outputs exportable and professional.',
    battlecard: 'TSI sells turning complex data into reports. Our sales tools should show the final report value early.',
  },
  {
    company: 'Setra',
    marketSignal: 'Critical-room and cleanroom monitoring competitor with strong multi-parameter monitoring language.',
    offers: ['room pressure monitors', 'multi-room environmental monitoring', 'real-time alarms', 'trend data', 'CEMS reports', 'third-party/BACnet support'],
    monsuiteResponse: 'Use PPM4/RPM/AGIM3 positioning for portable/fixed pressure monitoring and multi-sensor packages.',
    battlecard: 'Setra is strong in fixed critical spaces. Abatement should be easier for temporary projects, portable needs, and containment documentation.',
  },
];

export const sampleReports = [
  {
    title: 'Daily project report',
    bestFor: 'Healthcare construction and monitored containment projects.',
    includes: ['daily data availability', 'pressure min/max/average', 'excursions', 'longest event', 'offline/no-data periods', 'corrective actions'],
    whyItSells: 'Reduces daily paper logging and gives IP/facilities a concise status record.',
  },
  {
    title: 'Final project report',
    bestFor: 'Project closeout, customer records, audit packages, and GC/facility handoff.',
    includes: ['project summary', 'equipment list', 'requirements', 'charts', 'excursions', 'corrective actions', 'audit history', 'sign-off'],
    whyItSells: 'Turns monitoring into a deliverable that helps justify the equipment and software.',
  },
  {
    title: 'Excursion report',
    bestFor: 'Explaining failures, alarm history, corrective actions, and response quality.',
    includes: ['start/end times', 'duration', 'worst reading', 'threshold', 'acknowledgement', 'cause', 'response notes'],
    whyItSells: 'Shows that the customer has a response record, not just an alarm log.',
  },
  {
    title: 'Data availability report',
    bestFor: 'Proving whether monitoring coverage was complete enough to trust the record.',
    includes: ['expected monitoring time', 'valid data time', 'no-data gaps', 'offline devices', 'data freshness'],
    whyItSells: 'Prevents missing data from being hidden inside a compliance-style percentage.',
  },
  {
    title: 'Corrective action report',
    bestFor: 'Contractor accountability and infection prevention review.',
    includes: ['cause categories', 'action taken', 'responded by', 'timestamp', 'follow-up status', 'notes/photos'],
    whyItSells: 'Makes the response process visible and defensible.',
  },
  {
    title: 'Equipment / device report',
    bestFor: 'Submittals, closeout packages, and support review.',
    includes: ['models', 'serial numbers', 'sensor types', 'installation/removal dates', 'calibration references'],
    whyItSells: 'Connects the final report to the actual equipment used on site.',
  },
];

export const salesPlaybooks = [
  {
    id: 'healthcare-construction',
    title: 'Healthcare construction / ICRA conversation',
    pain: 'The customer needs proof that containment stayed in the intended pressure relationship while work happened near patient-care spaces.',
    ask: ['Is the facility requiring pressure monitoring?', 'Do they need daily reports or final closeout documentation?', 'Is Wi-Fi allowed or is cellular preferred?', 'Are particles/temp/RH part of the project record?', 'Who needs alarm notifications?'],
    recommend: ['Pressure monitor at minimum', 'RPM/AGIM3 when fixed monitoring or multi-sensor documentation is expected', 'Abatement Link Projects for live alerts, acknowledgement, user tracking, and reports', 'Air scrubber sizing through the Airflow Planner'],
    doNotPromise: 'Do not say the equipment makes the project ICRA compliant. Say it documents measured conditions against configured project requirements.',
  },
  {
    id: 'negative-containment',
    title: 'Negative pressure containment',
    pain: 'The customer needs to keep dirty air from escaping and prove that the containment held over time.',
    ask: ['What is the room/containment size?', 'Where is air exhausting?', 'What target pressure is required?', 'How much ducting is planned?', 'Are logs or alarms required?'],
    recommend: ['Airflow Planner for scrubber quantity', 'PPM4 for portable pressure verification/logging', 'RPM for fixed wall monitoring', 'AT Connect / Abatement Link if alarms and records matter'],
    doNotPromise: 'Do not claim airflow alone proves negative pressure. Field pressure must be measured.',
  },
  {
    id: 'mold-restoration',
    title: 'Mold / wet restoration',
    pain: 'The customer needs HEPA filtration, containment support, portability, and equipment that makes sense in damp/finished spaces.',
    ask: ['Is this residential or commercial?', 'Is the area wet/damp?', 'Is containment being built?', 'Do they need odor support?', 'What power is available?'],
    recommend: ['BD2K and PRED750 first for wet/residential/finished spaces', 'Carbon option when odor/VOC support is part of the expectation', 'Pressure monitoring if negative containment is being claimed'],
    doNotPromise: 'Do not say HEPA removes VOCs/odors; carbon is needed for odor/VOC support and exposure controls are separate.',
  },
  {
    id: 'asbestos-dust',
    title: 'Asbestos / hazardous dust containment',
    pain: 'The customer needs containment, HEPA filtration, negative pressure verification, logs, and defensible documentation.',
    ask: ['What does the abatement plan/spec require?', 'What pressure target is required?', 'How many containments?', 'How much exhaust ducting?', 'What circuits are available?'],
    recommend: ['H2KM/H2KMA, BD2K, PAS2400, or PAS5000 depending size/power/site access', 'Pressure monitor package', 'Documentation/reporting path through Abatement Link where required'],
    doNotPromise: 'Do not replace IH/consultant exposure monitoring or regulatory requirements with a scrubber recommendation.',
  },
  {
    id: 'general-air-cleaning',
    title: 'General air cleaning / recirculation',
    pain: 'The customer wants cleaner air and particle reduction without necessarily creating pressure containment.',
    ask: ['What is the room size?', 'What contaminant are they worried about?', 'Is air being exhausted or recirculated?', 'Is noise/portability important?', 'Do they need proof/logging?'],
    recommend: ['PRED750 for small/portable jobs', 'HC800FD for healthcare/occupied cleaner presentation', 'H2KM/BD2K/PAS units for larger rooms', 'Pressure monitoring optional unless pressure is claimed'],
    doNotPromise: 'Do not imply ACH or filtration proves safety by itself. It is a planning estimate.',
  },
];

export const roiDefaultInputs = {
  projectsPerYear: 12,
  daysPerProject: 21,
  roundsPerDay: 3,
  minutesPerRound: 15,
  hourlyRate: 65,
  adminMinutesPerDay: 20,
};

export function calculateRoi(inputs) {
  const projectsPerYear = Number.parseFloat(inputs.projectsPerYear) || 0;
  const daysPerProject = Number.parseFloat(inputs.daysPerProject) || 0;
  const roundsPerDay = Number.parseFloat(inputs.roundsPerDay) || 0;
  const minutesPerRound = Number.parseFloat(inputs.minutesPerRound) || 0;
  const hourlyRate = Number.parseFloat(inputs.hourlyRate) || 0;
  const adminMinutesPerDay = Number.parseFloat(inputs.adminMinutesPerDay) || 0;
  const yearlyMonitoringMinutes = projectsPerYear * daysPerProject * roundsPerDay * minutesPerRound;
  const yearlyAdminMinutes = projectsPerYear * daysPerProject * adminMinutesPerDay;
  const totalHours = (yearlyMonitoringMinutes + yearlyAdminMinutes) / 60;
  const laborCost = totalHours * hourlyRate;
  return {
    yearlyMonitoringHours: yearlyMonitoringMinutes / 60,
    yearlyAdminHours: yearlyAdminMinutes / 60,
    totalHours,
    laborCost,
  };
}

export function formatCurrency(value) {
  if (!Number.isFinite(value)) return '$0';
  return value.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}
