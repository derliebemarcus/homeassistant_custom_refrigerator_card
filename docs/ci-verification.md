# CI verification

The repository uses the central `homeassistant-card` profile from
`jenkins-shared-library@main`.

The Jenkinsfile contains only declarative repository and profile configuration. Quality,
security, reporting, Home Assistant, and release stages are implemented by the shared
library. Stage groups run sequentially by default; parallel execution requires an explicit
profile opt-in.

Forgejo is the authoritative SCM provider. Jenkins publishes commit status through the
Forgejo API, validates workflows under `.forgejo/workflows/`, and delegates release creation
to Forgejo.

Documentation-only changes are classified before the full profile starts. Repository
documentation is validated through the central documentation contract.
