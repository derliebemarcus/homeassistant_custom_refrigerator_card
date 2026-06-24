import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("src/homeassistant_custom_refrigerator_card.js", "utf8");
const distribution = await readFile("dist/homeassistant_custom_refrigerator_card.js", "utf8");
const manifest = JSON.parse(await readFile("hacs.json", "utf8"));
const packageJson = JSON.parse(await readFile("package.json", "utf8"));

assert.equal(distribution, source, "dist file must match the source build");
assert.equal(manifest.name, "LG ThinQ Refrigerator Card");
assert.equal(manifest.filename, "homeassistant_custom_refrigerator_card.js");
assert.equal(packageJson.version, "0.1.1");
assert.equal(packageJson.engines.node, ">=24");

for (const expected of [
  'customElements.define("refrigerator-card"',
  'type: "refrigerator-card"',
  'config/entity_registry/list_for_display',
  'platform === "lg_thinq"',
  '_fridge_temperature',
  '_freezer_temperature',
  '_eco_friendly',
  '_vacation_mode',
  '_express_cool',
  '_express_mode',
  '_quick_freeze',
  'event_type',
  'number", "set_value',
  'homeassistant", "toggle',
  'prefers-reduced-motion',
]) {
  assert.ok(source.includes(expected), `missing required feature: ${expected}`);
}

console.log("Refrigerator card validation passed");
