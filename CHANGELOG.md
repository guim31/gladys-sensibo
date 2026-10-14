# Changelog

All notable changes to this integration are documented in this file. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
uses [semantic versioning](https://semver.org/).

Describe each change under `## [Unreleased]` as you make it. The Release
workflow moves that section under the version it ships, and the section becomes
the notes of the version's GitHub Release.

## [Unreleased]

### Added

- Sensibo Sky, Air and Air Pro air conditioner controllers, through the
  official Sensibo cloud API and an API key: one device per Sensibo with power,
  mode, target temperature, fan speed, vertical and horizontal swing and
  Climate React, plus the room temperature, humidity, CO2 and TVOC it measures,
  and the filter life.
- Sensibo Pure (power, filter life) and Sensibo Elements (temperature,
  humidity, CO2, TVOC, PM2.5).
- Commands kept within the capabilities of the remote: unknown modes, fan
  speeds and swing positions refused, setpoints brought within its values.
- `air_conditioners` dashboard widget: the state, mode, setpoint and room
  temperature of each air conditioner, with On and Off buttons.
- Scene triggers: Sensibo offline, Sensibo back online, filter to clean.
- Scene actions: turn on air conditioners in a mode at a temperature, turn off
  one or all of them.
- Configuration: API key, refresh interval (1 to 10 minutes), language of the
  names (English, French, German, Spanish), and a "Test the connection" button.
