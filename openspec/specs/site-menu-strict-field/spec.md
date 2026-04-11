# site-menu-strict-field Specification

## Purpose
TBD - created by archiving change add-site-menu-strict-field. Update Purpose after archive.
## Requirements
### Requirement: System SHALL persist a boolean strict field on site menu records
The system SHALL add a `strict` boolean field to the `siteMenu` data model and SHALL persist it with menu records in the database.

#### Scenario: Persist strict on menu records
- **WHEN** a site menu record is created or read from the database
- **THEN** the system SHALL include the `strict` field as a boolean value on the menu record

### Requirement: System SHALL expose strict in site menu query responses
The system SHALL include the `strict` field in site menu list and detail responses so callers can read the current menu setting.

#### Scenario: Query menu tree with strict
- **WHEN** a client requests `GET /api/site-menu/getMenu`
- **THEN** the system SHALL return each menu node with a boolean `strict` field

#### Scenario: Query menu detail with strict
- **WHEN** a client requests `GET /api/site-menu/getMenu/:id` for an existing menu id
- **THEN** the system SHALL return the matching menu detail with a boolean `strict` field

### Requirement: System SHALL support strict in create and update menu requests
The system SHALL allow callers to set `strict` through site menu create and update APIs, and SHALL validate that the field is boolean when provided.

#### Scenario: Create menu with explicit strict
- **WHEN** a client requests `POST /api/site-menu/createMenu` with a valid boolean `strict`
- **THEN** the system SHALL persist that `strict` value on the created menu record

#### Scenario: Update menu strict
- **WHEN** a client requests `PUT /api/site-menu/updateMenu/:id` with a valid boolean `strict`
- **THEN** the system SHALL update the menu record with the provided `strict` value

#### Scenario: Reject invalid strict type
- **WHEN** a client sends a create or update request with a non-boolean `strict`
- **THEN** the system SHALL reject the request with a controlled Chinese error response

### Requirement: System SHALL keep strict backward compatible for existing site menu data
The system SHALL remain compatible with existing menu data and import sources that do not define `strict`, and SHALL default the value to `false` in those cases.

#### Scenario: Existing menu source omits strict
- **WHEN** a menu seed node or uploaded menu file node does not contain `strict`
- **THEN** the system SHALL treat the node's `strict` value as `false`

#### Scenario: Existing create request omits strict
- **WHEN** a client requests `POST /api/site-menu/createMenu` without a `strict` field
- **THEN** the system SHALL create the menu record with `strict` set to `false`

### Requirement: System SHALL preserve strict through site menu file import
The system SHALL parse, validate, and persist `strict` values from menu file import sources so imported menu data keeps the field consistently.

#### Scenario: Import menu file with strict
- **WHEN** a client uploads a valid site menu JSON file containing boolean `strict` values
- **THEN** the system SHALL persist those `strict` values in the imported menu records

