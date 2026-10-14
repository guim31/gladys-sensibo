// -----------------------------------------------------------------------------
// The one place that touches the network: a JSON request through the fetch of
// Node, with a timeout. The tests replace it with a simulated Sensibo cloud
// (test/helpers/fakeSensibo.js).
// -----------------------------------------------------------------------------

export const REQUEST_TIMEOUT_MS = 20_000;

/**
 * @param {{ method: string, url: string, headers?: object, body?: string }} request
 * @returns {Promise<{ status: number, body: any }>} body: parsed JSON, null otherwise
 */
export async function httpRequest({ method, url, headers, body }) {
  const response = await fetch(url, {
    method,
    headers,
    body,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const text = await response.text();
  let parsed = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }
  return { status: response.status, body: parsed };
}
