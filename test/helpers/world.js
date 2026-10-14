// -----------------------------------------------------------------------------
// A complete test world: the SDK's fake Gladys and the simulated Sensibo
// cloud, with the integration wired on top through registerHandlers. No timer
// runs unless `timers: true` (with node:test mock timers): the tests read the
// cloud with `world.hub.poll()`.
// -----------------------------------------------------------------------------

import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import { registerHandlers } from '../../src/app.js';
import { API_KEY, FakeSensibo } from './fakeSensibo.js';

// The integration logs every change; keep the test output readable.
process.env.LOG_LEVEL ??= 'silent';

export const ACCOUNT = { api_key: API_KEY, language: 'en' };

export async function createWorld({
  cloud,
  pods,
  config = ACCOUNT,
  devices = [],
  connect = true,
  timings = {},
  timers = false,
} = {}) {
  const sensibo = cloud ?? new FakeSensibo({ pods });
  const gladys = createFakeGladys({ config, devices });
  const app = registerHandlers(gladys, { request: sensibo.request, timers, timings });
  if (connect) {
    await gladys.connect();
    await app.ready;
  }
  return { gladys, fake: gladys.fake, cloud: sensibo, app, hub: app.hub };
}

/** External ids of a fixture pod. */
export const deviceId = (world, name) =>
  world.gladys.externalIds('pod', world.cloud.id(name)).device;
export const featureId = (world, name, key) =>
  world.gladys.externalIds('pod', world.cloud.id(name)).feature(key);

/** The discovered device of a fixture pod. */
export const deviceOf = (world, name) =>
  world.fake.discoveredDevices.find((device) => device.external_id === deviceId(world, name));

/** Add every discovered device in Gladys, as the user would. */
export async function createAll(world) {
  for (const device of world.fake.discoveredDevices) {
    await world.fake.deviceCreated(device);
  }
}

export { FakeSensibo };
