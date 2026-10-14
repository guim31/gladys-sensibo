// -----------------------------------------------------------------------------
// The hub with the SDK's fake Gladys and the simulated Sensibo cloud:
// discovery, states, commands from the devices and the scene actions, scene
// events, statuses.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TRIGGERS } from '../src/hub.js';
import { ACCOUNT, createAll, createWorld, deviceId, deviceOf, featureId } from './helpers/world.js';

const feature = (world, name, key) =>
  deviceOf(world, name).features.find((f) => f.external_id === featureId(world, name, key));

const set = (world, name, key, value) =>
  world.fake.setValue(deviceOf(world, name), feature(world, name, key), value);

test('every pod is discovered, its states published, the cloud transport set', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  assert.equal(world.fake.discoveredDevices.length, 4);
  assert.equal(world.fake.lastState(featureId(world, 'air-pro', 'co2')), 621);
  assert.equal(world.fake.connectionStatus.connected, true);
  // The Elements of the fixtures is offline: no state, an Unreachable badge.
  assert.equal(world.fake.lastState(featureId(world, 'elements', 'co2')), undefined);
  const transports = Object.fromEntries(
    world.fake.transports.map((entry) => [entry.device_external_id, entry.transport]),
  );
  assert.equal(transports[deviceId(world, 'elements')], 'unreachable');
  assert.equal(transports[deviceId(world, 'sky')], 'cloud');
});

test('a device added later receives its states again', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  const before = world.fake.states.length;
  await createAll(world);
  assert.ok(world.fake.states.length > before);
  assert.ok(world.fake.widgetRefreshes.length > 0);
});

test('power, mode, setpoint, fan and swing from the device features', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  let ack = await set(world, 'sky', 'power', 1);
  assert.equal(ack.success, true, ack.error);
  assert.equal(world.cloud.pod('sky').acState.on, true);
  assert.equal(world.fake.lastState(featureId(world, 'sky', 'power')), 1);

  ack = await set(world, 'sky', 'mode', 1); // cooling
  assert.equal(ack.success, true, ack.error);
  assert.equal(world.cloud.pod('sky').acState.mode, 'cool');

  ack = await set(world, 'sky', 'target_temperature', 40);
  assert.equal(ack.success, true, ack.error);
  assert.equal(world.cloud.pod('sky').acState.targetTemperature, 30, 'clamped to the remote');
  assert.equal(world.fake.lastState(featureId(world, 'sky', 'target_temperature')), 30);

  ack = await set(world, 'sky', 'fan_speed', 6); // quiet
  assert.equal(ack.success, true, ack.error);
  assert.equal(world.cloud.pod('sky').acState.fanLevel, 'quiet');

  ack = await set(world, 'sky', 'swing_vertical', 1);
  assert.equal(ack.success, true, ack.error);
  assert.equal(world.cloud.pod('sky').acState.swing, 'rangeFull');

  ack = await set(world, 'sky', 'fan_speed', 2); // medium_low: not on this remote
  assert.equal(ack.success, false);
  assert.match(ack.error, /fan speed/);
});

test('Climate React is switched from its feature', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  const ack = await set(world, 'sky', 'climate_react', 1);
  assert.equal(ack.success, true, ack.error);
  assert.equal(world.cloud.pod('sky').smartMode.enabled, true);
  assert.equal(world.fake.lastState(featureId(world, 'sky', 'climate_react')), 1);
});

test('an offline pod is not commanded', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  world.cloud.setOnline('sky', false);
  await world.hub.poll();
  const ack = await set(world, 'sky', 'power', 1);
  assert.equal(ack.success, false);
  assert.match(ack.error, /offline/);
  assert.equal(world.cloud.commands().length, 0);
});

test('turn_on: every air conditioner, in a mode, at a setpoint within its remote', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  const ack = await world.fake.sceneAction('turn_on', { mode: 'cool', temperature: 12 });
  assert.equal(ack.success, true, ack.error);
  assert.deepEqual(ack.data.outputs, { count: 2, temperature: 18 });
  for (const name of ['sky', 'air-pro']) {
    const state = world.cloud.pod(name).acState;
    assert.equal(state.on, true);
    assert.equal(state.mode, 'cool');
    assert.equal(state.targetTemperature, 18);
  }
  // The Pure and the Elements are not air conditioners.
  assert.equal(world.cloud.commands().length, 2);
});

test('turn_on without a temperature keeps the setpoint; an unknown mode is refused', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  let ack = await world.fake.sceneAction('turn_on', {
    device: deviceId(world, 'sky'),
    mode: 'heat',
  });
  assert.equal(ack.success, true, ack.error);
  assert.equal(world.cloud.pod('sky').acState.targetTemperature, 24);
  ack = await world.fake.sceneAction('turn_on', { mode: 'turbo' });
  assert.equal(ack.success, false);
  ack = await world.fake.sceneAction('turn_on', { device: deviceId(world, 'pure'), mode: 'cool' });
  assert.equal(ack.success, false);
});

test('turn_off: every air conditioner, the offline ones skipped', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  world.cloud.setOnline('sky', false);
  await world.hub.poll();
  const ack = await world.fake.sceneAction('turn_off', {});
  assert.equal(ack.success, true, ack.error);
  assert.deepEqual(ack.data.outputs, { count: 1 });
  assert.equal(world.cloud.pod('air-pro').acState.on, false);
});

test('a refused command says why, in the configured language', async (t) => {
  const world = await createWorld({ config: { ...ACCOUNT, language: 'fr' } });
  t.after(() => world.app.stop());
  world.cloud.failures.push({ status: 429, body: null });
  const ack = await world.fake.sceneAction('turn_off', { device: deviceId(world, 'sky') });
  assert.equal(ack.success, false);
  assert.equal(
    ack.error,
    'Living room : Trop de requêtes : le cloud Sensibo demande de patienter.',
  );
});

test('scene events: offline, back online, filter to clean, once per transition', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  world.cloud.setOnline('sky', false);
  await world.hub.poll();
  await world.hub.poll();
  world.cloud.setOnline('sky', true);
  world.cloud.pod('air-pro').filtersCleaning.shouldCleanFilters = false;
  await world.hub.poll();
  world.cloud.pod('air-pro').filtersCleaning.shouldCleanFilters = true;
  await world.hub.poll();
  await world.hub.poll();
  assert.deepEqual(
    world.fake.sceneEvents.map((event) => [event.key, event.data.name]),
    [
      [TRIGGERS.OFFLINE, 'Living room'],
      [TRIGGERS.ONLINE, 'Living room'],
      [TRIGGERS.FILTER, 'Hallway'],
    ],
  );
  assert.equal(world.fake.sceneEvents[0].data.device, deviceId(world, 'sky'));
});

test('a missing measurement does not change the structure of a device', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  const before = deviceOf(world, 'air-pro').features.length;
  delete world.cloud.pod('air-pro').measurements.co2;
  await world.hub.poll();
  assert.equal(deviceOf(world, 'air-pro').features.length, before);
});

test('statuses: no key, refused key, no device, then the test report', async (t) => {
  const world = await createWorld({ config: { language: 'en' } });
  t.after(() => world.app.stop());
  assert.equal(world.fake.connectionStatus.connected, false);
  assert.match(world.fake.connectionStatus.message.en, /API key/);
  await world.fake.configUpdated({ api_key: 'nope', language: 'en' });
  assert.equal(world.fake.connectionStatus.message.en, 'Sensibo refuses the API key.');
  await world.fake.configUpdated(ACCOUNT);
  assert.equal(world.fake.connectionStatus.connected, true);
  const ack = await world.fake.action('test_connection');
  assert.equal(ack.success, true, ack.error);
  assert.match(ack.data.message.en, /Connected to Sensibo: 4 device\(s\)/);
  assert.match(ack.data.message.en, /Office \(elements\), offline/);
  world.cloud.pods.clear();
  await world.hub.poll();
  assert.equal(world.fake.discoveredDevices.length, 0);
  assert.match(world.fake.connectionStatus.message.en, /no device/);
});
