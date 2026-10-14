// -----------------------------------------------------------------------------
// Texts sent from the container (connection status, action errors, reports),
// in the four languages of the Gladys interface. German says "du", Spanish
// "usted". The language is the one chosen in the configuration: Gladys does
// not tell a device integration or a scene action the user's language.
// -----------------------------------------------------------------------------

import { ERROR_KINDS } from './sensibo/client.js';

export const pick = (text, language) => text?.[language] ?? text?.fr ?? text?.en ?? '';

export const INIT_FAILED = {
  en: 'The integration could not start: see its logs.',
  fr: "L'intégration n'a pas pu démarrer : voir ses journaux.",
  de: 'Die Integration konnte nicht starten: Sieh dir ihre Protokolle an.',
  es: 'La integración no ha podido iniciarse: consulte sus registros.',
};

export const CONNECTION_TEXT = {
  noKey: {
    en: 'Enter the API key of your Sensibo account in the configuration.',
    fr: "Saisissez la clé d'API de votre compte Sensibo dans la configuration.",
    de: 'Gib den API-Schlüssel deines Sensibo-Kontos in der Konfiguration ein.',
    es: 'Introduzca la clave de API de su cuenta Sensibo en la configuración.',
  },
  noPod: {
    en: 'Connected, but the Sensibo account has no device.',
    fr: "Connecté, mais le compte Sensibo n'a aucun appareil.",
    de: 'Verbunden, aber das Sensibo-Konto hat kein Gerät.',
    es: 'Conectado, pero la cuenta Sensibo no tiene ningún dispositivo.',
  },
};

// Why the cloud cannot be read (connection status, test report), ≤ 100 characters.
export const ERROR_TEXT = {
  [ERROR_KINDS.AUTH]: {
    en: 'Sensibo refuses the API key.',
    fr: "Sensibo refuse la clé d'API.",
    de: 'Sensibo lehnt den API-Schlüssel ab.',
    es: 'Sensibo rechaza la clave de API.',
  },
  [ERROR_KINDS.UNREACHABLE]: {
    en: 'The Sensibo cloud does not answer.',
    fr: 'Le cloud Sensibo ne répond pas.',
    de: 'Die Sensibo-Cloud antwortet nicht.',
    es: 'La nube de Sensibo no responde.',
  },
  [ERROR_KINDS.RATE_LIMITED]: {
    en: 'Too many requests: the Sensibo cloud asks to wait.',
    fr: 'Trop de requêtes : le cloud Sensibo demande de patienter.',
    de: 'Zu viele Anfragen: Die Sensibo-Cloud bittet zu warten.',
    es: 'Demasiadas solicitudes: la nube de Sensibo pide esperar.',
  },
  [ERROR_KINDS.REFUSED]: {
    en: 'The Sensibo cloud refused the request.',
    fr: 'Le cloud Sensibo a refusé la requête.',
    de: 'Die Sensibo-Cloud hat die Anfrage abgelehnt.',
    es: 'La nube de Sensibo ha rechazado la solicitud.',
  },
};

// Errors of a command (scene action, widget, device), ≤ 200 characters.
export const ACTION_TEXT = {
  noPod: {
    en: 'No Sensibo air conditioner: check the configuration of the integration.',
    fr: "Aucune clim Sensibo : vérifiez la configuration de l'intégration.",
    de: 'Keine Sensibo-Klimaanlage: Prüfe die Konfiguration der Integration.',
    es: 'Ningún aire acondicionado Sensibo: compruebe la configuración de la integración.',
  },
  unknownPod: {
    en: 'This device is no longer on the Sensibo account.',
    fr: "Cet appareil n'est plus sur le compte Sensibo.",
    de: 'Dieses Gerät ist nicht mehr im Sensibo-Konto.',
    es: 'Este dispositivo ya no está en la cuenta Sensibo.',
  },
  offline: {
    en: 'The Sensibo is offline.',
    fr: 'Le Sensibo est hors ligne.',
    de: 'Das Sensibo ist offline.',
    es: 'El Sensibo está desconectado.',
  },
  kind: {
    en: 'This Sensibo does not drive an air conditioner.',
    fr: 'Ce Sensibo ne pilote pas de climatisation.',
    de: 'Dieses Sensibo steuert keine Klimaanlage.',
    es: 'Este Sensibo no controla un aire acondicionado.',
  },
  mode: {
    en: 'The remote of this air conditioner does not offer this mode.',
    fr: 'La télécommande de cette clim ne propose pas ce mode.',
    de: 'Die Fernbedienung dieser Klimaanlage bietet diesen Modus nicht.',
    es: 'El mando de este aire acondicionado no ofrece este modo.',
  },
  fan: {
    en: 'The remote does not offer this fan speed in this mode.',
    fr: 'La télécommande ne propose pas cette vitesse dans ce mode.',
    de: 'Die Fernbedienung bietet diese Lüfterstufe in diesem Modus nicht.',
    es: 'El mando no ofrece esta velocidad en este modo.',
  },
  swing: {
    en: 'The remote does not offer this swing position in this mode.',
    fr: 'La télécommande ne propose pas cette position de balayage dans ce mode.',
    de: 'Die Fernbedienung bietet diese Lamellenstellung in diesem Modus nicht.',
    es: 'El mando no ofrece esta posición de oscilación en este modo.',
  },
  temperature: {
    en: 'No setpoint in this mode (fan only).',
    fr: 'Pas de consigne dans ce mode (ventilation seule).',
    de: 'Keine Solltemperatur in diesem Modus (nur Lüften).',
    es: 'Sin temperatura objetivo en este modo (solo ventilación).',
  },
  unknownMode: {
    en: 'Unknown mode.',
    fr: 'Mode inconnu.',
    de: 'Unbekannter Modus.',
    es: 'Modo desconocido.',
  },
  badTemperature: {
    en: 'The temperature must be a number.',
    fr: 'La température doit être un nombre.',
    de: 'Die Temperatur muss eine Zahl sein.',
    es: 'La temperatura debe ser un número.',
  },
  failed: {
    en: 'No air conditioner accepted the command.',
    fr: "Aucune clim n'a accepté la commande.",
    de: 'Keine Klimaanlage hat den Befehl angenommen.',
    es: 'Ningún aire acondicionado ha aceptado la orden.',
  },
};

/** "<name>: <text>", with the typography of each language. */
export const labelled = (name, text, language) =>
  language === 'fr' ? `${name} : ${text}` : `${name}: ${text}`;

// "Test the connection" report.
export const REPORT_TEXT = {
  en: { found: (count) => `Connected to Sensibo: ${count} device(s).`, offline: 'offline' },
  fr: { found: (count) => `Connecté à Sensibo : ${count} appareil(s).`, offline: 'hors ligne' },
  de: { found: (count) => `Mit Sensibo verbunden: ${count} Gerät(e).`, offline: 'offline' },
  es: {
    found: (count) => `Conectado a Sensibo: ${count} dispositivo(s).`,
    offline: 'desconectado',
  },
};

// Names of the modes, by Sensibo mode key: the words of the Gladys interface
// (air conditioning modes of front/src/config/i18n).
export const MODE_TEXT = {
  auto: { en: 'Auto', fr: 'Auto', de: 'Automatisch', es: 'Auto' },
  cool: { en: 'Cooling', fr: 'Refroidissement', de: 'Kühlen', es: 'Frío' },
  heat: { en: 'Heating', fr: 'Chauffage', de: 'Heizen', es: 'Calor' },
  dry: { en: 'Drying', fr: 'Déshumidification', de: 'Entfeuchten', es: 'Seco' },
  fan: { en: 'Fan', fr: 'Ventilation', de: 'Lüften', es: 'Ventilador' },
};
