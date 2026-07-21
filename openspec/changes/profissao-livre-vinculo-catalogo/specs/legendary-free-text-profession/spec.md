## ADDED Requirements

### Requirement: Profession shall accept free text
The legendary create and edit flows SHALL present profession as a free-text input and SHALL allow a non-empty value even when it is absent from the profession catalog.

#### Scenario: User enters a profession outside the catalog
- **WHEN** the user enters `Engenheiro de Prompt` and saves a legendary
- **THEN** the save completes without requiring that value to exist in the profession catalog

#### Scenario: Existing linked profession is opened for editing
- **WHEN** a legendary already has a `professionId` linked to `Médico`
- **THEN** the free-text input is initialized with `Médico` and the existing link is not lost by an unrelated edit

### Requirement: Profession text shall resolve opportunistically against the existing catalog
The system SHALL trim the submitted text, reuse the existing `normalizeName` helper, and link the legendary only when exactly one active `Profession` has the same normalized name. It MUST NOT use fuzzy matching or create a profession or alias at runtime.

#### Scenario: Normalized text has one catalog match
- **WHEN** the user submits `  MÉDICO  ` and exactly one active catalog entry normalizes to `medico`
- **THEN** the system stores that entry in `professionId`, clears `professionText`, and does not force `needsReview` because of profession

#### Scenario: Runtime resolution never creates a profession
- **WHEN** any manual, Forms, or reconciliation flow resolves a submitted profession text
- **THEN** the resolver performs no `Profession.create`, `Profession.upsert`, or alias creation operation

#### Scenario: Inactive catalog entry is not selected as a new match
- **WHEN** the submitted text matches only a soft-deleted profession
- **THEN** the system treats the text as unmatched and does not create a new link to the inactive entry

### Requirement: Unmatched or ambiguous profession text shall be preserved for review
When a non-empty profession text has zero or multiple active normalized catalog matches, the system SHALL store the trimmed input in `professionText`, SHALL leave `professionId` null, and SHALL set `needsReview = true` without blocking the legendary save.

#### Scenario: Profession has no catalog match
- **WHEN** the submitted value is `Engenheiro de Prompt` and no active profession has that normalized name
- **THEN** the legendary is saved with `professionText = "Engenheiro de Prompt"`, `professionId = null`, and `needsReview = true`

#### Scenario: Profession has multiple normalized matches
- **WHEN** more than one active profession normalizes to the submitted value
- **THEN** the system chooses no arbitrary catalog entry, preserves the submitted text, and marks the legendary for review

#### Scenario: Other review causes are preserved
- **WHEN** a profession matches or is cleared but the legendary is already marked for review for another reason
- **THEN** profession resolution does not automatically set `needsReview = false`

### Requirement: Profession update semantics shall be explicit and backward compatible
The API SHALL treat the presence of `professionText` as an explicit profession update, SHALL leave profession unchanged when that property is absent from a PATCH, and SHALL continue accepting a validated `professionId` by itself for legacy clients. The API SHALL reject a payload that attempts to set both forms simultaneously.

#### Scenario: PATCH omits profession text
- **WHEN** a PATCH updates an unrelated legendary field without a `professionText` property
- **THEN** both the current `professionId` and `professionText` remain unchanged

#### Scenario: User clears profession
- **WHEN** `professionText` is explicitly submitted as blank
- **THEN** the system clears both `professionId` and `professionText` without forcing a new review issue

#### Scenario: Legacy client submits catalog ID
- **WHEN** a legacy client submits only a valid active `professionId`
- **THEN** the system preserves the existing ID-based behavior and clears any stale profession fallback text

#### Scenario: Payload mixes text and ID
- **WHEN** a payload attempts to set both `professionText` and `professionId`
- **THEN** the API rejects the ambiguous profession update and changes neither value

### Requirement: Existing profession data shall survive schema and application rollout
The schema migration SHALL add an optional free-text field without modifying or deleting any existing `professionId`, and the application SHALL preserve legacy catalog links during reads and unrelated updates.

#### Scenario: Migration runs over linked production data
- **WHEN** the migration is applied to a database containing legendários with catalog profession links
- **THEN** every existing `professionId` remains unchanged and `professionText` starts null for those records

#### Scenario: Migration is safely re-evaluated
- **WHEN** deployment tooling checks or reapplies the migration in an environment where the column already exists
- **THEN** it performs no destructive rewrite and leaves all profession links intact

#### Scenario: Pre-deploy and post-deploy checks are compared
- **WHEN** the production migration is deployed
- **THEN** operators have a dry-run preview and verified backup, and confirm that legendary counts and existing profession-link counts/IDs are unchanged afterward

### Requirement: Profession presentation shall retain unmatched information
Surfaces that display a legendary's profession and broad profession export output SHALL use the linked catalog name when available and otherwise use the persisted free text. Catalog-based filters and grouped profession reports SHALL continue to use `professionId` only.

#### Scenario: Linked profession is displayed
- **WHEN** a legendary has a linked profession and no fallback text
- **THEN** profile and profession export show the catalog name

#### Scenario: Unmatched profession is displayed
- **WHEN** a legendary has `professionText` and no `professionId`
- **THEN** profile and profession export show the preserved text instead of an empty profession

#### Scenario: Catalog report encounters free text
- **WHEN** a grouped profession report is generated for a legendary without `professionId`
- **THEN** the report does not silently promote or group that text as a catalog profession
