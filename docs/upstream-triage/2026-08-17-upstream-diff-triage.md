# Upstream Diff Triage - 2026-08-17

## Baseline

- Current integration branch: `upgrade/official-v1.23.11`
- Current committed head: `26eab2498f37e74cc1d9ac536f9b33bb6ce587b7` (`docs: propose official v1.23.11 upgrade`)
- Integration base: official `a194519c2f632c39546b8548fccb6d1b3dea341c` / `v1.23.11`; `official/master` is an ancestor of the current branch.
- Branch ancestry versus `official/master`: one local documentation commit ahead, zero upstream commits behind.
- Original local comparison branch: `master` at `f5f60ef88172a3218cbbe8c375d8cde1785a7c63` (`upd`).
- Local tracking ref: `origin/master` at `f5f60ef`.
- Fork remote: `origin` -> `https://github.com/oiov/check-cx.git`
- Upstream remote: `upstream` -> `https://github.com/h7ml/check-cx.git`
- Upstream branch: `upstream/master`
- Upstream commit: `d3a80e22fb46f5a6184cc7a29ac16fc59b2f8d56` (`feat: GROUP_HEALTH_DOC_URL`)
- Upstream commit date: 2026-05-10 17:45:43 +0800
- Fetch note: `upstream/master` was force-updated from `5764fdf` to `d3a80e2` on 2026-08-17.
- Authoritative upstream remote: `official` -> `https://github.com/BingZi-233/check-cx.git`
- Authoritative upstream branch: `official/master`
- Authoritative upstream commit: `a194519c2f632c39546b8548fccb6d1b3dea341c` (`chore: bump version to 1.23.11`)
- Authoritative upstream commit date: 2026-08-10 10:55:46 +0800
- Authoritative release: `v1.23.11`
- Source-of-truth correction: `BingZi-233/check-cx` is the official project; `h7ml/check-cx` is a modified downstream and must remain a separate comparison source.
- Latest fetch check: `git fetch official --tags --prune` on 2026-08-17 left `official/master` unchanged at `a194519`.

## Integration Status

- Decision: do not direct-merge either diverged fork. The working branch is already a clean official `v1.23.11` snapshot with only deployed compatibility behavior forward-ported.
- Application compatibility is implemented for site settings, group display metadata, scheduler tokens, config-level request metadata, `stream_mode=generate`, dynamic polling settings, and the existing public API rate limits.
- The root layout no longer starts the poller during prerender. `instrumentation.ts` is the single standalone startup path, preventing build workers from issuing model checks.
- `pnpm install --frozen-lockfile`, TypeScript, lint, `git diff --check`, and `pnpm build` pass. Lint retains one pre-existing warning in ignored local `triggers/worker.js`.
- The production database migration was rehearsed in one transaction and rolled back. Post-rollback state remained 44 configs, 7,908 history rows, 10 groups, 12 site settings, and 3 scheduler tokens; `check_models` and `check_configs.model_id` were absent afterward as expected.
- Runtime smoke checks confirmed production site metadata hydration (`Nbility - API Status`) and the admin login page without browser errors. Dashboard and valid group data require the migration and therefore remain production-window checks.
- Production migration status: committed on 2026-08-17. Verification recorded 44 configs, 7,912 history rows, 10 groups, 12 site settings, 3 scheduler tokens, 28 models, and 1 compatibility template. Model type mismatches, orphan history rows, and unresolved payloads were all zero; PostgREST resolved the new relationships.

## Sync And Ancestry

- Last known upstream sync: merge commit `c1da0a7` merged the former `upstream/master` head `5764fdf` into local `master`.
- Former upstream head `5764fdf` is an ancestor of local `master`.
- Merge base between local `master` and rewritten `upstream/master`: `797ff7726b9ad47ebe08b6178336a9116697c869`.
- Merge base between local `master` and `official/master`: `4d934f535ca154049e49356ae0a1327d7e4cc2e8`.
- Merge base between `upstream/master` (h7ml) and `official/master`: `797ff7726b9ad47ebe08b6178336a9116697c869`.
- Current upstream head is not an ancestor of local `master`.
- Local `master` is not an ancestor of current upstream head.
- Raw ancestry count (`HEAD...upstream/master`): local 214, upstream 223.
- Patch-equivalent count (`--cherry-pick`, including merges): local 13, upstream 22.
- Upstream-only ordinary commits after patch equivalence: 13.
- Local versus official raw ancestry count: local 51, official 65.
- Local versus official patch-equivalent count: local 51, official 65.
- h7ml versus official raw ancestry count: h7ml 223, official 228.
- h7ml versus official patch-equivalent count: h7ml 69, official 74.
- Interpretation: history was rewritten; raw counts substantially overstate the product diff.

## Product Scope Rules

- Include correctness, security, provider compatibility, polling, dashboard state, and active UI/API behavior.
- Include database/schema changes only with a reproducible Supabase migration and compatibility review.
- Inspect dependency and CI changes for security or deployment relevance.
- Skip branding, documentation-only churn, and duplicated rewritten commits unless they carry a behavior change.
- Prefer a reviewed merge/backport strategy over a direct merge while the rewritten history and local custom commits overlap.
- Treat official `v1.23.11` as the target product baseline, while explicitly preserving selected local and h7ml-only capabilities.
- Preserve deployed rows and secrets through idempotent, staged Supabase migrations; never replace a deployed database with `schema.sql`.

## Candidate Status

The 22 patch-equivalent commits include rewritten merge commits. There are 13 upstream-only ordinary commits: 11 in one optional feature batch, one correctness fix, and one fork-specific CI/image change.

| Priority | Subsystem | Candidate | Local status | Classification | Recommended action |
| --- | --- | --- | --- | --- | --- |
| High | Manual and scheduled stream checks | `4cce8b1` | Equivalent behavior applied through the shared official-based loader | Already covered | Keep single-test and scheduler execution on `loadProviderConfigsFromDB`; the omitted legacy batch route is not present in the target admin |
| Medium / optional | Global group health, dashboard URL state, settings, and migrations | `97030a2`, `5ba4265`, `8c063e9`, `fc53f64`, `e6f8106`, `8a6d812`, `75a3ec3`, `8d4a63e`, `8b12a08`, `8e83735`, `d3a80e2` | Not applied | Conditional / Manual backport | Backport as one reviewed feature batch only if this deployment integrates fishxcode/New API group-health data |
| None | Docker publishing/image identity | `39306e4` | Equivalent workflow already covered locally; image identity differs intentionally | Skip | Keep the dynamic GHCR workflow from local `02e96e8`; do not change Compose to `ghcr.io/fishxcode/check-cx` |
| High | Official v1.21.2-v1.23.11 update | `official/master` (`a194519`) | Applied as the integration branch base | Already covered | Keep the official snapshot as the branch base and review only compatibility-layer changes |
| High | Deployed Supabase data | Current production project | Custom migration committed and verified in production | Applied | Keep legacy columns through the rollback window; do not run the official migration chain or destructive cleanup |

### Official v1.23.11 update

The official line was 65 patch-equivalent commits ahead of the original local `master`. Compared with official `v1.20.11`, the current release changes 128 files with about 20,032 insertions and 5,264 deletions. The integration branch now contains these batches:

| Batch | Representative commits | Status | Classification | Action |
| --- | --- | --- | --- | --- |
| Provider/API correctness | `a2ee0c3`, `f5de606`, `5e8add3`, `cc474d4` | Applied from official base | Already covered | Verify real streaming and generate-mode checks after migration |
| Request templates and model normalization | `5ae6192`, `e88b309`, `c907996` | Applied with compatibility migration | Manual backport | Use the custom additive migration, retaining legacy columns and instance overrides |
| Docker poller and availability correctness | `917a9c5`, `19192b1` | Applied; build-time duplicate poller startup removed | Manual backport | Verify one standalone leader after migration |
| Next.js and AI SDK major upgrades | `5eddbc9`, `52deaff`, `336485e`, `4615983` | Applied and build-verified on Node 24 | Already covered | Deploy only on Node.js 22+ |
| Official UI redesign | `efcac47..b9eb3a0` | Applied with local site/group metadata hydration | Already covered | Capture final screenshots after migrated data renders |
| Capability challenge sampling | `19b83b4` | Applied in code and additive schema | Conditional | Verify challenge recording in the rollout smoke test |
| Official admin user directory | `16bccbb` | Added to migration but not used as a login gate | Conditional | Keep current Supabase session login for this release |

Direct merging remains inappropriate: the repository snapshots differ across 249 files and a simulated merge reports 20 conflicts in core UI, polling, provider, Supabase, type, package, and schema files. The target has instead been constructed from official `v1.23.11` with selected active local capabilities ported forward.

### Deployed database inventory

Read-only PostgREST inventory on 2026-08-17 found:

- `check_configs`: 44 rows; 4 enabled; provider split 16 OpenAI, 26 Anthropic, 2 Gemini.
- `check_history`: 7,900 rows from 2026-07-18 through 2026-08-17; 7,201 operational, 126 failed, 14 validation-failed, 559 error, and no degraded rows.
- `group_info`: 10 rows; 7 use `display_name`, 4 use `description`, and 4 use `website_url`.
- `scheduler_tokens`: 3 enabled `checks:run` tokens; one has been used.
- `site_settings`: 12 rows, including polling, degraded threshold, retention, concurrency, and site metadata settings.
- Current operational values: polling interval 1,800 seconds, degraded threshold 1,000,000 ms, history retention count 60, concurrency 5.
- Supabase Auth: one confirmed email user with a prior sign-in.
- Deployed public tables do not include local alert tables; inactive alert features do not need to block the official upgrade.

Compatibility-sensitive config data:

- 9 configs contain non-empty instance metadata; no config contains a non-empty request header.
- 28 unique `(type, model)` groups exist across 44 configs.
- One model group, covering two configs, has two different metadata payloads.
- Four model groups, covering 12 configs, have multiple stream modes.
- 21 configs use default stream mode, 15 explicitly use streaming, and 8 explicitly use generate/non-streaming mode.

The official migration chain is unsafe for this database without modification:

1. `20260304153000_backfill_check_configs_to_templates.sql` creates templates but intentionally leaves instance metadata in place.
2. `20260322120000_extract_check_models.sql` drops the legacy `check_configs.model` column.
3. `20260322130000_relink_templates_through_models.sql` then aborts if any instance metadata remains or if one model maps to multiple templates.
4. The deployed database satisfies both abort conditions, so running official migrations sequentially could leave a partially migrated schema after step 2.
5. Official code removes `stream_mode` and hard-codes a 6-second degraded threshold, which would regress 23 explicit stream-mode configs and the deployed 1,000,000 ms threshold setting.

Required migration shape:

- Expand: add `check_request_templates`, `check_models`, `model_id`, `check_challenges`, and supporting indexes/functions without dropping legacy columns.
- Migrate: backfill 28 model rows and all 44 `model_id` values; retain instance metadata and `stream_mode` as overrides; preserve all IDs, secrets, history, scheduler tokens, site settings, and group metadata.
- Deploy: use an official-based loader that resolves model/template defaults, then applies config-level request metadata and stream-mode overrides.
- Contract: only after production verification, optionally remove the legacy `model` column. Do not remove config-level override columns while conflicting variants exist.

### Stream-mode fix

`4cce8b1` adds `stream_mode` to the selected columns and maps it to `ProviderConfig.streamMode` in:

- `app/api/admin/configs/[id]/test/route.ts`
- `app/api/admin/configs/batch-test/route.ts`
- `app/api/internal/checks/run/route.ts`

The integration uses `loadProviderConfigsFromDB` for the single-test and scheduler-token routes, so both receive the config-level `streamMode`; AI SDK v7 execution calls `generateText` for `generate` mode. The legacy batch-test route is intentionally absent from the smaller target admin surface.

### Global group-health feature

The 11-commit batch changes 19 files with 1,678 insertions and 72 deletions. It adds:

- A global New API group-health dashboard and URL-synchronized views.
- Admin settings for the New API URL/token/user, visible windows, feature enablement, and error details.
- A public server route that proxies group-health reads.
- Four Supabase migrations and schema snapshots.

The cumulative feature patch applies cleanly to local `HEAD` according to `git apply --check`, despite direct branch merging being conflict-heavy. Before adoption it needs an explicit product decision and hardening review:

- `GET /api/global-group-health` is public and can trigger upstream requests; the one-window path does not use the existing full-window cache, and `forceRefresh` can also bypass cache semantics.
- The admin-configured base URL is passed to server-side `fetch`; validate allowed protocols/hosts and consider private-network restrictions.
- Long windows allow upstream request timeouts up to 90 seconds, so rate limiting and per-window caching are needed.
- Migrations enable the feature by default even when its data source may not be configured; deployment defaults should be reviewed.

## Conflict Notes

- Local has 13 patch-equivalent commits absent upstream when merges are included. The ordinary local-only commits are `77536de` and `f5f60ef`, plus local `02e96e8` whose Docker workflow is functionally equivalent but whose Compose image identity intentionally differs.
- Both sides contain rewritten equivalents of several historical merge/CI commits; hashes alone are not reliable identity.
- A simulated direct merge reports conflicts in 17 existing files, including dashboard, settings, provider, type, schema, environment, and Compose files.
- A simulated direct merge with official `v1.23.11` reports 20 core conflicts and would also delete the active local admin/settings/scheduler implementation.
- Local `f5f60ef` deliberately changes the degraded threshold default from 6 seconds to 100 seconds; this must be preserved.
- Local `77536de` deliberately keeps `/triggers` ignored; this must be preserved.

## Suggested Batches And Verification

1. Application batch: complete on `upgrade/official-v1.23.11`; keep `official/master` as the base and review the compatibility changes before deployment.
2. Database batch: apply the additive migration only after backup/PITR confirmation and a polling pause, then run the verification SQL before code deployment.
3. Runtime batch: deploy on Node.js 22+, verify one poller leader, streaming and generate checks, dashboard/group data, scheduler-token execution, and challenge recording before resuming traffic.
4. Optional h7ml batch: continue to skip global group health unless explicitly selected; if selected later, add URL validation, per-window caching/rate limiting, and disabled-by-default deployment settings.

The approved OpenSpec change is `openspec/changes/update-official-v1-23-11/`. Application implementation and production migration are complete; deployment smoke checks and rollback-window retention remain.
