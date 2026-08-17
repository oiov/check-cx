## 1. Integration Baseline

- [ ] 1.1 Create an integration branch rooted at official `v1.23.11`.
- [ ] 1.2 Port active local runtime configuration and site metadata behavior.
- [ ] 1.3 Port scheduler-token check execution and preserve all existing token semantics.
- [ ] 1.4 Port group display metadata fields used by deployed rows.
- [ ] 1.5 Port config-level `request_header`, `metadata`, and `stream_mode` overrides into the official model/template loader.
- [ ] 1.6 Preserve the deployed configurable degraded threshold, polling interval, history retention behavior, and concurrency.

## 2. Database Migration

- [ ] 2.1 Add a preflight migration that validates expected tables, columns, row counts, nullability, provider values, and payload/stream-mode conflicts.
- [ ] 2.2 Add `check_request_templates`, `check_models`, `model_id`, supporting constraints, and indexes without dropping legacy columns.
- [ ] 2.3 Backfill exactly one `check_models` row per existing `(type, model)` and populate every `check_configs.model_id`.
- [ ] 2.4 Preserve config-level metadata and stream-mode overrides; do not collapse conflicting payloads into a shared model template.
- [ ] 2.5 Add `check_challenges`, `intelligence_stats`, and updated history/retention RPCs additively.
- [ ] 2.6 Add optional `admin_users` support without blocking the current single-user admin session flow.
- [ ] 2.7 Add post-migration verification SQL and a rollback/compatibility note.

## 3. Application Compatibility

- [ ] 3.1 Upgrade Node, Next.js, React, Supabase SDK, AI SDK, and UI dependencies to official-compatible versions.
- [ ] 3.2 Update the provider implementation for AI SDK v7 while preserving endpoint query parameters and non-streaming generation mode.
- [ ] 3.3 Use official standalone poller initialization and verify single-poller lease behavior.
- [ ] 3.4 Preserve existing public API rate limits and authenticated local admin behavior.
- [ ] 3.5 Integrate the official UI while retaining deployed site title, logo, favicon, URL, and group display metadata.

## 4. Verification

- [ ] 4.1 Run the migration against a staging clone or restored backup.
- [ ] 4.2 Verify all 44 configs retain IDs, API keys, endpoints, enabled flags, model resolution, metadata, and stream modes.
- [ ] 4.3 Verify all 7,900 existing history rows remain attached to their original config IDs.
- [ ] 4.4 Verify the 10 group rows, 12 site settings, and 3 scheduler tokens remain intact.
- [ ] 4.5 Run `pnpm install --frozen-lockfile`, `pnpm lint`, and `pnpm build` under Node.js 22+.
- [ ] 4.6 Exercise streaming and generate-mode checks, dashboard refresh, group pages, scheduler-token execution, and challenge recording.
- [ ] 4.7 Capture desktop and mobile screenshots for the official UI integration.

## 5. Production Rollout

- [ ] 5.1 Confirm a restorable Supabase backup or point-in-time recovery checkpoint.
- [ ] 5.2 Pause application polling and external scheduler calls.
- [ ] 5.3 Run preflight SQL and record verification counts.
- [ ] 5.4 Execute the additive production migration in one short transaction.
- [ ] 5.5 Deploy the updated application and run smoke checks before resuming polling.
- [ ] 5.6 Keep legacy columns for at least one verified rollback window; perform destructive cleanup only as a separate approved change.

