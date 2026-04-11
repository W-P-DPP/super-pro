## ADDED Requirements

### Requirement: System SHALL support moving files and folders within the repository root file directory
The system SHALL allow a client to move a file or folder from one path under the repository root `file` directory to another existing folder under that same root, and SHALL preserve the moved target's name during the move.

#### Scenario: Move a file to another folder
- **WHEN** a client requests moving a file from one valid path under the repository root `file` directory into another existing folder under that root
- **THEN** the system SHALL move that file into the destination folder

#### Scenario: Move a folder to another folder
- **WHEN** a client requests moving a folder from one valid path under the repository root `file` directory into another existing folder under that root
- **THEN** the system SHALL move that folder and its descendants into the destination folder

### Requirement: System SHALL validate drag-move targets before changing the file tree
The system SHALL validate every move request before changing the file tree, and SHALL reject the request if the source does not exist, the source is the root, the destination is not an existing folder, the move would escape the repository root `file` directory, the move would place a folder inside itself or its descendant, or the destination already contains a conflicting target name.

#### Scenario: Reject moving the file root
- **WHEN** a client requests moving the repository root `file` directory
- **THEN** the system SHALL reject the request with a controlled error response

#### Scenario: Reject moving a folder into itself or a descendant
- **WHEN** a client requests moving a folder into the same folder or into one of its descendant folders
- **THEN** the system SHALL reject the request with a controlled error response

#### Scenario: Reject destination conflict
- **WHEN** a client requests moving a file or folder into a destination folder that already contains the same target name
- **THEN** the system SHALL reject the request with a controlled error response

### Requirement: System SHALL provide controlled file content access for previewable files
The system SHALL provide a controlled way for the `file-server` preview workspace to read supported file content from within the repository root `file` directory without exposing paths outside that root.

#### Scenario: Read a previewable file inside the file root
- **WHEN** a client requests preview access to a supported file under the repository root `file` directory
- **THEN** the system SHALL return the requested file content through the controlled file service domain

#### Scenario: Reject preview path escape
- **WHEN** a client requests preview access for a path that resolves outside the repository root `file` directory
- **THEN** the system SHALL reject the request with a controlled error response
