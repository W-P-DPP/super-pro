## ADDED Requirements

### Requirement: System SHALL stop using JWT whitelist rules inside the JWT middleware
The system SHALL remove path-based whitelist bypass logic from `jwtMiddleware` and SHALL keep the middleware focused on validating the current request's JWT token only.

#### Scenario: JWT middleware no longer decides path exemptions
- **WHEN** the system processes a request through `jwtMiddleware`
- **THEN** the middleware SHALL validate JWT enablement and token presence or validity
- **THEN** the middleware SHALL NOT maintain a route whitelist for anonymous access

### Requirement: System SHALL apply JWT by explicit route or business router mounting
The system SHALL no longer mount `jwtMiddleware` globally for all `/api` routes in `app.ts`, and SHALL instead apply JWT explicitly at the route integration layer or inside a business router where needed.

#### Scenario: Protected business route requires JWT because it is explicitly mounted with JWT
- **WHEN** `JWT_ENABLED` is `true` and a client accesses a protected API route that is explicitly mounted with `jwtMiddleware`
- **THEN** the system SHALL reject requests without a valid bearer token

### Requirement: System SHALL keep anonymous APIs accessible through explicit route design rather than whitelist bypass
The system SHALL keep anonymous endpoints accessible only because the route definition or router integration omits JWT for that endpoint, not because `jwtMiddleware` contains a matching whitelist rule.

#### Scenario: Login API remains anonymous without whitelist
- **WHEN** `JWT_ENABLED` is `true` and a client sends `POST /api/user/loginUser` without an `Authorization` header
- **THEN** the system SHALL process the login request if that route is explicitly left outside JWT protection
- **THEN** the system SHALL NOT rely on a JWT whitelist entry to allow the request
