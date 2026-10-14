// -----------------------------------------------------------------------------
// One Gladys device per Sensibo pod.
//
// Identity: the pod id of the Sensibo cloud, stable for the life of the pod on
// the account. The room name typed in the Sensibo app is the device name.
//
// Features (category/type couples of the core table, see
// test/gladys-rules.test.js), each published only when the pod exposes it:
//   - power: air-conditioning/binary (switch/binary on a Pure), writable;
//   - mode, setpoint, fan speed, vertical and horizontal swing:
//     air-conditioning/*, writable, the couples the core gives its own air
//     conditioners (MELCloud, Matter). Bounds: the remote's capabilities;
//   - Climate React: switch/binary, writable, when it was set up in the app;
//   - measured temperature and humidity, CO2, TVOC, PM2.5: read only;
//   - filter life: hepa-filter-monitoring/filter-life-remaining, read only,
//     the share of the cleaning interval left (0 % = clean the filter).
//
// The devices are published with should_poll: false: the integration reads
// the cloud on its own timer (src/hub.js), at the interval of the configuration.
// -----------------------------------------------------------------------------

import {
  DEVICE_FEATURE_CATEGORIES as CATEGORIES,
  DEVICE_FEATURE_TYPES as TYPES,
  DEVICE_FEATURE_UNITS as UNITS,
} from '@gladysassistant/integration-sdk';
import { KINDS } from './sensibo/model.js';

export const DEVICE_TYPE = 'pod';

// Suffixes of the feature external ids: permanent once published.
export const FEATURE_KEYS = Object.freeze({
  POWER: 'power',
  MODE: 'mode',
  TARGET_TEMPERATURE: 'target_temperature',
  FAN_SPEED: 'fan_speed',
  SWING_VERTICAL: 'swing_vertical',
  SWING_HORIZONTAL: 'swing_horizontal',
  CLIMATE_REACT: 'climate_react',
  TEMPERATURE: 'temperature',
  HUMIDITY: 'humidity',
  CO2: 'co2',
  TVOC: 'tvoc',
  PM25: 'pm25',
  FILTER: 'filter',
});

// Feature names, in the language chosen in the configuration (Gladys does not
// tell a device integration the user's language). Frozen at creation in Gladys.
export const NAMES = {
  en: {
    [FEATURE_KEYS.POWER]: 'Power',
    [FEATURE_KEYS.MODE]: 'Mode',
    [FEATURE_KEYS.TARGET_TEMPERATURE]: 'Target temperature',
    [FEATURE_KEYS.FAN_SPEED]: 'Fan speed',
    [FEATURE_KEYS.SWING_VERTICAL]: 'Vertical swing',
    [FEATURE_KEYS.SWING_HORIZONTAL]: 'Horizontal swing',
    [FEATURE_KEYS.CLIMATE_REACT]: 'Climate React',
    [FEATURE_KEYS.TEMPERATURE]: 'Room temperature',
    [FEATURE_KEYS.HUMIDITY]: 'Humidity',
    [FEATURE_KEYS.CO2]: 'CO2',
    [FEATURE_KEYS.TVOC]: 'TVOC',
    [FEATURE_KEYS.PM25]: 'PM2.5',
    [FEATURE_KEYS.FILTER]: 'Filter life',
  },
  fr: {
    [FEATURE_KEYS.POWER]: 'Marche/arrêt',
    [FEATURE_KEYS.MODE]: 'Mode',
    [FEATURE_KEYS.TARGET_TEMPERATURE]: 'Température de consigne',
    [FEATURE_KEYS.FAN_SPEED]: 'Vitesse de ventilation',
    [FEATURE_KEYS.SWING_VERTICAL]: 'Balayage vertical',
    [FEATURE_KEYS.SWING_HORIZONTAL]: 'Balayage horizontal',
    [FEATURE_KEYS.CLIMATE_REACT]: 'Climate React',
    [FEATURE_KEYS.TEMPERATURE]: 'Température ambiante',
    [FEATURE_KEYS.HUMIDITY]: 'Humidité',
    [FEATURE_KEYS.CO2]: 'CO2',
    [FEATURE_KEYS.TVOC]: 'COV totaux',
    [FEATURE_KEYS.PM25]: 'PM2.5',
    [FEATURE_KEYS.FILTER]: 'Durée de vie du filtre',
  },
  de: {
    [FEATURE_KEYS.POWER]: 'Ein/Aus',
    [FEATURE_KEYS.MODE]: 'Modus',
    [FEATURE_KEYS.TARGET_TEMPERATURE]: 'Solltemperatur',
    [FEATURE_KEYS.FAN_SPEED]: 'Lüfterstufe',
    [FEATURE_KEYS.SWING_VERTICAL]: 'Vertikale Lamellen',
    [FEATURE_KEYS.SWING_HORIZONTAL]: 'Horizontale Lamellen',
    [FEATURE_KEYS.CLIMATE_REACT]: 'Climate React',
    [FEATURE_KEYS.TEMPERATURE]: 'Raumtemperatur',
    [FEATURE_KEYS.HUMIDITY]: 'Luftfeuchtigkeit',
    [FEATURE_KEYS.CO2]: 'CO2',
    [FEATURE_KEYS.TVOC]: 'TVOC',
    [FEATURE_KEYS.PM25]: 'PM2.5',
    [FEATURE_KEYS.FILTER]: 'Filterlebensdauer',
  },
  es: {
    [FEATURE_KEYS.POWER]: 'Encendido',
    [FEATURE_KEYS.MODE]: 'Modo',
    [FEATURE_KEYS.TARGET_TEMPERATURE]: 'Temperatura objetivo',
    [FEATURE_KEYS.FAN_SPEED]: 'Velocidad del ventilador',
    [FEATURE_KEYS.SWING_VERTICAL]: 'Oscilación vertical',
    [FEATURE_KEYS.SWING_HORIZONTAL]: 'Oscilación horizontal',
    [FEATURE_KEYS.CLIMATE_REACT]: 'Climate React',
    [FEATURE_KEYS.TEMPERATURE]: 'Temperatura ambiente',
    [FEATURE_KEYS.HUMIDITY]: 'Humedad',
    [FEATURE_KEYS.CO2]: 'CO2',
    [FEATURE_KEYS.TVOC]: 'COV totales',
    [FEATURE_KEYS.PM25]: 'PM2.5',
    [FEATURE_KEYS.FILTER]: 'Vida útil del filtro',
  },
};

const writable = (category, type, min, max) => ({
  category,
  type,
  read_only: false,
  has_feedback: true,
  keep_history: true,
  min,
  max,
});

const sensor = (category, type, unit, min, max) => ({
  category,
  type,
  unit,
  read_only: true,
  has_feedback: false,
  keep_history: true,
  min,
  max,
});

const bit = (value) => (value === null ? null : value ? 1 : 0);

const FEATURES = [
  {
    key: FEATURE_KEYS.POWER,
    applies: (pod) => pod.features.power,
    definition: (pod) =>
      pod.kind === KINDS.AC
        ? writable(CATEGORIES.AIR_CONDITIONING, TYPES.AIR_CONDITIONING.BINARY, 0, 1)
        : writable(CATEGORIES.SWITCH, TYPES.SWITCH.BINARY, 0, 1),
    value: (pod) => bit(pod.on),
  },
  {
    key: FEATURE_KEYS.MODE,
    applies: (pod) => pod.features.mode,
    definition: () => writable(CATEGORIES.AIR_CONDITIONING, TYPES.AIR_CONDITIONING.MODE, 0, 4),
    value: (pod) => pod.mode,
  },
  {
    key: FEATURE_KEYS.TARGET_TEMPERATURE,
    applies: (pod) => pod.features.targetTemperature,
    definition: (pod) => ({
      ...writable(
        CATEGORIES.AIR_CONDITIONING,
        TYPES.AIR_CONDITIONING.TARGET_TEMPERATURE,
        ...pod.features.setpointRange,
      ),
      unit: pod.unit === 'F' ? UNITS.FAHRENHEIT : UNITS.CELSIUS,
    }),
    value: (pod) => pod.targetTemperature,
  },
  {
    key: FEATURE_KEYS.FAN_SPEED,
    applies: (pod) => pod.features.fanSpeed,
    definition: () => writable(CATEGORIES.AIR_CONDITIONING, TYPES.AIR_CONDITIONING.FAN_SPEED, 0, 7),
    value: (pod) => pod.fanSpeed,
  },
  {
    key: FEATURE_KEYS.SWING_VERTICAL,
    applies: (pod) => pod.features.swingVertical,
    definition: () =>
      writable(CATEGORIES.AIR_CONDITIONING, TYPES.AIR_CONDITIONING.SWING_VERTICAL, 0, 6),
    value: (pod) => pod.swingVertical,
  },
  {
    key: FEATURE_KEYS.SWING_HORIZONTAL,
    applies: (pod) => pod.features.swingHorizontal,
    definition: () =>
      writable(CATEGORIES.AIR_CONDITIONING, TYPES.AIR_CONDITIONING.SWING_HORIZONTAL, 0, 6),
    value: (pod) => pod.swingHorizontal,
  },
  {
    key: FEATURE_KEYS.CLIMATE_REACT,
    applies: (pod) => pod.features.climateReact,
    definition: () => writable(CATEGORIES.SWITCH, TYPES.SWITCH.BINARY, 0, 1),
    value: (pod) => bit(pod.climateReact),
  },
  {
    key: FEATURE_KEYS.TEMPERATURE,
    applies: (pod) => pod.features.temperature,
    // The pods measure in Celsius, whatever the unit chosen for the setpoint.
    definition: () =>
      sensor(CATEGORIES.TEMPERATURE_SENSOR, TYPES.SENSOR.DECIMAL, UNITS.CELSIUS, -20, 60),
    value: (pod) => pod.temperature,
  },
  {
    key: FEATURE_KEYS.HUMIDITY,
    applies: (pod) => pod.features.humidity,
    definition: () =>
      sensor(CATEGORIES.HUMIDITY_SENSOR, TYPES.SENSOR.DECIMAL, UNITS.PERCENT, 0, 100),
    value: (pod) => pod.humidity,
  },
  {
    key: FEATURE_KEYS.CO2,
    applies: (pod) => pod.features.co2,
    definition: () => sensor(CATEGORIES.CO2_SENSOR, TYPES.SENSOR.DECIMAL, UNITS.PPM, 0, 10000),
    value: (pod) => pod.co2,
  },
  {
    key: FEATURE_KEYS.TVOC,
    applies: (pod) => pod.features.tvoc,
    definition: () => sensor(CATEGORIES.VOC_SENSOR, TYPES.SENSOR.DECIMAL, UNITS.PPB, 0, 10000),
    value: (pod) => pod.tvoc,
  },
  {
    key: FEATURE_KEYS.PM25,
    applies: (pod) => pod.features.pm25,
    definition: () =>
      sensor(
        CATEGORIES.PM25_SENSOR,
        TYPES.SENSOR.DECIMAL,
        UNITS.MICROGRAM_PER_CUBIC_METER,
        0,
        1000,
      ),
    value: (pod) => pod.pm25,
  },
  {
    key: FEATURE_KEYS.FILTER,
    applies: (pod) => pod.features.filter,
    definition: () =>
      sensor(
        CATEGORIES.HEPA_FILTER_MONITORING,
        TYPES.FILTER_MONITORING.FILTER_LIFE_REMAINING,
        UNITS.PERCENT,
        0,
        100,
      ),
    value: (pod) => pod.filterLife,
  },
];

/** External ids of a pod's device and features. */
export const deviceIds = (gladys, id) => gladys.externalIds(DEVICE_TYPE, id);

/** The pod id of a device external id, null when it is not one of ours. */
export function podIdOf(gladys, externalId) {
  const prefix = deviceIds(gladys, 'x').device.slice(0, -1);
  if (typeof externalId !== 'string' || !externalId.startsWith(prefix)) {
    return null;
  }
  const id = externalId.slice(prefix.length);
  return id && !id.includes(':') ? id : null;
}

/** The name shown for a pod: its room in the Sensibo app, else its model. */
export const podName = (pod) => pod.name ?? `Sensibo ${pod.model}`;

/**
 * The discovery payload of a pod.
 * @param {object} gladys SDK client
 * @param {object} pod parsed pod (src/sensibo/model.js parsePod)
 * @param {string} language feature names language
 */
export function buildDevice(gladys, pod, language = 'fr') {
  const ids = deviceIds(gladys, pod.id);
  const names = NAMES[language] ?? NAMES.fr;
  return {
    name: podName(pod),
    external_id: ids.device,
    should_poll: false,
    params: [{ name: 'MODEL', value: pod.model }],
    features: FEATURES.filter(({ applies }) => applies(pod)).map(({ key, definition }) => ({
      ...definition(pod),
      name: names[key],
      external_id: ids.feature(key),
    })),
  };
}

/**
 * The states of a pod's features (unknown values skipped).
 * @returns {Array<{ device_feature_external_id: string, state: number }>}
 */
export function podStates(gladys, pod) {
  const ids = deviceIds(gladys, pod.id);
  return FEATURES.filter(({ applies }) => applies(pod))
    .map(({ key, value }) => ({
      device_feature_external_id: ids.feature(key),
      state: value(pod),
    }))
    .filter(({ state }) => typeof state === 'number' && Number.isFinite(state));
}

/** The feature key of a feature external id of a pod. */
export function featureKeyOf(gladys, id, featureExternalId) {
  const ids = deviceIds(gladys, id);
  return Object.values(FEATURE_KEYS).find((key) => ids.feature(key) === featureExternalId) ?? null;
}
