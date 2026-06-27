import assert from "node:assert/strict";
import test from "node:test";

import { createHass, installCardDom } from "./test-helpers.mjs";

const registry = installCardDom();
await import("../../src/homeassistant_custom_refrigerator_card.js");
const RefrigeratorCard = registry.get("refrigerator-card");

test("validates configuration and exposes layout metadata", () => {
  const card = new RefrigeratorCard();

  assert.throws(
    () => card.setConfig({}),
    /refrigerator-card requires device_id or entities/,
  );
  assert.deepEqual(RefrigeratorCard.getStubConfig(), {
    type: "custom:refrigerator-card",
    device_id: "",
    title: "Kühlschrank",
  });
  assert.equal(card.getCardSize(), 6);
  assert.deepEqual(card.getGridOptions(), {
    columns: 12,
    min_columns: 6,
    rows: 6,
    min_rows: 4,
  });

  card.setConfig({
    title: "Configured fridge",
    entities: { door: "binary_sensor.fridge_door" },
  });
  assert.deepEqual(card._entities, { door: "binary_sensor.fridge_door" });
  assert.equal(card._config.show_modes, true);
  assert.match(card.shadowRoot.innerHTML, /Loading|Kühlschrank wird geladen/);
});

test("discovers matching LG ThinQ entities and recovers from registry errors", async () => {
  const card = new RefrigeratorCard();
  card.setConfig({ device_id: "device-1" });
  card._hass = createHass();
  card._hass.callWS = async () => ({
    entities: [
      {
        di: "device-1",
        pl: "lg_thinq",
        ei: "binary_sensor.kitchen_door_open",
      },
      {
        device_id: "device-1",
        platform: "lg_thinq",
        entity_id: "switch.kitchen_express_mode",
      },
      {
        di: "device-1",
        pl: "home_connect",
        ei: "sensor.ignored_notification",
      },
      {
        di: "other-device",
        pl: "lg_thinq",
        ei: "sensor.other_fridge_temperature",
      },
    ],
  });

  await card._discover();

  assert.deepEqual(card._entities, {
    door: "binary_sensor.kitchen_door_open",
    quickFreeze: "switch.kitchen_express_mode",
  });
  assert.equal(card._discovering, false);

  const originalError = console.error;
  const errors = [];
  console.error = (...args) => errors.push(args);
  try {
    card._hass.callWS = async () => {
      throw new Error("registry unavailable");
    };
    await card._discover();
  } finally {
    console.error = originalError;
  }

  assert.deepEqual(card._entities, {});
  assert.match(String(errors[0]?.[0]), /discovery failed/);
});

test("dispatches more-info events and isolates service-call failures", async () => {
  const card = new RefrigeratorCard();
  card._config = { title: "Fridge" };
  card._entities = { door: "binary_sensor.fridge_door" };
  card._hass = createHass();

  const calls = [];
  card._hass.callService = async (...args) => calls.push(args);
  await card._service("homeassistant", "toggle", {
    entity_id: "switch.fridge_mode",
  });
  assert.deepEqual(calls, [
    ["homeassistant", "toggle", { entity_id: "switch.fridge_mode" }],
  ]);

  card._moreInfo("door");
  assert.equal(card.lastDispatchedEvent.type, "hass-more-info");
  assert.deepEqual(card.lastDispatchedEvent.detail, {
    entityId: "binary_sensor.fridge_door",
  });

  card.lastDispatchedEvent = null;
  card._moreInfo("missing");
  assert.equal(card.lastDispatchedEvent, null);

  const originalError = console.error;
  const errors = [];
  console.error = (...args) => errors.push(args);
  try {
    card._hass.callService = async () => {
      throw new Error("service unavailable");
    };
    await card._service("number", "set_value", { value: 4 });
  } finally {
    console.error = originalError;
  }
  assert.match(String(errors[0]?.[0]), /number\.set_value failed/);
});
