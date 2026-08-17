## ADDED Requirements

### Requirement: Lossless Additive Migration
The production migration MUST preserve all existing config IDs, secrets, history rows, group rows, site settings, scheduler tokens, and active behavior while adding the official model/template/challenge schema.

#### Scenario: Existing rows are migrated
- **WHEN** the migration runs against the recorded production baseline
- **THEN** all 44 configs receive non-null, type-compatible `model_id` values
- **AND** all 7,900 existing history rows retain their original `config_id`
- **AND** no API key, endpoint, setting, token hash, or group metadata value is changed

### Requirement: Configuration Overrides Are Preserved
The target schema and loader MUST preserve config-level request metadata and stream-mode behavior when multiple configs for one model have different values.

#### Scenario: Shared model has different config behavior
- **WHEN** two configs reference the same `(type, model)` but use different metadata or stream modes
- **THEN** they may share one model row
- **AND** each config's override values remain distinct and effective at runtime

### Requirement: Migration Is Idempotent and Bounded
Migration SQL SHALL use idempotent object creation and upsert patterns, short transactions, and bounded lock and statement timeouts.

#### Scenario: Migration is retried after a non-committed failure
- **WHEN** the migration is executed again
- **THEN** existing compatible objects and backfilled rows do not cause duplicate-object or duplicate-row failures
- **AND** the final row relationships remain deterministic

### Requirement: Preflight and Verification Gates
The migration MUST stop before destructive or dependent steps if schema assumptions or data counts do not match the expected baseline.

#### Scenario: Unexpected data is found
- **WHEN** preflight detects unknown provider values, null models, missing tables, orphan history, or an unexpected config count
- **THEN** no migration writes are committed
- **AND** the discrepancy is reported for review

### Requirement: Production Rollout Supports Recovery
Production execution MUST require a restorable backup or PITR checkpoint, a polling pause, post-migration verification, and retention of legacy columns for a rollback window.

#### Scenario: Post-migration smoke checks fail
- **WHEN** the new application does not pass production smoke checks
- **THEN** polling remains paused
- **AND** the previous application version is redeployed against preserved legacy columns
- **AND** existing data remains available

