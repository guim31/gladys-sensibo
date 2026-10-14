// -----------------------------------------------------------------------------
// Client of the official Sensibo cloud API (https://home.sensibo.com/api/v2),
// authenticated by the API key the user creates at https://home.sensibo.com/me/api.
//
//   GET  /users/me/pods?fields=*        { status, result: [pod, …] } — every pod, one request
//   POST /pods/<id>/acStates            { acState } → { result: { status, acState, failureReason } }
//   PUT  /pods/<id>/smartmode           { enabled } → { status: "success" }
//
// The key travels in the `apiKey` query parameter, as the API documents: the
// URL is therefore never logged, and the errors carry a kind (ERROR_KINDS)
// and an HTTP status, never the URL or the key.
// -----------------------------------------------------------------------------

import { httpRequest } from './http.js';

export const API_URL = 'https://home.sensibo.com/api/v2';

export const ERROR_KINDS = Object.freeze({
  AUTH: 'auth', // API key refused (401, 403)
  UNREACHABLE: 'unreachable', // network, DNS, timeout, 5xx
  RATE_LIMITED: 'rate_limited', // 429
  REFUSED: 'refused', // any other refusal of the API
});

export class SensiboError extends Error {
  constructor(kind, message, { status = null } = {}) {
    super(message);
    this.name = 'SensiboError';
    this.kind = kind;
    this.status = status;
  }
}

function errorFrom(status, body, what) {
  // The API explains a refusal in `reason` or `message`: short, no secret.
  const reason = typeof body?.reason === 'string' ? body.reason.slice(0, 100) : null;
  const detail = reason ? `HTTP ${status}, ${reason}` : `HTTP ${status}`;
  if (status === 401 || status === 403) {
    return new SensiboError(ERROR_KINDS.AUTH, `${what}: API key refused (${detail})`, { status });
  }
  if (status === 429) {
    return new SensiboError(ERROR_KINDS.RATE_LIMITED, `${what}: rate limited (${detail})`, {
      status,
    });
  }
  if (status >= 500) {
    return new SensiboError(ERROR_KINDS.UNREACHABLE, `${what}: server error (${detail})`, {
      status,
    });
  }
  return new SensiboError(ERROR_KINDS.REFUSED, `${what}: refused (${detail})`, { status });
}

export class SensiboClient {
  /**
   * @param {object} options
   * @param {string} options.apiKey
   * @param {Function} [options.request] HTTP seam (src/sensibo/http.js)
   */
  constructor({ apiKey, request = httpRequest }) {
    this.apiKey = apiKey;
    this.request = request;
  }

  url(path, query = {}) {
    const params = new URLSearchParams({ ...query, apiKey: this.apiKey });
    return `${API_URL}${path}?${params}`;
  }

  async call(what, method, path, { query, body } = {}) {
    let response;
    try {
      response = await this.request({
        method,
        url: this.url(path, query),
        headers: {
          Accept: 'application/json',
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (err) {
      // fetch errors may quote the URL: keep the cause name only.
      throw new SensiboError(
        ERROR_KINDS.UNREACHABLE,
        `${what}: Sensibo cloud unreachable (${err?.name === 'TimeoutError' ? 'timeout' : err?.cause?.code || err?.name || 'network error'})`,
      );
    }
    if (response.status < 200 || response.status >= 300) {
      throw errorFrom(response.status, response.body, what);
    }
    return response.body;
  }

  /** Every pod of the account, with all its fields. */
  async getPods() {
    const body = await this.call('Pod list', 'GET', '/users/me/pods', { query: { fields: '*' } });
    if (!Array.isArray(body?.result)) {
      throw new SensiboError(ERROR_KINDS.REFUSED, 'Pod list: unexpected answer');
    }
    return body.result.filter((pod) => pod && typeof pod.id === 'string' && pod.id);
  }

  /**
   * Send a complete AC state; resolves with the state the pod applied.
   * @param {string} id pod id
   * @param {object} acState
   */
  async setAcState(id, acState) {
    const body = await this.call('AC command', 'POST', `/pods/${encodeURIComponent(id)}/acStates`, {
      body: { acState },
    });
    const result = body?.result;
    if (result?.status && result.status !== 'Success') {
      const reason =
        typeof result.failureReason === 'string' ? result.failureReason.slice(0, 100) : 'failed';
      throw new SensiboError(ERROR_KINDS.REFUSED, `AC command: ${reason}`);
    }
    return result?.acState && typeof result.acState === 'object' ? result.acState : acState;
  }

  /** Turn Climate React on or off (its settings stay those of the Sensibo app). */
  async setClimateReact(id, enabled) {
    await this.call('Climate React', 'PUT', `/pods/${encodeURIComponent(id)}/smartmode`, {
      body: { enabled },
    });
  }
}
