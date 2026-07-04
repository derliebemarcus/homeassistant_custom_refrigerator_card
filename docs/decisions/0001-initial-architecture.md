# 0001: Prefer device-based discovery with explicit entity overrides.

## Status

Accepted

## Date

2026-07-04

## Context

Standalone Home Assistant dashboard card for LG ThinQ refrigerators with temperature controls, door warnings, modes, and notifications.

## Decision drivers

- Accurate target-temperature and door-state presentation
- Responsive and accessible rendering
- Graceful handling of optional capabilities

## Considered options

1. Retain the established architecture
2. Replace it with a tightly coupled alternative
3. Defer the architectural boundary to deployment-specific code

## Decision

Prefer device-based discovery with explicit entity overrides.

## Rationale

The Home Assistant device registry is more stable than installation-specific entity names while explicit mappings preserve an escape hatch.

## Consequences

- The documented building blocks and interfaces remain explicit contracts.
- Changes to the decision require a superseding ADR.

## Risks

- Entity names differ between LG ThinQ appliance generations.
- Home Assistant frontend APIs can change across releases.

## References

- maintenance issue #37
