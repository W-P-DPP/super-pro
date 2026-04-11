## ADDED Requirements

### Requirement: file-server SHALL support batch file upload from the tree workspace
The `file-server` frontend SHALL allow the user to choose and upload multiple files from a folder node in the tree workspace, and SHALL send those files to the backend using the selected folder as the upload target.

#### Scenario: Upload multiple files from a folder node
- **WHEN** a user selects a folder node in the tree workspace and triggers the batch file upload action
- **THEN** the system SHALL allow the user to choose multiple files in one picker interaction
- **THEN** the system SHALL upload those files into the selected folder
- **THEN** the tree workspace SHALL refresh to reflect the uploaded files

### Requirement: file-server SHALL support folder upload from the tree workspace
The `file-server` frontend SHALL allow the user to choose a local folder from a folder node in the tree workspace, and SHALL preserve the selected folder's internal relative paths when submitting the upload request.

#### Scenario: Upload a folder from a folder node
- **WHEN** a user selects a folder node in the tree workspace and triggers the folder upload action
- **THEN** the system SHALL allow the user to choose a local folder
- **THEN** the system SHALL submit the folder contents with their relative paths preserved
- **THEN** the tree workspace SHALL refresh to reflect the uploaded folder structure

### Requirement: file-server SHALL return controlled feedback for batch and folder upload results
The `file-server` frontend SHALL display controlled Chinese feedback when a batch file upload or folder upload succeeds or fails, and SHALL keep the target folder as the primary context after the tree refresh.

#### Scenario: Batch upload succeeds
- **WHEN** a batch file upload or folder upload request succeeds
- **THEN** the system SHALL display a Chinese success message for that upload action
- **THEN** the refreshed tree SHALL remain focused on the target folder used for the upload

#### Scenario: Batch upload fails
- **WHEN** a batch file upload or folder upload request fails
- **THEN** the system SHALL display a controlled Chinese error message returned from the backend instead of a silent failure
