export const GRID_SIZE = 24;

export const inventoryItems = [
  {
    sku: 'PPM4',
    name: 'Portable Pressure Monitor 4',
    shortName: 'PPM4',
    category: 'Monitor',
    dimensions: { widthIn: 10.75, heightIn: 9, depthIn: 5.25 },
    mount: ['portable', 'wall'],
    ethernetPorts: 2,
    tubingPorts: ['room', 'ref'],
    pressureCapable: true,
    description: 'Yellow construction case, opens to show screen, small window to view screen. Portable and wall-mountable.',
    requiredAccessories: ['PPM4CHRGR'],
  },
  {
    sku: 'AT-RPM-RTS',
    name: 'RPM Monitor',
    shortName: 'RPM',
    category: 'Monitor',
    dimensions: { widthIn: 8, heightIn: 5, depthIn: 1.5 },
    mount: ['wall'],
    ethernetPorts: 2,
    tubingPorts: ['room', 'ref'],
    pressureCapable: true,
    description: 'White wall-mounted case around a 7 inch screen.',
    requiredAccessories: [],
  },
  {
    sku: 'PMA-TRHM',
    name: 'Temperature & Humidity Sensor',
    shortName: 'T/H',
    category: 'Sensor',
    dimensions: { widthIn: 3, heightIn: 5.125, depthIn: 1.5 },
    mount: ['wall'],
    ethernetPorts: 2,
    tubingPorts: [],
    pressureCapable: false,
    label: 'Temp & Humidity',
    description: 'Wall-mounted sensor module with front label and two rear ethernet ports.',
  },
  {
    sku: 'PMA-RPSM',
    name: 'Pressure Sensor',
    shortName: 'PRESS',
    category: 'Sensor',
    dimensions: { widthIn: 3, heightIn: 5.125, depthIn: 1.5 },
    mount: ['wall'],
    ethernetPorts: 2,
    tubingPorts: ['room', 'ref'],
    pressureCapable: true,
    label: 'Pressure',
    description: 'Wall-mounted pressure sensor with two rear ethernet ports and room/ref tubing ports.',
  },
  {
    sku: 'PMA-AVM',
    name: 'Velocity / ACH Sensor',
    shortName: 'ACH',
    category: 'Sensor',
    dimensions: { widthIn: 3, heightIn: 5.125, depthIn: 1.5 },
    mount: ['wall'],
    ethernetPorts: 2,
    tubingPorts: [],
    pressureCapable: false,
    label: 'Velocity',
    description: 'Wall-mounted ACH/velocity sensor module with front label and two rear ethernet ports.',
  },
  {
    sku: 'PMA-PSM',
    name: 'Particle Sensor',
    shortName: 'PART',
    category: 'Sensor',
    dimensions: { widthIn: 3, heightIn: 5.125, depthIn: 1.5 },
    mount: ['wall'],
    ethernetPorts: 2,
    tubingPorts: [],
    pressureCapable: false,
    label: 'Particle',
    description: 'Wall-mounted particle sensor module with front label and two rear ethernet ports.',
  },
  {
    sku: 'PMA-CM',
    name: 'Cellular Module',
    shortName: 'CELL',
    category: 'Communication',
    dimensions: { widthIn: 3, heightIn: 5.125, depthIn: 1.5 },
    mount: ['wall'],
    ethernetPorts: 2,
    tubingPorts: [],
    pressureCapable: false,
    label: 'Cellular',
    description: 'Cellular module for monitor systems. Sensor-style housing with two rear ethernet ports.',
  },
];

export const accessoryItems = [
  {
    sku: 'MI00660',
    name: 'Connector, 1/8" Barb Panel Mount 10/pk',
    category: 'Tubing Accessory',
  },
  {
    sku: 'MI00666',
    name: 'FILTER PPME3 1/8" Barb Polypro 10 Micron HDPE',
    category: 'Tubing Accessory',
  },
  {
    sku: 'MI00712',
    name: 'PPM3 Lithium Polymer Battery Pack, 3.7V, 2000 mAH with integrated control electronics',
    category: 'Power',
  },
  {
    sku: 'MI00774',
    name: 'Small Tubing - 10/PK',
    category: 'Tubing',
  },
  {
    sku: 'MSS173',
    name: 'Elbow w/ Tubing Attached for Pressure Monitor',
    category: 'Tubing Accessory',
  },
  {
    sku: 'MSS191',
    name: 'PPM3 Accessory Kit',
    category: 'Accessory Kit',
  },
  {
    sku: 'PPM3-ACC',
    name: 'Accessories for PPM3',
    category: 'Accessory Kit',
  },
  {
    sku: 'PPM4CHRGR',
    name: 'Charger For PPM4 Pressure Monitor',
    category: 'Power',
  },
];

export function findInventoryItem(sku) {
  return inventoryItems.find((item) => item.sku === sku);
}

export function findAccessory(sku) {
  return accessoryItems.find((item) => item.sku === sku);
}
