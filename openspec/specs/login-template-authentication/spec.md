# login-template-authentication Specification

## Purpose
TBD - created by archiving change connect-login-template-to-user-login-api. Update Purpose after archive.
## Requirements
### Requirement: Login template SHALL authenticate through the backend login API
The login template SHALL obtain the backend login public key before login submission, SHALL encrypt the entered password on the client, and SHALL submit the username plus encrypted password ciphertext to `POST /api/user/loginUser` instead of sending the raw password.

#### Scenario: Submit valid credentials
- **WHEN** a user submits a valid username and password from the login form
- **THEN** the system SHALL request the login public key required for password encryption
- **THEN** the system SHALL call `POST /api/user/loginUser` with the username and encrypted password ciphertext
- **THEN** the system SHALL process the returned authentication token payload

#### Scenario: Reject invalid credentials
- **WHEN** the backend returns a controlled login failure for invalid username, invalid encrypted payload, or wrong password
- **THEN** the system SHALL show the returned Chinese error message and SHALL keep the user on the login form

#### Scenario: Handle disabled user
- **WHEN** the backend rejects login because the user is disabled
- **THEN** the system SHALL show the controlled Chinese error message from the backend

### Requirement: Login template SHALL persist authentication state according to the remember option
The login template SHALL persist successful login token data in persistent browser storage after login succeeds, SHALL keep the stored payload limited to authentication token metadata, and SHALL NOT depend on returned user profile data from the login API.

#### Scenario: Persist token locally after successful login
- **WHEN** a user logs in successfully
- **THEN** the system SHALL persist the returned token in local browser storage
- **THEN** the system SHALL persist any token metadata needed for later bearer-token usage or expiry checks

#### Scenario: Do not overwrite storage on failed login
- **WHEN** a login request fails
- **THEN** the system SHALL keep the existing stored authentication token state unchanged

### Requirement: Login template SHALL align visible interactions with current backend capabilities
The login template SHALL present a login-only experience that matches the currently available backend capability and SHALL not expose a misleading locally successful registration flow.

#### Scenario: Backend supports login only
- **WHEN** the login page is rendered
- **THEN** the system SHALL present login as the primary available action and SHALL not allow a mock registration submission to complete as a real account operation

#### Scenario: Prevent duplicate submission
- **WHEN** a login request is in progress
- **THEN** the system SHALL disable repeated form submission and SHALL present a loading state

### Requirement: Login template SHALL preserve the existing themed feedback experience
The login template SHALL keep all new success, error, loading, and disabled states within the existing theme token system, SHALL present user-facing copy in Simplified Chinese by default, and SHALL present login success feedback without assuming that the login API returns user profile data.

#### Scenario: Show themed error state
- **WHEN** a login request fails due to business, encryption, or network reasons
- **THEN** the system SHALL present an error state that remains visually consistent in both light and dark themes

#### Scenario: Show themed success state
- **WHEN** a login request succeeds
- **THEN** the system SHALL present a success state that confirms login completion without requiring current-user profile feedback from the login response

### Requirement: Login template SHALL redirect to the URL-provided target after successful login
After the login template completes a successful login and persists authentication token data, it SHALL inspect the current page URL for a `redirect` query parameter. When that parameter exists and is non-empty, the system SHALL navigate the browser to the provided target address.

#### Scenario: Login success with redirect parameter
- **WHEN** a user lands on the login page with a non-empty `redirect` query parameter and logs in successfully
- **THEN** the system SHALL persist the authentication token data locally
- **THEN** the system SHALL navigate the browser to the `redirect` target

#### Scenario: Login success without redirect parameter
- **WHEN** a user logs in successfully and the login page URL does not contain a non-empty `redirect` query parameter
- **THEN** the system SHALL keep the existing local success feedback behavior
