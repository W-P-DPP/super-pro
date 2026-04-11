## ADDED Requirements

### Requirement: Login template SHALL authenticate through the backend login API
The login template SHALL submit username and password to `POST /api/user/loginUser` instead of using local mock authentication logic.

#### Scenario: Submit valid credentials
- **WHEN** a user submits a valid username and password from the login form
- **THEN** the system SHALL call `POST /api/user/loginUser` and process the returned authentication payload

#### Scenario: Reject invalid credentials
- **WHEN** the backend returns a controlled login failure for invalid username or password
- **THEN** the system SHALL show the returned Chinese error message and SHALL keep the user on the login form

#### Scenario: Handle disabled user
- **WHEN** the backend rejects login because the user is disabled
- **THEN** the system SHALL show the controlled Chinese error message from the backend

### Requirement: Login template SHALL persist authentication state according to the remember option
The login template SHALL persist successful login state, including token, token type, expiry metadata, and current user information, and SHALL choose the storage scope based on the remember-device option.

#### Scenario: Remember current device
- **WHEN** a user logs in successfully with “记住当前设备” enabled
- **THEN** the system SHALL persist the authentication state in persistent browser storage

#### Scenario: Session-only login
- **WHEN** a user logs in successfully without enabling “记住当前设备”
- **THEN** the system SHALL persist the authentication state in session-scoped browser storage

#### Scenario: Restore stored login state
- **WHEN** the application starts and a valid stored authentication state exists
- **THEN** the system SHALL restore the current login state without requiring the user to re-enter credentials

### Requirement: Login template SHALL align visible interactions with current backend capabilities
The login template SHALL present a login-only experience that matches the currently available backend capability and SHALL not expose a misleading locally successful registration flow.

#### Scenario: Backend supports login only
- **WHEN** the login page is rendered
- **THEN** the system SHALL present login as the primary available action and SHALL not allow a mock registration submission to complete as a real account operation

#### Scenario: Prevent duplicate submission
- **WHEN** a login request is in progress
- **THEN** the system SHALL disable repeated form submission and SHALL present a loading state

### Requirement: Login template SHALL preserve the existing themed feedback experience
The login template SHALL keep all new success, error, loading, and disabled states within the existing theme token system and SHALL present user-facing copy in Simplified Chinese by default.

#### Scenario: Show themed error state
- **WHEN** a login request fails due to business or network reasons
- **THEN** the system SHALL present an error state that remains visually consistent in both light and dark themes

#### Scenario: Show themed success state
- **WHEN** a login request succeeds
- **THEN** the system SHALL present a success state and current-user feedback using the existing component and token language
