## Context

The local fork is at `f5f60ef`, the modified h7ml line is at `d3a80e2`, and the authoritative official release is `a194519` / `v1.23.11`. The local and official branches each contain substantial unique history, so a direct merge is not a reliable integration strategy.

The deployed Supabase project currently contains 44 configs, 7,900 history rows, 10 group rows, 12 site settings, and 3 scheduler tokens. Nine configs contain instance metadata. One `(type, model)` group has two payload variants, and four model groups have mixed stream modes. The official migration chain cannot represent those differences after it moves templates to model level and removes config-level fields.

## Goals / Non-Goals

- Goals: reach official `v1.23.11`, preserve deployed data and active local behavior, provide a reversible rollout, and adopt official fixes and runtime upgrades.
- Goals: keep API keys and other secrets out of migration logs, generated reports, and source control.
- Non-Goals: preserve inactive alert features whose tables are absent from the deployed database.
- Non-Goals: adopt the h7ml global group-health feature during this upgrade.
- Non-Goals: drop legacy columns or normalize all config metadata during the initial rollout.

## Decisions

### Decision: Build from the official release

The target branch will start from official `v1.23.11`. Active local behavior will be forward-ported in focused commits. This avoids interpreting hundreds of rewritten or downstream commits as a conventional merge.

### Decision: Use expand/migrate/contract

The first database migration will only add tables, columns, indexes, constraints, functions, and views. It will backfill new relationships but retain `check_configs.model`, `request_header`, `metadata`, and `stream_mode` so the current application remains deployable during rollback.

Destructive cleanup is deferred to a separate approved change after production verification.

### Decision: Preserve instance overrides

The target loader resolves values in this order:

1. Model-linked request template defaults.
2. Config-level `request_header` overrides.
3. Config-level `metadata` overrides.
4. Config-level `stream_mode` execution choice.

Objects are merged by key, with config-level values winning. This preserves the two payload variants sharing one model and the 12 configs in mixed-stream-mode model groups.

### Decision: Preserve operational settings

The official hard-coded defaults must not replace deployed settings. Polling interval, degraded threshold, retention behavior, and concurrency continue to read from `site_settings`, with environment/default fallbacks.

### Decision: Keep current admin access during this release

The deployed project has one confirmed email auth user. The official `admin_users` table is not used by official application code, so it may be created additively but will not gate login in this rollout. Role enforcement can be introduced later as a separate security change.

## Data Mapping

| Current data | Target representation | Migration rule |
| --- | --- | --- |
| `check_configs.id` | Same UUID | Preserve exactly |
| `check_configs.model` | `check_models.model` plus retained legacy column | Insert 28 distinct `(type, model)` rows and backfill all 44 `model_id` values |
| `request_header` / `metadata` | Template defaults plus config overrides | Retain config columns; never overwrite or clear during initial migration |
| `stream_mode` | Config-level execution override | Retain column and port generate-mode code |
| `api_key`, endpoint, flags, group | Same config row | Preserve exactly; never log values |
| `check_history` | Same rows and config IDs | No rewrite; update views/RPCs only after model backfill |
| `group_info` extended fields | Retained compatibility columns | Keep `display_name`, `description`, `website_url`, `icon_url`, and `tags` |
| `site_settings` | Retained local table | Preserve all 12 rows and application readers |
| `scheduler_tokens` | Retained local table | Preserve all 3 rows and token hashes |
| Capability challenges | New empty table | Begin collecting only after new code deploys |

## Migration Plan

1. Verify a Supabase backup/PITR restore point and pause polling/scheduler traffic.
2. Run read-only preflight queries and compare counts with the recorded baseline.
3. Start a short transaction with bounded lock and statement timeouts.
4. Create new model/template/challenge/admin objects and indexes idempotently.
5. Insert 28 distinct models with `ON CONFLICT`, backfill all 44 `model_id` values, and verify no nulls or type mismatches.
6. Replace compatible views/RPCs without deleting history or legacy fields.
7. Commit and rerun verification queries.
8. Deploy the updated application and smoke-test before resuming polling.

## Rollback

- Before commit: roll back the migration transaction.
- After commit but before code deploy: the current application continues to use retained legacy columns and ignores additive objects.
- After code deploy: redeploy the current image; retained legacy columns support the old loader.
- Do not drop additive objects during an incident unless they are proven causal; leaving unused tables is safer than attempting emergency DDL.

## Risks / Trade-offs

- Keeping legacy columns temporarily duplicates model information. This is accepted to make code rollback possible.
- Config-level overrides diverge from official model-only normalization. This is required for lossless behavior and can be revisited after data is normalized explicitly.
- Official AI SDK and Next.js upgrades change runtime behavior. Staging verification must cover endpoint query parameters, streaming, generate mode, Cache Components, and standalone poller startup.
- A long application/database version skew could expose unsupported writes. The production pause and same-window deploy keep the skew short.

## Manual Actions

The local environment has no Supabase CLI, `psql`, `pg_dump`, database password, or management access token. The user must perform one of these before production execution:

1. Confirm a restorable Supabase backup or PITR checkpoint in the Supabase dashboard.
2. Either run the approved SQL in the Supabase SQL Editor, or provide a temporary direct database connection string so Codex can execute and verify it.
3. Pause external calls using the three scheduler tokens and stop the currently deployed poller during the migration window.
4. Ensure the production runtime uses Node.js 22 or newer before deploying the new image.
5. Keep the previous deployable image/tag available for application rollback.

## Open Questions

- No blocking product question is assumed: active deployed local capabilities will be preserved, while inactive alerting and h7ml global group-health features are deferred.

