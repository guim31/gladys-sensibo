// -----------------------------------------------------------------------------
// The pods of the fixtures as the integration sees them, and the safety rules
// of the commands: never outside the capabilities of the remote.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  KINDS,
  applyAcState,
  UnsupportedCommand,
  buildAcState,
  parsePod,
  snapSetpoint,
} from '../src/sensibo/model.js';
import { loadFixture } from './helpers/fakeSensibo.js';

const pod = (name) => parsePod(loadFixture(name));

test('the fixtures parse into the three kinds of pods', () => {
  const sky = pod('sky');
  assert.equal(sky.kind, KINDS.AC);
  assert.equal(sky.name, 'Living room');
  assert.equal(sky.on, false);
  assert.equal(sky.mode, 2); // heat
  assert.equal(sky.targetTemperature, 24);
  assert.equal(sky.fanSpeed, 5); // high
  assert.deepEqual(sky.features.setpointRange, [17, 30]);
  assert.equal(sky.filterDirty, true);
  assert.equal(sky.filterLife, 0);
  assert.equal(sky.climateReact, false);
  assert.equal(pod('pure').kind, KINDS.PURIFIER);
  const elements = pod('elements');
  assert.equal(elements.kind, KINDS.MONITOR);
  assert.equal(elements.online, false);
  assert.equal(elements.co2, 432);
  assert.equal(elements.features.power, false);
});

test('the setpoint is in the unit of the AC state, Fahrenheit included', () => {
  const raw = loadFixture('sky');
  raw.temperatureUnit = 'F';
  raw.acState.temperatureUnit = 'F';
  raw.acState.targetTemperature = 75;
  const sky = parsePod(raw);
  assert.equal(sky.unit, 'F');
  assert.deepEqual(sky.features.setpointRange, [63, 86]);
  assert.equal(buildAcState(sky, { targetTemperature: 71.5 }).targetTemperature, 72);
  // Displayed in F, but the remote set in C: the setpoint stays in C.
  raw.acState.temperatureUnit = 'C';
  raw.acState.targetTemperature = 22;
  const mixed = parsePod(raw);
  assert.equal(mixed.unit, 'C');
  assert.equal(buildAcState(mixed, { on: true }).targetTemperature, 22);
});

test('a malformed setpoint list is ignored, not thrown', () => {
  const raw = loadFixture('sky');
  raw.remoteCapabilities.modes.cool.temperatures.C.values = 'oops';
  const sky = parsePod(raw);
  assert.deepEqual(sky.capabilities.modes.cool.temperatures, []);
});

test('back from the fan mode, the last setpoint is used again', () => {
  const sky = pod('sky');
  const fan = applyAcState(sky, buildAcState(sky, { mode: 'fan' }));
  assert.equal(fan.targetTemperature, null);
  assert.equal(buildAcState(fan, { mode: 'cool' }).targetTemperature, 24);
  const unknown = { ...fan, lastSetpoint: null };
  assert.equal(buildAcState(unknown, { mode: 'cool' }).targetTemperature, 24, 'middle of 18-30');
});

test('a setpoint is clamped to the remote, then rounded to its nearest value', () => {
  const sky = pod('sky');
  assert.equal(buildAcState(sky, { targetTemperature: 35 }).targetTemperature, 30);
  assert.equal(buildAcState(sky, { targetTemperature: 5 }).targetTemperature, 17);
  assert.equal(buildAcState(sky, { targetTemperature: 21.4 }).targetTemperature, 21);
  // Cooling starts at 18 on this remote, heating at 17.
  assert.equal(buildAcState(sky, { mode: 'cool', targetTemperature: 17 }).targetTemperature, 18);
  assert.equal(snapSetpoint([], 20), null);
});

test('a mode, a fan level or a swing position the remote lacks is refused', () => {
  const raw = loadFixture('sky');
  delete raw.remoteCapabilities.modes.dry;
  const sky = parsePod(raw);
  assert.throws(() => buildAcState(sky, { mode: 'dry' }), { reason: 'mode' });
  assert.throws(() => buildAcState(sky, { fanLevel: 'medium_low' }), { reason: 'fan' });
  assert.throws(() => buildAcState(sky, { swing: 'rangeTop' }), { reason: 'swing' });
  assert.throws(() => buildAcState(pod('elements'), { on: true }), UnsupportedCommand);
});

test('changing mode keeps the state inside the new mode', () => {
  const sky = pod('sky');
  const fan = buildAcState(sky, { mode: 'fan' });
  assert.equal(fan.mode, 'fan');
  assert.equal(fan.targetTemperature, undefined, 'no setpoint in fan mode');
  assert.equal(fan.fanLevel, 'high');
  const dry = buildAcState(sky, { mode: 'dry', on: true });
  assert.equal(dry.fanLevel, undefined, 'no fan level in dry mode on this remote');
  assert.equal(dry.targetTemperature, 24);
  assert.throws(() => buildAcState({ ...sky, acState: fan }, { targetTemperature: 20 }), {
    reason: 'temperature',
  });
});

test('a Pure is turned on and off, nothing else', () => {
  const pure = pod('pure');
  assert.deepEqual(buildAcState(pure, { on: true }), {
    on: true,
    mode: 'fan',
    fanLevel: 'low',
    light: 'on',
  });
});
