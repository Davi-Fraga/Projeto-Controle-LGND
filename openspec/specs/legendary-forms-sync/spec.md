# legendary-forms-sync Specification

## Purpose
TBD - created by archiving change sincronizar-legendarios-via-forms. Update Purpose after archive.
## Requirements
### Requirement: Dedicated webhook shall ingest canonical Forms payloads
The system SHALL expose a public webhook route dedicated to legendary synchronization, separate from the TOP pre-registration webhook, protected by `x-webhook-secret` compared in a timing-safe way, that accepts a canonical Google Forms payload and performs a direct create-or-update of a `Legendary` without any approval step.

#### Scenario: Valid payload is accepted
- **WHEN** the Apps Script posts a valid canonical payload with the correct `x-webhook-secret`
- **THEN** the API creates or updates a `Legendary` directly (no approval), records the sync in audit/history, and returns whether the record was created or updated

#### Scenario: Invalid or missing secret is rejected
- **WHEN** the webhook receives a payload without the expected `x-webhook-secret`
- **THEN** the API rejects the request with an unauthorized error and does not create or update any `Legendary`

#### Scenario: Payload exceeds allowed size
- **WHEN** the webhook receives a payload larger than the configured limit
- **THEN** the API rejects the request with payload-too-large behavior and does not persist the body

#### Scenario: Route is separate from TOP pre-registration
- **WHEN** the sync webhook is invoked
- **THEN** it does NOT create, read, or modify any `TopPreRegistration`, `TopParticipant`, or `TopServant`, and the pre-registration webhook remains unaffected

### Requirement: Every Forms field shall be explicitly mapped
The system SHALL map every field of the "MANADA ROTA DO CERRADO" Forms response to a known destination: an existing `Legendary` field or relationship, a new approved `Legendary` field, `needsReview`/`notes`, or preserved sync metadata. No field SHALL be silently dropped and no unmapped `Legendary` field SHALL be invented.

#### Scenario: Mapped fields are persisted
- **WHEN** a response includes name, phone, LGND number, email, birth date, district, city, state, church and profession
- **THEN** the `Legendary` stores those values in the mapped structured fields according to the approved mapping table in design.md

#### Scenario: Fields without a prior column use approved new fields or metadata
- **WHEN** the response includes district, state/UF, spiritual leader name/contact, spouse/mother name/contact/email, skills, "is spiritual leader"/leadership, or "which TOP you climbed"
- **THEN** the system stores each value in its approved new field or preserved metadata as decided in design.md, never in an invented column

### Requirement: Input values shall be normalized like the 226 import
The system SHALL normalize Forms values using the same rules as the existing 226-member import (`prisma/import-manus.ts`): canonical city spelling, single phone format, LGND number with digits only, and accent/case/space-insensitive name normalization for the dedup key. This logic SHALL be reused from a shared, unit-tested helper.

#### Scenario: City is canonicalized
- **WHEN** the response sends `Caldas novas GO`
- **THEN** the stored city uses the same canonical spelling the import produces (`Caldas Novas`)

#### Scenario: LGND number uses digits only
- **WHEN** the response sends an LGND number with punctuation or spaces
- **THEN** the system stores and compares it using digits only

#### Scenario: Phone uses the standard format
- **WHEN** the response sends a phone with DDI, spaces or punctuation
- **THEN** the system stores it in the same normalized format the import and approval paths use

### Requirement: Upsert shall key on LGND number plus tolerant name match
The system SHALL deduplicate by LGND number as the primary anchor confirmed by an accent/case/space-insensitive **exact** name comparison (the same normalization as the 226 import; no fuzzy matching in this version). When the LGND number exists and the normalized name matches, the system SHALL update the same person. The system SHALL never create two `Legendary` records for the same LGND number.

#### Scenario: New person is created
- **WHEN** a payload arrives with an LGND number that does not yet exist
- **THEN** the system creates a new `Legendary` with `isFromRotaDoCerrado = true` and `status = ACTIVE`

#### Scenario: Existing person is updated
- **WHEN** a payload arrives with an existing LGND number whose stored name matches the payload name under tolerant comparison
- **THEN** the system updates that `Legendary` in place and does not create a new record

### Requirement: Number-vs-name conflict shall go to review
The system SHALL protect against mistyped LGND numbers: when the LGND number already exists but the payload name diverges materially from the stored name under tolerant comparison, the system SHALL NOT blindly overwrite the record. It SHALL flag `needsReview`, record the conflict for the admin, and preserve the existing person's data.

#### Scenario: Divergent name is not overwritten
- **WHEN** a payload arrives with an existing LGND number but a name that does not match the stored name under tolerant comparison
- **THEN** the system does not overwrite the existing `Legendary` core identity, sets `needsReview = true`, and records the conflicting payload for admin resolution

#### Scenario: Admin can find conflicts
- **WHEN** an admin opens the legendarios review queue
- **THEN** records flagged by a Forms number-vs-name conflict are listed with the origin and the conflicting values

### Requirement: The most recent response shall win
The system SHALL apply last-write-wins using the Forms response timestamp. A response whose timestamp is older than the last applied Forms sync for that `Legendary` SHALL NOT overwrite the newer data.

#### Scenario: Newer response overwrites
- **WHEN** a response arrives with a timestamp newer than the record's last Forms sync
- **THEN** the system applies the update and advances the stored last-sync timestamp

#### Scenario: Late older response is ignored
- **WHEN** a response arrives with a timestamp older than the record's last Forms sync
- **THEN** the system does not overwrite the newer data and reports the response as skipped/stale

### Requirement: Ingestion shall be idempotent per Forms response
The system SHALL use a stable identifier of the Forms response/spreadsheet row to make ingestion idempotent, so re-sending the same response produces no duplicate effect.

#### Scenario: Same response is resent
- **WHEN** the Apps Script resends a payload carrying an already-processed response identifier with no newer timestamp
- **THEN** the system returns the existing `Legendary` result and applies no duplicate create, update, or team membership

### Requirement: Team field shall link a TeamMembership
The system SHALL link the person to the `Team` matching the Forms "Equipe" value by creating an active `TeamMembership` when one does not already exist, without duplicating memberships. Values that do not match an existing team SHALL be flagged for review without failing the ingestion.

#### Scenario: Known team is linked
- **WHEN** the response's team value matches an existing `Team` and the person has no active membership there
- **THEN** the system creates an active `TeamMembership` and does not duplicate it on resend

#### Scenario: Unknown team is flagged, not fatal
- **WHEN** the response's team value does not match any existing `Team`
- **THEN** the system still upserts the `Legendary`, sets `needsReview = true`, and records the unmatched team for admin resolution instead of rejecting the payload

### Requirement: Markers shall be applied on sync
The system SHALL set `isFromRotaDoCerrado = true` on Forms-synced legendaries and `status = ACTIVE` on first creation, and SHALL flag `needsReview = true` when the response indicates the person is a spiritual leader, per business rule.

#### Scenario: New Forms legendary is active and tagged
- **WHEN** a new `Legendary` is created from a Forms response
- **THEN** it has `isFromRotaDoCerrado = true` and `status = ACTIVE`

#### Scenario: Spiritual leader is flagged for attention
- **WHEN** the response answers "is spiritual leader" as yes
- **THEN** the system sets `needsReview = true` and preserves the declared leadership for admin attention

### Requirement: Required-field and validation handling shall be defined
The system SHALL reject payloads that lack the identity anchors needed for a safe upsert (LGND number and full name). For other missing or invalid required business fields, or a mismatch between email and email confirmation, the system SHALL accept the record and flag `needsReview` with the issue recorded, rather than dropping data silently.

#### Scenario: Missing identity anchor is rejected
- **WHEN** a payload lacks LGND number or full name
- **THEN** the API rejects it and does not create an unreviewable `Legendary`

#### Scenario: Email confirmation mismatch is flagged
- **WHEN** the response email and confirmation email differ
- **THEN** the system upserts the person but sets `needsReview = true` and records the mismatch

#### Scenario: Other missing required field is flagged
- **WHEN** a payload has valid identity anchors but misses another required Forms field
- **THEN** the system upserts the person and records a validation issue visible to the admin

### Requirement: Each sync shall be audited and traceable
The system SHALL record each synchronization through the audit trail and `LegendaryHistory`, capturing the Forms origin, timestamp, and whether the record was created or updated, so the last synchronization is traceable.

#### Scenario: Create is audited
- **WHEN** a Forms response creates a new `Legendary`
- **THEN** the system records an audit entry and a `LegendaryHistory` of type creation noting Forms origin and response timestamp

#### Scenario: Update is audited with before/after
- **WHEN** a Forms response updates an existing `Legendary`
- **THEN** the system records an audit entry with before/after and a `LegendaryHistory` update noting Forms origin and response timestamp

### Requirement: Runtime sync shall never auto-create a Church
The webhook SHALL match the Forms church name against existing `Church` records by normalized name and link the match. It SHALL NOT create a `Church` during runtime ingestion. When no church matches, the system SHALL upsert the `Legendary`, preserve the raw church name, and set `needsReview = true` for a human to decide whether it is an existing or new church.

#### Scenario: Known church is linked
- **WHEN** the response's church name matches an existing `Church` under normalized comparison
- **THEN** the system links the `Legendary` to that `Church`

#### Scenario: Unknown church is flagged, never created at runtime
- **WHEN** the response's church name matches no existing `Church`
- **THEN** the system upserts the `Legendary`, does not create a `Church`, preserves the raw name, and sets `needsReview = true`

### Requirement: Personal data shall be stored but access-restricted
The system SHALL always store `email` and `birthDate` from the Forms response, but SHALL treat them as sensitive personal data: they SHALL NOT appear in general listings or broad exports, and they SHALL be exposed only in the administrative detail view of a `Legendary`, restricted by the existing scope-based access control so that only full-visibility roles can see them.

#### Scenario: Sensitive fields are stored
- **WHEN** a Forms response includes email and birth date
- **THEN** the system persists them on the `Legendary`

#### Scenario: Sensitive fields are hidden from general listings
- **WHEN** any client requests a general list of legendaries or a broad export
- **THEN** the response does not include `email` or `birthDate`

#### Scenario: Restricted-scope role cannot read sensitive fields
- **WHEN** a scope-restricted role (e.g., city manager or team coordinator) views a `Legendary` outside full-visibility permission
- **THEN** the system does not expose `email` or `birthDate` for that user

### Requirement: Apps Script shall handle secret and retries safely
The Forms integration SHALL use Google Apps Script with the webhook URL and secret stored in Script Properties (never hardcoded or versioned), sending `x-webhook-secret`, and SHALL support retrying failed deliveries without creating duplicates.

#### Scenario: Script sends secret from properties
- **WHEN** the `onFormSubmit` trigger runs
- **THEN** the script reads the webhook URL and secret from Script Properties, sends `x-webhook-secret`, and does not contain the production secret in source

#### Scenario: Failed delivery is retryable without duplication
- **WHEN** the webhook returns a non-success response or the request fails
- **THEN** the script records enough context to retry the same response later using the same response identifier, so the retry is idempotent

### Requirement: Forms profession resolution shall use the shared catalog resolver
The Forms ingestion and profession-reference reconciliation flows SHALL use the same side-effect-free normalized profession resolver as manual legendary create and update. An unmatched or ambiguous Forms profession SHALL be persisted in `professionText`, SHALL leave `professionId` null, and SHALL contribute a `needsReview` issue without rejecting ingestion.

#### Scenario: Forms profession matches the catalog
- **WHEN** a Forms response contains a profession with exactly one active normalized catalog match
- **THEN** the sync stores the matched `professionId`, clears `professionText`, and creates no profession

#### Scenario: Forms profession does not match the catalog
- **WHEN** a Forms response contains a non-empty profession with no active normalized catalog match
- **THEN** the sync still upserts the legendary, stores the trimmed value in `professionText`, leaves `professionId` null, and sets `needsReview = true`

#### Scenario: Forms profession match is ambiguous
- **WHEN** a Forms response profession has multiple active normalized catalog matches
- **THEN** the sync selects none, preserves the text, and records a review issue

#### Scenario: Reconciliation uses the same rule
- **WHEN** an admin explicitly reruns reference reconciliation for a legendary with profession text
- **THEN** reconciliation uses the shared resolver and produces the same catalog-link or free-text result as manual save and Forms ingestion
