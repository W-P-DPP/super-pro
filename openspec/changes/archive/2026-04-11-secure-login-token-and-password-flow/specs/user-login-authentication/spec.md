## ADDED Requirements

### Requirement: System SHALL expose a login public key API under the user business prefix
The system SHALL provide a login public key API in the existing `user` business domain and SHALL expose it as `GET /api/user/getLoginPublicKey`. The API SHALL remain anonymously accessible through explicit route design and SHALL return the public key material required by the frontend to encrypt the login password.

#### Scenario: Access login public key API without JWT
- **WHEN** `JWT_ENABLED` is `true` and a client sends a `GET` request to `/api/user/getLoginPublicKey` without an `Authorization` header
- **THEN** the system SHALL process the request instead of rejecting it for missing token
- **THEN** the response data SHALL include the login public key required for client-side password encryption

## MODIFIED Requirements

### Requirement: System SHALL authenticate users with username and password and issue a JWT
The system SHALL authenticate users with username and encrypted password credentials, SHALL decrypt the submitted login password on the server before password-hash verification, SHALL reject users in a non-loginable status, and SHALL return only JWT token data required by the caller on successful login.

#### Scenario: Successful login
- **WHEN** a client sends `POST /api/user/loginUser` with a valid username, a valid encrypted password ciphertext, and an enabled user account
- **THEN** the system SHALL return a successful Chinese response
- **THEN** the response data SHALL include a JWT token
- **THEN** the response data SHALL include token metadata required by the caller to use the token
- **THEN** the response data SHALL NOT include the logged-in user's profile information

#### Scenario: Disabled user cannot log in
- **WHEN** a client sends `POST /api/user/loginUser` with credentials that decrypt and verify successfully for a disabled user
- **THEN** the system SHALL reject the login request with a controlled Chinese error response

### Requirement: System SHALL return controlled Chinese errors for invalid login attempts
The system SHALL validate login input, SHALL reject malformed or undecryptable login password ciphertext, and SHALL return controlled Chinese errors instead of raw runtime or database errors when login fails.

#### Scenario: Missing login parameters
- **WHEN** a client sends `POST /api/user/loginUser` without a required username or password ciphertext
- **THEN** the system SHALL return a controlled Chinese error response for invalid parameters

#### Scenario: Invalid encrypted password payload
- **WHEN** a client sends `POST /api/user/loginUser` with a password ciphertext that cannot be decrypted by the server
- **THEN** the system SHALL return a controlled Chinese error response for invalid login credentials or malformed encrypted payload

#### Scenario: Invalid credentials
- **WHEN** a client sends `POST /api/user/loginUser` with a non-existent username or a decrypted password that does not match the stored hash
- **THEN** the system SHALL return the same controlled Chinese error response for invalid credentials
