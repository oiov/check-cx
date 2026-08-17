# Change: Update to official v1.23.11 with lossless data migration

## Why

The deployed fork is based on an older, heavily modified history while the authoritative `BingZi-233/check-cx` repository has advanced to `v1.23.11`. A direct merge would conflict across core runtime, UI, provider, and schema files, and the official database migration chain would stop after partially changing the deployed schema because current configs contain instance-level metadata and mixed stream modes.

## What Changes

- Rebuild the application integration on top of official `v1.23.11` instead of merging official history into the current fork.
- Port forward only deployed local capabilities: site settings, scheduler-token checks, group display metadata, configurable polling/threshold/concurrency, config-level metadata overrides, and `stream_mode`.
- Adopt official provider fixes, model/template normalization, standalone poller initialization, degraded availability handling, dependency upgrades, UI redesign, and capability challenge support.
- Replace the official destructive migration sequence with a staged expand/migrate/contract migration that preserves all existing rows, IDs, secrets, history, and legacy columns during the rollback window.
- Keep configuration-level request metadata and stream-mode overrides because the deployed data cannot be represented losslessly by one template per `(type, model)`.
- Add staging and production verification queries, backup requirements, polling pause/resume steps, and a code rollback path.
- **BREAKING**: The target runtime requires Node.js 22 or newer and upgrades Next.js to 16.2.x and AI SDK to v7.

## Impact

- Affected specs: `upstream-integration`, `database-migration`
- Affected code: application bootstrap, provider execution, config loader, polling, dashboard UI, runtime configuration, scheduler-token endpoints, Supabase clients, types, and package/runtime configuration
- Affected database objects: `check_configs`, `check_history`, `group_info`, existing RPCs/views, plus new `check_models`, `check_request_templates`, `check_challenges`, `admin_users`, and `intelligence_stats`
- Deployment impact: staged database migration and application rollout with a short polling pause; no planned loss of configuration or history data
- Rollback: redeploy the current application against preserved legacy columns; new additive objects may remain unused

