import { useMemo, useState } from 'react';
import AppShell from '../components/AppShell.jsx';
import {
  inventoryItems,
  MONITOR_EXPANSION_BUS_CAPACITY_MA,
  POWER_RECOMMENDATION_THRESHOLD_MA,
} from '../data/setupInventory.js';

const products = inventoryItems.filter((item) => !item.createsProbe && !item.isProbe);
const baseUnits = products.filter((item) => item.sku === 'PPM4' || item.sku === 'AT-RPM-RTS');
const sensorLike = products.filter((item) => item.powerDrawMa > 0);
const supportPowerItems = products.filter((item) => item.powerBus || item.powerAccessory);
const step = (value, delta) => Math.max(0, value + delta);

export default function SystemBuilderPage({ user, onLogout }) {
  const [counts, setCounts] = useState({
    PPM4: 0,
    'AT-RPM-RTS': 1,
    'PMA-TRHM': 0,
    'PMA-RPSM': 0,
    'PMA-AVM': 0,
    'PMA-PSM': 0,
    'PMA-CM': 0,
    'PMA-PB': 0,
    PPM4CHRGR: 0,
  });

  const [localPowerAssignments, setLocalPowerAssignments] = useState({
    'PMA-AVM': 0,
    'PMA-PSM': 0,
    'PMA-CM': 0,
    'PMA-RPSM': 0,
    'PMA-TRHM': 0,
  });

  function updateCount(sku, delta) {
    setCounts((current) => {
      const next = { ...current, [sku]: step(current[sku] || 0, delta) };
      const maxChargers = next.PPM4CHRGR || 0;
      const assigned = Object.values(localPowerAssignments).reduce((sum, value) => sum + value, 0);
      if (assigned > maxChargers) {
        // handled visually, user can adjust assignments after reducing chargers
      }
      return next;
    });
  }

  function updateAssignment(sku, delta) {
    const availableCount = counts[sku] || 0;
    const usedElsewhere = Object.entries(localPowerAssignments)
      .filter(([key]) => key !== sku)
      .reduce((sum, [, value]) => sum + value, 0);
    const maxByChargers = Math.max(0, (counts.PPM4CHRGR || 0) - usedElsewhere);

    setLocalPowerAssignments((current) => {
      const nextValue = Math.max(0, Math.min(availableCount, maxByChargers, (current[sku] || 0) + delta));
      return { ...current, [sku]: nextValue };
    });
  }

  const analysis = useMemo(() => {
    const sourceCount = (counts.PPM4 || 0) + (counts['AT-RPM-RTS'] || 0);
    const availableBusCapacity = sourceCount * MONITOR_EXPANSION_BUS_CAPACITY_MA;
    const powerBusCount = counts['PMA-PB'] || 0;
    const chargerCount = counts.PPM4CHRGR || 0;
    const assignedChargers = Object.values(localPowerAssignments).reduce((sum, value) => sum + value, 0);
    const unassignedChargers = Math.max(0, chargerCount - assignedChargers);

    const rows = sensorLike.map((item) => {
      const qty = counts[item.sku] || 0;
      const localPowerQty = Math.min(qty, localPowerAssignments[item.sku] || 0);
      const busQty = qty - localPowerQty;
      const totalDraw = qty * item.powerDrawMa;
      const busDraw = busQty * item.powerDrawMa;
      return {
        ...item,
        qty,
        localPowerQty,
        busQty,
        totalDraw,
        busDraw,
      };
    }).filter((row) => row.qty > 0);

    const totalBusDraw = rows.reduce((sum, row) => sum + row.busDraw, 0);
    const totalSystemDraw = rows.reduce((sum, row) => sum + row.totalDraw, 0);
    const usesPowerBus = powerBusCount > 0;
    const status = !sourceCount && rows.length
      ? 'missing-source'
      : usesPowerBus
        ? 'power-bus'
        : totalBusDraw > availableBusCapacity
          ? 'overload'
          : 'ok';

    const warnings = [];

    if (!sourceCount && rows.length) {
      warnings.push({
        tone: 'danger',
        title: 'Add a monitor first',
        body: 'Select at least one PPM4 or RPM so the sensors have an expansion bus to connect to.',
      });
    }

    if (!usesPowerBus && sourceCount && totalBusDraw > availableBusCapacity) {
      warnings.push({
        tone: 'danger',
        title: 'Expansion bus limit exceeded',
        body: `Current bus load is ${totalBusDraw}mA and available monitor capacity is ${availableBusCapacity}mA. Add a Power Bus or attach local chargers to high-draw modules.`,
      });
    }

    if (usesPowerBus) {
      warnings.push({
        tone: 'info',
        title: 'Power Bus present',
        body: 'A Power Bus is included in this system. Use it to power the high-draw branch of the chain and confirm final placement in the field.',
      });
    }

    rows.forEach((row) => {
      if (row.powerDrawMa > POWER_RECOMMENDATION_THRESHOLD_MA && row.localPowerQty < row.qty && !usesPowerBus) {
        warnings.push({
          tone: 'warning',
          title: `${row.shortName} should have dedicated power`,
          body: `${row.name} draws ${row.powerDrawMa}mA. Anything above ${POWER_RECOMMENDATION_THRESHOLD_MA}mA should have a local charger or be placed on a Power Bus.`,
        });
      }
    });

    if (assignedChargers > chargerCount) {
      warnings.push({
        tone: 'danger',
        title: 'Too many charger assignments',
        body: `You assigned ${assignedChargers} local power connections but only selected ${chargerCount} PPM4 chargers.`,
      });
    }

    const partsList = products
      .map((item) => ({ ...item, qty: counts[item.sku] || 0 }))
      .filter((item) => item.qty > 0)
      .map((item) => ({ sku: item.sku, name: item.name, qty: item.qty }));

    return {
      sourceCount,
      availableBusCapacity,
      powerBusCount,
      chargerCount,
      assignedChargers,
      unassignedChargers,
      rows,
      totalBusDraw,
      totalSystemDraw,
      usesPowerBus,
      status,
      warnings,
      partsList,
    };
  }, [counts, localPowerAssignments]);

  return (
    <AppShell user={user} onLogout={onLogout}>
      <main className="page-wrap system-builder-page">
        <section className="hero-card mobile-hero">
          <div>
            <p className="eyebrow">Mobile builder</p>
            <h1>Build a system without the CAD screen.</h1>
            <p>
              Pick a monitor, add sensors, and MonSuite will calculate expansion-bus load,
              recommend dedicated power, and generate a quick parts list.
            </p>
          </div>
          <div className={`hero-panel status-${analysis.status}`}>
            <span>Bus load</span>
            <strong>{analysis.totalBusDraw}mA / {analysis.usesPowerBus ? 'Power Bus' : `${analysis.availableBusCapacity}mA`}</strong>
            <small>
              {analysis.usesPowerBus
                ? 'Power Bus present'
                : `${analysis.sourceCount} monitor source${analysis.sourceCount === 1 ? '' : 's'}`}
            </small>
          </div>
        </section>

        <section className="system-builder-layout">
          <section className="system-panel inventory-stack">
            <div className="panel-heading">
              <span>1. Base monitor</span>
              <strong>Required</strong>
            </div>
            <div className="quantity-list">
              {baseUnits.map((item) => (
                <div className="quantity-row" key={item.sku}>
                  <div>
                    <strong>{item.name}</strong>
                    <small>{item.sku} · {MONITOR_EXPANSION_BUS_CAPACITY_MA}mA expansion bus</small>
                  </div>
                  <div className="stepper">
                    <button onClick={() => updateCount(item.sku, -1)}>-</button>
                    <span>{counts[item.sku] || 0}</span>
                    <button onClick={() => updateCount(item.sku, 1)}>+</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="panel-heading top-gap">
              <span>2. Sensors & modules</span>
              <strong>Add quantities</strong>
            </div>
            <div className="quantity-list">
              {sensorLike.map((item) => (
                <div className="quantity-row stacked" key={item.sku}>
                  <div>
                    <strong>{item.name}</strong>
                    <small>{item.sku} · {item.powerDrawMa}mA</small>
                  </div>
                  <div className="quantity-row-actions">
                    <div className="stepper">
                      <button onClick={() => updateCount(item.sku, -1)}>-</button>
                      <span>{counts[item.sku] || 0}</span>
                      <button onClick={() => updateCount(item.sku, 1)}>+</button>
                    </div>
                    <div className="assignment">
                      <label>Local power</label>
                      <div className="stepper compact">
                        <button onClick={() => updateAssignment(item.sku, -1)}>-</button>
                        <span>{localPowerAssignments[item.sku] || 0}</span>
                        <button onClick={() => updateAssignment(item.sku, 1)}>+</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="panel-heading top-gap">
              <span>3. Power helpers</span>
              <strong>Optional</strong>
            </div>
            <div className="quantity-list">
              {supportPowerItems.map((item) => (
                <div className="quantity-row" key={item.sku}>
                  <div>
                    <strong>{item.name}</strong>
                    <small>{item.sku} · {item.powerAccessory ? '1 charger = 1 device' : 'powers heavy branch'}</small>
                  </div>
                  <div className="stepper">
                    <button onClick={() => updateCount(item.sku, -1)}>-</button>
                    <span>{counts[item.sku] || 0}</span>
                    <button onClick={() => updateCount(item.sku, 1)}>+</button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="system-panel analysis-stack">
            <div className="panel-heading">
              <span>Power summary</span>
              <strong>{analysis.status === 'ok' ? 'Ready' : analysis.status === 'power-bus' ? 'Review' : 'Action needed'}</strong>
            </div>

            <div className="summary-grid">
              <div className="summary-card">
                <span>Total sensor draw</span>
                <strong>{analysis.totalSystemDraw}mA</strong>
              </div>
              <div className="summary-card">
                <span>Bus draw</span>
                <strong>{analysis.totalBusDraw}mA</strong>
              </div>
              <div className="summary-card">
                <span>Monitor bus capacity</span>
                <strong>{analysis.availableBusCapacity}mA</strong>
              </div>
              <div className="summary-card">
                <span>Chargers assigned</span>
                <strong>{analysis.assignedChargers}/{analysis.chargerCount}</strong>
              </div>
            </div>

            <div className="warning-stack">
              {analysis.warnings.length ? analysis.warnings.map((warning, index) => (
                <div className={`status-callout ${warning.tone}`} key={`${warning.title}-${index}`}>
                  <strong>{warning.title}</strong>
                  <p>{warning.body}</p>
                </div>
              )) : (
                <div className="status-callout success">
                  <strong>Looks good</strong>
                  <p>This quick inventory selection is within the available monitor bus capacity.</p>
                </div>
              )}
            </div>

            {analysis.rows.length > 0 && (
              <div className="breakdown-table">
                <div className="table-head">
                  <span>Module</span>
                  <span>Qty</span>
                  <span>Bus draw</span>
                </div>
                {analysis.rows.map((row) => (
                  <div className="table-row" key={row.sku}>
                    <span>{row.shortName}</span>
                    <span>{row.qty}</span>
                    <span>{row.busDraw}mA {row.localPowerQty ? <em>({row.localPowerQty} local)</em> : ''}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="parts-list-card compact-list">
              <div className="panel-heading compact">
                <span>Quick parts list</span>
                <strong>{analysis.partsList.length} lines</strong>
              </div>
              {analysis.partsList.length ? (
                <div className="parts-list">
                  {analysis.partsList.map((part) => (
                    <div className="part-row" key={part.sku}>
                      <strong>{part.qty}×</strong>
                      <div>
                        <span>{part.name}</span>
                        <small>{part.sku}</small>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="panel-help">Choose a monitor and some modules to generate the list.</p>
              )}
            </div>
          </section>
        </section>
      </main>
    </AppShell>
  );
}
