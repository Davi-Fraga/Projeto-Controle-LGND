## ADDED Requirements

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
