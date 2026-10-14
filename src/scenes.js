// -----------------------------------------------------------------------------
// Scene action handlers (manifest `scene_actions`, Gladys 5.1+).
//
// "Control a device" already sets one feature of one air conditioner; these
// set the mode and the setpoint in a single command (one infrared frame, so
// the unit does not beep through every step), and reach every air
// conditioner at once ("everything off when the house is empty"). The fields
// arrive resolved; an empty device means every air conditioner.
// -----------------------------------------------------------------------------

export const SCENE_ACTIONS = {
  async turn_on(hub, { fields = {} }) {
    const done = await hub.turnOn(fields.device || null, fields.mode, fields.temperature);
    // What was really applied, after the remote's limits, in °C: the first one.
    const applied = done.find((pod) => pod.targetTemperature !== null && pod.mode !== 4);
    const outputs = { count: done.length };
    if (applied) {
      outputs.temperature =
        applied.unit === 'F'
          ? Math.round((((applied.targetTemperature - 32) * 5) / 9) * 10) / 10
          : applied.targetTemperature;
    }
    return outputs;
  },

  async turn_off(hub, { fields = {} }) {
    const done = await hub.setPower(fields.device || null, false);
    return { count: done.length };
  },
};
