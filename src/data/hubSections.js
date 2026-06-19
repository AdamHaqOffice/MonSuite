export const hubSections = [
  {
    title: 'Product Knowledge',
    eyebrow: 'Sales answers',
    description: 'Browse monitor product details, model notes, accessories, SKUs, FAQs, and internal sales guidance.',
    path: '/products',
    status: 'V1 starter',
  },
  {
    title: 'Manuals & Downloads',
    eyebrow: 'Documents',
    description: 'Central library for manuals, pamphlets, quick guides, spec sheets, and product information files.',
    path: '/downloads',
    status: 'V1 starter',
  },
  {
    title: 'Firmware & Updates',
    eyebrow: 'Versions',
    description: 'Firmware files, release notes, feature updates, compatibility notes, and update instructions.',
    path: '/firmware',
    status: 'V1 starter',
  },
  {
    title: 'Support Tickets',
    eyebrow: 'Help desk',
    description: 'Send users to the existing support/ticketing system when they need technical help or escalation.',
    path: '/support',
    status: 'Linked',
  },
  {
    title: 'Setup Configurator',
    eyebrow: 'CAD-lite',
    description: 'Draw rooms on a grid, place monitors and sensors, connect tubing and ethernet, and build a parts list.',
    path: '/setup-builder',
    status: 'V2 MVP',
  },
  {
    title: 'Parts & Costing',
    eyebrow: 'Future tool',
    description: 'Generate parts lists, estimate costs, and export setup summaries for sales or customer review.',
    path: '/parts-costing',
    status: 'Coming later',
  },
  {
    title: 'AI Assistant',
    eyebrow: 'Future search',
    description: 'Ask questions across manuals, guides, firmware notes, product pages, and setup documentation.',
    path: '/ai-assistant',
    status: 'Coming later',
  },
];

export const starterDownloads = [
  { product: 'PPM4', type: 'Manual', title: 'Portable Pressure Monitor Manual', version: 'Add version', url: '#' },
  { product: 'RPM', type: 'Quick Guide', title: 'Room Pressure Monitor Quick Start Guide', version: 'Add version', url: '#' },
  { product: 'Sensors', type: 'Pamphlet', title: 'External Sensor Product Sheet', version: 'Add version', url: '#' },
];

export const starterFirmware = [
  { product: 'PPM4', version: 'Add version', releaseDate: 'Add date', notes: 'Add release notes and compatibility details.', url: '#' },
  { product: 'RPM', version: 'Add version', releaseDate: 'Add date', notes: 'Add release notes and update instructions.', url: '#' },
];
