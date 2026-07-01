#!/usr/bin/env bash
set -euo pipefail

branch='feat/migrate-shared-card-profile-15'
repository='derliebemarcus/homeassistant_custom_refrigerator_card'

git fetch origin "refs/heads/${branch}:refs/remotes/origin/${branch}"
git checkout -B "$branch" "origin/$branch"

node <<'NODE'
const fs = require('node:fs');
const path = 'package.json';
const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));
pkg.overrides = { ...(pkg.overrides || {}), qs: '6.15.2' };
fs.writeFileSync(path, `${JSON.stringify(pkg, null, 2)}\n`);
NODE

podman run --rm --userns=keep-id \
  -v "$PWD:/workspace:z" \
  -w /workspace \
  registry.home.siczb.de/siczb/homeassistant-card-ci:24 \
  npm install --package-lock-only --ignore-scripts

node <<'NODE'
const fs = require('node:fs');
const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
if (lock.packages['node_modules/@stryker-mutator/core']?.version !== '9.6.1') {
  throw new Error('Expected Stryker 9.6.1 from Dishwasher canary');
}
if (lock.packages['node_modules/qs']?.version !== '6.15.2') {
  throw new Error('Expected qs 6.15.2 from Dishwasher canary');
}
NODE

git add package.json package-lock.json
if git diff --cached --quiet; then
  exit 0
fi

git config user.name 'jenkins-release'
git config user.email 'jenkins-release@users.noreply.github.com'
git commit -m 'fix: align dependencies with Dishwasher canary'
gh auth setup-git
git remote set-url origin "https://github.com/${repository}.git"
git push origin "HEAD:refs/heads/${branch}"
