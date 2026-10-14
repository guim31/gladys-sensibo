// -----------------------------------------------------------------------------
// The container reads the cloud on its own timer (should_poll: false, and the
// 5.2.0 core never polls a device created without should_poll): proven here
// without ever calling onPoll. A refused key stops the readings; a "too many
// requests" slows them down.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACCOUNT, createWorld, featureId } from './helpers/world.js';

const reads = (world) => world.cloud.requests.filter((r) => r.path === '/users/me/pods').length;

async function flush() {
  for (let i = 0; i < 20; i += 1) {
    await new Promise((resolve) => setImmediate(resolve));
  }
}

test('the pods are read again at the configured interval, without onPoll', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const world = await createWorld({ config: { ...ACCOUNT, poll_interval: '300' }, timers: true });
  t.after(() => world.app.stop());
  assert.equal(reads(world), 1);
  world.cloud.pod('sky').acState.on = true;
  t.mock.timers.tick(299_000);
  await flush();
  assert.equal(reads(world), 1);
  t.mock.timers.tick(1_000);
  await flush();
  assert.equal(reads(world), 2);
  assert.equal(world.fake.lastState(featureId(world, 'sky', 'power')), 1);
  t.mock.timers.tick(300_000);
  await flush();
  assert.equal(reads(world), 3);
});

test('a refused key is only tried again once an hour', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const world = await createWorld({ config: { ...ACCOUNT, api_key: 'nope' }, timers: true });
  t.after(() => world.app.stop());
  t.mock.timers.tick(3_599_000);
  await flush();
  assert.equal(world.cloud.requests.length, 1);
  assert.equal(world.fake.connectionStatus.connected, false);
  t.mock.timers.tick(1_000);
  await flush();
  assert.equal(world.cloud.requests.length, 2);
});

test('a "too many requests" answer waits ten minutes', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const world = await createWorld({ config: { ...ACCOUNT, poll_interval: '60' }, timers: true });
  t.after(() => world.app.stop());
  world.cloud.failures.push({ status: 429, body: null });
  t.mock.timers.tick(60_000);
  await flush();
  assert.equal(world.fake.connectionStatus.connected, false);
  const count = world.cloud.requests.length;
  t.mock.timers.tick(540_000);
  await flush();
  assert.equal(world.cloud.requests.length, count);
  t.mock.timers.tick(60_000);
  await flush();
  assert.equal(world.fake.connectionStatus.connected, true);
});
