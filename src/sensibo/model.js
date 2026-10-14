// -----------------------------------------------------------------------------
// What a Sensibo pod is for the integration, parsed from one entry of
// GET /users/me/pods?fields=* (real examples in test/fixtures/sensibo), and the
// AC states sent back by the commands.
//
// Three kinds of pods:
//   - ac: Sky, Air, Air Pro… an infrared remote of an air conditioner or of an
//     air-to-air heat pump. Its `remoteCapabilities` list, mode by mode, what
//     the remote can send: setpoints, fan levels, swing positions;
//   - purifier: Sensibo Pure (on/off only here);
//   - monitor: Sensibo Elements, an air quality monitor.
//
// Safety (choice of Guilhem): a command never leaves the capabilities of the
// remote. A mode the remote lacks is refused; a setpoint is clamped to the
// setpoints of the mode, then rounded to the nearest one; a fan level or a
// swing position the mode lacks is refused.
// -----------------------------------------------------------------------------

// Values of the Gladys core (server/utils/constants.js, 5.2.0), not exported
// by the SDK: AC_MODE, AC_FAN_SPEED, AC_SWING_VERTICAL, AC_SWING_HORIZONTAL.
const AC_MODE = { AUTO: 0, COOLING: 1, HEATING: 2, DRYING: 3, FAN: 4 };
const AC_FAN_SPEED = {
  AUTO: 0,
  LOW: 1,
  LOW_MID: 2,
  MID: 3,
  MID_HIGH: 4,
  HIGH: 5,
  QUIET: 6,
  TURBO: 7,
};
const AC_SWING = {
  OFF: 0,
  SWING: 1,
  POSITION_1: 2,
  POSITION_2: 3,
  POSITION_3: 4,
  POSITION_4: 5,
  POSITION_5: 6,
};
const AC_SWING_VERTICAL = AC_SWING;
const AC_SWING_HORIZONTAL = AC_SWING;

export const KINDS = Object.freeze({ AC: 'ac', PURIFIER: 'purifier', MONITOR: 'monitor' });

// Sensibo modes ↔ the AC_MODE values of the Gladys core.
export const MODE_VALUES = Object.freeze({
  auto: AC_MODE.AUTO,
  cool: AC_MODE.COOLING,
  heat: AC_MODE.HEATING,
  dry: AC_MODE.DRYING,
  fan: AC_MODE.FAN,
});
export const MODE_KEYS = Object.freeze(Object.keys(MODE_VALUES));

// Sensibo fan levels ↔ AC_FAN_SPEED.
export const FAN_VALUES = Object.freeze({
  auto: AC_FAN_SPEED.AUTO,
  low: AC_FAN_SPEED.LOW,
  medium_low: AC_FAN_SPEED.LOW_MID,
  medium: AC_FAN_SPEED.MID,
  medium_high: AC_FAN_SPEED.MID_HIGH,
  high: AC_FAN_SPEED.HIGH,
  quiet: AC_FAN_SPEED.QUIET,
  strong: AC_FAN_SPEED.TURBO,
});

// Vertical swing (`swing`) ↔ AC_SWING_VERTICAL. The partial ranges read as
// "swing"; writing "swing" sends the full range.
export const SWING_VALUES = Object.freeze({
  stopped: AC_SWING_VERTICAL.OFF,
  rangeFull: AC_SWING_VERTICAL.SWING,
  fixedTop: AC_SWING_VERTICAL.POSITION_1,
  fixedMiddleTop: AC_SWING_VERTICAL.POSITION_2,
  fixedMiddle: AC_SWING_VERTICAL.POSITION_3,
  fixedMiddleBottom: AC_SWING_VERTICAL.POSITION_4,
  fixedBottom: AC_SWING_VERTICAL.POSITION_5,
});
const SWING_READ_ONLY = { rangeTop: 1, rangeMiddle: 1, rangeBottom: 1, both: 1, horizontal: 0 };

// Horizontal swing (`horizontalSwing`) ↔ AC_SWING_HORIZONTAL. `fixedLeftRight`
// (both flaps outwards) has no Gladys value: it reads as nothing.
export const HORIZONTAL_SWING_VALUES = Object.freeze({
  stopped: AC_SWING_HORIZONTAL.OFF,
  rangeFull: AC_SWING_HORIZONTAL.SWING,
  fixedLeft: AC_SWING_HORIZONTAL.POSITION_1,
  fixedCenterLeft: AC_SWING_HORIZONTAL.POSITION_2,
  fixedCenter: AC_SWING_HORIZONTAL.POSITION_3,
  fixedCenterRight: AC_SWING_HORIZONTAL.POSITION_4,
  fixedRight: AC_SWING_HORIZONTAL.POSITION_5,
});
const HORIZONTAL_SWING_READ_ONLY = { rangeCenter: 1 };

// The AC state properties a command sends back (never `timestamp`).
const AC_PROPERTIES = [
  'on',
  'mode',
  'targetTemperature',
  'temperatureUnit',
  'fanLevel',
  'swing',
  'horizontalSwing',
  'light',
];

/** A command the pod cannot carry out; `reason` picks the message. */
export class UnsupportedCommand extends Error {
  constructor(reason) {
    super(`unsupported: ${reason}`);
    this.name = 'UnsupportedCommand';
    this.reason = reason; // 'kind' | 'mode' | 'fan' | 'swing' | 'temperature'
  }
}

const finite = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : null);
const lookup = (table, key) =>
  typeof key === 'string' && Object.hasOwn(table, key) ? table[key] : null;
const keyOf = (table, value) => Object.keys(table).find((key) => table[key] === value) ?? null;

export function kindOf(pod) {
  const model = String(pod.productModel ?? '').toLowerCase();
  if (model.startsWith('pure')) {
    return KINDS.PURIFIER;
  }
  if (model.startsWith('elements')) {
    return KINDS.MONITOR;
  }
  return KINDS.AC;
}

/** Celsius or Fahrenheit, as the pod is set in the Sensibo app. */
const unitOf = (pod) => ((pod.temperatureUnit ?? pod.acState?.temperatureUnit) === 'F' ? 'F' : 'C');

/**
 * What the remote can do, mode by mode.
 * @returns {{ modes: Record<string, { temperatures: number[], fanLevels: string[], swing: string[], horizontalSwing: string[], light: string[] }> }}
 */
function parseCapabilities(pod, unit) {
  const modes = {};
  for (const [mode, caps] of Object.entries(pod.remoteCapabilities?.modes ?? {})) {
    if (!Object.hasOwn(MODE_VALUES, mode) || !caps || typeof caps !== 'object') {
      continue;
    }
    const list = (value) =>
      Array.isArray(value) ? value.filter((v) => typeof v === 'string') : [];
    modes[mode] = {
      temperatures: (caps.temperatures?.[unit]?.values ?? [])
        .filter((v) => finite(v) !== null)
        .sort((a, b) => a - b),
      fanLevels: list(caps.fanLevels),
      swing: list(caps.swing),
      horizontalSwing: list(caps.horizontalSwing),
      light: list(caps.light),
    };
  }
  return { modes };
}

/** What the features of a pod are made of (decided from what the API exposes). */
function parseFeatures(kind, capabilities, measurements, smartMode, filters) {
  const modes = Object.values(capabilities.modes);
  const measured = (key) => finite(measurements?.[key]) !== null;
  const temperatures = modes.flatMap((mode) => mode.temperatures);
  const ac = kind === KINDS.AC && modes.length > 0;
  return {
    power: kind !== KINDS.MONITOR,
    mode: ac,
    targetTemperature: ac && temperatures.length > 0,
    fanSpeed: ac && modes.some((mode) => mode.fanLevels.some((l) => Object.hasOwn(FAN_VALUES, l))),
    swingVertical: ac && modes.some((mode) => mode.swing.length > 0),
    swingHorizontal: ac && modes.some((mode) => mode.horizontalSwing.length > 0),
    climateReact: kind === KINDS.AC && Boolean(smartMode && typeof smartMode === 'object'),
    temperature: measured('temperature'),
    humidity: measured('humidity'),
    co2: measured('co2'),
    tvoc: measured('tvoc'),
    pm25: kind !== KINDS.PURIFIER && measured('pm25'),
    filter: kind !== KINDS.MONITOR && finite(filters?.filtersCleanSecondsThreshold) > 0,
    setpointRange:
      temperatures.length > 0 ? [Math.min(...temperatures), Math.max(...temperatures)] : null,
  };
}

/** Filter life left, in percent of the cleaning interval set in the Sensibo app. */
function filterLife(filters) {
  const threshold = finite(filters?.filtersCleanSecondsThreshold);
  const used = finite(filters?.acOnSecondsSinceLastFiltersClean);
  if (!threshold || threshold <= 0 || used === null) {
    return null;
  }
  return Math.max(0, Math.min(100, Math.round(100 * (1 - used / threshold))));
}

/**
 * The integration's view of one pod.
 * @param {object} pod an entry of GET /users/me/pods?fields=*
 */
export function parsePod(pod) {
  const kind = kindOf(pod);
  const unit = unitOf(pod);
  const capabilities = parseCapabilities(pod, unit);
  const acState = pod.acState && typeof pod.acState === 'object' ? pod.acState : {};
  // The Sky Plus can take its measurements from a room sensor.
  const measurements = pod.mainMeasurementsSensor?.measurements ?? pod.measurements ?? {};
  const airQuality = pod.measurements ?? {};
  const filters = pod.filtersCleaning ?? {};
  const smartMode = pod.smartMode;
  const swingValue = (value) => lookup(SWING_VALUES, value) ?? lookup(SWING_READ_ONLY, value);
  const horizontalValue = (value) =>
    lookup(HORIZONTAL_SWING_VALUES, value) ?? lookup(HORIZONTAL_SWING_READ_ONLY, value);
  return {
    id: pod.id,
    name: typeof pod.room?.name === 'string' && pod.room.name.trim() ? pod.room.name.trim() : null,
    model: typeof pod.productModel === 'string' ? pod.productModel : 'unknown',
    kind,
    unit,
    online: pod.connectionStatus?.isAlive !== false,
    capabilities,
    features: parseFeatures(
      kind,
      capabilities,
      { ...airQuality, ...measurements },
      smartMode,
      filters,
    ),
    acState: Object.fromEntries(
      AC_PROPERTIES.filter((key) => acState[key] !== undefined).map((key) => [key, acState[key]]),
    ),
    on: typeof acState.on === 'boolean' ? acState.on : null,
    mode: lookup(MODE_VALUES, acState.mode),
    targetTemperature: finite(acState.targetTemperature),
    fanSpeed: lookup(FAN_VALUES, acState.fanLevel),
    swingVertical: swingValue(acState.swing),
    swingHorizontal: horizontalValue(acState.horizontalSwing),
    climateReact: smartMode && typeof smartMode === 'object' ? smartMode.enabled === true : null,
    temperature: finite(measurements.temperature),
    humidity: finite(measurements.humidity),
    co2: finite(airQuality.co2),
    tvoc: finite(airQuality.tvoc),
    pm25: finite(airQuality.pm25),
    filterLife: filterLife(filters),
    filterDirty: filters.shouldCleanFilters === true,
  };
}

/** The setpoints of a mode, snapped: clamped to the list, then the nearest value. */
export function snapSetpoint(values, wanted) {
  if (values.length === 0) {
    return null;
  }
  return values.reduce((best, value) =>
    Math.abs(value - wanted) < Math.abs(best - wanted) ? value : best,
  );
}

/**
 * The complete AC state to send so that `change` applies, kept inside the
 * capabilities of the remote. Properties the new mode does not know are
 * dropped; a setpoint or a fan level it does not offer is replaced by the
 * nearest one (setpoint) or the first one (fan level), so that changing mode
 * never sends a state the remote cannot send.
 * @param {object} pod parsePod()
 * @param {{ on?: boolean, mode?: string, targetTemperature?: number, fanLevel?: string, swing?: string, horizontalSwing?: string }} change
 */
export function buildAcState(pod, change) {
  if (pod.kind === KINDS.MONITOR) {
    throw new UnsupportedCommand('kind');
  }
  const current = pod.acState;
  const mode = change.mode ?? current.mode;
  const caps = pod.capabilities.modes[mode];
  if (change.mode !== undefined && !caps) {
    throw new UnsupportedCommand('mode');
  }
  const next = { ...current, ...('on' in change ? { on: change.on } : {}) };
  if (!caps) {
    // A pod whose remote lists nothing (Pure, unknown remote): power only.
    if (Object.keys(change).some((key) => key !== 'on')) {
      throw new UnsupportedCommand(pod.kind === KINDS.AC ? 'mode' : 'kind');
    }
    return next;
  }
  next.mode = mode;

  if (caps.temperatures.length > 0) {
    const wanted = change.targetTemperature ?? finite(current.targetTemperature);
    next.targetTemperature = snapSetpoint(caps.temperatures, wanted ?? caps.temperatures[0]);
    next.temperatureUnit = pod.unit;
  } else {
    if (change.targetTemperature !== undefined && change.mode === undefined) {
      throw new UnsupportedCommand('temperature');
    }
    delete next.targetTemperature;
    delete next.temperatureUnit;
  }

  const pickFrom = (list, key, reason) => {
    if (list.length === 0) {
      if (change[key] !== undefined) {
        throw new UnsupportedCommand(reason);
      }
      delete next[key];
      return;
    }
    if (change[key] !== undefined) {
      if (!list.includes(change[key])) {
        throw new UnsupportedCommand(reason);
      }
      next[key] = change[key];
    } else if (!list.includes(current[key])) {
      next[key] = list[0];
    }
  };
  pickFrom(caps.fanLevels, 'fanLevel', 'fan');
  pickFrom(caps.swing, 'swing', 'swing');
  pickFrom(caps.horizontalSwing, 'horizontalSwing', 'swing');
  pickFrom(caps.light, 'light', 'swing'); // never changed by Gladys: kept, or dropped
  return next;
}

/** The pod after a command, as the API answered (or as sent). */
export function applyAcState(pod, acState) {
  const raw = {
    id: pod.id,
    productModel: pod.model,
    temperatureUnit: pod.unit,
    connectionStatus: { isAlive: pod.online },
    room: pod.name ? { name: pod.name } : undefined,
    acState,
  };
  const parsed = parsePod(raw);
  return {
    ...pod,
    acState: parsed.acState,
    on: parsed.on,
    mode: parsed.mode,
    targetTemperature: parsed.targetTemperature,
    fanSpeed: parsed.fanSpeed,
    swingVertical: parsed.swingVertical,
    swingHorizontal: parsed.swingHorizontal,
  };
}

/** Sensibo names of Gladys values (commands from device features). */
export const modeKeyOf = (value) => keyOf(MODE_VALUES, value);
export const fanKeyOf = (value) => keyOf(FAN_VALUES, value);
export const swingKeyOf = (value) => keyOf(SWING_VALUES, value);
export const horizontalSwingKeyOf = (value) => keyOf(HORIZONTAL_SWING_VALUES, value);
