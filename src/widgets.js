// -----------------------------------------------------------------------------
// Dashboard widget (manifest `widgets`, Gladys 5.1+): `air_conditioners`.
//
// The use case: the wall tablet, "is the air conditioning still on in the
// bedroom?", and the button to turn everything off when leaving. So the
// widget lists the air conditioners with their state (mode and setpoint when
// on) and the room temperature, and offers two direct buttons: On (the last
// mode and setpoint, as the remote's power button) and Off.
//
// Every air conditioner by default, or the one chosen in the widget settings.
// The current state carries a check mark (when every shown air conditioner is
// in it), never the `primary` style, invisible in dark mode. Mode, setpoint
// and fan stay on the device and in the scene actions.
//
// Budget (8 components, 1 status, 2 buttons, 1 caption): the values are sent
// as text, not bound to device features, so the widget works before the
// devices are added to Gladys.
// -----------------------------------------------------------------------------

import { WIDGET_COLORS } from '@gladysassistant/integration-sdk';
import { podName } from './devices.js';
import { WIDGET_KEY } from './hub.js';
import { modeKeyOf } from './sensibo/model.js';
import { ERROR_TEXT, MODE_TEXT, pick } from './texts.js';

// Action keys of the buttons: permanent once published (unique, the core
// drops a button whose key is taken).
export const ACTIONS = Object.freeze({ ON: 'turn_on', OFF: 'turn_off' });

const ACTIVE_ICON = 'check-circle';
export const MAX_ROWS = 10;

export const TEXT = {
  noKey: {
    en: 'Enter your Sensibo API key in the configuration of the integration.',
    fr: "Saisissez votre clé d'API Sensibo dans la configuration de l'intégration.",
    de: 'Gib deinen Sensibo-API-Schlüssel in der Konfiguration der Integration ein.',
    es: 'Introduzca su clave de API de Sensibo en la configuración de la integración.',
  },
  noPod: {
    en: 'No Sensibo air conditioner found yet: see the Configuration screen of the integration.',
    fr: "Aucune clim Sensibo trouvée pour l'instant : voir l'écran Configuration de l'intégration.",
    de: 'Noch keine Sensibo-Klimaanlage gefunden: Sieh dir die Konfiguration der Integration an.',
    es: 'Aún no se ha encontrado ningún aire acondicionado Sensibo: consulte la pantalla de configuración de la integración.',
  },
  unknown: {
    en: 'This device is no longer on the Sensibo account: choose another one in the widget settings.',
    fr: "Cet appareil n'est plus sur le compte Sensibo : choisissez-en un autre dans les réglages du widget.",
    de: 'Dieses Gerät ist nicht mehr im Sensibo-Konto: Wähle ein anderes in den Widget-Einstellungen.',
    es: 'Este dispositivo ya no está en la cuenta Sensibo: elija otro en la configuración del widget.',
  },
  on: { en: 'On', fr: 'Allumer', de: 'Ein', es: 'Encender' },
  off: { en: 'Off', fr: 'Éteindre', de: 'Aus', es: 'Apagar' },
  stateOff: { en: 'Off', fr: 'Arrêt', de: 'Aus', es: 'Apagado' },
  offline: { en: 'Offline', fr: 'Hors ligne', de: 'Offline', es: 'Desconectado' },
  room: { en: 'room', fr: 'pièce', de: 'Raum', es: 'sala' },
  waiting: { en: 'Waiting…', fr: 'En attente…', de: 'Warte…', es: 'Esperando…' },
  more: {
    en: 'Other air conditioners',
    fr: 'Autres clims',
    de: 'Weitere Klimaanlagen',
    es: 'Otros aires',
  },
};

// Toasts after a tap (≤ 200 characters).
export const DONE_TEXT = {
  en: {
    on: (n) => `Turned on: ${n} air conditioner(s).`,
    off: (n) => `Turned off: ${n} air conditioner(s).`,
  },
  fr: { on: (n) => `Allumée(s) : ${n} clim(s).`, off: (n) => `Éteinte(s) : ${n} clim(s).` },
  de: {
    on: (n) => `Eingeschaltet: ${n} Klimaanlage(n).`,
    off: (n) => `Ausgeschaltet: ${n} Klimaanlage(n).`,
  },
  es: { on: (n) => `Encendido(s): ${n} aire(s).`, off: (n) => `Apagado(s): ${n} aire(s).` },
};

const t = (text, language) => pick(text, language);
const fit = (text, max) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

const MODE_COLORS = {
  cool: WIDGET_COLORS.INFO,
  heat: WIDGET_COLORS.WARNING,
  auto: WIDGET_COLORS.SUCCESS,
  dry: WIDGET_COLORS.SUCCESS,
  fan: WIDGET_COLORS.SUCCESS,
};

function message(text, language) {
  return {
    ttl_seconds: 300,
    components: [{ type: 'text', variant: 'body', text: t(text, language) }],
  };
}

const formatTemperature = (value, unit, language) =>
  `${new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format(value)} °${unit}`;

/** The status row of one air conditioner. */
export function podRow(pod, language) {
  const label = fit(podName(pod), 40);
  if (!pod.online) {
    return {
      label,
      icon: 'wifi-off',
      value: t(TEXT.offline, language),
      color: WIDGET_COLORS.DANGER,
    };
  }
  if (pod.on === null) {
    return { label, icon: 'clock', value: t(TEXT.waiting, language), color: WIDGET_COLORS.NEUTRAL };
  }
  const parts = [];
  const mode = modeKeyOf(pod.mode);
  if (!pod.on) {
    parts.push(t(TEXT.stateOff, language));
  } else {
    parts.push(mode ? t(MODE_TEXT[mode], language) : t(TEXT.on, language));
    if (pod.targetTemperature !== null && mode !== 'fan') {
      parts.push(formatTemperature(pod.targetTemperature, pod.unit, language));
    }
  }
  if (pod.temperature !== null) {
    parts.push(`${t(TEXT.room, language)} ${formatTemperature(pod.temperature, 'C', language)}`);
  }
  return {
    label,
    icon: pod.on ? 'wind' : 'power',
    value: fit(parts.join(' · '), 40),
    color: pod.on ? (MODE_COLORS[mode] ?? WIDGET_COLORS.SUCCESS) : WIDGET_COLORS.NEUTRAL,
  };
}

function view(hub, deviceExternalId) {
  if (!deviceExternalId) {
    return hub.airConditioners();
  }
  try {
    return hub.targets(deviceExternalId);
  } catch {
    return [];
  }
}

async function get(hub, { settings, language = 'fr' }) {
  if (!hub.client) {
    return message(TEXT.noKey, language);
  }
  if (hub.airConditioners().length === 0) {
    return message(TEXT.noPod, language);
  }
  const pods = view(hub, settings?.device);
  if (pods.length === 0) {
    return message(TEXT.unknown, language);
  }
  const items = pods.slice(0, MAX_ROWS).map((pod) => podRow(pod, language));
  if (pods.length > MAX_ROWS) {
    items[MAX_ROWS - 1] = {
      label: t(TEXT.more, language),
      icon: 'more-horizontal',
      value: pods.length - (MAX_ROWS - 1),
      color: WIDGET_COLORS.NEUTRAL,
    };
  }
  const online = pods.filter((pod) => pod.online && pod.on !== null);
  const components = [{ type: 'status', items }];
  if (hub.cloud.error) {
    // The rows are the last known states: say they may be out of date.
    components.unshift({
      type: 'text',
      variant: 'caption',
      text: fit(t(ERROR_TEXT[hub.cloud.error.kind], language), 80),
    });
  }
  for (const [key, on, icon] of [
    [ACTIONS.ON, true, 'power'],
    [ACTIONS.OFF, false, 'x-circle'],
  ]) {
    const active = online.length > 0 && online.every((pod) => pod.on === on);
    components.push({
      type: 'button',
      label: t(on ? TEXT.on : TEXT.off, language),
      icon: active ? ACTIVE_ICON : icon,
      style: 'secondary',
      action: { key },
    });
  }
  return { ttl_seconds: 60, components };
}

async function action(hub, { actionKey, settings }) {
  if (actionKey !== ACTIONS.ON && actionKey !== ACTIONS.OFF) {
    throw new Error(`Unknown action ${actionKey}`);
  }
  // The command comes from the action key, never from the params of the tap.
  const on = actionKey === ACTIONS.ON;
  const done = await hub.setPower(settings?.device || null, on);
  return {
    message: Object.fromEntries(
      Object.entries(DONE_TEXT).map(([language, text]) => [
        language,
        (on ? text.on : text.off)(done.length),
      ]),
    ),
  };
}

export const WIDGETS = {
  [WIDGET_KEY]: { get, action },
};
