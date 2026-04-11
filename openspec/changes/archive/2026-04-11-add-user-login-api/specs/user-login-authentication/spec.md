## ADDED Requirements

### Requirement: System SHALL expose a user login API under the user business prefix
The system SHALL provide a login API in the existing `user` business domain and SHALL expose it as `POST /api/user/loginUser`.

#### Scenario: Access login API through user business prefix
- **WHEN** a client sends a `POST` request to `/api/user/loginUser`
- **THEN** the system SHALL route the request through the `user` module instead of creating a separate business prefix

### Requirement: System SHALL allow the user login API to bypass JWT token verification
The system SHALL allow anonymous access to `POST /api/user/loginUser` even when JWT verification is enabled, and SHALL continue enforcing JWT verification for other protected `/api` routes.

#### Scenario: Login remains accessible when JWT is enabled
- **WHEN** `JWT_ENABLED` is `true` and a client sends `POST /api/user/loginUser` without an `Authorization` header
- **THEN** the system SHALL process the login request instead of rejecting it for missing token

### Requirement: System SHALL authenticate users with username and password and issue a JWT
The system SHALL validate username and password credentials against the user data source, SHALL reject users in a non-loginable status, and SHALL return a JWT token plus sanitized user information on successful login.

#### Scenario: Successful login
- **WHEN** a client sends `POST /api/user/loginUser` with a valid username, password, and an enabled user account
- **THEN** the system SHALL return a successful Chinese response
- **THEN** the response data SHALL include a JWT token
- **THEN** the response data SHALL include token metadata required by the caller to use the token
- **THEN** the response data SHALL include the logged-in user's basic information without exposing the password hash

#### Scenario: Disabled user cannot log in
- **WHEN** a client sends `POST /api/user/loginUser` with correct credentials for a disabled user
- **THEN** the system SHALL reject the login request with a controlled Chinese error response

### Requirement: System SHALL store and process login credentials without exposing sensitive fields
The system SHALL maintain a password hash for login verification, SHALL avoid returning the password hash in CRUD or login responses, and SHALL keep credential handling inside the defined user module layers.

#### Scenario: Password hash is not exposed in user-facing responses
- **WHEN** the system returns user data from `POST /api/user/loginUser`, `GET /api/user/getUser`, or `GET /api/user/getUser/:id`
- **THEN** the response SHALL NOT include the stored password hash field

### Requirement: System SHALL return controlled Chinese errors for invalid login attempts
The system SHALL validate login input and SHALL return controlled Chinese errors instead of raw runtime or database errors when login fails.

#### Scenario: Missing login parameters
- **WHEN** a client sends `POST /api/user/loginUser` without a required username or password
- **THEN** the system SHALL return a controlled Chinese error response for invalid parameters

#### Scenario: Invalid credentials
- **WHEN** a client sends `POST /api/user/loginUser` with a non-existent username or an incorrect password
- **THEN** the system SHALL return the same controlled Chinese error response for invalid credentials
