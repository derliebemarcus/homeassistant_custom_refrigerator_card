# Troubleshooting

## Validation fails

Run the documented local test commands and inspect the first failing quality gate.

## Renovate stops after a configuration error

The effective Renovate policy is stored in the repository's `renovate.json`. Do not replace it with a private cross-repository preset unless the Mend Renovate app has verified read access to that preset repository. Run `npm test` to validate the required npm and major-update rules before opening a pull request.

## Runtime cannot reach an external dependency

Verify DNS, network reachability, credentials, permissions, quotas, and upstream status.

## Configuration is rejected

Compare the deployed values with the configuration reference and remove stale generated artifacts or caches where applicable.

## A release or deployment is unhealthy

Stop further automation and follow the rollback procedure.
