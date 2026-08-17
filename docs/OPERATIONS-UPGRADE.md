# Official v1.23.11 rollout

The application branch is based on official `BingZi-233/check-cx` release `v1.23.11`; the compatibility migration is additive and keeps legacy config columns for rollback.

Before production:

1. Confirm a Supabase backup or PITR restore point that can be restored.
2. Pause the deployed poller and external scheduler calls using the existing scheduler tokens.
3. Run the preflight migration in the Supabase SQL Editor. It intentionally stops unless the recorded deployment baseline is still 44 configs, at least 7,900 history rows, 10 groups, 12 site settings, and 3 scheduler tokens.
4. Run the migration as one transaction, then run `supabase/verify-official-v1-23-11.sql` and record its results.
5. Deploy the application with Node.js 22 or newer and run one dashboard refresh, one `generate`-mode test, one scheduler-token call, and one group page check.
6. Resume polling only after the smoke checks pass. Keep the previous image and all legacy columns for the rollback window.

The migration has already been executed against a real database connection in a transaction and rolled back successfully; no production rows were changed by that rehearsal. Do not run destructive cleanup of legacy columns as part of this release.

Production migration status (2026-08-17): committed successfully. Verification recorded 44 configs, 7,912 history rows, 10 groups, 12 site settings, and 3 scheduler tokens. All configs have a model relationship; model type mismatches, orphan history rows, and unresolved config payloads are zero. PostgREST resolves the new relationships and reports 28 models plus 1 compatibility template.
