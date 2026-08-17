## ADDED Requirements

### Requirement: Official Release Baseline
The application SHALL use official `BingZi-233/check-cx` release `v1.23.11` as its integration baseline while preserving explicitly selected deployed local behavior.

#### Scenario: Integration history is constructed
- **WHEN** the upgrade branch is created
- **THEN** it starts from official `v1.23.11`
- **AND** local capabilities are added as focused forward-port commits rather than a direct merge from the current fork

### Requirement: Deployed Local Capabilities Remain Available
The upgraded application MUST retain site settings, scheduler-token execution, group display metadata, configurable polling and thresholds, config metadata overrides, and generate-mode checks.

#### Scenario: Existing deployment starts on upgraded code
- **WHEN** the migrated database and upgraded application are deployed
- **THEN** existing settings and scheduler tokens continue to work
- **AND** configs retain their prior stream or generate execution behavior
- **AND** group display metadata remains visible

### Requirement: Official Runtime Fixes Are Adopted
The upgraded application SHALL include official provider correctness fixes, standalone poller initialization, degraded availability calculation, supported dependency versions, and the official dashboard UI baseline.

#### Scenario: Official behavior is verified
- **WHEN** the upgraded application is tested in staging
- **THEN** provider endpoint query parameters are preserved
- **AND** the standalone deployment initializes one poller
- **AND** degraded checks count as available in availability statistics
- **AND** the application builds on Node.js 22 or newer

### Requirement: Rollback-Compatible Application Deployment
The upgraded application MUST be deployable without making the previous application version unable to read the database during the rollback window.

#### Scenario: Application rollback is required
- **WHEN** the upgraded deploy fails smoke checks
- **THEN** the previous application image can be redeployed
- **AND** its required legacy database columns are still present

