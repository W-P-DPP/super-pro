## ADDED Requirements

### Requirement: System SHALL persist a controlled role enum for each user
The system SHALL add a `role` field to the user domain model and SHALL restrict persisted role values to the controlled enum values `admin` and `guest`.

#### Scenario: Existing or newly created user stores a supported role value
- **WHEN** the system creates or loads a user record
- **THEN** the user record SHALL contain a `role` value of either `admin` or `guest`

#### Scenario: Create user falls back to guest role by default
- **WHEN** a client sends `POST /api/user/createUser` without a `role` field
- **THEN** the system SHALL create the user with `role` set to `guest`

### Requirement: System SHALL allow user CRUD write operations to handle role
The system SHALL accept `role` in user create and update requests, SHALL validate it before entering the repository layer, and SHALL persist the validated value in `sys_user`.

#### Scenario: Create user with admin role
- **WHEN** a client sends `POST /api/user/createUser` with `role` set to `admin`
- **THEN** the system SHALL persist the user with `role` equal to `admin`

#### Scenario: Update user role to guest
- **WHEN** a client sends `PUT /api/user/updateUser/:id` with `role` set to `guest`
- **THEN** the system SHALL update the target user's `role` to `guest`

### Requirement: System SHALL expose role in user CRUD responses
The system SHALL include the `role` field in user list, detail, create, and update responses so that callers can observe the persisted user role without additional mapping.

#### Scenario: User list returns role field
- **WHEN** a client sends `GET /api/user/getUser`
- **THEN** each returned user item SHALL include a `role` field with value `admin` or `guest`

#### Scenario: User detail returns role field
- **WHEN** a client sends `GET /api/user/getUser/:id`
- **THEN** the returned user object SHALL include a `role` field with value `admin` or `guest`

### Requirement: System SHALL reject unsupported role values with controlled Chinese errors
The system SHALL reject create and update requests containing unsupported role values and SHALL return controlled Chinese business errors instead of persisting invalid data or surfacing raw runtime errors.

#### Scenario: Create user with unsupported role
- **WHEN** a client sends `POST /api/user/createUser` with `role` set to an unsupported value
- **THEN** the system SHALL reject the request with a controlled Chinese error response

#### Scenario: Update user with unsupported role
- **WHEN** a client sends `PUT /api/user/updateUser/:id` with `role` set to an unsupported value
- **THEN** the system SHALL reject the request with a controlled Chinese error response
