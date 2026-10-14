// -----------------------------------------------------------------------------
// The Sensibo hub: the pods of the account, read from the Sensibo cloud on a
// timer of the container (the interval of the configuration), their states
// published to Gladys when they change, their scene events fired on
// transitions, and the commands of the devices, the widget and the scene
// actions.
//
// Gladys never polls these devices (should_poll: false): the interval goes
// beyond the one-minute list of the core scheduler, and the scene events must
// fire even for a pod whose device was not added. A reading is one request
// (GET /users/me/pods); a command is one request, and its answer gives the
// new state: no extra reading to confirm it.
// -----------------------------------------------------------------------------

import { DEVICE_TRANSPORTS, createLogger } from '@gladysassistant/integration-sdk';
import {
  buildDevice,
  deviceIds,
  featureKeyOf,
  FEATURE_KEYS,
  podIdOf,
  podName,
  podStates,
} from './devices.js';
import { ERROR_KINDS, SensiboClient } from './sensibo/client.js';
import {
  KINDS,
  MODE_VALUES,
  UnsupportedCommand,
  applyAcState,
  buildAcState,
  fanKeyOf,
  horizontalSwingKeyOf,
  modeKeyOf,
  parsePod,
  swingKeyOf,
} from './sensibo/model.js';
import { ACTION_TEXT, CONNECTION_TEXT, ERROR_TEXT, REPORT_TEXT, labelled, pick } from './texts.js';

const logger = createLogger({ name: 'sensibo-hub' });

export const WIDGET_KEY = 'air_conditioners';

// Scene trigger keys (manifest `scene_triggers`): permanent once published.
export const TRIGGERS = Object.freeze({
  OFFLINE: 'pod_offline',
  ONLINE: 'pod_online',
  FILTER: 'filter_clean_needed',
});

export const HUB_TIMINGS = {
  // After a "too many requests", wait this long before the next reading.
  rateLimitBackoffMs: 10 * 60_000,
  // Re-send unchanged values this often (Gladys flags values older than 48 h).
  heartbeatMs: 12 * 60 * 60_000,
};

const STICKY_FEATURES = [
  'power',
  'mode',
  'targetTemperature',
  'fanSpeed',
  'swingVertical',
  'swingHorizontal',
  'climateReact',
  'temperature',
  'humidity',
  'co2',
  'tvoc',
  'pm25',
  'filter',
];

/**
 * Once published, a feature stays: a measurement missing from one reading
 * must not change the structure of the device ("Update" in Discovery).
 */
function keepFeatures(previous, next) {
  if (!previous) {
    return next;
  }
  const features = { ...next.features };
  for (const key of STICKY_FEATURES) {
    features[key] = Boolean(previous.features[key] || next.features[key]);
  }
  features.setpointRange = next.features.setpointRange ?? previous.features.setpointRange;
  if (features.targetTemperature && !features.setpointRange) {
    features.targetTemperature = false;
  }
  return { ...next, features };
}

export class SensiboHub {
  /**
   * @param {object} options
   * @param {object} options.gladys GladysIntegration (or the SDK's fake Gladys)
   * @param {Function} [options.request] HTTP seam (src/sensibo/http.js)
   * @param {boolean} [options.timers] periodic timers (off in tests)
   * @param {object} [options.timings] HUB_TIMINGS overrides
   */
  constructor({ gladys, request, timers = true, timings }) {
    this.gladys = gladys;
    this.request = request;
    this.timersEnabled = timers;
    this.timings = { ...HUB_TIMINGS, ...timings };
    this.config = null;
    this.client = null;
    this.apiKey = null;
    /** @type {Map<string, object>} pods by id (parsePod) */
    this.pods = new Map();
    /** Cloud state: read once at least, and the last error (or none). */
    this.cloud = { read: false, error: null };
    this.devicesKey = null;
    this.transports = new Map();
    this.connection = null;
    this.polling = null;
    this.pollTimer = null;
    this.stopped = false;
    /** Problems already logged, by key: repeats go to debug. */
    this.warned = new Set();
  }

  // --- Logs ------------------------------------------------------------------
  // Info keeps the lifecycle only (cloud connected, lost, back, pods going
  // offline, user commands). A problem that repeats every cycle is logged once,
  // then at debug until it clears. LOG_LEVEL=debug shows everything.

  problem(key, message, level = 'warn') {
    if (this.warned.has(key)) {
      logger.debug(message);
      return;
    }
    this.warned.add(key);
    logger[level](message);
  }

  resolved(key) {
    this.warned.delete(key);
  }

  // --- Lifecycle -------------------------------------------------------------

  async start(config) {
    await this.reconfigure(config);
  }

  /** Gladys reconnected (it restarted): send everything again. */
  async resync(config) {
    this.devicesKey = null;
    this.transports.clear();
    this.connection = null;
    this.gladys.forgetPublishedStates();
    await this.reconfigure(config);
  }

  async reconfigure(config) {
    const changedKey = config.apiKey !== this.apiKey;
    const changedLanguage = this.config && this.config.language !== config.language;
    this.config = config;
    if (changedKey) {
      this.apiKey = config.apiKey;
      this.client = config.apiKey
        ? new SensiboClient({ apiKey: config.apiKey, request: this.request })
        : null;
      this.pods.clear();
      this.cloud = { read: false, error: null };
      this.devicesKey = null;
      this.warned.clear();
      // The previous account's pods leave the Discovery tab at once.
      await this.publishDevices();
    } else if (changedLanguage) {
      this.gladys.requestWidgetRefresh(WIDGET_KEY);
    }
    if (!this.client) {
      clearTimeout(this.pollTimer);
      await this.publishDevices();
      await this.publishConnectionStatus();
      return;
    }
    await this.pollNow();
  }

  async stop() {
    this.stopped = true;
    clearTimeout(this.pollTimer);
    await this.polling?.catch(() => {});
  }

  /** Read now, then schedule the next reading. */
  async pollNow() {
    try {
      await this.poll();
    } finally {
      // Even after an unexpected error: one bad reading never stops the timer.
      this.schedulePoll();
    }
  }

  schedulePoll() {
    clearTimeout(this.pollTimer);
    if (!this.timersEnabled || this.stopped || !this.client) {
      return;
    }
    const kind = this.cloud.error?.kind;
    if (kind === ERROR_KINDS.AUTH) {
      // A refused key stays refused: wait for a new configuration (or
      // "Test the connection").
      return;
    }
    const delay =
      kind === ERROR_KINDS.RATE_LIMITED
        ? Math.max(this.timings.rateLimitBackoffMs, this.config.pollIntervalMs)
        : this.config.pollIntervalMs;
    this.pollTimer = setTimeout(() => {
      this.pollNow().catch((err) =>
        this.problem('poll', `Reading failed: ${err.message}`, 'error'),
      );
    }, delay);
  }

  // --- Reading the cloud -----------------------------------------------------

  /** Read every pod. Concurrent calls share the reading. */
  poll() {
    // A reading started with a previous key is not shared: start a new one.
    if (!this.polling || this.polling.client !== this.client) {
      const polling = this.read().finally(() => {
        if (this.polling === polling) {
          this.polling = null;
        }
      });
      polling.client = this.client;
      this.polling = polling;
    }
    return this.polling;
  }

  async read() {
    const client = this.client;
    if (!client) {
      return;
    }
    let pods;
    try {
      pods = await client.getPods();
    } catch (err) {
      if (!err.kind) {
        throw err;
      }
      if (client === this.client && !this.stopped) {
        await this.applyCloudFailure(err);
      }
      return;
    }
    if (client !== this.client || this.stopped) {
      return; // the key changed while reading
    }
    await this.applyReadings(pods.map(parsePod));
  }

  async applyCloudFailure(err) {
    const previous = this.cloud.error?.kind;
    this.cloud = { read: this.cloud.read, error: { kind: err.kind, message: err.message } };
    if (previous !== err.kind) {
      logger.warn(`Sensibo cloud: ${err.message}`);
    } else {
      logger.debug(`Sensibo cloud: ${err.message} (again)`);
    }
    await this.publishConnectionStatus();
    if (previous !== err.kind) {
      this.gladys.requestWidgetRefresh(WIDGET_KEY);
    }
  }

  async applyReadings(readings) {
    const wasError = this.cloud.error;
    const firstReading = !this.cloud.read;
    this.cloud = { read: true, error: null };
    if (wasError) {
      logger.info('Sensibo cloud: connection restored');
    } else if (firstReading) {
      logger.info(`Connected to Sensibo: ${readings.length} device(s)`);
    }
    let widgetChanged = Boolean(wasError) || firstReading;
    const seen = new Set();
    for (const reading of readings) {
      seen.add(reading.id);
      const previous = this.pods.get(reading.id);
      const next = keepFeatures(previous, reading);
      // Not `||=`: the transitions (scene events) must run for every pod.
      const changed = await this.transitions(previous, next);
      widgetChanged = widgetChanged || changed;
      this.pods.set(next.id, next);
    }
    for (const id of [...this.pods.keys()]) {
      if (!seen.has(id)) {
        this.pods.delete(id); // removed from the account
        widgetChanged = true;
      }
    }
    await this.publishDevices();
    for (const pod of this.pods.values()) {
      // An offline pod's last values are not re-sent: the heartbeat would keep
      // them looking fresh. Its badge says Unreachable.
      if (pod.online) {
        await this.publishStates(pod);
      }
    }
    await this.publishTransports();
    await this.publishConnectionStatus();
    if (widgetChanged) {
      this.gladys.requestWidgetRefresh(WIDGET_KEY);
    }
  }

  /** Scene events of a pod between two readings; resolves whether the widget changed. */
  async transitions(previous, next) {
    if (!previous) {
      return true;
    }
    let changed = false;
    if (previous.online && !next.online) {
      logger.info(`${podName(next)} is offline`);
      await this.fire(TRIGGERS.OFFLINE, next);
      changed = true;
    } else if (!previous.online && next.online) {
      logger.info(`${podName(next)} is back online`);
      await this.fire(TRIGGERS.ONLINE, next);
      changed = true;
    }
    if (!previous.filterDirty && next.filterDirty) {
      logger.info(`${podName(next)}: the filter needs cleaning`);
      await this.fire(TRIGGERS.FILTER, next);
    }
    return (
      changed ||
      previous.name !== next.name ||
      previous.on !== next.on ||
      previous.mode !== next.mode ||
      previous.targetTemperature !== next.targetTemperature ||
      previous.temperature !== next.temperature
    );
  }

  async fire(key, pod) {
    try {
      await this.gladys.publishSceneEvent(key, {
        device: deviceIds(this.gladys, pod.id).device,
        name: podName(pod),
      });
      this.resolved('scene-event');
    } catch (err) {
      this.problem('scene-event', `Scene event ${key} refused: ${err.message}`);
    }
  }

  // --- Publishing to Gladys --------------------------------------------------

  async publishDevices() {
    const devices = [...this.pods.values()].map((pod) =>
      buildDevice(this.gladys, pod, this.config.language),
    );
    const key = JSON.stringify(devices);
    if (key === this.devicesKey) {
      return;
    }
    try {
      // Even an empty list: the Discovery tab then shows no stale pod.
      await this.gladys.publishDiscoveredDevices(devices);
      this.devicesKey = key;
      this.resolved('devices');
    } catch (err) {
      this.problem('devices', `Discovered devices refused: ${err.message}`);
    }
  }

  async publishStates(pod) {
    const states = podStates(this.gladys, pod);
    if (states.length === 0) {
      return;
    }
    try {
      await this.gladys.publishChangedStates(states, { heartbeat: this.timings.heartbeatMs });
      this.resolved('states');
    } catch (err) {
      this.problem('states', `States of ${podName(pod)} refused: ${err.message}`);
    }
  }

  async publishTransports() {
    const entries = [];
    for (const pod of this.pods.values()) {
      const externalId = deviceIds(this.gladys, pod.id).device;
      const transport = pod.online ? DEVICE_TRANSPORTS.CLOUD : DEVICE_TRANSPORTS.UNREACHABLE;
      if (this.transports.get(externalId) !== transport) {
        entries.push({ external_id: externalId, transport });
      }
    }
    if (entries.length === 0) {
      return;
    }
    try {
      await this.gladys.publishTransports(entries);
      for (const entry of entries) {
        this.transports.set(entry.external_id, entry.transport);
      }
      this.resolved('transports');
    } catch (err) {
      this.problem('transports', `Transports refused: ${err.message}`);
    }
  }

  /** The status under the integration name. */
  connectionStatus() {
    if (!this.client) {
      return { connected: false, message: CONNECTION_TEXT.noKey };
    }
    if (this.cloud.error) {
      return { connected: false, message: ERROR_TEXT[this.cloud.error.kind] };
    }
    if (this.cloud.read && this.pods.size === 0) {
      return { connected: true, message: CONNECTION_TEXT.noPod };
    }
    return { connected: true };
  }

  async publishConnectionStatus() {
    const status = this.connectionStatus();
    const key = JSON.stringify(status);
    if (key === this.connection) {
      return;
    }
    try {
      await this.gladys.setConnectionStatus(status.connected, status.message);
      this.connection = key;
      this.resolved('connection-status');
    } catch (err) {
      this.problem('connection-status', `Connection status refused: ${err.message}`);
    }
  }

  /** The user added a device: its states sent before were dropped by Gladys. */
  async onDeviceCreated(device) {
    const id = podIdOf(this.gladys, device.external_id);
    const pod = id === null ? null : this.pods.get(id);
    if (!pod) {
      return;
    }
    this.gladys.forgetPublishedStates(device.external_id);
    await this.publishStates(pod);
    this.gladys.requestWidgetRefresh(WIDGET_KEY);
  }

  // --- Commands --------------------------------------------------------------

  /** The air conditioners (kind ac), the ones "every air conditioner" means. */
  airConditioners() {
    return [...this.pods.values()].filter((pod) => pod.kind === KINDS.AC);
  }

  /**
   * The pods a command targets: one device, or every air conditioner.
   * @param {string|null|undefined} deviceExternalId
   */
  targets(deviceExternalId) {
    const language = this.config?.language;
    if (!deviceExternalId) {
      const all = this.airConditioners();
      if (all.length === 0) {
        throw new Error(pick(ACTION_TEXT.noPod, language));
      }
      return all;
    }
    const id = podIdOf(this.gladys, deviceExternalId);
    const pod = id === null ? null : this.pods.get(id);
    if (!pod) {
      throw new Error(pick(ACTION_TEXT.unknownPod, language));
    }
    return [pod];
  }

  /**
   * Send `change` to the targeted pods, within the capabilities of each remote.
   * Commanding every air conditioner skips the offline ones and those that
   * cannot do it. Resolves with the pods that accepted; throws when none did.
   */
  async command(deviceExternalId, change, describe) {
    const language = this.config.language;
    const targets = this.targets(deviceExternalId);
    const single = targets.length === 1 && Boolean(deviceExternalId);
    const done = [];
    let lastError = null;
    for (const pod of targets) {
      if (!pod.online) {
        lastError = new UnsupportedCommand('offline');
        continue;
      }
      let acState;
      try {
        acState = buildAcState(pod, change);
      } catch (err) {
        if (!(err instanceof UnsupportedCommand)) {
          throw err;
        }
        lastError = err;
        continue;
      }
      let applied;
      try {
        applied = await this.client.setAcState(pod.id, acState);
      } catch (err) {
        if (!err.kind) {
          throw err;
        }
        logger.warn(`${podName(pod)}: command failed: ${err.message}`);
        lastError = err;
        continue;
      }
      logger.info(`${podName(pod)}: ${describe}`);
      const next = applyAcState(pod, applied);
      this.pods.set(pod.id, next);
      done.push(next);
      await this.publishStates(next);
    }
    this.gladys.requestWidgetRefresh(WIDGET_KEY);
    if (done.length === 0) {
      throw new Error(this.errorText(lastError, single ? targets[0] : null, language));
    }
    return done;
  }

  errorText(err, pod, language) {
    let text;
    if (err instanceof UnsupportedCommand) {
      text = pick(ACTION_TEXT[err.reason] ?? ACTION_TEXT.failed, language);
    } else if (err?.kind) {
      text = pick(ERROR_TEXT[err.kind], language);
    } else {
      text = pick(ACTION_TEXT.failed, language);
    }
    return (pod ? labelled(podName(pod), text, language) : text).slice(0, 200);
  }

  /** On or off, the rest of the state unchanged. */
  setPower(deviceExternalId, on) {
    return this.command(deviceExternalId, { on }, on ? 'turned on' : 'turned off');
  }

  /**
   * Turn on in a mode, at a setpoint (clamped and rounded to the remote's
   * setpoints); without a setpoint, the current one (or the nearest) is kept.
   */
  turnOn(deviceExternalId, mode, temperature) {
    const language = this.config.language;
    if (!Object.hasOwn(MODE_VALUES, mode)) {
      throw new Error(pick(ACTION_TEXT.unknownMode, language));
    }
    const change = { on: true, mode };
    if (temperature !== null && temperature !== undefined && temperature !== '') {
      const number = Number(String(temperature).replace(',', '.'));
      if (!Number.isFinite(number)) {
        throw new Error(pick(ACTION_TEXT.badTemperature, language));
      }
      change.targetTemperature = number;
    }
    return this.command(
      deviceExternalId,
      change,
      `on, ${mode}${change.targetTemperature === undefined ? '' : ` ${change.targetTemperature}`}`,
    );
  }

  /** A feature of a device was set in Gladys (dashboard, scene, voice assistant). */
  async setValue(device, feature, value) {
    const id = podIdOf(this.gladys, device.external_id);
    const key = id === null ? null : featureKeyOf(this.gladys, id, feature.external_id);
    const number = Number(value);
    const language = this.config.language;
    const fail = (reason) => {
      throw new Error(pick(ACTION_TEXT[reason], language));
    };
    switch (key) {
      case FEATURE_KEYS.POWER:
        await this.setPower(device.external_id, number === 1);
        return;
      case FEATURE_KEYS.MODE: {
        const mode = modeKeyOf(number) ?? fail('unknownMode');
        await this.command(device.external_id, { mode }, `mode ${mode}`);
        return;
      }
      case FEATURE_KEYS.TARGET_TEMPERATURE:
        if (!Number.isFinite(number)) {
          fail('badTemperature');
        }
        await this.command(device.external_id, { targetTemperature: number }, `setpoint ${number}`);
        return;
      case FEATURE_KEYS.FAN_SPEED: {
        const fanLevel = fanKeyOf(number) ?? fail('fan');
        await this.command(device.external_id, { fanLevel }, `fan ${fanLevel}`);
        return;
      }
      case FEATURE_KEYS.SWING_VERTICAL: {
        const swing = swingKeyOf(number) ?? fail('swing');
        await this.command(device.external_id, { swing }, `swing ${swing}`);
        return;
      }
      case FEATURE_KEYS.SWING_HORIZONTAL: {
        const horizontalSwing = horizontalSwingKeyOf(number) ?? fail('swing');
        await this.command(
          device.external_id,
          { horizontalSwing },
          `horizontal swing ${horizontalSwing}`,
        );
        return;
      }
      case FEATURE_KEYS.CLIMATE_REACT:
        await this.setClimateReact(device.external_id, number === 1);
        return;
      default:
        throw new Error(`Feature ${feature.external_id} cannot be controlled`);
    }
  }

  async setClimateReact(deviceExternalId, enabled) {
    const language = this.config.language;
    const [pod] = this.targets(deviceExternalId);
    try {
      await this.client.setClimateReact(pod.id, enabled);
    } catch (err) {
      if (!err.kind) {
        throw err;
      }
      logger.warn(`${podName(pod)}: Climate React failed: ${err.message}`);
      throw new Error(this.errorText(err, pod, language), { cause: err });
    }
    logger.info(`${podName(pod)}: Climate React ${enabled ? 'on' : 'off'}`);
    const next = { ...pod, climateReact: enabled };
    this.pods.set(pod.id, next);
    await this.publishStates(next);
  }

  // --- Reports ---------------------------------------------------------------

  /** "Test the connection": read the cloud now (even after a refused key). */
  async testConnection() {
    await this.pollNow();
    const message = {};
    const status = this.connectionStatus();
    for (const [language, text] of Object.entries(REPORT_TEXT)) {
      if (!status.connected || this.pods.size === 0) {
        message[language] = pick(status.message, language);
        continue;
      }
      const lines = [text.found(this.pods.size)];
      for (const pod of this.pods.values()) {
        lines.push(`- ${podName(pod)} (${pod.model})${pod.online ? '' : `, ${text.offline}`}`);
      }
      message[language] = lines.join('\n');
    }
    return message;
  }
}
