// -----------------------------------------------------------------------------
// The `air_conditioners` widget: content within the core's vocabulary and
// budget, the rows of each air conditioner, the buttons and their commands.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateWidgetContent } from '@gladysassistant/integration-sdk';
import { WIDGET_KEY } from '../src/hub.js';
import { ACTIONS } from '../src/widgets.js';
import { ACCOUNT, createWorld, deviceId } from './helpers/world.js';

const get = async (world, settings = {}, language = 'fr') => {
  const ack = await world.fake.widgetGet(WIDGET_KEY, { settings, language });
  assert.equal(ack.success, true, ack.error);
  const { content } = ack.data;
  assert.deepEqual(validateWidgetContent(content), [], JSON.stringify(content));
  return content;
};

test('every air conditioner gets a row, with two buttons, in every language', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  for (const language of ['en', 'fr', 'de', 'es']) {
    const [status, ...buttons] = (await get(world, {}, language)).components;
    assert.equal(status.items.length, 2, 'the Pure and the Elements are not listed');
    assert.deepEqual(
      buttons.map((button) => button.action.key),
      [ACTIONS.ON, ACTIONS.OFF],
    );
  }
  const [status] = (await get(world)).components;
  assert.deepEqual(
    status.items.map((item) => [item.label, item.value]),
    [
      ['Living room', 'Arrêt · pièce 20,2 °C'],
      ['Hallway', 'Chauffage · 22 °C · pièce 21,2 °C'],
    ],
  );
});

test('one air conditioner: its row, and the check mark on its state', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  const content = await get(world, { device: deviceId(world, 'air-pro') });
  assert.equal(content.components[0].items.length, 1);
  const marked = content.components.filter((c) => c.type === 'button' && c.icon === 'check-circle');
  assert.deepEqual(
    marked.map((button) => button.action.key),
    [ACTIONS.ON],
  );
});

test('a button turns on or off what the widget shows', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  let ack = await world.fake.widgetAction(WIDGET_KEY, ACTIONS.OFF, {}, { settings: {} });
  assert.equal(ack.success, true, ack.error);
  assert.equal(ack.data.message.fr, 'Éteinte(s) : 2 clim(s).');
  assert.equal(world.cloud.pod('air-pro').acState.on, false);
  ack = await world.fake.widgetAction(
    WIDGET_KEY,
    ACTIONS.ON,
    {},
    {
      settings: { device: deviceId(world, 'sky') },
    },
  );
  assert.equal(ack.success, true, ack.error);
  assert.equal(world.cloud.pod('sky').acState.on, true);
  assert.equal(world.cloud.pod('air-pro').acState.on, false);
});

test('messages: no key, a cloud error over the last known rows', async (t) => {
  const world = await createWorld({ config: { language: 'fr' } });
  t.after(() => world.app.stop());
  let content = await get(world);
  assert.match(content.components[0].text, /clé d'API/);
  await world.fake.configUpdated(ACCOUNT);
  world.cloud.failures.push({ status: 503, body: null });
  await world.hub.poll();
  content = await get(world);
  assert.equal(content.components[0].type, 'text');
  assert.equal(content.components[1].items.length, 2);
});
