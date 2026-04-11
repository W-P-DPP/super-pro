## ADDED Requirements

### Requirement: System SHALL preserve uploaded filenames across supported client platforms
The system SHALL normalize the uploaded multipart filename before validation, conflict detection, persistence, and response generation, and SHALL preserve the user's intended filename for supported browser upload flows including macOS clients uploading Chinese filenames.

#### Scenario: Preserve a normal uploaded filename
- **WHEN** a client uploads a file whose multipart filename is already correctly decoded
- **THEN** the system SHALL keep that filename unchanged for validation, persistence, and response data

#### Scenario: Recover a garbled macOS Chinese filename before saving
- **WHEN** a client uploads a Chinese-named file from a supported macOS browser flow and the multipart filename reaches the server in a garbled decoded form
- **THEN** the system SHALL recover the intended filename before saving the file
- **THEN** the saved file name SHALL match the user's intended Chinese filename
- **THEN** the response data SHALL return the recovered filename and relative path

#### Scenario: Detect conflicts using the normalized filename
- **WHEN** a client uploads a file whose normalized filename matches an existing file in the target directory
- **THEN** the system SHALL reject the upload with the existing controlled conflict response instead of saving a second incorrectly named file
