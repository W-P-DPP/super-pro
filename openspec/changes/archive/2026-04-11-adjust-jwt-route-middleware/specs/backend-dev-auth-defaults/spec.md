## ADDED Requirements

### Requirement: Repository backend development guidance SHALL require JWT by default for new APIs
The repository backend development guidance SHALL state that newly added backend APIs require JWT authentication by default unless the requirement explicitly states that an endpoint must remain anonymous.

#### Scenario: New API follows default JWT rule
- **WHEN** a developer adds a new backend API without any explicit anonymous-access requirement
- **THEN** the repository guidance SHALL require that API to be treated as JWT-protected by default

### Requirement: Repository backend development guidance SHALL default JWT mounting to src/index.ts
The repository backend development guidance SHALL state that JWT middleware is mounted by default at the business route integration point in `general-server/src/index.ts`.

#### Scenario: New protected business router follows default mount location
- **WHEN** a developer adds a new protected business router
- **THEN** the repository guidance SHALL direct the developer to mount `jwtMiddleware` at `general-server/src/index.ts` by default

### Requirement: Repository backend development guidance SHALL require explicit anonymous exceptions
The repository backend development guidance SHALL require anonymous endpoints to be explicitly documented and SHALL forbid developers from introducing anonymous access by editing a JWT whitelist inside the middleware.

#### Scenario: Anonymous API must be explicitly declared
- **WHEN** a developer adds or changes an API that must remain anonymous
- **THEN** the repository guidance SHALL require that exception to be explicitly stated in the change context or implementation design
- **THEN** the repository guidance SHALL forbid solving the exception by adding a JWT whitelist entry inside `jwtMiddleware`
