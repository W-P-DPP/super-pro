## ADDED Requirements

### Requirement: Login template SHALL redirect to the URL-provided target after successful login
After the login template completes a successful login and persists authentication token data, it SHALL inspect the current page URL for a `redirect` query parameter. When that parameter exists and is non-empty, the system SHALL navigate the browser to the provided target address.

#### Scenario: Login success with redirect parameter
- **WHEN** a user lands on the login page with a non-empty `redirect` query parameter and logs in successfully
- **THEN** the system SHALL persist the authentication token data locally
- **THEN** the system SHALL navigate the browser to the `redirect` target

#### Scenario: Login success without redirect parameter
- **WHEN** a user logs in successfully and the login page URL does not contain a non-empty `redirect` query parameter
- **THEN** the system SHALL keep the existing local success feedback behavior
