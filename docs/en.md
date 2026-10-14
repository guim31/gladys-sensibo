# Sensibo

Control from Gladys the air conditioners and air-to-air heat pumps driven by a
[Sensibo](https://sensibo.com) (Sky, Air, Air Pro), through the official Sensibo
cloud API: power, mode, target temperature, fan speed and swing, Climate React,
and the room temperature, humidity and air quality the Sensibo measures. The
Sensibo Pure (air purifier) and Elements (air quality monitor) are supported
too. A dashboard widget shows every air conditioner with On and Off buttons,
and scenes react when a Sensibo goes offline or a filter needs cleaning.

> **Developed without the hardware: feedback welcome.** This integration was
> built and tested against a simulated Sensibo cloud, fed with real devices
> from the test data of pysensibo and Home Assistant, not with a real Sensibo
> account. If something does not work as described, say so on the
> [Gladys forum](https://community.gladysassistant.com) or in the
> [issues](https://github.com/guim31/gladys-sensibo/issues).

## Requirements

- Gladys Assistant 5.1.0 or newer.
- A **Sensibo account** with your devices already set up in the Sensibo app
  (remote of the air conditioner detected).
- A Sensibo **API key**: sign in at
  [home.sensibo.com/me/api](https://home.sensibo.com/me/api) and create one.
- An Internet connection: the integration talks to the Sensibo cloud.

## Getting started

1. Install the integration from the Gladys catalog.
2. In **Configuration**, paste the **API key**, then save.
3. Click **Test the connection**: the message under the button lists the
   devices of the account.
4. Open the **Discovery** tab: one device per Sensibo, named after its room in
   the Sensibo app. Click **Add**, choose a room, save.

Options:

- **Refresh interval**: how often the Sensibo cloud is read, from 1 to 10
  minutes (2 minutes by default). One request reads every device. A change made
  from Gladys shows at once; a change made with the remote or the Sensibo app
  shows at the next reading.
- **Language of the names**: English, French, German or Spanish (French by
  default), for the feature names (given when a device is added) and the
  messages of the integration.

## The device of each Sensibo

| Feature            | What it is                                                                                    |
| ------------------ | --------------------------------------------------------------------------------------------- |
| Power              | Turns the air conditioner (or the Pure) on and off                                            |
| Mode               | Auto, Cooling, Heating, Drying, Fan: only the modes the remote of your air conditioner offers |
| Target temperature | Bounded by the setpoints of the remote, in the unit chosen in the Sensibo app                 |
| Fan speed          | Auto, low to high, quiet, turbo: the levels the remote offers in the current mode             |
| Vertical swing     | Off, swing, or one of five fixed positions                                                    |
| Horizontal swing   | Off, swing, or one of five fixed positions                                                    |
| Climate React      | Turns on or off the Climate React automation, set up in the Sensibo app                       |
| Room temperature   | Measured by the Sensibo, read only                                                            |
| Humidity           | Measured by the Sensibo, read only                                                            |
| CO2                | Air Pro and Elements, read only                                                               |
| TVOC               | Volatile organic compounds, Air Pro and Elements, read only                                   |
| PM2.5              | Fine particles, Elements, read only                                                           |
| Filter life        | Share of the cleaning interval left: 0 % means clean the filter                               |

A feature only appears when the device offers it: the Pure has Power and Filter
life, the Elements only its measurements. The badge of the device shows
**Cloud** while the Sensibo is connected and **Unreachable** when it is
offline.

**Safety.** A command never leaves what the remote of your air conditioner can
send: a mode it lacks is refused, a target temperature is brought within its
setpoints (17 °C asked on a remote that cools from 18 °C gives 18 °C), and a fan
speed or swing position it lacks in the current mode is refused with a message.
These are the air conditioning features Gladys gives its other air conditioners.

## Dashboard

Add the **Sensibo air conditioners** widget to a dashboard. By default it lists
every air conditioner: Off, or the mode and target temperature when on, then the
room temperature. Choose one in its settings to show it alone. Its two buttons
act on what the widget shows:

- **On**: turns on with the last mode and target temperature, like the power
  button of the remote;
- **Off**: turns off.

The button of the current state carries a check mark when every air conditioner
shown is in it. Mode, target temperature and fan speed are on the device.

## Scenes

### Triggers

- **Sensibo offline**: a Sensibo lost its connection to the Sensibo cloud
  (Wi-Fi, power cut). Filter: the device. Variables: name and device.
- **Sensibo back online**: the Sensibo is connected again. Filter: the device.
- **Filter to clean**: Sensibo says the filter needs cleaning, after the running
  time set in the Sensibo app. Filter: the device.

For a temperature or humidity out of range, use the device trigger of Gladys on
the _Room temperature_ or _Humidity_ feature (for example "above 28 °C"): it
already fires on the crossing.

### Actions

- **Turn on Sensibo air conditioners**: one air conditioner, or all of them when
  the field is empty, in a mode (Cooling, Heating, Auto, Drying, Fan), at a
  temperature in °C (converted for the devices set to Fahrenheit), in a single command. The temperature is brought within the
  setpoints of each remote in that mode; empty, the current one is kept.
  Outputs: the number of air conditioners turned on, and the temperature
  applied.
- **Turn off Sensibo air conditioners**: one air conditioner, or all of them
  when the field is empty. The offline ones are skipped. Output: the number
  turned off.

For one feature of one device, the Gladys action _Control a device_ works too.

### Scene ideas

- **Leaving home** (alarm armed): _Turn off Sensibo air conditioners_, field
  empty: every air conditioner off.
- **Heat wave**: when the _Room temperature_ of the bedroom goes above 27 °C,
  between 2 pm and 8 pm: _Turn on Sensibo air conditioners_, bedroom, Cooling, 25.
- **Filter reminder**: _Filter to clean_ → send a message: "Clean the filter of
  {{triggerEvent.data.name}}".

## Troubleshooting

- **"Sensibo refuses the API key"**: check the key at
  [home.sensibo.com/me/api](https://home.sensibo.com/me/api), or create a new
  one. After this error, the integration only tries again once an hour, or
  at once when you save the configuration or click **Test the connection**.
- **"Too many requests"**: the Sensibo cloud limits the requests of a key; the
  integration waits ten minutes. Choose a longer interval if it comes back.
- **A mode or a fan speed is refused**: the remote of your air conditioner does
  not offer it in this mode. The Sensibo app shows what it offers.
- **The air conditioner does not react**: a Sensibo sends infrared: check that
  it sees the indoor unit, and that the remote set up in the Sensibo app is the
  right one.
- **More details**: the logs of the integration (Settings → Integrations →
  Sensibo). They never contain the API key.

## Limits

- Cloud only: without Internet, or when the Sensibo cloud is down, nothing can
  be controlled from Gladys.
- A reading every minute at most, to respect the limits of the Sensibo API.
  Changes made with the remote are seen at the next reading.
- Infrared has no feedback: the state shown is the one Sensibo last sent, not
  one read from the air conditioner.
- Climate React, schedules, timers, the Pure Boost and the Sensibo motion
  sensors are set up in the Sensibo app; Gladys only turns Climate React on and
  off. The fan speed of the Pure is not exposed.
- On a dashboard, Gladys may label the Climate React switch with its generic
  name, "Switch".
- Developed without the hardware: feedback welcome.
- Not affiliated with Sensibo.
