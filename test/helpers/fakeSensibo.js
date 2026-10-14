// -----------------------------------------------------------------------------
// A simulated Sensibo cloud, as the official API v2 answers: the pod list and
// the AC state and Climate React commands. The pods are real devices of the
// pysensibo and Home Assistant test data (test/fixtures/sensibo, anonymized);
// a command changes the AC state the way the cloud reports it, so a reading
// after a command shows what the pod did. Errors come with their real HTTP
// status.
// -----------------------------------------------------------------------------

import { readFileSync } from 'node:fs';

export const API_KEY = 'Ab1Cd2Ef3Gh4Ij5Kl6Mn7Op8Qr9St0';

export const FIXTURES = ['sky', 'air-pro', 'pure', 'elements'];

export function loadFixture(name) {
  return JSON.parse(
    readFileSync(new URL(`../fixtures/sensibo/${name}.json`, import.meta.url), 'utf8'),
  );
}

export class FakeSensibo {
  /** @param {{ pods?: string[] }} [options] fixture names */
  constructor({ pods = FIXTURES } = {}) {
    this.pods = new Map();
    for (const name of pods) {
      const pod = loadFixture(name);
      this.pods.set(name, pod);
    }
    this.apiKey = API_KEY;
    this.requests = [];
    /** Next answers to force, in order: { status, body } or 'network'. */
    this.failures = [];
    /** Answer of the next AC command: { status: 'Failed', failureReason } */
    this.commandResults = [];
    this.request = (req) => this.handle(req);
  }

  /** The pod id of a fixture. */
  id(name) {
    return this.pods.get(name).id;
  }

  pod(name) {
    return this.pods.get(name);
  }

  setOnline(name, online) {
    this.pod(name).connectionStatus.isAlive = online;
  }

  byId(id) {
    return [...this.pods.values()].find((pod) => pod.id === id);
  }

  async handle({ method, url, body }) {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/^\/api\/v2/, '');
    this.requests.push({ method, path, query: Object.fromEntries(parsed.searchParams) });
    const failure = this.failures.shift();
    if (failure === 'network') {
      throw new TypeError('fetch failed', { cause: { code: 'ECONNRESET' } });
    }
    if (failure) {
      return failure;
    }
    if (parsed.origin !== 'https://home.sensibo.com' || !parsed.pathname.startsWith('/api/v2/')) {
      return { status: 404, body: null };
    }
    if (parsed.searchParams.get('apiKey') !== this.apiKey) {
      return { status: 401, body: { status: 'error', reason: 'Unauthorized' } };
    }
    if (method === 'GET' && path === '/users/me/pods') {
      return {
        status: 200,
        body: { status: 'success', result: structuredClone([...this.pods.values()]) },
      };
    }
    let match = path.match(/^\/pods\/([^/]+)\/acStates$/);
    if (method === 'POST' && match) {
      const pod = this.byId(decodeURIComponent(match[1]));
      if (!pod) {
        return { status: 404, body: { status: 'error', reason: 'NotFound' } };
      }
      const { acState } = JSON.parse(body);
      const forced = this.commandResults.shift();
      if (forced) {
        return {
          status: 200,
          body: {
            status: 'success',
            result: { status: 'Failed', ...forced, acState: pod.acState },
          },
        };
      }
      const changed = Object.keys(acState).filter((key) => acState[key] !== pod.acState[key]);
      pod.acState = { timestamp: pod.acState.timestamp, ...acState };
      return {
        status: 200,
        body: {
          status: 'success',
          result: {
            id: 'Cmd0001',
            status: 'Success',
            reason: 'UserRequest',
            acState: structuredClone(pod.acState),
            changedProperties: changed,
            failureReason: null,
          },
        },
      };
    }
    match = path.match(/^\/pods\/([^/]+)\/smartmode$/);
    if (method === 'PUT' && match) {
      const pod = this.byId(decodeURIComponent(match[1]));
      if (!pod?.smartMode) {
        return { status: 400, body: { status: 'error', reason: 'NoSmartMode' } };
      }
      pod.smartMode.enabled = JSON.parse(body).enabled === true;
      return { status: 200, body: { status: 'success', result: pod.smartMode } };
    }
    return { status: 404, body: null };
  }

  /** The AC commands received, as sent. */
  commands() {
    return this.requests.filter((r) => r.method === 'POST');
  }
}
