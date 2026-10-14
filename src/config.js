// -----------------------------------------------------------------------------
// Integration configuration: defaults (they mirror the `default` values of the
// manifest `config_schema`, see test/manifest.test.js) and normalization, so
// the rest of the code never deals with strings, blanks or `undefined`.
// -----------------------------------------------------------------------------

export const LANGUAGES = ['en', 'fr', 'de', 'es'];

// Refresh intervals offered in the configuration, in seconds. One minute at
// least: the Sensibo cloud limits the requests of an API key, and the pods
// themselves report every 90 seconds or so.
export const POLL_INTERVALS = ['60', '120', '300', '600'];

export const DEFAULT_CONFIG = {
  api_key: '',
  poll_interval: '120',
  language: 'fr',
};

/**
 * @param {Record<string, unknown>} raw the configuration returned by the SDK
 */
export function normalizeConfig(raw = {}) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const interval =
    source.poll_interval === undefined || source.poll_interval === null
      ? ''
      : String(source.poll_interval);
  return {
    // A key pasted with a space or a line break around it still works.
    apiKey: typeof source.api_key === 'string' ? source.api_key.trim() : '',
    pollIntervalMs:
      Number(POLL_INTERVALS.includes(interval) ? interval : DEFAULT_CONFIG.poll_interval) * 1000,
    language: LANGUAGES.includes(source.language) ? source.language : DEFAULT_CONFIG.language,
  };
}
