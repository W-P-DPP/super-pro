## ADDED Requirements

### Requirement: Frontend template SHALL route strict menu card clicks through the configured login page
The frontend template SHALL inspect the `strict` field on tool menu items returned by the menu API. When a user clicks a tool card whose `strict` value is `true`, the system SHALL open a configured login page URL in a new browser window instead of opening the tool target directly.

#### Scenario: Strict card click uses login page
- **WHEN** a user clicks a tool card whose menu item has `strict` set to `true`
- **THEN** the system SHALL open the configured login page URL in a new browser window
- **THEN** the system SHALL NOT open the original tool target directly before login

#### Scenario: Non-strict card keeps current behavior
- **WHEN** a user clicks a tool card whose menu item has `strict` set to `false`
- **THEN** the system SHALL keep the existing direct-open behavior for that target

### Requirement: Frontend template SHALL configure the login page URL through environment variables
The frontend template SHALL read the strict-menu login page address from an environment variable so the login target can be changed without editing component code. The default configured value SHALL be `http://www.zwpsite.icu:8082/login`.

#### Scenario: Generate login URL from env configuration
- **WHEN** the frontend template resolves the login page URL for a strict menu click
- **THEN** the system SHALL use the environment-configured login page address

### Requirement: Frontend template SHALL include redirect target on strict card login jumps
When the frontend template redirects a strict menu card click to the login page, it SHALL include a `redirect` query parameter whose value is the clicked card's original target address.

#### Scenario: Strict external card carries redirect target
- **WHEN** a user clicks a strict tool card whose original target is `https://target.example.com/path`
- **THEN** the login page URL SHALL include `redirect=https%3A%2F%2Ftarget.example.com%2Fpath`

#### Scenario: Strict internal-style path carries redirect target
- **WHEN** a user clicks a strict tool card whose original target is a non-empty path string
- **THEN** the login page URL SHALL include that original target as the encoded `redirect` parameter value
