## ADDED Requirements

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

## MODIFIED Requirements

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
