import { useMemo, useRef, useState } from 'react';
import AppShell from '../components/AppShell.jsx';
import {
  accessoryItems,
  findInventoryItem,
  GRID_SIZE,
  inventoryItems,
  MONITOR_EXPANSION_BUS_CAPACITY_MA,
  POWER_RECOMMENDATION_THRESHOLD_MA,
} from '../data/setupInventory.js';

const DEFAULT_SCALE_LABEL = '1 grid square = 1 ft';
const DEFAULT_CANVAS_SIZE = { width: 1120, height: 720 };

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

  const widthRatio = Math.abs(dx) / halfWidth;
  const heightRatio = Math.abs(dy) / halfHeight;

  if (widthRatio > heightRatio) {
    const sign = dx >= 0 ? 1 : -1;
    return {
      x: center.x + sign * halfWidth,
      y: center.y + dy * (halfWidth / Math.abs(dx)),
    };
  }

  const sign = dy >= 0 ? 1 : -1;
  return {
    x: center.x + dx * (halfHeight / Math.abs(dy)),
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

  if (!sourceItem || !targetItem) {
    return { valid: false, message: 'Select two placed devices for ethernet.' };
  }

  const sourceCatalog = findInventoryItem(sourceItem.sku);
  const targetCatalog = findInventoryItem(targetItem.sku);

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
  const sourceCatalog = findInventoryItem(sourceItem?.sku);

  if (!sourceCatalog?.pressureCapable) {
    return { valid: false, message: 'Only the PPM4, RPM, and pressure sensor can use tubing.' };
  }

  if (target?.itemId) {
    return { valid: false, message: 'Tubing should end at a room/reference point, not another device.' };
  }

  return { valid: true, message: `${source.tubingPort?.toUpperCase() || 'ROOM'} tubing run added.` };
}

function summarizeParts(placedItems, connections) {
  const lines = new Map();

  function addPart(key, name, qty = 1, category = 'Device', note = '') {
    const current = lines.get(key) || { sku: key, name, qty: 0, category, note };
    current.qty += qty;
    lines.set(key, current);
  }

  placedItems.forEach((placedItem) => {
    const catalogItem = findInventoryItem(placedItem.sku);
    addPart(placedItem.sku, catalogItem?.name || placedItem.label, 1, catalogItem?.category || 'Device');

    catalogItem?.requiredAccessories?.forEach((sku) => {
      const accessory = accessoryItems.find((item) => item.sku === sku);
      addPart(sku, accessory?.name || sku, 1, accessory?.category || 'Required Accessory', `Required for ${catalogItem.shortName}`);
    });
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

  return Array.from(lines.values());
}

function buildEthernetGraph(placedItems, connections) {
  const graph = new Map(placedItems.map((item) => [item.id, new Set()]));

  connections
    .filter((connection) => connection.type === 'ethernet' && connection.from.itemId && connection.to.itemId)
    .forEach((connection) => {
      graph.get(connection.from.itemId)?.add(connection.to.itemId);
      graph.get(connection.to.itemId)?.add(connection.from.itemId);
    });

  return graph;
}

function getPowerComponents(placedItems, connections) {
  const graph = buildEthernetGraph(placedItems, connections);
  const visited = new Set();
  const components = [];

  placedItems.forEach((startItem) => {
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
    const details = items.map((item) => ({ placed: item, catalog: findInventoryItem(item.sku) }));
    const sources = details.filter(({ catalog }) => catalog?.powerSource);
    const hasPowerBus = sources.some(({ catalog }) => catalog?.powerBus);
    const totalCapacityMa = hasPowerBus
      ? Infinity
      : sources.reduce((sum, { catalog }) => sum + (Number(catalog?.powerCapacityMa) || 0), 0);
    const totalLoadMa = details.reduce((sum, { catalog }) => sum + (Number(catalog?.powerDrawMa) || 0), 0);

    components.push({ ids, items, details, sources, hasPowerBus, totalCapacityMa, totalLoadMa });
  });

  return components;
}

function getPowerWarnings(placedItems, connections) {
  const warnings = [];
  const components = getPowerComponents(placedItems, connections);

  components.forEach((component) => {
    const poweredItems = component.details.filter(({ catalog }) => Number(catalog?.powerDrawMa) > 0);
    if (!poweredItems.length) return;

    if (!component.sources.length) {
      warnings.push({
        id: `no-source-${component.ids.join('-')}`,
        severity: 'warning',
        title: 'No power source on ethernet chain',
        message: `${poweredItems.map(({ placed }) => placed.label).join(', ')} need a monitor or Power Bus on the ethernet chain.`,
      });
      return;
    }

    if (!component.hasPowerBus && component.totalLoadMa > component.totalCapacityMa) {
      warnings.push({
        id: `overload-${component.ids.join('-')}`,
        severity: 'danger',
        title: 'Expansion bus power exceeded',
        message: `${component.totalLoadMa}mA load exceeds ${component.totalCapacityMa}mA available. Add a Power Bus or split the daisy chain.`,
      });
    }
  });

  placedItems.forEach((placedItem) => {
    const catalog = findInventoryItem(placedItem.sku);
    if (!catalog || !Number(catalog.powerDrawMa) || catalog.powerDrawMa <= POWER_RECOMMENDATION_THRESHOLD_MA) return;

    const component = components.find((entry) => entry.ids.includes(placedItem.id));
    if (component?.hasPowerBus) return;

    warnings.push({
      id: `recommend-${placedItem.id}`,
      severity: 'advisory',
      title: 'Dedicated power recommended',
      message: `${catalog.shortName} draws ${catalog.powerDrawMa}mA. Anything above ${POWER_RECOMMENDATION_THRESHOLD_MA}mA should have power on it.`,
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
  };
}

export default function SetupBuilderPage({ user, onLogout }) {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState('select');
  const [placedItems, setPlacedItems] = useState([]);
  const [walls, setWalls] = useState([]);
  const [connections, setConnections] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [activeStart, setActiveStart] = useState(null);
  const [draftWall, setDraftWall] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [notice, setNotice] = useState('Drag a monitor, sensor, or Power Bus onto the grid to start a setup.');
  const [tubingPort, setTubingPort] = useState('room');

  const selectedItem = placedItems.find((item) => item.id === selectedId);
  const selectedCatalogItem = selectedItem ? findInventoryItem(selectedItem.sku) : null;
  const connectionCounts = useMemo(() => buildConnectionCounts(connections), [connections]);
  const partsList = useMemo(() => summarizeParts(placedItems, connections), [placedItems, connections]);
  const powerWarnings = useMemo(() => getPowerWarnings(placedItems, connections), [placedItems, connections]);
  const selectedPowerInfo = useMemo(() => (
    selectedItem ? getPowerInfoForItem(selectedItem.id, placedItems, connections) : null
  ), [selectedItem, placedItems, connections]);

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
    const scale = catalogItem.category === 'Monitor' ? 5 : 7;
    const width = Math.max(56, Math.round(catalogItem.dimensions.widthIn * scale));
    const height = Math.max(56, Math.round(catalogItem.dimensions.heightIn * scale));

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

    setPlacedItems((items) => [...items, newItem]);
    setSelectedId(newItem.id);
    setNotice(`${catalogItem.name} added to the setup.`);
  }

  function handleCanvasPointerDown(event) {
    if (!canvasRef.current) return;
    const pointer = getPointerPosition(event, canvasRef.current);

    if (tool === 'wall') {
      const snapped = { x: snap(pointer.x), y: snap(pointer.y) };
      if (!draftWall) {
        setDraftWall({ from: snapped, to: snapped });
        setNotice('Wall started. Click another grid point to finish the wall.');
      } else {
        const wall = { id: makeId('wall'), from: draftWall.from, to: snapped };
        setWalls((currentWalls) => [...currentWalls, wall]);
        setDraftWall(null);
        setNotice('Wall added.');
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

    if (dragging) {
      const canvasSize = getCanvasSize(canvasRef.current);
      const x = snap(pointer.x - dragging.offsetX);
      const y = snap(pointer.y - dragging.offsetY);
      setPlacedItems((items) => items.map((item) => (
        item.id === dragging.itemId
          ? { ...item, x: clamp(x, 0, canvasSize.width - item.width), y: clamp(y, 0, canvasSize.height - item.height) }
          : item
      )));
    }
  }

  function handleCanvasPointerUp() {
    setDragging(null);
  }

  function handleItemPointerDown(event, item) {
    event.stopPropagation();
    setSelectedId(item.id);

    if (tool === 'ethernet') {
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

    if (tool === 'tubing') {
      const catalogItem = findInventoryItem(item.sku);
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
    if (!selectedItem) return;
    setPlacedItems((items) => items.map((item) => (
      item.id === selectedItem.id
        ? { ...item, width: item.height, height: item.width, rotation: (item.rotation + 90) % 360 }
        : item
    )));
    setNotice(`${selectedItem.label} rotated.`);
  }

  function removeSelectedItem() {
    if (!selectedItem) return;
    setPlacedItems((items) => items.filter((item) => item.id !== selectedItem.id));
    setConnections((currentConnections) => currentConnections.filter((connection) => (
      connection.from.itemId !== selectedItem.id && connection.to.itemId !== selectedItem.id
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
    if (walls.length) {
      setWalls((currentWalls) => currentWalls.slice(0, -1));
      setNotice('Last wall removed.');
    }
  }

  function clearLayout() {
    setPlacedItems([]);
    setConnections([]);
    setWalls([]);
    setDraftWall(null);
    setSelectedId(null);
    setActiveStart(null);
    setNotice('Layout cleared.');
  }

  function saveDraft() {
    const draft = { placedItems, connections, walls, savedAt: new Date().toISOString() };
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
      setPlacedItems(draft.placedItems || []);
      setConnections(draft.connections || []);
      setWalls(draft.walls || []);
      setNotice('Draft loaded.');
    } catch {
      setNotice('Saved draft could not be loaded.');
    }
  }

  function exportJson() {
    const draft = { placedItems, connections, walls, partsList, powerWarnings, scale: DEFAULT_SCALE_LABEL };
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
      <main className="setup-builder-page">
        <section className="setup-header">
          <div>
            <p className="eyebrow">Setup Configurator MVP</p>
            <h1>Build monitor layouts on a grid.</h1>
            <p>
              Draw walls, place monitors, sensors, and Power Bus modules, connect ethernet and tubing,
              then review the generated parts list and power warnings.
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

            <div className="tool-group">
              <button className={`tool-button ${tool === 'select' ? 'active' : ''}`} onClick={() => { setTool('select'); setActiveStart(null); }}>Select / Move</button>
              <button className={`tool-button ${tool === 'wall' ? 'active' : ''}`} onClick={() => { setTool('wall'); setActiveStart(null); }}>Draw Walls</button>
              <button className={`tool-button ${tool === 'ethernet' ? 'active' : ''}`} onClick={() => { setTool('ethernet'); setActiveStart(null); }}>Ethernet</button>
              <button className={`tool-button ${tool === 'tubing' ? 'active' : ''}`} onClick={() => { setTool('tubing'); setActiveStart(null); }}>Tubing</button>
            </div>

            {tool === 'tubing' && (
              <div className="segmented-control" aria-label="Tubing port">
                <button className={tubingPort === 'room' ? 'active' : ''} onClick={() => setTubingPort('room')}>Room</button>
                <button className={tubingPort === 'ref' ? 'active' : ''} onClick={() => setTubingPort('ref')}>Ref</button>
              </div>
            )}

            <p className="panel-help">Drag products onto the canvas. Use ethernet/tubing tools by clicking a source, then a target.</p>

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
                    </g>
                  );
                })}
              </svg>

              {placedItems.map((item) => {
                const catalogItem = findInventoryItem(item.sku);
                const usedPorts = connectionCounts[item.id] || 0;
                const hasItemPowerWarning = powerWarnings.some((warning) => warning.id.includes(item.id));
                return (
                  <button
                    className={`placed-item ${selectedId === item.id ? 'selected' : ''} ${catalogItem?.category?.toLowerCase() || ''} ${catalogItem?.powerBus ? 'power-bus' : ''} ${hasItemPowerWarning ? 'power-warning' : ''}`}
                    key={item.id}
                    style={{ left: item.x, top: item.y, width: item.width, height: item.height }}
                    onPointerDown={(event) => handleItemPointerDown(event, item)}
                    title={catalogItem?.name}
                  >
                    {hasItemPowerWarning && <span className="power-badge" aria-label="Power warning">⚡</span>}
                    <strong>{item.label}</strong>
                    <span>{item.sku}</span>
                    <small>
                      {usedPorts}/{catalogItem?.ethernetPorts || 0} ETH
                      {Number(catalogItem?.powerDrawMa) > 0 ? ` · ${catalogItem.powerDrawMa}mA` : ''}
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
                  <div><dt>Ethernet</dt><dd>{connectionCounts[selectedItem.id] || 0}/{selectedCatalogItem.ethernetPorts} ports used</dd></div>
                  <div><dt>Power draw</dt><dd>{Number(selectedCatalogItem.powerDrawMa) > 0 ? `${selectedCatalogItem.powerDrawMa}mA` : selectedCatalogItem.powerSource ? 'Power source' : 'Not set'}</dd></div>
                  <div><dt>Bus status</dt><dd>{selectedPowerInfo ? (selectedPowerInfo.hasPowerBus ? `${selectedPowerInfo.loadMa}mA load · Power Bus present` : `${selectedPowerInfo.loadMa}mA / ${selectedPowerInfo.capacityMa || 0}mA`) : 'Not connected'}</dd></div>
                  <div><dt>Tubing</dt><dd>{selectedCatalogItem.pressureCapable ? 'Room / Ref capable' : 'Not tubing capable'}</dd></div>
                </dl>
                <p>{selectedCatalogItem.description}</p>
                <div className="selected-actions">
                  <button className="button secondary small" onClick={rotateSelectedItem}>Rotate</button>
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
                <li>Power Bus has 2 ethernet ports and provides dedicated power to its chain.</li>
                <li>Devices above {POWER_RECOMMENDATION_THRESHOLD_MA}mA show a power recommendation unless a Power Bus is present.</li>
                <li>PPM4, RPM, Power Bus, and all sensors have 2 ethernet ports.</li>
                <li>Tubing can only start from PPM4, RPM, or pressure sensors.</li>
              </ul>
            </div>
          </aside>
        </section>
      </main>
    </AppShell>
  );
}
