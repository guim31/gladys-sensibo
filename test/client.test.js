// -----------------------------------------------------------------------------
// The Sensibo client against the simulated cloud: the requests it sends, the
// error kinds, and no key in any error message.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ERROR_KINDS, SensiboClient } from '../src/sensibo/client.js';
import { API_KEY, FakeSensibo } from './helpers/fakeSensibo.js';

const setup = (apiKey = API_KEY) => {
  const cloud = new FakeSensibo();
  return { cloud, client: new SensiboClient({ apiKey, request: cloud.request }) };
};

test('one request reads every pod, with all its fields', async () => {
  const { cloud, client } = setup();
  const pods = await client.getPods();
  assert.equal(pods.length, 4);
  assert.deepEqual(cloud.requests, [
    { method: 'GET', path: '/users/me/pods', query: { fields: '*', apiKey: API_KEY } },
  ]);
});

test('an AC command posts the whole state and returns the applied one', async () => {
  const { cloud, client } = setup();
  const sky = cloud.pod('sky');
  const applied = await client.setAcState(sky.id, { ...sky.acState, on: true });
  assert.equal(applied.on, true);
  assert.equal(cloud.requests[0].path, `/pods/${sky.id}/acStates`);
  assert.equal(cloud.pod('sky').acState.on, true);
});

test('a command the pod refuses is an error with its reason', async () => {
  const { cloud, client } = setup();
  cloud.commandResults.push({ failureReason: 'IrCodeNotFound' });
  await assert.rejects(client.setAcState(cloud.id('sky'), { on: true }), {
    kind: ERROR_KINDS.REFUSED,
    message: /IrCodeNotFound/,
  });
});

test('Climate React is switched by PUT smartmode', async () => {
  const { cloud, client } = setup();
  await client.setClimateReact(cloud.id('sky'), true);
  assert.equal(cloud.pod('sky').smartMode.enabled, true);
  assert.equal(cloud.requests[0].method, 'PUT');
});

test('error kinds: key refused, quota, outage, network; the key never in the message', async () => {
  const cases = [
    [{ status: 401, body: { reason: 'Unauthorized' } }, ERROR_KINDS.AUTH],
    [{ status: 403, body: null }, ERROR_KINDS.AUTH],
    [{ status: 429, body: null }, ERROR_KINDS.RATE_LIMITED],
    [{ status: 503, body: null }, ERROR_KINDS.UNREACHABLE],
    ['network', ERROR_KINDS.UNREACHABLE],
    [{ status: 400, body: { reason: 'BadRequest' } }, ERROR_KINDS.REFUSED],
    [{ status: 200, body: { status: 'success' } }, ERROR_KINDS.REFUSED],
  ];
  for (const [failure, kind] of cases) {
    const { cloud, client } = setup();
    cloud.failures.push(failure);
    await assert.rejects(client.getPods(), (err) => {
      assert.equal(err.kind, kind, JSON.stringify(failure));
      assert.ok(!err.message.includes(API_KEY));
      return true;
    });
  }
  const { client } = setup('wrong');
  await assert.rejects(client.getPods(), { kind: ERROR_KINDS.AUTH });
});

test('a fetch error quoting the URL does not leak the key', async () => {
  const client = new SensiboClient({
    apiKey: API_KEY,
    request: async ({ url }) => {
      throw new Error(`request to ${url} failed`);
    },
  });
  await assert.rejects(client.getPods(), (err) => !err.message.includes(API_KEY));
});
