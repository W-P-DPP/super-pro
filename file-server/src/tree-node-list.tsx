import {
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  Trash2,
  Upload,
} from 'lucide-react'
import type { DragEvent, ReactNode } from 'react'
import type { DragState } from './file-server-types'
import type { FileNode } from './file-tree'
import { getChildren } from './file-tree'

function formatFileSize(size?: number): string {
  if (typeof size !== 'number') {
    return '--'
  }

  if (size < 1024) {
    return `${size} B`
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }

  if (size < 1024 * 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`
  }

  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

function formatTime(value?: string): string {
  if (!value) {
    return '--'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '--'
  }

  return date.toLocaleString('zh-CN', { hour12: false })
}

function getNodeLabel(node: FileNode): string {
  return node.relativePath === '/' ? 'file' : node.name
}

function ActionButton({
  label,
  disabled,
  danger = false,
  onClick,
  children,
}: {
  label: string
  disabled?: boolean
  danger?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={[
        'inline-flex size-8 items-center justify-center rounded-lg border transition',
        danger
          ? 'border-transparent text-destructive hover:border-destructive/25 hover:bg-destructive/10'
          : 'border-transparent text-muted-foreground hover:border-border hover:bg-background hover:text-foreground',
        disabled ? 'cursor-not-allowed opacity-50' : '',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

export type TreeNodeListProps = {
  nodes: FileNode[]
  depth?: number
  selectedPath: string
  expandedPaths: string[]
  composingPath: string | null
  folderName: string
  submitting: boolean
  dragState: DragState
  onSelect: (pathName: string) => void
  onToggleExpand: (pathName: string) => void
  onStartCreateFolder: (pathName: string) => void
  onFolderNameChange: (value: string) => void
  onCreateFolder: () => void
  onCancelCreateFolder: () => void
  onUploadFiles: (pathName: string) => void
  onUploadFolder: (pathName: string) => void
  onDelete: (pathName: string) => void
  onDragStart: (node: FileNode) => void
  onDragEnd: () => void
  onDragOver: (node: FileNode, event: DragEvent<HTMLDivElement>) => void
  onDrop: (node: FileNode, event: DragEvent<HTMLDivElement>) => void
  isValidDropTarget: (node: FileNode) => boolean
}

export function TreeNodeList({
  nodes,
  depth = 0,
  selectedPath,
  expandedPaths,
  composingPath,
  folderName,
  submitting,
  dragState,
  onSelect,
  onToggleExpand,
  onStartCreateFolder,
  onFolderNameChange,
  onCreateFolder,
  onCancelCreateFolder,
  onUploadFiles,
  onUploadFolder,
  onDelete,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  isValidDropTarget,
}: TreeNodeListProps) {
  return (
    <div className="space-y-1">
      {nodes.map((node) => {
        const isFolder = node.type === 'folder'
        const isRoot = node.relativePath === '/'
        const children = getChildren(node)
        const isExpanded = isRoot || (isFolder && expandedPaths.includes(node.relativePath))
        const isSelected = selectedPath === node.relativePath
        const isDragging = dragState.sourcePath === node.relativePath
        const isDropTarget = dragState.dropTargetPath === node.relativePath
        const nodeLabel = getNodeLabel(node)
        const metaText = isFolder
          ? `${children.length} 个子项`
          : `${formatFileSize(node.size)} · ${formatTime(node.modifiedTime)}`

        return (
          <div key={node.relativePath} className="space-y-1">
            <div
              draggable={!isRoot && !submitting}
              onDragStart={() => onDragStart(node)}
              onDragEnd={onDragEnd}
              onDragOver={(event) => onDragOver(node, event)}
              onDrop={(event) => onDrop(node, event)}
              className={[
                'group rounded-lg border transition',
                isDropTarget
                  ? 'border-primary/40 bg-primary/10 shadow-[var(--shadow-soft)]'
                  : isSelected
                    ? 'border-primary/30 bg-primary/10 shadow-[var(--shadow-soft)]'
                    : 'border-transparent hover:border-border/80 hover:bg-background/70',
                isDragging ? 'opacity-60' : '',
                !isRoot && !submitting ? 'cursor-grab active:cursor-grabbing' : '',
                dragState.sourcePath && isFolder && isValidDropTarget(node)
                  ? 'ring-1 ring-primary/20'
                  : '',
              ].join(' ')}
            >
              <div
                className="flex items-center gap-2 px-2 py-2"
                style={{ paddingLeft: `${depth * 16 + 8}px` }}
              >
                {isFolder ? (
                  <button
                    type="button"
                    aria-label={isExpanded ? '收起目录' : '展开目录'}
                    disabled={isRoot}
                    onClick={() => onToggleExpand(node.relativePath)}
                    className={[
                      'inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition',
                      isRoot
                        ? 'cursor-default opacity-70'
                        : 'hover:bg-background hover:text-foreground',
                    ].join(' ')}
                  >
                    {isExpanded ? (
                      <ChevronDown className="size-4" />
                    ) : (
                      <ChevronRight className="size-4" />
                    )}
                  </button>
                ) : (
                  <span className="inline-flex size-7 shrink-0 items-center justify-center" />
                )}

                <button
                  type="button"
                  onClick={() => onSelect(node.relativePath)}
                  className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden text-left"
                  aria-label={`树节点 ${nodeLabel}`}
                  title={node.relativePath}
                >
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card/80">
                    {isFolder ? (
                      isExpanded ? (
                        <FolderOpen className="size-4 text-primary" />
                      ) : (
                        <Folder className="size-4 text-primary" />
                      )
                    ) : (
                      <FileText className="size-4 text-muted-foreground" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1 overflow-hidden">
                    <span className="block truncate text-sm font-medium" title={nodeLabel}>
                      {nodeLabel}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground" title={metaText}>
                      {isRoot ? '根目录' : metaText}
                    </span>
                  </span>
                </button>

                <div
                  className={[
                    'flex shrink-0 items-center gap-1 self-start transition',
                    isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                  ].join(' ')}
                >
                  {isFolder ? (
                    <>
                      <ActionButton
                        label="新建子文件夹"
                        disabled={submitting}
                        onClick={() => onStartCreateFolder(node.relativePath)}
                      >
                        <FolderPlus className="size-4" />
                      </ActionButton>
                      <ActionButton
                        label="上传文件到当前目录"
                        disabled={submitting}
                        onClick={() => onUploadFiles(node.relativePath)}
                      >
                        <Upload className="size-4" />
                      </ActionButton>
                      <ActionButton
                        label="上传文件夹"
                        disabled={submitting}
                        onClick={() => onUploadFolder(node.relativePath)}
                      >
                        <FolderOpen className="size-4" />
                      </ActionButton>
                    </>
                  ) : null}
                  {!isRoot ? (
                    <ActionButton
                      label="移动到 rubbish"
                      danger
                      disabled={submitting}
                      onClick={() => onDelete(node.relativePath)}
                    >
                      <Trash2 className="size-4" />
                    </ActionButton>
                  ) : null}
                </div>
              </div>

              {isDropTarget ? (
                <div className="border-t border-border/60 px-4 py-2 text-xs text-primary">
                  释放后将移动到当前文件夹
                </div>
              ) : null}

              {composingPath === node.relativePath && isFolder ? (
                <div className="border-t border-border/60 px-3 pb-3 pt-2">
                  <div
                    className="flex flex-wrap gap-2"
                    style={{ paddingLeft: `${depth * 16 + 48}px` }}
                  >
                    <input
                      value={folderName}
                      disabled={submitting}
                      onChange={(event) => onFolderNameChange(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          onCreateFolder()
                        }

                        if (event.key === 'Escape') {
                          event.preventDefault()
                          onCancelCreateFolder()
                        }
                      }}
                      placeholder="输入文件夹名称"
                      className="h-10 min-w-[200px] flex-1 rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/20"
                    />
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={onCreateFolder}
                      className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      创建
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={onCancelCreateFolder}
                      className="inline-flex h-10 items-center rounded-lg border border-border bg-background px-4 text-sm text-muted-foreground transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            {isFolder && isExpanded && children.length > 0 ? (
              <TreeNodeList
                nodes={children}
                depth={depth + 1}
                selectedPath={selectedPath}
                expandedPaths={expandedPaths}
                composingPath={composingPath}
                folderName={folderName}
                submitting={submitting}
                dragState={dragState}
                onSelect={onSelect}
                onToggleExpand={onToggleExpand}
                onStartCreateFolder={onStartCreateFolder}
                onFolderNameChange={onFolderNameChange}
                onCreateFolder={onCreateFolder}
                onCancelCreateFolder={onCancelCreateFolder}
                onUploadFiles={onUploadFiles}
                onUploadFolder={onUploadFolder}
                onDelete={onDelete}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onDragOver={onDragOver}
                onDrop={onDrop}
                isValidDropTarget={isValidDropTarget}
              />
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
