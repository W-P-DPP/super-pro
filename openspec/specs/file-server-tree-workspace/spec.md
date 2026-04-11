# file-server-tree-workspace Specification

## Purpose
Define the left tree workspace behavior for `file-server`, including tree-first navigation, core file actions, batch and folder upload entry points, drag-and-drop move interactions, and the relationship between the tree workspace and the right-side preview area.

## Requirements

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

### Requirement: file-server SHALL render files and folders directly inside the tree workspace
The `file-server` frontend SHALL render both files and folders in the left tree so that users can browse and act on the full hierarchy from the tree workspace.

#### Scenario: Tree includes files and folders
- **WHEN** the system renders the current file hierarchy
- **THEN** the left tree SHALL include folder nodes and file nodes instead of showing folders only

#### Scenario: File nodes remain operable in the tree
- **WHEN** a file node appears in the tree
- **THEN** the system SHALL allow that file node to be selected
- **THEN** the system SHALL expose the supported file actions for that node from the tree workspace

### Requirement: file-server SHALL support dragging files and folders to another folder in the tree workspace
The `file-server` frontend SHALL allow the user to drag a file node or folder node from the left tree workspace and drop it onto a valid destination folder node to move that target under the destination folder.

#### Scenario: Drag a file into another folder
- **WHEN** a user drags a file node and drops it onto a different folder node in the tree workspace
- **THEN** the system SHALL request moving that file under the destination folder
- **THEN** the tree workspace SHALL refresh to reflect the new file location

#### Scenario: Drag a folder into another folder
- **WHEN** a user drags a folder node and drops it onto a different valid folder node
- **THEN** the system SHALL request moving that folder under the destination folder
- **THEN** the tree workspace SHALL refresh to reflect the updated hierarchy

#### Scenario: Reject invalid drop targets
- **WHEN** a user drags a node onto a file node, onto itself, or onto an invalid tree location
- **THEN** the system SHALL NOT submit a move request
- **THEN** the system SHALL keep the current tree state unchanged

### Requirement: file-server SHALL provide clear feedback for tree drag-and-drop operations
The `file-server` frontend SHALL provide controlled visual and textual feedback while a drag move is in progress and after it succeeds or fails.

#### Scenario: Show active drop target
- **WHEN** a user drags a node across the tree workspace
- **THEN** the system SHALL visually distinguish valid destination folder nodes from inactive nodes

#### Scenario: Move succeeds
- **WHEN** a drag move request completes successfully
- **THEN** the system SHALL display a controlled Chinese success message
- **THEN** the moved node or its destination folder SHALL remain the primary context after refresh

#### Scenario: Move fails
- **WHEN** a drag move request fails because the target is invalid, conflicting, or rejected by the backend
- **THEN** the system SHALL display a controlled Chinese failure message
- **THEN** the tree SHALL remain in its previous valid state

### Requirement: file-server SHALL keep the right content area as a file preview workspace in this version
The `file-server` frontend SHALL use the right content area as a preview workspace for the currently selected file or folder context, and SHALL NOT require that area as the primary entry point for create, upload, delete, or drag-move actions.

#### Scenario: Preview workspace for a selected file
- **WHEN** a user selects a file node in the `file-server` tree
- **THEN** the right content area SHALL display the preview workspace for that file instead of a generic placeholder

#### Scenario: Contextual empty state for a selected folder
- **WHEN** a user selects a folder node in the `file-server` tree
- **THEN** the right content area SHALL display a controlled folder-context state for preview or future actions

#### Scenario: Primary actions remain in the tree workspace
- **WHEN** a user creates a folder, uploads a file, deletes a target, or drags a node to another folder
- **THEN** the system SHALL allow those actions to complete from the tree workspace without requiring the right content area as the main action surface
