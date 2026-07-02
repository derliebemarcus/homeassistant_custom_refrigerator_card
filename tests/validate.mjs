import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("src/homeassistant_custom_refrigerator_card.js", "utf8");
const distribution = await readFile("dist/homeassistant_custom_refrigerator_card.js", "utf8");
const readme = await readFile("README.md", "utf8");
const manifest = JSON.parse(await readFile("hacs.json", "utf8"));
const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const packageLock = JSON.parse(await readFile("package-lock.json", "utf8"));
const changesetsConfig = JSON.parse(await readFile(".changeset/config.json", "utf8"));

const supportedHomeAssistant = "2026.7.0";

assert.equal(distribution, source);
assert.equal(manifest.name, "LG ThinQ Refrigerator Card");
assert.equal(manifest.filename, "homeassistant_custom_refrigerator_card.js");
assert.equal(manifest.homeassistant, supportedHomeAssistant);
assert.match(manifest.homeassistant, /^\d{4}\.\d{1,2}\.0$/);
assert.ok(readme.includes("Home Assistant " + supportedHomeAssistant + " or newer"));
assert.equal(packageLock.version, packageJson.version);
assert.equal(packageLock.packages[""].version, packageJson.version);
assert.equal(changesetsConfig.baseBranch, "main");
assert.equal(changesetsConfig.privatePackages.version, true);
assert.equal(changesetsConfig.privatePackages.tag, false);
assert.equal(packageJson.engines.node, ">=24");

const versionPattern = /const VERSION = "([^"\n]+)";/;
assert.equal(source.match(versionPattern)?.[1], packageJson.version);
assert.equal(distribution.match(versionPattern)?.[1], packageJson.version);

assert.ok(source.includes('customElements.define("refrigerator-card"'));
assert.ok(source.includes('globalThis.customCards'));

console.log("Refrigerator card validation passed");
