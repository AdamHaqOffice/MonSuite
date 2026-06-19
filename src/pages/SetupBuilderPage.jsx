import { useMemo, useRef, useState } from 'react';
import AppShell from '../components/AppShell.jsx';
import {
  accessoryItems,
  findInventoryItem,
  GRID_SIZE,
  inventoryItems,
  MONITOR_EXPANSION_BUS_CAPACITY_MA,
  POWER_RECOMMENDATION_THRESHOLD_MA,
  PROBE_MAX_LENGTH_FT,
} from '../data/setupInventory.js';

const DEFAULT_SCALE_LABEL = '1 grid square = 1 ft';
const DEFAULT_CANVAS_SIZE = { width: 1120, height: 720 };
const PROBE_MAX_DISTANCE_PX = PROBE_MAX_LENGTH_FT * GRID_SIZE;

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function snap(value) {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getCanvasSize(element) {
  if (!element) return DEFAULT_CANVAS_SIZE;
  const rect = element.getBoundingClientRect();
  return {
    width: Math.max(1, rect.width),
    height: Math.max(1, rect.height),
  };
}

function getPointerPosition(event, element) {
  const rect = element.getBoundingClientRect();
  return {
    x: clamp(event.clientX - rect.left, 0, rect.width),
    y: clamp(event.clientY - rect.top, 0, rect.height),
  };
}

function getProbeCatalog(item) {
  return {
    sku: 'ACH-PROBE',
    name: 'ACH Probe',
    shortName: item.label || 'Probe',
    category: 'Probe',
    dimensions: { widthIn: 1.25, heightIn: 1.25, depthIn: 0.75 },
    mount: ['remote'],
    ethernetPorts: 0,
    tubingPorts: [],
    pressureCapable: false,
    powerSource: false,
    powerAccessory: false,
    powerDrawMa: 0,
    description: `Remote ACH probe. Keep within ${PROBE_MAX_LENGTH_FT} ft of its ACH sensor.`,
    probe: true,
  };
}

function getCatalogForPlacedItem(item) {
  if (!item) return null;
  if (item.isProbe) return getProbeCatalog(item);
  return findInventoryItem(item.sku);
}

function getPlacedItemCenter(placedItem) {
  return {
    x: placedItem.x + placedItem.width / 2,
    y: placedItem.y + placedItem.height / 2,
  };
}

function getPlacedItemEdgeAnchor(placedItem, targetPoint) {
  const center = getPlacedItemCenter(placedItem);
  if (!targetPoint) return center;

  const dx = targetPoint.x - center.x;
  const dy = targetPoint.y - center.y;
  const halfWidth = placedItem.width / 2;
  const halfHeight = placedItem.height / 2;

  if (dx === 0 && dy === 0) return center;

  const widthRatio = halfWidth ? Math.abs(dx) / halfWidth : 0;
  const heightRatio = halfHeight ? Math.abs(dy) / halfHeight : 0;

  if (widthRatio > heightRatio) {
    const sign = dx >= 0 ? 1 : -1;
    return {
      x: center.x + sign * halfWidth,
      y: center.y + dy * ((halfWidth || 1) / Math.abs(dx || 1)),
    };
  }

  const sign = dy >= 0 ? 1 : -1;
  return {
    x: center.x + dx * ((halfHeight || 1) / Math.abs(dy || 1)),
    y: center.y + sign * halfHeight,
  };
}

function getPointCenter(point, placedItems) {
  if (point.itemId) {
    const item = placedItems.find((placed) => placed.id === point.itemId);
    if (item) return getPlacedItemCenter(item);
  }

  return { x: point.x, y: point.y };
}

function getResolvedConnectionPoints(connection, placedItems) {
  const fromCenter = getPointCenter(connection.from, placedItems);
  const toCenter = getPointCenter(connection.to, placedItems);
  const fromItem = connection.from.itemId ? placedItems.find((item) => item.id === connection.from.itemId) : null;
  const toItem = connection.to.itemId ? placedItems.find((item) => item.id === connection.to.itemId) : null;

  return {
    from: fromItem ? getPlacedItemEdgeAnchor(fromItem, toCenter) : fromCenter,
    to: toItem ? getPlacedItemEdgeAnchor(toItem, fromCenter) : toCenter,
  };
}

function lineLengthFeet(connection, placedItems) {
  const { from, to } = getResolvedConnectionPoints(connection, placedItems);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return Math.max(1, Math.round(Math.sqrt(dx * dx + dy * dy) / GRID_SIZE));
}

function getProbeLengthFeet(probeItem, placedItems) {
  const parent = placedItems.find((entry) => entry.id === probeItem.parentId);
  if (!parent) return 0;
  const from = getPlacedItemCenter(parent);
  const to = getPlacedItemCenter(probeItem);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return Math.round((Math.sqrt(dx * dx + dy * dy) / GRID_SIZE) * 10) / 10;
}

function buildConnectionCounts(connections) {
  return connections
    .filter((connection) => connection.type === 'ethernet')
    .reduce((counts, connection) => {
      if (connection.from.itemId) counts[connection.from.itemId] = (counts[connection.from.itemId] || 0) + 1;
      if (connection.to.itemId) counts[connection.to.itemId] = (counts[connection.to.itemId] || 0) + 1;
      return counts;
    }, {});
}

function validateEthernetConnection(source, target, placedItems, existingConnections) {
  if (!source?.itemId || !target?.itemId) {
    return { valid: false, message: 'Ethernet must connect one device to another device.' };
  }

  if (source.itemId === target.itemId) {
    return { valid: false, message: 'Ethernet cannot connect a device to itself.' };
  }

  const sourceItem = placedItems.find((item) => item.id === source.itemId);
  const targetItem = placedItems.find((item) => item.id === target.itemId);
  const sourceCatalog = getCatalogForPlacedItem(sourceItem);
  const targetCatalog = getCatalogForPlacedItem(targetItem);

  if (!sourceCatalog?.ethernetPorts || !targetCatalog?.ethernetPorts) {
    return { valid: false, message: 'Both selected items need ethernet ports.' };
  }

  const duplicate = existingConnections.some((connection) => (
    connection.type === 'ethernet'
    && ((connection.from.itemId === source.itemId && connection.to.itemId === target.itemId)
      || (connection.from.itemId === target.itemId && connection.to.itemId === source.itemId))
  ));

  if (duplicate) {
    return { valid: false, message: 'Those devices are already connected by ethernet.' };
  }

  const counts = buildConnectionCounts(existingConnections);
  if ((counts[source.itemId] || 0) >= sourceCatalog.ethernetPorts) {
    return { valid: false, message: `${sourceItem.label} has no ethernet ports available.` };
  }

  if ((counts[target.itemId] || 0) >= targetCatalog.ethernetPorts) {
    return { valid: false, message: `${targetItem.label} has no ethernet ports available.` };
  }

  return { valid: true, message: 'Ethernet connection added.' };
}

function validateTubingConnection(source, target, placedItems) {
  if (!source?.itemId) {
    return { valid: false, message: 'Start tubing from a pressure-capable monitor or pressure sensor.' };
  }

  const sourceItem = placedItems.find((item) => item.id === source.itemId);
  const sourceCatalog = getCatalogForPlacedItem(sourceItem);

  if (!sourceCatalog?.pressureCapable) {
    return { valid: false, message: 'Only the PPM4, RPM, and pressure sensor can use tubing.' };
  }

  if (target?.itemId) {
    return { valid: false, message: 'Tubing should end at a room/reference point, not another device.' };
  }

  return { valid: true, message: `${source.tubingPort?.toUpperCase() || 'ROOM'} tubing run added.` };
}

function validatePowerConnection(source, target, placedItems, connections) {
  if (!source?.itemId || !target?.itemId) {
    return { valid: false, message: 'Local power must connect a charger to one device.' };
  }

  if (source.itemId === target.itemId) {
    return { valid: false, message: 'A charger cannot power itself.' };
  }

  const sourceItem = placedItems.find((item) => item.id === source.itemId);
  const targetItem = placedItems.find((item) => item.id === target.itemId);
  const sourceCatalog = getCatalogForPlacedItem(sourceItem);
  const targetCatalog = getCatalogForPlacedItem(targetItem);

  if (!sourceCatalog?.powerAccessory) {
    return { valid: false, message: 'Select a PPM4 Charger first, then click the device it should power.' };
  }

  if (!targetCatalog || targetCatalog.probe || targetCatalog.powerAccessory || targetCatalog.powerBus) {
    return { valid: false, message: 'PPM4 Charger must power one monitor or sensor, not a probe or Power Bus.' };
  }

  const chargerUsed = connections.some((connection) => connection.type === 'power' && connection.from.itemId === source.itemId);
  if (chargerUsed) {
    return { valid: false, message: 'That charger is already attached to a device.' };
  }

  const targetPowered = connections.some((connection) => connection.type === 'power' && connection.to.itemId === target.itemId);
  if (targetPowered) {
    return { valid: false, message: `${targetItem.label} already has a dedicated charger.` };
  }

  return { valid: true, message: `${sourceItem.label} now powers ${targetItem.label}.` };
}

function getLocallyPoweredItemIds(connections, placedItems) {
  const chargerIds = new Set(
    placedItems.filter((item) => getCatalogForPlacedItem(item)?.powerAccessory).map((item) => item.id),
  );

  return new Set(
    connections
      .filter((connection) => connection.type === 'power' && chargerIds.has(connection.from.itemId) && connection.to.itemId)
      .map((connection) => connection.to.itemId),
  );
}

function summarizeParts(placedItems, connections) {
  const lines = new Map();

  function addPart(key, name, qty = 1, category = 'Device', note = '') {
    const current = lines.get(key) || { sku: key, name, qty: 0, category, note };
    current.qty += qty;
    if (note && !current.note) current.note = note;
    lines.set(key, current);
  }

  placedItems.forEach((placedItem) => {
    if (placedItem.isProbe) return;
    const catalogItem = getCatalogForPlacedItem(placedItem);
    addPart(placedItem.sku, catalogItem?.name || placedItem.label, 1, catalogItem?.category || 'Device');

    catalogItem?.requiredAccessories?.forEach((sku) => {
      const accessory = accessoryItems.find((item) => item.sku === sku);
      addPart(sku, accessory?.name || sku, 1, accessory?.category || 'Required Accessory', `Required for ${catalogItem.shortName}`);
    });

    if (catalogItem?.createsProbe) {
      addPart(`${placedItem.sku}-PROBE`, 'ACH Probe', 1, 'Included Component', `Included with each ${catalogItem.shortName} sensor.`);
    }
  });

  const ethernetConnections = connections.filter((connection) => connection.type === 'ethernet');
  if (ethernetConnections.length) {
    addPart('ETH-RUN', 'Ethernet cable run - add final cable SKU/length', ethernetConnections.length, 'Connection', 'Placeholder until cable lengths/SKUs are added.');
  }

  const tubingConnections = connections.filter((connection) => connection.type === 'tubing');
  if (tubingConnections.length) {
    addPart('MI00774', 'Small Tubing - 10/PK', tubingConnections.length, 'Tubing', 'One line added per tubing run for now.');
    addPart('MSS173', 'Elbow w/ Tubing Attached for Pressure Monitor', tubingConnections.length, 'Tubing Accessory', 'Review exact quantity during final quoting.');
  }

  const powerConnections = connections.filter((connection) => connection.type === 'power');
  if (powerConnections.length) {
    addPart('PWR-ATTACH', 'Local power attachment', powerConnections.length, 'Power', 'Each attachment represents one PPM4 charger powering one device.');
  }

  return Array.from(lines.values());
}

function buildEthernetGraph(placedItems, connections) {
  const graph = new Map(
    placedItems
      .filter((item) => !item.isProbe)
      .map((item) => [item.id, new Set()]),
  );

  connections
    .filter((connection) => connection.type === 'ethernet' && connection.from.itemId && connection.to.itemId)
    .forEach((connection) => {
      graph.get(connection.from.itemId)?.add(connection.to.itemId);
      graph.get(connection.to.itemId)?.add(connection.from.itemId);
    });

  return graph;
}

function getPowerComponents(placedItems, connections) {
  const nonProbeItems = placedItems.filter((item) => !item.isProbe);
  const graph = buildEthernetGraph(nonProbeItems, connections);
  const locallyPoweredIds = getLocallyPoweredItemIds(connections, placedItems);
  const visited = new Set();
  const components = [];

  nonProbeItems.forEach((startItem) => {
    if (visited.has(startItem.id)) return;

    const stack = [startItem.id];
    const ids = [];
    visited.add(startItem.id);

    while (stack.length) {
      const currentId = stack.pop();
      ids.push(currentId);
      graph.get(currentId)?.forEach((nextId) => {
        if (!visited.has(nextId)) {
          visited.add(nextId);
          stack.push(nextId);
        }
      });
    }

    const items = ids.map((id) => placedItems.find((item) => item.id === id)).filter(Boolean);
    const details = items.map((item) => ({
      placed: item,
      catalog: getCatalogForPlacedItem(item),
      localPower: locallyPoweredIds.has(item.id),
    }));
    const sources = details.filter(({ catalog }) => catalog?.powerSource);
    const hasPowerBus = sources.some(({ catalog }) => catalog?.powerBus);
    const totalCapacityMa = hasPowerBus
      ? Infinity
      : sources.reduce((sum, { catalog }) => sum + (Number(catalog?.powerCapacityMa) || 0), 0);
    const totalLoadMa = details.reduce((sum, { catalog, localPower }) => {
      if (localPower) return sum;
      return sum + (Number(catalog?.powerDrawMa) || 0);
    }, 0);

    components.push({
      ids,
      items,
      details,
      sources,
      hasPowerBus,
      totalCapacityMa,
      totalLoadMa,
      locallyPoweredIds,
    });
  });

  return components;
}

function getPowerWarnings(placedItems, connections) {
  const warnings = [];
  const components = getPowerComponents(placedItems, connections);

  components.forEach((component) => {
    const poweredItems = component.details.filter(({ catalog, localPower }) => Number(catalog?.powerDrawMa) > 0 && !localPower);
    if (!poweredItems.length) return;

    if (!component.sources.length) {
      warnings.push({
        id: `no-source-${component.ids.join('-')}`,
        severity: 'warning',
        title: 'No expansion-bus power source on ethernet chain',
        message: `${poweredItems.map(({ placed }) => placed.label).join(', ')} need a monitor or Power Bus on the ethernet chain, or their own chargers.`,
      });
      return;
    }

    if (!component.hasPowerBus && component.totalLoadMa > component.totalCapacityMa) {
      warnings.push({
        id: `overload-${component.ids.join('-')}`,
        severity: 'danger',
        title: 'Expansion bus power exceeded',
        message: `${component.totalLoadMa}mA load exceeds ${component.totalCapacityMa}mA available. Add a Power Bus or attach a PPM4 Charger to the device pushing the chain over.`,
      });
    }
  });

  placedItems.forEach((placedItem) => {
    if (placedItem.isProbe) return;
    const catalog = getCatalogForPlacedItem(placedItem);
    if (!catalog || !Number(catalog.powerDrawMa) || catalog.powerDrawMa <= POWER_RECOMMENDATION_THRESHOLD_MA) return;

    const component = components.find((entry) => entry.ids.includes(placedItem.id));
    const locallyPowered = component?.locallyPoweredIds?.has(placedItem.id);
    if (component?.hasPowerBus || locallyPowered) return;

    warnings.push({
      id: `recommend-${placedItem.id}`,
      severity: 'advisory',
      title: 'Dedicated power recommended',
      message: `${catalog.shortName} draws ${catalog.powerDrawMa}mA. Anything above ${POWER_RECOMMENDATION_THRESHOLD_MA}mA should have power on it. Attach a PPM4 Charger or use a Power Bus.`,
    });
  });

  return warnings;
}

function getPowerInfoForItem(itemId, placedItems, connections) {
  const component = getPowerComponents(placedItems, connections).find((entry) => entry.ids.includes(itemId));
  if (!component) return null;

  return {
    loadMa: component.totalLoadMa,
    capacityMa: component.totalCapacityMa,
    hasPowerBus: component.hasPowerBus,
    sourceCount: component.sources.length,
    locallyPowered: component.locallyPoweredIds.has(itemId),
  };
}

function clampProbeDistance(probe, parent, canvasSize) {
  const parentCenter = getPlacedItemCenter(parent);
  const probeCenter = getPlacedItemCenter(probe);
  const dx = probeCenter.x - parentCenter.x;
  const dy = probeCenter.y - parentCenter.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance <= PROBE_MAX_DISTANCE_PX || distance === 0) {
    return {
      ...probe,
      x: clamp(snap(probe.x), 0, canvasSize.width - probe.width),
      y: clamp(snap(probe.y), 0, canvasSize.height - probe.height),
    };
  }

  const ratio = PROBE_MAX_DISTANCE_PX / distance;
  const limitedCenterX = parentCenter.x + dx * ratio;
  const limitedCenterY = parentCenter.y + dy * ratio;

  return {
    ...probe,
    x: clamp(snap(limitedCenterX - probe.width / 2), 0, canvasSize.width - probe.width),
    y: clamp(snap(limitedCenterY - probe.height / 2), 0, canvasSize.height - probe.height),
  };
}

function constrainProbes(items, canvasSize) {
  const baseItems = items.map((item) => ({ ...item }));
  return baseItems.map((item) => {
    if (!item.isProbe) return item;
    const parent = baseItems.find((entry) => entry.id === item.parentId);
    if (!parent) return item;
    return clampProbeDistance(item, parent, canvasSize);
  });
}

function getDoorSwingPath(door) {
  const dx = door.to.x - door.from.x;
  const dy = door.to.y - door.from.y;
  const length = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;
  const mx = (door.from.x + door.to.x) / 2 + nx * 18;
  const my = (door.from.y + door.to.y) / 2 + ny * 18;
  return `M ${door.from.x} ${door.from.y} Q ${mx} ${my} ${door.to.x} ${door.to.y}`;
}

export default function SetupBuilderPage({ user, onLogout }) {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState('select');
  const [placedItems, setPlacedItems] = useState([]);
  const [walls, setWalls] = useState([]);
  const [doors, setDoors] = useState([]);
  const [connections, setConnections] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [activeStart, setActiveStart] = useState(null);
  const [draftWall, setDraftWall] = useState(null);
  const [draftDoor, setDraftDoor] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [notice, setNotice] = useState('Drag a monitor, sensor, charger, or Power Bus onto the grid to start a setup.');
  const [tubingPort, setTubingPort] = useState('room');

  const selectedItem = placedItems.find((item) => item.id === selectedId);
  const selectedCatalogItem = selectedItem ? getCatalogForPlacedItem(selectedItem) : null;
  const connectionCounts = useMemo(() => buildConnectionCounts(connections), [connections]);
  const partsList = useMemo(() => summarizeParts(placedItems, connections), [placedItems, connections]);
  const powerWarnings = useMemo(() => getPowerWarnings(placedItems, connections), [placedItems, connections]);
  const selectedPowerInfo = useMemo(() => (
    selectedItem && !selectedItem.isProbe ? getPowerInfoForItem(selectedItem.id, placedItems, connections) : null
  ), [selectedItem, placedItems, connections]);
  const locallyPoweredItemIds = useMemo(() => getLocallyPoweredItemIds(connections, placedItems), [connections, placedItems]);

  function handleInventoryDragStart(event, item) {
    event.dataTransfer.setData('application/monsuite-item', item.sku);
    event.dataTransfer.effectAllowed = 'copy';
  }

  function handleCanvasDrop(event) {
    event.preventDefault();
    const sku = event.dataTransfer.getData('application/monsuite-item');
    const catalogItem = findInventoryItem(sku);
    if (!catalogItem || !canvasRef.current) return;

    const pointer = getPointerPosition(event, canvasRef.current);
    const canvasSize = getCanvasSize(canvasRef.current);
    const scale = catalogItem.category === 'Monitor' ? 5 : catalogItem.powerAccessory ? 9 : 7;
    const width = Math.max(catalogItem.powerAccessory ? 42 : 56, Math.round(catalogItem.dimensions.widthIn * scale));
    const height = Math.max(catalogItem.powerAccessory ? 42 : 56, Math.round(catalogItem.dimensions.heightIn * scale));

    const newItem = {
      id: makeId('item'),
      sku: catalogItem.sku,
      label: catalogItem.shortName,
      x: clamp(snap(pointer.x - width / 2), 0, canvasSize.width - width),
      y: clamp(snap(pointer.y - height / 2), 0, canvasSize.height - height),
      width,
      height,
      rotation: 0,
    };

    let addedItems = [newItem];
    if (catalogItem.createsProbe) {
      const probeWidth = 28;
      const probeHeight = 28;
      const probe = {
        id: makeId('probe'),
        sku: 'ACH-PROBE',
        label: catalogItem.probeLabel || 'Probe',
        parentId: newItem.id,
        isProbe: true,
        x: clamp(snap(newItem.x + newItem.width + GRID_SIZE), 0, canvasSize.width - probeWidth),
        y: clamp(snap(newItem.y + newItem.height / 2 - probeHeight / 2), 0, canvasSize.height - probeHeight),
        width: probeWidth,
        height: probeHeight,
        rotation: 0,
      };
      addedItems.push(probe);
    }

    const nextItems = constrainProbes([...placedItems, ...addedItems], canvasSize);
    setPlacedItems(nextItems);
    setSelectedId(newItem.id);
    setNotice(catalogItem.createsProbe ? `${catalogItem.name} added with remote probe. Probe must stay within ${PROBE_MAX_LENGTH_FT} ft.` : `${catalogItem.name} added to the setup.`);
  }

  function handleCanvasPointerDown(event) {
    if (!canvasRef.current) return;
    const pointer = getPointerPosition(event, canvasRef.current);
    const snapped = { x: snap(pointer.x), y: snap(pointer.y) };

    if (tool === 'wall') {
      if (!draftWall) {
        setDraftWall({ from: snapped, to: snapped });
        setDraftDoor(null);
        setNotice('Wall started. Click another grid point to finish the wall.');
      } else {
        const wall = { id: makeId('wall'), from: draftWall.from, to: snapped };
        setWalls((currentWalls) => [...currentWalls, wall]);
        setDraftWall(null);
        setNotice('Wall added.');
      }
      return;
    }

    if (tool === 'door') {
      if (!draftDoor) {
        setDraftDoor({ from: snapped, to: snapped });
        setDraftWall(null);
        setNotice('Door started. Click another point to place the door opening.');
      } else {
        const door = { id: makeId('door'), from: draftDoor.from, to: snapped };
        setDoors((currentDoors) => [...currentDoors, door]);
        setDraftDoor(null);
        setNotice('Door added.');
      }
      return;
    }

    if (tool === 'tubing' && activeStart?.type === 'tubing') {
      const target = { x: snap(pointer.x), y: snap(pointer.y), roomPoint: true };
      const validation = validateTubingConnection(activeStart.point, target, placedItems);
      setNotice(validation.message);

      if (validation.valid) {
        setConnections((currentConnections) => [...currentConnections, {
          id: makeId('tube'),
          type: 'tubing',
          label: activeStart.point.tubingPort,
          from: { ...activeStart.point },
          to: target,
        }]);
      }
      setActiveStart(null);
      return;
    }

    setSelectedId(null);
  }

  function handleCanvasPointerMove(event) {
    if (!canvasRef.current) return;
    const pointer = getPointerPosition(event, canvasRef.current);

    if (draftWall) {
      setDraftWall((wall) => ({ ...wall, to: { x: snap(pointer.x), y: snap(pointer.y) } }));
    }

    if (draftDoor) {
      setDraftDoor((door) => ({ ...door, to: { x: snap(pointer.x), y: snap(pointer.y) } }));
    }

    if (dragging) {
      const canvasSize = getCanvasSize(canvasRef.current);
      const x = snap(pointer.x - dragging.offsetX);
      const y = snap(pointer.y - dragging.offsetY);

      setPlacedItems((items) => {
        const updated = items.map((item) => {
          if (item.id !== dragging.itemId) return { ...item };
          return {
            ...item,
            x: clamp(x, 0, canvasSize.width - item.width),
            y: clamp(y, 0, canvasSize.height - item.height),
          };
        });
        return constrainProbes(updated, canvasSize);
      });
    }
  }

  function handleCanvasPointerUp() {
    setDragging(null);
  }

  function handleItemPointerDown(event, item) {
    event.stopPropagation();
    setSelectedId(item.id);

    if (tool === 'ethernet') {
      if (item.isProbe) {
        setNotice('Probes do not have ethernet ports.');
        return;
      }

      const point = { itemId: item.id };
      if (!activeStart || activeStart.type !== 'ethernet') {
        setActiveStart({ type: 'ethernet', point });
        setNotice(`Ethernet start: ${item.label}. Click another ethernet-capable item.`);
        return;
      }

      const validation = validateEthernetConnection(activeStart.point, point, placedItems, connections);
      setNotice(validation.message);
      if (validation.valid) {
        setConnections((currentConnections) => [...currentConnections, {
          id: makeId('eth'),
          type: 'ethernet',
          from: { ...activeStart.point },
          to: { ...point },
        }]);
      }
      setActiveStart(null);
      return;
    }

    if (tool === 'power') {
      const catalogItem = getCatalogForPlacedItem(item);
      if (!activeStart || activeStart.type !== 'power') {
        if (!catalogItem?.powerAccessory) {
          setNotice('Click a PPM4 Charger first, then the device it should power.');
          return;
        }

        setActiveStart({ type: 'power', point: { itemId: item.id } });
        setNotice(`Power start: ${item.label}. Click the monitor or sensor this charger should power.`);
        return;
      }

      const validation = validatePowerConnection(activeStart.point, { itemId: item.id }, placedItems, connections);
      setNotice(validation.message);
      if (validation.valid) {
        setConnections((currentConnections) => [...currentConnections, {
          id: makeId('pwr'),
          type: 'power',
          from: { ...activeStart.point },
          to: { itemId: item.id },
        }]);
      }
      setActiveStart(null);
      return;
    }

    if (tool === 'tubing') {
      if (item.isProbe) {
        setNotice('Probes do not start tubing.');
        setActiveStart(null);
        return;
      }

      const catalogItem = getCatalogForPlacedItem(item);
      if (!catalogItem?.pressureCapable) {
        setNotice('Only the PPM4, RPM, and pressure sensor can start tubing.');
        setActiveStart(null);
        return;
      }

      setActiveStart({ type: 'tubing', point: { itemId: item.id, tubingPort } });
      setNotice(`${tubingPort.toUpperCase()} tubing start: ${item.label}. Click a room/reference point on the grid.`);
      return;
    }

    if (tool === 'select') {
      const pointer = getPointerPosition(event, canvasRef.current);
      setDragging({ itemId: item.id, offsetX: pointer.x - item.x, offsetY: pointer.y - item.y });
    }
  }

  function rotateSelectedItem() {
    if (!selectedItem || selectedItem.isProbe) return;
    setPlacedItems((items) => items.map((item) => (
      item.id === selectedItem.id
        ? { ...item, width: item.height, height: item.width, rotation: (item.rotation + 90) % 360 }
        : item
    )));
    setNotice(`${selectedItem.label} rotated.`);
  }

  function removeSelectedItem() {
    if (!selectedItem) return;
    const removalIds = new Set([selectedItem.id]);

    if (!selectedItem.isProbe) {
      placedItems
        .filter((item) => item.parentId === selectedItem.id)
        .forEach((item) => removalIds.add(item.id));
    }

    setPlacedItems((items) => items.filter((item) => !removalIds.has(item.id) && !removalIds.has(item.parentId)));
    setConnections((currentConnections) => currentConnections.filter((connection) => (
      !removalIds.has(connection.from.itemId) && !removalIds.has(connection.to.itemId)
    )));
    setSelectedId(null);
    setNotice('Item removed from setup.');
  }

  function undoLastLine() {
    if (connections.length) {
      setConnections((currentConnections) => currentConnections.slice(0, -1));
      setNotice('Last connection removed.');
      return;
    }
    if (doors.length) {
      setDoors((currentDoors) => currentDoors.slice(0, -1));
      setNotice('Last door removed.');
      return;
    }
    if (walls.length) {
      setWalls((currentWalls) => currentWalls.slice(0, -1));
      setNotice('Last wall removed.');
    }
  }

  function clearLayout() {
    setPlacedItems([]);
    setConnections([]);
    setWalls([]);
    setDoors([]);
    setDraftWall(null);
    setDraftDoor(null);
    setSelectedId(null);
    setActiveStart(null);
    setNotice('Layout cleared.');
  }

  function saveDraft() {
    const draft = { placedItems, connections, walls, doors, savedAt: new Date().toISOString() };
    localStorage.setItem('monsuite-setup-draft', JSON.stringify(draft));
    setNotice('Draft saved in this browser.');
  }

  function loadDraft() {
    const rawDraft = localStorage.getItem('monsuite-setup-draft');
    if (!rawDraft) {
      setNotice('No saved draft found in this browser.');
      return;
    }

    try {
      const draft = JSON.parse(rawDraft);
      const canvasSize = getCanvasSize(canvasRef.current);
      setPlacedItems(constrainProbes(draft.placedItems || [], canvasSize));
      setConnections(draft.connections || []);
      setWalls(draft.walls || []);
      setDoors(draft.doors || []);
      setNotice('Draft loaded.');
    } catch {
      setNotice('Saved draft could not be loaded.');
    }
  }

  function exportJson() {
    const draft = { placedItems, connections, walls, doors, partsList, powerWarnings, scale: DEFAULT_SCALE_LABEL };
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'monsuite-setup-draft.json';
    link.click();
    URL.revokeObjectURL(url);
    setNotice('Setup JSON exported.');
  }

  return (
    <AppShell user={user} onLogout={onLogout}>
      <main className="setup-builder-page setup-builder-v4">
        <section className="setup-header">
          <div>
            <p className="eyebrow">Setup Configurator MVP</p>
            <h1>Build monitor layouts on a grid.</h1>
            <p>
              Draw walls and doors, place monitors, sensors, chargers, and Power Bus modules,
              connect ethernet/tubing/local power, then review the generated parts list and power warnings.
            </p>
          </div>
          <div className="setup-header-actions">
            <button className="button secondary small" onClick={loadDraft}>Load draft</button>
            <button className="button secondary small" onClick={saveDraft}>Save draft</button>
            <button className="button primary small" onClick={exportJson}>Export JSON</button>
          </div>
        </section>

        <section className="setup-workspace">
          <aside className="setup-panel inventory-panel">
            <div className="panel-heading">
              <span>Inventory</span>
              <strong>{inventoryItems.length} items</strong>
            </div>

            <div className="tool-group tool-grid">
              <button className={`tool-button ${tool === 'select' ? 'active' : ''}`} onClick={() => { setTool('select'); setActiveStart(null); }}>Select / Move</button>
              <button className={`tool-button ${tool === 'wall' ? 'active' : ''}`} onClick={() => { setTool('wall'); setActiveStart(null); }}>Draw Walls</button>
              <button className={`tool-button ${tool === 'door' ? 'active' : ''}`} onClick={() => { setTool('door'); setActiveStart(null); }}>Draw Doors</button>
              <button className={`tool-button ${tool === 'ethernet' ? 'active' : ''}`} onClick={() => { setTool('ethernet'); setActiveStart(null); }}>Ethernet</button>
              <button className={`tool-button ${tool === 'tubing' ? 'active' : ''}`} onClick={() => { setTool('tubing'); setActiveStart(null); }}>Tubing</button>
              <button className={`tool-button ${tool === 'power' ? 'active' : ''}`} onClick={() => { setTool('power'); setActiveStart(null); }}>Local Power</button>
            </div>

            {tool === 'tubing' && (
              <div className="segmented-control" aria-label="Tubing port">
                <button className={tubingPort === 'room' ? 'active' : ''} onClick={() => setTubingPort('room')}>Room</button>
                <button className={tubingPort === 'ref' ? 'active' : ''} onClick={() => setTubingPort('ref')}>Ref</button>
              </div>
            )}

            <p className="panel-help">Drag products onto the canvas. Use tools by clicking a source, then a target. ACH sensors auto-create a probe that must stay within 2 ft.</p>

            <div className="inventory-list">
              {inventoryItems.map((item) => (
                <div
                  className={`inventory-card ${item.category?.toLowerCase() || ''}`}
                  draggable
                  key={item.sku}
                  onDragStart={(event) => handleInventoryDragStart(event, item)}
                >
                  <span>{item.shortName}</span>
                  <div>
                    <strong>{item.name}</strong>
                    <small>
                      {item.sku} · {item.category}
                      {Number(item.powerDrawMa) > 0 ? ` · ${item.powerDrawMa}mA` : ''}
                      {item.powerBus ? ' · powered' : ''}
                      {item.powerAccessory ? ' · single-device power' : ''}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <section className="canvas-column">
            <div className="canvas-toolbar">
              <span>{DEFAULT_SCALE_LABEL}</span>
              <strong>{notice}</strong>
              <div>
                <button className="button secondary small" onClick={undoLastLine}>Undo line</button>
                <button className="button secondary small" onClick={clearLayout}>Clear</button>
              </div>
            </div>

            <div
              className={`setup-canvas tool-${tool}`}
              ref={canvasRef}
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleCanvasDrop}
              onPointerDown={handleCanvasPointerDown}
              onPointerMove={handleCanvasPointerMove}
              onPointerUp={handleCanvasPointerUp}
              onPointerLeave={handleCanvasPointerUp}
            >
              <svg className="connection-layer">
                {walls.map((wall) => (
                  <line
                    className="wall-line"
                    key={wall.id}
                    x1={wall.from.x}
                    y1={wall.from.y}
                    x2={wall.to.x}
                    y2={wall.to.y}
                  />
                ))}
                {draftWall && (
                  <line
                    className="wall-line draft"
                    x1={draftWall.from.x}
                    y1={draftWall.from.y}
                    x2={draftWall.to.x}
                    y2={draftWall.to.y}
                  />
                )}
                {doors.map((door) => (
                  <g key={door.id}>
                    <line className="door-line" x1={door.from.x} y1={door.from.y} x2={door.to.x} y2={door.to.y} />
                    <path className="door-swing" d={getDoorSwingPath(door)} />
                  </g>
                ))}
                {draftDoor && (
                  <g>
                    <line className="door-line draft" x1={draftDoor.from.x} y1={draftDoor.from.y} x2={draftDoor.to.x} y2={draftDoor.to.y} />
                    <path className="door-swing draft" d={getDoorSwingPath(draftDoor)} />
                  </g>
                )}
                {connections.map((connection) => {
                  const points = getResolvedConnectionPoints(connection, placedItems);
                  const length = lineLengthFeet(connection, placedItems);
                  return (
                    <g key={connection.id}>
                      <line
                        className={`connection-line ${connection.type}`}
                        x1={points.from.x}
                        y1={points.from.y}
                        x2={points.to.x}
                        y2={points.to.y}
                      />
                      {connection.type === 'tubing' && (
                        <>
                          <circle className="tube-endpoint" cx={points.to.x} cy={points.to.y} r="6" />
                          <text
                            className="connection-label"
                            x={(points.from.x + points.to.x) / 2}
                            y={(points.from.y + points.to.y) / 2 - 8}
                          >
                            {connection.label?.toUpperCase()} · {length}ft
                          </text>
                        </>
                      )}
                      {connection.type === 'power' && (
                        <text
                          className="connection-label power"
                          x={(points.from.x + points.to.x) / 2}
                          y={(points.from.y + points.to.y) / 2 - 8}
                        >
                          PWR
                        </text>
                      )}
                    </g>
                  );
                })}
                {placedItems.filter((item) => item.isProbe).map((probe) => {
                  const parent = placedItems.find((entry) => entry.id === probe.parentId);
                  if (!parent) return null;
                  const from = getPlacedItemEdgeAnchor(parent, getPlacedItemCenter(probe));
                  const to = getPlacedItemEdgeAnchor(probe, getPlacedItemCenter(parent));
                  const length = getProbeLengthFeet(probe, placedItems);
                  return (
                    <g key={`probe-link-${probe.id}`}>
                      <line className="connection-line probe" x1={from.x} y1={from.y} x2={to.x} y2={to.y} />
                      <text className="connection-label probe" x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 8}>
                        Probe · {length}ft / max {PROBE_MAX_LENGTH_FT}ft
                      </text>
                    </g>
                  );
                })}
              </svg>

              {placedItems.map((item) => {
                const catalogItem = getCatalogForPlacedItem(item);
                const usedPorts = connectionCounts[item.id] || 0;
                const hasItemPowerWarning = powerWarnings.some((warning) => warning.id.includes(item.id));
                const localPowerAttached = locallyPoweredItemIds.has(item.id);
                return (
                  <button
                    className={`placed-item ${selectedId === item.id ? 'selected' : ''} ${catalogItem?.category?.toLowerCase() || ''} ${catalogItem?.powerBus ? 'power-bus' : ''} ${catalogItem?.powerAccessory ? 'power-accessory' : ''} ${item.isProbe ? 'probe' : ''} ${hasItemPowerWarning ? 'power-warning' : ''} ${localPowerAttached ? 'local-powered' : ''}`}
                    key={item.id}
                    style={{ left: item.x, top: item.y, width: item.width, height: item.height }}
                    onPointerDown={(event) => handleItemPointerDown(event, item)}
                    title={catalogItem?.name}
                  >
                    {hasItemPowerWarning && <span className="power-badge" aria-label="Power warning">⚡</span>}
                    {localPowerAttached && <span className="power-badge attached" aria-label="Local power attached">🔌</span>}
                    <strong>{item.label}</strong>
                    <span>{catalogItem?.sku || item.sku}</span>
                    <small>
                      {item.isProbe
                        ? `remote · ${PROBE_MAX_LENGTH_FT}ft max`
                        : `${usedPorts}/${catalogItem?.ethernetPorts || 0} ETH${Number(catalogItem?.powerDrawMa) > 0 ? ` · ${catalogItem.powerDrawMa}mA` : ''}`}
                    </small>
                  </button>
                );
              })}
            </div>
          </section>

          <aside className="setup-panel details-panel">
            <div className="panel-heading">
              <span>Details</span>
              <strong>{placedItems.length} placed</strong>
            </div>

            {selectedItem && selectedCatalogItem ? (
              <div className="selected-card">
                <p className="eyebrow">Selected item</p>
                <h2>{selectedCatalogItem.name}</h2>
                <dl>
                  <div><dt>SKU</dt><dd>{selectedCatalogItem.sku}</dd></div>
                  <div><dt>Size</dt><dd>{selectedCatalogItem.dimensions.widthIn}&quot; W × {selectedCatalogItem.dimensions.heightIn}&quot; H × {selectedCatalogItem.dimensions.depthIn}&quot; D</dd></div>
                  <div><dt>Mount</dt><dd>{selectedCatalogItem.mount.join(', ')}</dd></div>
                  <div><dt>Ethernet</dt><dd>{selectedItem.isProbe ? 'None' : `${connectionCounts[selectedItem.id] || 0}/${selectedCatalogItem.ethernetPorts} ports used`}</dd></div>
                  <div><dt>Power draw</dt><dd>{Number(selectedCatalogItem.powerDrawMa) > 0 ? `${selectedCatalogItem.powerDrawMa}mA` : selectedCatalogItem.powerSource ? 'Power source' : selectedCatalogItem.powerAccessory ? 'Local charger' : 'None'}</dd></div>
                  <div><dt>Local power</dt><dd>{selectedPowerInfo?.locallyPowered ? 'PPM4 Charger attached' : selectedCatalogItem.powerAccessory ? 'Provides single-device power' : 'No dedicated charger attached'}</dd></div>
                  <div><dt>Bus status</dt><dd>{selectedItem.isProbe ? `Must stay within ${PROBE_MAX_LENGTH_FT} ft of parent ACH sensor` : selectedPowerInfo ? (selectedPowerInfo.hasPowerBus ? `${selectedPowerInfo.loadMa}mA load · Power Bus present` : `${selectedPowerInfo.loadMa}mA / ${selectedPowerInfo.capacityMa || 0}mA`) : 'Not connected'}</dd></div>
                  <div><dt>Tubing</dt><dd>{selectedCatalogItem.pressureCapable ? 'Room / Ref capable' : 'Not tubing capable'}</dd></div>
                </dl>
                <p>{selectedCatalogItem.description}</p>
                <div className="selected-actions">
                  {!selectedItem.isProbe && <button className="button secondary small" onClick={rotateSelectedItem}>Rotate</button>}
                  <button className="button secondary small danger" onClick={removeSelectedItem}>Remove</button>
                </div>
              </div>
            ) : (
              <div className="empty-details">
                <h2>No item selected</h2>
                <p>Click a placed item to see dimensions, ports, mounting, power draw, and notes.</p>
              </div>
            )}

            <div className="power-card">
              <div className="panel-heading compact">
                <span>Power check</span>
                <strong>{powerWarnings.length ? `${powerWarnings.length} alerts` : 'OK'}</strong>
              </div>

              {powerWarnings.length ? (
                <div className="power-warning-list">
                  {powerWarnings.map((warning) => (
                    <div className={`power-warning-row ${warning.severity}`} key={warning.id}>
                      <b>⚡</b>
                      <div>
                        <strong>{warning.title}</strong>
                        <small>{warning.message}</small>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="panel-help">No expansion bus power warnings yet.</p>
              )}
            </div>

            <div className="parts-list-card">
              <div className="panel-heading compact">
                <span>Parts list</span>
                <strong>{partsList.length} lines</strong>
              </div>

              {partsList.length ? (
                <div className="parts-list">
                  {partsList.map((part) => (
                    <div className="part-row" key={part.sku}>
                      <strong>{part.qty}×</strong>
                      <div>
                        <span>{part.name}</span>
                        <small>{part.sku} · {part.category}</small>
                        {part.note && <em>{part.note}</em>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="panel-help">Parts will appear after you place monitors, sensors, cables, or tubing.</p>
              )}
            </div>

            <div className="rules-card">
              <strong>Current rules</strong>
              <ul>
                <li>PPM4 and RPM expansion bus capacity is {MONITOR_EXPANSION_BUS_CAPACITY_MA}mA.</li>
                <li>Power Bus has 2 ethernet ports and powers its chain.</li>
                <li>PPM4 Charger powers one monitor or sensor without adding that device to the bus load.</li>
                <li>Devices above {POWER_RECOMMENDATION_THRESHOLD_MA}mA show a power recommendation unless a Power Bus or charger is present.</li>
                <li>PPM4, RPM, Power Bus, and all sensors have 2 ethernet ports. Chargers and probes do not.</li>
                <li>Tubing can only start from PPM4, RPM, or pressure sensors.</li>
                <li>ACH sensors automatically create a remote probe with a max length of {PROBE_MAX_LENGTH_FT} ft.</li>
              </ul>
            </div>
          </aside>
        </section>
      </main>
    </AppShell>
  );
}
