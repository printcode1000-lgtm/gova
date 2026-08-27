# Unresolved Questions & Inspection Log

This log tracks architectural areas requiring deeper investigation, verification against live traffic, or ongoing monitoring.

---

## 1. Native Plugin Compatibility Baseline vs OTA Publish

- **Context**: `architecture:check` reported a notice regarding native plugins and OTA publishing:
  ```text
  This is not an architecture violation and does not fail the check.
  It means ota:publish will refuse until you either ship a store build
  and re-tag the baseline, or declare the minimum native version because
  the plugin is already compiled into the installed shell.
  ```
- **Action Item**: Inspect `packages/ota-core/scripts/validate-app-versions.ts` and ensure store baseline version tags match the current native plugins declared in `packages/native-core`.

---

## 2. Super-Admin Real-User Simulation Route Coverage

- **Context**: `@asol/simulation-core` and `scripts/check-simulation-coverage.ts` discover interactive page flows across all application routes.
- **Action Item**: Periodically re-run `npm run simulation:coverage` when new application routes or modal dialogs are added under `src/app/` to ensure 100% test coverage for UI attributes.

---

## 3. High-Frequency System Log Buffer Flushing in Static Mode

- **Context**: In static `out/` and Capacitor mobile environments, network disconnects can buffer system audit logs in LocalStorage / Preferences.
- **Action Item**: Verify the maximum buffer size and retry backoff behavior in `packages/system-logs-core` to guarantee zero memory leaks or storage overflow on long-running offline sessions.

---

## 4. Multi-Region Turso Latency Profiling

- **Context**: Sharded Turso databases are distributed across accounts.
- **Action Item**: Monitor read query latencies via `@asol/observability-core` when accessing `gova-products` and `gova-profiles` from diverse geographic client locations.
