## ADDED Requirements

### Requirement: System SHALL support batch file upload under a target directory
The system SHALL allow a client to upload multiple files in a single `POST /api/file/upload` request, SHALL treat the provided `targetPath` as the root directory for that request, and SHALL store each uploaded file inside that target directory when no per-file relative subpath is provided.

#### Scenario: Upload multiple files into one target directory
- **WHEN** a client uploads multiple files in one request and the `targetPath` exists within the repository root `file` directory
- **THEN** the system SHALL save all uploaded files under that target directory
- **THEN** the system SHALL return a controlled successful response for the upload batch

### Requirement: System SHALL preserve relative paths for folder upload
The system SHALL allow a client to provide per-file relative paths in an upload batch, SHALL resolve those relative paths under the request `targetPath`, and SHALL create any missing intermediate directories beneath that target path before writing the files.

#### Scenario: Upload a folder structure under a target directory
- **WHEN** a client uploads multiple files together with valid relative paths that represent a folder hierarchy under an existing `targetPath`
- **THEN** the system SHALL recreate that hierarchy within the target directory
- **THEN** the system SHALL store each file at the relative path indicated by the client within that hierarchy

### Requirement: System SHALL validate the entire upload batch before writing files
The system SHALL validate every target path in an upload batch before writing any file, and SHALL reject the entire batch if any file would escape the repository root `file` directory, collide with an existing target, or collide with another file in the same upload batch.

#### Scenario: Reject a batch when one target conflicts with an existing file
- **WHEN** a client uploads multiple files and any resolved target path already exists within the destination hierarchy
- **THEN** the system SHALL reject the entire upload batch with a controlled conflict response
- **THEN** the system SHALL NOT write any file from that request

#### Scenario: Reject a batch when one relative path escapes the file root
- **WHEN** a client uploads multiple files and any provided relative path resolves outside the repository root `file` directory
- **THEN** the system SHALL reject the entire upload batch with a controlled error response
- **THEN** the system SHALL NOT write any file from that request
