# file-service-management Specification

## Purpose
Define the workspace-local file service that manages the repository root `file` directory as the only visible working area, moves deleted content into the repository root `rubbish` directory, and provides a dedicated `file-server` frontend workspace package for operating this capability.

## Requirements

### Requirement: System SHALL expose file service APIs under the file business prefix

The system SHALL provide file management APIs in a dedicated `file` business domain and SHALL expose them under `/api/file`.

#### Scenario: Access file tree API through the file business prefix

- **WHEN** a client sends a `GET` request to `/api/file/tree`
- **THEN** the system SHALL route the request through the `file` module instead of mixing the capability into unrelated business domains

#### Scenario: Access file creation and deletion APIs through the file business prefix

- **WHEN** a client sends requests to create a folder, upload a file, or delete a target under `/api/file`
- **THEN** the system SHALL process those requests through the same `file` business domain

### Requirement: System SHALL limit all file operations to the repository root file directory

The system SHALL treat the repository root `file` directory as the only writable and queryable business root, SHALL resolve all client-provided paths relative to that root, and SHALL reject requests that escape that root.

#### Scenario: Create folder inside the file root

- **WHEN** a client requests creating a folder under an existing parent path within the repository root `file` directory
- **THEN** the system SHALL create the folder successfully inside that root

#### Scenario: Upload file inside the file root

- **WHEN** a client uploads a file and provides a target directory that exists within the repository root `file` directory
- **THEN** the system SHALL store the uploaded file inside that target directory

#### Scenario: Reject path escape

- **WHEN** a client provides a path that resolves outside the repository root `file` directory, including traversal-like input such as `../`
- **THEN** the system SHALL reject the request with a controlled error response

### Requirement: System SHALL reject overwrite conflicts for folder creation and file upload

The system SHALL NOT overwrite an existing file or folder when handling folder creation or file upload requests.

#### Scenario: Reject creating a folder with an existing sibling name

- **WHEN** a client requests creating a folder whose name already exists under the same parent directory
- **THEN** the system SHALL reject the request with a controlled error response

#### Scenario: Reject uploading a file with an existing target name

- **WHEN** a client uploads a file whose target directory already contains the same file name
- **THEN** the system SHALL reject the request with a controlled error response

### Requirement: System SHALL return the repository root file directory as a tree structure

The system SHALL return the repository root `file` directory as a tree structure that distinguishes folders from files.

#### Scenario: Query file tree

- **WHEN** a client requests `GET /api/file/tree`
- **THEN** the system SHALL return the current contents of the repository root `file` directory as a tree
- **THEN** each returned node SHALL identify whether it is a file or a folder

### Requirement: System SHALL soft-delete files and folders by moving them into the rubbish directory

The system SHALL soft-delete files and folders by moving the target into the repository root `rubbish` directory instead of physically deleting it, and SHALL preserve the original relative path under a timestamp-based bucket.

#### Scenario: Delete a file

- **WHEN** a client deletes a file within the repository root `file` directory
- **THEN** the system SHALL move that file into `rubbish/<timestamp>/original-relative-path`

#### Scenario: Delete a folder

- **WHEN** a client deletes a folder within the repository root `file` directory
- **THEN** the system SHALL move that folder and its contents into `rubbish/<timestamp>/original-relative-path`

#### Scenario: Reject deleting the file root itself

- **WHEN** a client attempts to delete the repository root `file` directory itself
- **THEN** the system SHALL reject the request with a controlled error response

### Requirement: Workspace SHALL include a dedicated file-server frontend package for this capability

The workspace SHALL include a dedicated frontend package named `file-server` and SHALL manage it through the existing monorepo configuration.

#### Scenario: file-server is part of the workspace

- **WHEN** the repository workspace configuration is loaded
- **THEN** the `file-server` package SHALL be included in the monorepo package set for development and build workflows
