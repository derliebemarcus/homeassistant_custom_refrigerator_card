import assert from "node:assert/strict";
import test from "node:test";

import {
  createHass,
  entityState,
  installCardDom,
} from "./test-helpers.mjs";

const registry = installCardDom();
await import("../../src/homeassistant_custom_refrigerator_card.js");
const RefrigeratorCard = registry.get("refrigerator-card");

function createCard({
  language = "de",
  entities = {},
  states = {},
  config = {},
} = {}) {
  const card = new RefrigeratorCard();
  card._config = {
    title: "Kühlschrank",
    show_notification: true,
    show_modes: true,
    show_temperature_controls: true,
    ...config,
  };
  card._entities = entities;
  card._hass = createHass(states, language);
  return card;
}

test("selects German and English labels from Home Assistant locale", () => {
  const german = createCard({ language: "de-CH" });
  const english = createCard({ language: "fr-FR" });

  assert.equal(german._language, "de");
  assert.equal(german._text.doorOpen, "Tür offen");
  assert.equal(english._language, "en");
  assert.equal(english._text.doorOpen, "Door open");
});

test("reads entity state, domain, availability and numeric values", () => {
  const entities = {
    door: "binary_sensor.fridge_door",
    quickFreeze: "switch.fridge_quick_freeze",
    fridgeTemperature: "number.fridge_temperature",
  };
  const states = {
    "binary_sensor.fridge_door": entityState("on"),
    "switch.fridge_quick_freeze": entityState("off"),
    "number.fridge_temperature": entityState("4"),
  };
  const card = createCard({ entities, states });

  assert.equal(card._state("door").state, "on");
  assert.equal(card._available("door"), true);
  assert.equal(card._domain("quickFreeze"), "switch");
  assert.equal(card._canToggle("quickFreeze"), true);
  assert.equal(card._canToggle("door"), false);
  assert.equal(card._on("quickFreeze"), false);
  assert.equal(card._doorOpen(), true);
  assert.equal(card._number("fridgeTemperature"), 4);

  card._hass.states["number.fridge_temperature"] = entityState("unknown");
  assert.equal(card._available("fridgeTemperature"), false);
  assert.equal(card._number("fridgeTemperature"), null);
});

test("creates a stable state signature from relevant attributes", () => {
  const entities = { fridgeTemperature: "number.fridge_temperature" };
  const states = {
    "number.fridge_temperature": entityState("5", {
      min: 1,
      max: 7,
      step: 1,
      event_type: "door_is_open",
    }),
  };
  const card = createCard({ entities, states });

  assert.equal(
    card._stateSignature(),
    JSON.stringify({
      fridgeTemperature: ["5", 1, 7, 1, "door_is_open"],
    }),
  );
});

test("normalizes notifications and translates known event types", () => {
  const entities = { notification: "event.fridge_notification" };
  const card = createCard({
    entities,
    states: {
      "event.fridge_notification": entityState("2026-06-25", {
        event_type: "door_is_open",
      }),
    },
  });

  assert.equal(card._eventType(), "door_is_open");
  assert.equal(card._eventLabel("door_is_open"), "Die Kühlschranktür ist offen");
  assert.equal(card._eventLabel("custom_filter_event"), "Custom Filter Event");
  assert.equal(card._eventLabel(""), "");

  card._hass.states["event.fridge_notification"] = entityState("2026-06-25", {
    event_type: "none",
  });
  assert.equal(card._eventType(), "");
});

test("escapes all HTML-sensitive characters", () => {
  const card = createCard();
  assert.equal(
    card._escape(`<&>"'`),
    "&lt;&amp;&gt;&quot;&#039;",
  );
  assert.equal(card._escape(null), "");
});

test("renders temperature controls only for usable number entities", () => {
  const entities = { fridgeTemperature: "number.fridge_temperature" };
  const states = {
    "number.fridge_temperature": entityState("4", {
      min: 1,
      max: 7,
      step: 1,
      unit_of_measurement: "°C",
    }),
  };
  const card = createCard({ entities, states });

  const enabled = card._temperatureZone(
    "fridgeTemperature",
    "Kühlteil",
    "mdi:fridge-top",
  );
  assert.match(enabled, /type="range"/);
  assert.match(enabled, /value="4"/);
  assert.match(enabled, /4 °C/);

  card._config.show_temperature_controls = false;
  const disabled = card._temperatureZone(
    "fridgeTemperature",
    "Kühlteil",
    "mdi:fridge-top",
  );
  assert.doesNotMatch(disabled, /type="range"/);

  card._hass.states["number.fridge_temperature"] = entityState("unavailable");
  const unavailable = card._temperatureZone(
    "fridgeTemperature",
    "Kühlteil",
    "mdi:fridge-top",
  );
  assert.match(unavailable, />—</);
});

test("distinguishes interactive and read-only mode controls", () => {
  const entities = {
    ecoMode: "switch.fridge_eco",
    quickFreeze: "binary_sensor.fridge_quick_freeze",
  };
  const states = {
    "switch.fridge_eco": entityState("on"),
    "binary_sensor.fridge_quick_freeze": entityState("off"),
  };
  const card = createCard({ entities, states });

  const controls = card._modeControls();
  assert.match(controls, /data-toggle="ecoMode"/);
  assert.match(controls, /data-info="quickFreeze"/);
  assert.match(controls, /mode active interactive/);
  assert.match(controls, /readonly/);

  card._config.show_modes = false;
  assert.equal(card._modeControls(), "");
});

test("renders loading, missing and populated card states", () => {
  const card = new RefrigeratorCard();
  card._config = {
    title: "Test fridge",
    show_notification: true,
    show_modes: true,
    show_temperature_controls: true,
  };

  card._render();
  assert.match(card.shadowRoot.innerHTML, /Kühlschrank wird geladen/);

  card._hass = createHass({}, "de");
  card._entities = {};
  card._render();
  assert.match(card.shadowRoot.innerHTML, /Keine LG-ThinQ-Entitäten gefunden/);

  card._entities = {
    door: "binary_sensor.fridge_door",
    fridgeTemperature: "number.fridge_temperature",
    freezerTemperature: "number.freezer_temperature",
    ecoMode: "switch.fridge_eco",
  };
  card._hass = createHass({
    "binary_sensor.fridge_door": entityState("off"),
    "number.fridge_temperature": entityState("4", {
      min: 1,
      max: 7,
      step: 1,
      unit_of_measurement: "°C",
    }),
    "number.freezer_temperature": entityState("-18", {
      min: -24,
      max: -15,
      step: 1,
      unit_of_measurement: "°C",
    }),
    "switch.fridge_eco": entityState("on"),
  });
  card._render();

  assert.match(card.shadowRoot.innerHTML, /Test fridge/);
  assert.match(card.shadowRoot.innerHTML, /Tür geschlossen/);
  assert.match(card.shadowRoot.innerHTML, /Kühlteil/);
  assert.match(card.shadowRoot.innerHTML, /Gefrierteil/);
});
