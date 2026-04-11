## ADDED Requirements

### Requirement: file-server SHALL use the left tree as the primary file workspace

The `file-server` frontend SHALL present the left-side tree as the primary workspace for browsing and managing the `file` directory, and SHALL keep the tree visibly distinguishable from the secondary content area.

#### Scenario: Tree-first layout on desktop

- **WHEN** a user opens the `file-server` page on desktop
- **THEN** the system SHALL render the file tree in the left column as the primary interactive workspace
- **THEN** the system SHALL keep the right content area visually secondary

#### Scenario: Current selection is reflected in the tree

- **WHEN** a user selects a file or folder node in the left tree
- **THEN** the system SHALL show a clear selected state on that node in the tree workspace

### Requirement: file-server SHALL allow core file actions from the tree workspace

The `file-server` frontend SHALL allow the user to perform core file management actions from the left tree workspace instead of requiring the right content area as the main action surface.

#### Scenario: Create folder from the tree workspace

- **WHEN** a user targets a folder location in the left tree and triggers the create-folder action
- **THEN** the system SHALL allow the user to create a new folder relative to that tree location

#### Scenario: Upload file from the tree workspace

- **WHEN** a user targets a folder location in the left tree and triggers the upload action
- **THEN** the system SHALL allow the user to upload a file into that folder from the tree workspace

#### Scenario: Delete target from the tree workspace

- **WHEN** a user selects a file or folder node in the left tree and triggers the delete action
- **THEN** the system SHALL allow the user to delete that target from the tree workspace

### Requirement: file-server SHALL render files and folders directly inside the tree workspace

The `file-server` frontend SHALL render both files and folders in the left tree so that users can browse and act on the full hierarchy from the tree workspace.

#### Scenario: Tree includes files and folders

- **WHEN** the system renders the current file hierarchy
- **THEN** the left tree SHALL include folder nodes and file nodes instead of showing folders only

#### Scenario: File nodes remain operable in the tree

- **WHEN** a file node appears in the tree
- **THEN** the system SHALL allow that file node to be selected
- **THEN** the system SHALL expose the supported file actions for that node from the tree workspace

### Requirement: file-server SHALL keep the right content area as an empty placeholder in this version

The `file-server` frontend SHALL keep the right content area as a non-operational placeholder in this version, and SHALL NOT depend on that area for the primary create, upload, or delete flows.

#### Scenario: Placeholder content area

- **WHEN** a user views the `file-server` page after this change
- **THEN** the right content area SHALL present an empty-state or placeholder message for future expansion

#### Scenario: Primary actions do not require the right content area

- **WHEN** a user creates a folder, uploads a file, or deletes a target
- **THEN** the system SHALL allow those actions to complete from the tree workspace without requiring the right content area as the main entry point
