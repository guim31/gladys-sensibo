# Sensibo for Gladys Assistant

A [Gladys Assistant](https://gladysassistant.com) external integration for the
[Sensibo](https://sensibo.com) smart air conditioner controllers: drive the air
conditioners and air-to-air heat pumps behind a Sensibo Sky, Air or Air Pro from
Gladys, its dashboards and its scenes, through the official Sensibo cloud API.

> **Developed without the hardware: feedback welcome.** The integration was
> built and tested against a simulated Sensibo cloud fed with real devices from
> the test data of [pysensibo](https://github.com/andrey-git/pysensibo) and of
> the [Home Assistant Sensibo integration](https://www.home-assistant.io/integrations/sensibo/),
> not with a real Sensibo account. Please report what works and what does not
> on the [Gladys forum](https://community.gladysassistant.com) or in the
> [issues](https://github.com/guim31/gladys-sensibo/issues).

## Features

- **One device per Sensibo** of the account, named after its room in the
  Sensibo app:
  - **air conditioning**: power, mode (auto, cooling, heating, drying, fan),
    target temperature, fan speed, vertical and horizontal swing, with the
    core's own `air-conditioning` couples;
  - **Climate React** switch, when it is set up in the Sensibo app;
  - **room temperature** and **humidity**, **CO2** and **TVOC** (Air Pro,
    Elements), **PM2.5** (Elements), read only;
  - **filter life**: the share of the cleaning interval left.
- **Sensibo Pure** (power, filter life) and **Sensibo Elements** (measurements).
- **Dashboard widget** _Sensibo air conditioners_: the state, mode, setpoint and
  room temperature of every air conditioner (or of one), with On and Off
  buttons.
- **Scene triggers**: Sensibo offline, Sensibo back online, filter to clean.
- **Scene actions**: turn on one or every air conditioner in a mode at a
  temperature (one command), turn off one or all of them.
- Device badge **Cloud** / **Unreachable** following the connection of each
  Sensibo; English, French, German and Spanish everywhere.

### Safety choices

An air conditioner is not a main heating, and a remote only knows some modes
and setpoints. So every command stays within the `remoteCapabilities` the API
returns for the remote: a mode the remote lacks is refused, a setpoint is
clamped to the setpoints of the mode then rounded to the nearest one, a fan
speed or swing position missing in the mode is refused, and changing mode drops
or replaces what the new mode does not know. The features are those the Gladys
core gives its other air conditioners (MELCloud, Matter). The widget only
offers On and Off.

## Requirements

- Gladys Assistant **5.1.0** or later.
- A Sensibo account with an **API key** (created at
  [home.sensibo.com/me/api](https://home.sensibo.com/me/api)) and an Internet
  connection.

## Installation

1. In Gladys: **Integrations → Install from GitHub**, with the address
   `https://github.com/guim31/gladys-sensibo` (or from the catalog once listed).
2. In **Configuration**, paste the API key, save, then **Test the connection**.
3. Add the devices from the **Discovery** tab.

The user documentation is in [`docs/`](docs/en.md) (English, French, German,
Spanish), also shown by Gladys.

## How it works

- `GET https://home.sensibo.com/api/v2/users/me/pods?fields=*` reads every pod
  in one request, on a timer of the container: every 1 to 10 minutes (2 by
  default). The devices are published with `should_poll: false`.
- Commands: `POST /pods/<id>/acStates` with the complete AC state (one infrared
  frame for mode and setpoint together); the answer gives the state applied,
  published at once. Climate React: `PUT /pods/<id>/smartmode` with
  `{ enabled }`.
- The key travels in the `apiKey` query parameter, as the API documents; no URL
  is ever logged. Nothing is written to `/data`.
- A refused key stops the readings until the configuration changes; a "too many
  requests" answer pauses them ten minutes.

## Limitations

- Cloud only (the Sensibo local API is not public).
- Changes made with the remote or the app show at the next reading; infrared
  has no feedback, so the state is the one Sensibo last sent.
- Climate React settings, schedules, timers, Pure Boost and the motion sensors
  stay in the Sensibo app. The fan speed of the Pure is not exposed.
- No dedicated trigger for a temperature out of range: the core's device
  trigger on the _Room temperature_ feature already fires on the crossing (the
  integration's triggers can only filter on equality).
- Developed without the hardware: the API shapes come from pysensibo, the Home
  Assistant integration and their real fixtures, not from a real account.
- The Sensibo Air is also reachable through HomeKit (prohand's HomeKit
  Controller integration, local); this integration covers every Sensibo model
  through the cloud.

## Development

```bash
npm ci
npm run format:check
npm run lint
npm test
npx -y github:GladysAssistant/integration-store --skip-image-check .
```

The tests use the fake Gladys of the SDK (`@gladysassistant/integration-sdk/testing`)
and a simulated Sensibo cloud (`test/helpers/fakeSensibo.js`) loaded with the
devices of `test/fixtures/sensibo/`. See [`CLAUDE.md`](CLAUDE.md) for the
project rules.

## Credits

- [pysensibo](https://github.com/andrey-git/pysensibo) by Andrey and
  contributors (MIT): the endpoints, the field names, and the device examples of
  `examples/response.json` (Sky v2, Pure, Elements), anonymized in
  `test/fixtures/sensibo/`.
- The [Home Assistant Sensibo integration](https://github.com/home-assistant/core/tree/dev/homeassistant/components/sensibo)
  (Apache-2.0): the behaviour of the commands and the test data of
  `tests/components/sensibo/fixtures/data.json`, from which the Air Pro fixture
  is derived (its CO2 and TVOC values are illustrative).
- The architecture and the conformity tests follow
  [gladys-heatzy](https://github.com/guim31/gladys-heatzy) and
  [gladys-wled](https://github.com/guim31/gladys-wled).

## Disclaimer

This project is not affiliated with, endorsed or sponsored by Sensibo.
"Sensibo" is a trademark of its owner.

## License

Apache-2.0
