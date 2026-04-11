## ADDED Requirements

### Requirement: file-server SHALL render a preview workspace for selected supported files
The `file-server` frontend SHALL render a preview workspace in the right content area for the currently selected file when that file type is supported for preview.

#### Scenario: Preview a Markdown file
- **WHEN** a user selects a Markdown file in the tree workspace
- **THEN** the system SHALL render the Markdown content in the right preview area

#### Scenario: Preview a PDF or media file
- **WHEN** a user selects a supported PDF, image, audio, or video file in the tree workspace
- **THEN** the system SHALL render a corresponding in-app preview in the right content area

#### Scenario: Preview an office document
- **WHEN** a user selects a supported office document such as `docx` or `xlsx/xls`
- **THEN** the system SHALL render a controlled read-only preview strategy for that file in the right content area

### Requirement: file-server SHALL keep preview state aligned with the current tree selection
The `file-server` preview workspace SHALL update according to the currently selected tree node and SHALL avoid showing stale content from a previously selected file.

#### Scenario: Switch from one file to another
- **WHEN** a user changes the selected file node in the tree
- **THEN** the preview workspace SHALL replace the previous preview with the newly selected file's preview state

#### Scenario: Select a folder instead of a file
- **WHEN** a user selects a folder node
- **THEN** the preview workspace SHALL stop showing the previous file preview
- **THEN** the preview workspace SHALL display a controlled folder-context state instead

### Requirement: file-server SHALL provide controlled fallback states for unsupported or unavailable previews
The `file-server` preview workspace SHALL provide controlled Chinese feedback when a preview is loading, unavailable, unsupported, or intentionally declined because the file is too large or unsafe to preview directly.

#### Scenario: Preview is loading
- **WHEN** a user selects a supported file and the preview content is still being prepared
- **THEN** the preview workspace SHALL display a loading state instead of a blank area

#### Scenario: Preview is unsupported
- **WHEN** a user selects a file whose type is not supported for preview
- **THEN** the preview workspace SHALL display a controlled unsupported-preview message

#### Scenario: Preview fails
- **WHEN** a supported file cannot be previewed because content loading or parsing fails
- **THEN** the preview workspace SHALL display a controlled failure message instead of crashing or leaving stale content visible
