# frontend-template-strict-menu-redirect Specification

## Purpose
TBD - created by archiving change strict-menu-login-redirect. Update Purpose after archive.
## Requirements
### Requirement: Frontend template SHALL route strict menu card clicks according to menu protection and local login state
The frontend template SHALL inspect the `strict` field on tool menu items returned by the menu API and SHALL also inspect whether the browser already contains a reusable auth token. When a user clicks a tool card whose `strict` value is `true`, the system SHALL open the configured login page URL in a new browser window only when no reusable auth token is available. When a reusable auth token is already available, the system SHALL open the original tool target directly instead of forcing an additional login jump.

#### Scenario: Strict card click without local token uses login page
- **WHEN** a user clicks a tool card whose menu item has `strict` set to `true`
- **AND** the browser does not contain a reusable auth token
- **THEN** the system SHALL open the configured login page URL in a new browser window
- **THEN** the system SHALL NOT open the original tool target directly before login

#### Scenario: Strict card click with local token opens target directly
- **WHEN** a user clicks a tool card whose menu item has `strict` set to `true`
- **AND** the browser already contains a reusable auth token
- **THEN** the system SHALL open the original tool target directly
- **THEN** the system SHALL NOT force an intermediate login-page jump

#### Scenario: Non-strict card keeps current behavior
- **WHEN** a user clicks a tool card whose menu item has `strict` set to `false`
- **THEN** the system SHALL keep the existing direct-open behavior for that target

### Requirement: Frontend template SHALL configure the login page URL through environment variables
The frontend template SHALL read the strict-menu login page address from an environment variable so the login target can be changed without editing component code. The default configured value SHALL be `http://www.zwpsite.icu:8082/login`.

#### Scenario: Generate login URL from env configuration
- **WHEN** the frontend template resolves the login page URL for a strict menu click
- **THEN** the system SHALL use the environment-configured login page address

### Requirement: Frontend template SHALL include redirect target on strict card login jumps
When the frontend template opens the login page for a strict menu card click because no reusable auth token is available, it SHALL include a `redirect` query parameter whose value is the resolved strict-menu target address. In development mode, if the original menu target matches a configured development remapping rule, the `redirect` value SHALL use the remapped local development target instead of the original production target.

#### Scenario: Strict external card carries original redirect target when no remapping applies
- **WHEN** a user clicks a strict tool card whose original target is `https://target.example.com/path`
- **AND** the browser does not contain a reusable auth token
- **THEN** the login page URL SHALL include `redirect=https%3A%2F%2Ftarget.example.com%2Fpath`

#### Scenario: Strict internal workspace target carries remapped development redirect target
- **WHEN** the frontend template runs in development mode
- **AND** a user clicks a strict tool card whose original target is `http://www.zwpsite.icu:8082/agent/chat?tab=history#panel`
- **AND** the browser does not contain a reusable auth token
- **AND** the configured remapping rule maps `http://www.zwpsite.icu:8082/agent/` to `http://127.0.0.1:15697/agent/`
- **THEN** the login page URL SHALL include `redirect=http%3A%2F%2F127.0.0.1%3A15697%2Fagent%2Fchat%3Ftab%3Dhistory%23panel`

#### Scenario: Strict internal-style path keeps original redirect target when remapping is unavailable
- **WHEN** a user clicks a strict tool card whose original target is a non-empty path string
- **AND** the browser does not contain a reusable auth token
- **AND** no development remapping rule applies
- **THEN** the login page URL SHALL include that original target as the encoded `redirect` parameter value

### Requirement: Frontend template SHALL configure development target remapping for strict menu entries
The frontend template SHALL allow development-only remapping rules for strict menu targets through environment configuration. Each rule SHALL map a production target URL prefix to the corresponding local development base URL.

#### Scenario: Development target remapping rules come from environment configuration
- **WHEN** the frontend template runs in development mode and resolves a strict menu target
- **THEN** the system SHALL read the configured target remapping rules from environment configuration
- **THEN** each remapping rule SHALL define a production target prefix and a local development base URL

### Requirement: Frontend template SHALL remap matched strict menu targets before navigation resolution in development mode
When the frontend template runs in development mode and a strict menu target matches a configured remapping rule, the system SHALL rebuild the final target address against the mapped local development base URL before deciding whether to open the target directly or send the user to login. The rebuilt target SHALL preserve the unmatched pathname remainder, query string, and hash fragment from the original target.

#### Scenario: Strict menu target matches a configured development rule
- **WHEN** a strict menu target is `http://www.zwpsite.icu:8082/agent/chat?tab=history#panel`
- **AND** development remapping config maps `http://www.zwpsite.icu:8082/agent/` to `http://127.0.0.1:15697/agent/`
- **THEN** the resolved strict menu target SHALL become `http://127.0.0.1:15697/agent/chat?tab=history#panel`

#### Scenario: Strict menu target does not match any configured development rule
- **WHEN** the frontend template runs in development mode
- **AND** a strict menu target does not match any configured remapping rule
- **THEN** the system SHALL keep the original target address unchanged

#### Scenario: Production mode keeps original strict menu target
- **WHEN** the frontend template runs in production mode
- **THEN** the system SHALL NOT apply development target remapping
