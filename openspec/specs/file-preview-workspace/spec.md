# file-preview-workspace Specification

## Purpose
Define the right-side preview workspace for `file-server`, including supported preview types, selection-driven preview switching, and controlled fallback states for loading, unsupported, oversized, or failed previews.
## Requirements
### Requirement: file-server SHALL redirect unauthorized preview access to the login page
The `file-server` frontend SHALL treat preview requests as protected requests. When preview loading is rejected because authentication or authorization is not accepted, the system SHALL redirect the browser to the configured login page and SHALL preserve the current page URL as a `redirect` parameter.

#### Scenario: Preview request returns unauthorized
- **WHEN** the current file preview request receives a `401` or `403` response
- **THEN** the system SHALL navigate the browser to the configured login page
- **THEN** the login page URL SHALL include the current `file-server` page address as the encoded `redirect` parameter

#### Scenario: Preview request succeeds
- **WHEN** the current file preview request succeeds
- **THEN** the system SHALL keep the existing preview rendering behavior
- **THEN** the system SHALL NOT trigger a login redirect

### Requirement: file-server SHALL render a preview workspace for selected supported files
The `file-server` frontend SHALL render a preview workspace in the right content area for the currently selected file when that file type is supported for preview.

#### Scenario: Preview a Markdown file
- **WHEN** a user selects a Markdown file in the tree workspace
- **THEN** the system SHALL convert the Markdown text into HTML before rendering the preview content
- **THEN** the system SHALL render the resulting HTML in the right preview area
- **THEN** the Markdown preview body SHALL be displayed in a centered readable content column instead of stretching edge to edge across the panel

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

### Requirement: file-server SHALL provide a download action for the selected file
The `file-server` frontend SHALL provide a visible download action in the preview workspace when the current selection is a file, and SHALL use the selected file path to trigger a browser download through the authenticated file service.

#### Scenario: Download the currently selected file
- **WHEN** a user selects a file in the tree workspace
- **THEN** the preview workspace SHALL display a download action for that file
- **THEN** invoking that action SHALL trigger a browser download for the selected file

#### Scenario: Do not provide download for a folder context
- **WHEN** a user selects a folder in the tree workspace
- **THEN** the preview workspace SHALL NOT display a file download action

#### Scenario: Keep preview behavior unchanged after exposing download
- **WHEN** a user selects a file that is previewable in the current system
- **THEN** the system SHALL continue rendering the existing preview content for that file
- **THEN** the added download action SHALL NOT replace or block the preview workflow
