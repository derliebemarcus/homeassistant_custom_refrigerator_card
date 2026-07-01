import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("src/homeassistant_custom_refrigerator_card.js", "utf8");
const distribution = await readFile("dist/homeassistant_custom_refrigerator_card.js", "utf8");
const manifest = JSON.parse(await readFile("hacs.json", "utf8"));
const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const packageLock = JSON.parse(await readFile("package-lock.json", "utf8"));
const changesetsConfig = JSON.parse(await readFile(".changeset/config.json", "utf8"));

assert.equal(distribution, source, "dist file must match the source build");
assert.equal(manifest.name, "LG ThinQ Refrigerator Card");
assert.equal(manifest.filename, "homeassistant_custom_refrigerator_card.js");
assert.match(packageJson.version, /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/);
assert.equal(packageLock.version, packageJson.version);
assert.equal(packageLock.packages[""].version, packageJson.version);
assert.equal(changesetsConfig.baseBranch, "main");
assert.equal(changesetsConfig.privatePackages.version, true);
assert.equal(changesetsConfig.privatePackages.tag, false);
assert.equal(packageJson.engines.node, ">=24");

for (const expected of [
  'customElements.define("refrigerator-card"',
  'type: "refrigerator-card"',
  'config/entity_registry/list_for_display',
  '_fridge_temperature',
  '_freezer_temperature',
  'prefers-reduced-motion',
  'getEntitySuggestion',
  'globalThis.customCards',
]) {
  assert.ok(source.includes(expected), `missing required feature: ${expected}`);
}

console.log("Refrigerator card validation passed");
