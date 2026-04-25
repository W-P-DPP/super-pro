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

### Requirement: System SHALL provide a dedicated authenticated file download endpoint
The system SHALL provide a dedicated `GET /api/file/download` endpoint under the existing file business domain. The endpoint SHALL accept `targetPath` as the target file path, SHALL enforce the same repository root `file` directory boundary as other file operations, and SHALL reject requests that target folders or paths outside that root.

#### Scenario: Download a file inside the file root
- **WHEN** a client sends a `GET` request to `/api/file/download` with a valid `targetPath` that points to a file inside the repository root `file` directory
- **THEN** the system SHALL return the file content successfully
- **THEN** the response SHALL use attachment download semantics for the resolved file name

#### Scenario: Reject downloading a folder
- **WHEN** a client sends a `GET` request to `/api/file/download` with a `targetPath` that resolves to a folder
- **THEN** the system SHALL reject the request with a controlled error response

#### Scenario: Reject download path escape
- **WHEN** a client sends a `GET` request to `/api/file/download` with a `targetPath` that resolves outside the repository root `file` directory
- **THEN** the system SHALL reject the request with a controlled error response

