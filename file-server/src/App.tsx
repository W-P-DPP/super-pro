import {
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  MoonStar,
  RefreshCw,
  Search,
  SunMedium,
  Trash2,
  Upload,
} from 'lucide-react'
import type { ChangeEvent, ReactNode } from 'react'
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useTheme } from 'next-themes'

type FileNodeType = 'file' | 'folder'

type FileNode = {
  name: string
  relativePath: string
  type: FileNodeType
  size?: number
  modifiedTime?: string
  children?: FileNode[]
}

type ApiResponse<T> = {
  code: number
  msg: string
  data: T
  timestamp: number
}

type FeedbackState =
  | {
      type: 'success' | 'error'
      text: string
    }
  | null

type TreeNodeListProps = {
  nodes: FileNode[]
  depth?: number
  selectedPath: string
  expandedPaths: string[]
  composingPath: string | null
  folderName: string
  submitting: boolean
  onSelect: (pathName: string) => void
  onToggleExpand: (pathName: string) => void
  onStartCreateFolder: (pathName: string) => void
  onFolderNameChange: (value: string) => void
  onCreateFolder: () => void
  onCancelCreateFolder: () => void
  onUpload: (pathName: string) => void
  onDelete: (pathName: string) => void
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim() || '/api'

function getChildren(node: FileNode): FileNode[] {
  return node.children ?? []
}

function getAuthHeaders() {
  const headers = new Headers()
  const token = localStorage.getItem('token')

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  return headers
}

async function requestJson<T>(pathName: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const headers = getAuthHeaders()

  if (init?.headers) {
    const incoming = new Headers(init.headers)
    incoming.forEach((value, key) => headers.set(key, value))
  }

  if (!(init?.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_BASE_URL}${pathName}`, {
    ...init,
    headers,
  })
  const payload = (await response.json()) as ApiResponse<T>

  if (!response.ok || payload.code !== 200) {
    throw new Error(payload.msg || '请求失败')
  }

  return payload
}

function sortNodes(nodes: FileNode[]): FileNode[] {
  return [...nodes]
    .map((node) => ({
      ...node,
      children: sortNodes(getChildren(node)),
    }))
    .sort((left, right) => {
      if (left.type !== right.type) {
        return left.type === 'folder' ? -1 : 1
      }

      return left.name.localeCompare(right.name, 'zh-CN')
    })
}

function findNode(nodes: FileNode[], relativePath: string): FileNode | null {
  for (const node of nodes) {
    if (node.relativePath === relativePath) {
      return node
    }

    const target = findNode(getChildren(node), relativePath)
    if (target) {
      return target
    }
  }

  return null
}

function getParentPath(relativePath: string): string {
  if (relativePath === '/') {
    return '/'
  }

  const segments = relativePath.split('/').filter(Boolean)
  if (segments.length <= 1) {
    return '/'
  }

  return `/${segments.slice(0, -1).join('/')}`
}

function getPathChain(relativePath: string): string[] {
  if (relativePath === '/') {
    return ['/']
  }

  const chain = ['/']
  const segments = relativePath.split('/').filter(Boolean)
  let currentPath = ''

  for (const segment of segments) {
    currentPath += `/${segment}`
    chain.push(currentPath)
  }

  return chain
}

function getFolderPathSet(nodes: FileNode[]): Set<string> {
  const paths = new Set<string>(['/'])

  const walk = (items: FileNode[]) => {
    for (const item of items) {
      if (item.type === 'folder') {
        paths.add(item.relativePath)
        walk(getChildren(item))
      }
    }
  }

  walk(nodes)
  return paths
}

function reconcileExpandedPaths(
  nodes: FileNode[],
  currentExpandedPaths: string[],
  focusPath: string,
): string[] {
  const validFolderPaths = getFolderPathSet(nodes)
  const nextExpandedPaths = currentExpandedPaths.filter((pathName) =>
    validFolderPaths.has(pathName),
  )

  for (const pathName of getPathChain(focusPath)) {
    if (validFolderPaths.has(pathName) && !nextExpandedPaths.includes(pathName)) {
      nextExpandedPaths.push(pathName)
    }
  }

  if (!nextExpandedPaths.includes('/')) {
    nextExpandedPaths.unshift('/')
  }

  return nextExpandedPaths
}

function countTreeNodes(nodes: FileNode[]): { files: number; folders: number } {
  return nodes.reduce(
    (result, node) => {
      if (node.type === 'folder') {
        result.folders += 1
        const childCount = countTreeNodes(getChildren(node))
        result.files += childCount.files
        result.folders += childCount.folders
      } else {
        result.files += 1
      }

      return result
    },
    { files: 0, folders: 0 },
  )
}

function countVisibleNodes(nodes: FileNode[]): number {
  return nodes.reduce((count, node) => count + 1 + countVisibleNodes(getChildren(node)), 0)
}

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

  return `${(size / (1024 * 1024)).toFixed(1)} MB`
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

function filterTree(nodes: FileNode[], keyword: string): FileNode[] {
  const normalizedKeyword = keyword.trim().toLocaleLowerCase('zh-CN')
  if (!normalizedKeyword) {
    return nodes
  }

  return nodes.flatMap((node) => {
    const children = getChildren(node)
    const ownMatch =
      node.name.toLocaleLowerCase('zh-CN').includes(normalizedKeyword) ||
      node.relativePath.toLocaleLowerCase('zh-CN').includes(normalizedKeyword)

    if (node.type === 'file') {
      return ownMatch ? [{ ...node, children: [] }] : []
    }

    const matchedChildren = filterTree(children, normalizedKeyword)

    if (ownMatch) {
      return [{ ...node, children }]
    }

    if (matchedChildren.length > 0) {
      return [{ ...node, children: matchedChildren }]
    }

    return []
  })
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

function TreeNodeList({
  nodes,
  depth = 0,
  selectedPath,
  expandedPaths,
  composingPath,
  folderName,
  submitting,
  onSelect,
  onToggleExpand,
  onStartCreateFolder,
  onFolderNameChange,
  onCreateFolder,
  onCancelCreateFolder,
  onUpload,
  onDelete,
}: TreeNodeListProps) {
  return (
    <div className="space-y-1">
      {nodes.map((node) => {
        const isFolder = node.type === 'folder'
        const isRoot = node.relativePath === '/'
        const children = getChildren(node)
        const isExpanded = isRoot || (isFolder && expandedPaths.includes(node.relativePath))
        const isSelected = selectedPath === node.relativePath
        const metaText = isFolder
          ? `${children.length} 项`
          : `${formatFileSize(node.size)} · ${formatTime(node.modifiedTime)}`

        return (
          <div key={node.relativePath} className="space-y-1">
            <div
              className={[
                'group rounded-lg border transition',
                isSelected
                  ? 'border-primary/30 bg-primary/10 shadow-[var(--shadow-soft)]'
                  : 'border-transparent hover:border-border/80 hover:bg-background/70',
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
                      isRoot ? 'cursor-default opacity-70' : 'hover:bg-background hover:text-foreground',
                    ].join(' ')}
                  >
                    {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                  </button>
                ) : (
                  <span className="inline-flex size-7 shrink-0 items-center justify-center" />
                )}

                <button
                  type="button"
                  onClick={() => onSelect(node.relativePath)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
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
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {isRoot ? 'file' : node.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {isRoot ? '根目录' : metaText}
                    </span>
                  </span>
                </button>

                <div
                  className={[
                    'flex shrink-0 items-center gap-1 transition',
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
                        onClick={() => onUpload(node.relativePath)}
                      >
                        <Upload className="size-4" />
                      </ActionButton>
                    </>
                  ) : null}
                  {!isRoot ? (
                    <ActionButton
                      label="移入 rubbish"
                      danger
                      disabled={submitting}
                      onClick={() => onDelete(node.relativePath)}
                    >
                      <Trash2 className="size-4" />
                    </ActionButton>
                  ) : null}
                </div>
              </div>

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
                onSelect={onSelect}
                onToggleExpand={onToggleExpand}
                onStartCreateFolder={onStartCreateFolder}
                onFolderNameChange={onFolderNameChange}
                onCreateFolder={onCreateFolder}
                onCancelCreateFolder={onCancelCreateFolder}
                onUpload={onUpload}
                onDelete={onDelete}
              />
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

export default function App() {
  const { resolvedTheme, setTheme } = useTheme()
  const uploadInputRef = useRef<HTMLInputElement | null>(null)
  const [tree, setTree] = useState<FileNode[]>([])
  const [selectedPath, setSelectedPath] = useState('/')
  const [expandedPaths, setExpandedPaths] = useState<string[]>(['/'])
  const [composingPath, setComposingPath] = useState<string | null>(null)
  const [folderName, setFolderName] = useState('')
  const [pendingUploadPath, setPendingUploadPath] = useState<string | null>(null)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [feedback, setFeedback] = useState<FeedbackState>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const deferredSearchKeyword = useDeferredValue(searchKeyword.trim())

  const rootNode = useMemo<FileNode>(
    () => ({
      name: 'file',
      relativePath: '/',
      type: 'folder',
      children: tree,
    }),
    [tree],
  )

  const selectedNode = useMemo(
    () => (selectedPath === '/' ? rootNode : findNode(tree, selectedPath) ?? rootNode),
    [rootNode, selectedPath, tree],
  )

  const activeFolderPath =
    selectedNode.type === 'folder' ? selectedNode.relativePath : getParentPath(selectedNode.relativePath)

  const treeStats = useMemo(() => countTreeNodes(tree), [tree])

  const visibleTree = useMemo(
    () => filterTree(tree, deferredSearchKeyword),
    [deferredSearchKeyword, tree],
  )

  const visibleExpandedPaths = useMemo(
    () =>
      deferredSearchKeyword
        ? Array.from(getFolderPathSet(visibleTree))
        : expandedPaths,
    [deferredSearchKeyword, expandedPaths, visibleTree],
  )

  const visibleNodeCount = useMemo(() => countVisibleNodes(visibleTree), [visibleTree])

  function applyTree(data: FileNode[], nextSelectedPath = selectedPath) {
    const nextTree = sortNodes(data)
    const targetPath =
      nextSelectedPath === '/' || findNode(nextTree, nextSelectedPath) ? nextSelectedPath : '/'

    setTree(nextTree)
    setSelectedPath(targetPath)
    setExpandedPaths((currentExpandedPaths) =>
      reconcileExpandedPaths(nextTree, currentExpandedPaths, targetPath),
    )
  }

  async function refreshTree(nextSelectedPath?: string) {
    setLoading(true)

    try {
      const response = await requestJson<FileNode[]>('/file/tree')
      applyTree(response.data, nextSelectedPath)
    } catch (error) {
      setFeedback({
        type: 'error',
        text: error instanceof Error ? error.message : '读取文件树失败',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    async function loadInitialTree() {
      try {
        const response = await requestJson<FileNode[]>('/file/tree')
        if (cancelled) {
          return
        }

        const nextTree = sortNodes(response.data)
        setTree(nextTree)
        setSelectedPath('/')
        setExpandedPaths(['/'])
      } catch (error) {
        if (cancelled) {
          return
        }

        setFeedback({
          type: 'error',
          text: error instanceof Error ? error.message : '读取文件树失败',
        })
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadInitialTree()

    return () => {
      cancelled = true
    }
  }, [])

  function handleSelect(pathName: string) {
    setSelectedPath(pathName)
    setExpandedPaths((currentExpandedPaths) =>
      reconcileExpandedPaths(tree, currentExpandedPaths, pathName),
    )

    if (composingPath && composingPath !== pathName) {
      setComposingPath(null)
      setFolderName('')
    }
  }

  function handleToggleExpand(pathName: string) {
    if (pathName === '/' || deferredSearchKeyword) {
      return
    }

    setExpandedPaths((currentExpandedPaths) =>
      currentExpandedPaths.includes(pathName)
        ? currentExpandedPaths.filter((item) => item !== pathName)
        : [...currentExpandedPaths, pathName],
    )
  }

  function handleStartCreateFolder(pathName: string) {
    setSelectedPath(pathName)
    setComposingPath(pathName)
    setFolderName('')
    setExpandedPaths((currentExpandedPaths) =>
      currentExpandedPaths.includes(pathName)
        ? currentExpandedPaths
        : [...currentExpandedPaths, pathName],
    )
  }

  function handleCancelCreateFolder() {
    setComposingPath(null)
    setFolderName('')
  }

  async function handleCreateFolder() {
    const trimmedFolderName = folderName.trim()
    if (!trimmedFolderName) {
      setFeedback({
        type: 'error',
        text: '请先输入文件夹名称',
      })
      return
    }

    const parentPath = composingPath ?? activeFolderPath

    setSubmitting(true)
    try {
      const response = await requestJson<FileNode>('/file/folder', {
        method: 'POST',
        body: JSON.stringify({
          parentPath,
          folderName: trimmedFolderName,
        }),
      })

      setFeedback({
        type: 'success',
        text: response.msg,
      })
      handleCancelCreateFolder()
      await refreshTree(response.data.relativePath)
    } catch (error) {
      setFeedback({
        type: 'error',
        text: error instanceof Error ? error.message : '创建文件夹失败',
      })
    } finally {
      setSubmitting(false)
    }
  }

  function handleStartUpload(pathName: string) {
    setSelectedPath(pathName)
    setPendingUploadPath(pathName)
    setExpandedPaths((currentExpandedPaths) =>
      currentExpandedPaths.includes(pathName)
        ? currentExpandedPaths
        : [...currentExpandedPaths, pathName],
    )
    uploadInputRef.current?.click()
  }

  async function uploadFileToPath(pathName: string, file: File) {
    const formData = new FormData()
    formData.append('targetPath', pathName)
    formData.append('file', file)

    setSubmitting(true)
    try {
      const response = await requestJson<FileNode>('/file/upload', {
        method: 'POST',
        body: formData,
      })

      setFeedback({
        type: 'success',
        text: response.msg,
      })
      await refreshTree(response.data.relativePath)
    } catch (error) {
      setFeedback({
        type: 'error',
        text: error instanceof Error ? error.message : '上传文件失败',
      })
    } finally {
      setSubmitting(false)
      setPendingUploadPath(null)
      if (uploadInputRef.current) {
        uploadInputRef.current.value = ''
      }
    }
  }

  async function handleFileInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    const targetPath = pendingUploadPath ?? activeFolderPath

    if (!file) {
      setPendingUploadPath(null)
      if (uploadInputRef.current) {
        uploadInputRef.current.value = ''
      }
      return
    }

    await uploadFileToPath(targetPath, file)
  }

  async function handleDeleteTarget(targetPath: string) {
    const confirmed = window.confirm(`确认将 ${targetPath} 移入 rubbish 吗？`)
    if (!confirmed) {
      return
    }

    setSubmitting(true)
    try {
      const response = await requestJson<FileNode>('/file', {
        method: 'DELETE',
        body: JSON.stringify({
          targetPath,
        }),
      })

      setFeedback({
        type: 'success',
        text: `${response.msg}，已移入 rubbish`,
      })
      handleCancelCreateFolder()
      await refreshTree(getParentPath(targetPath))
    } catch (error) {
      setFeedback({
        type: 'error',
        text: error instanceof Error ? error.message : '删除目标失败',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="h-screen p-4 text-foreground sm:p-6 lg:p-8">
      <input
        ref={uploadInputRef}
        type="file"
        className="hidden"
        onChange={(event) => void handleFileInputChange(event)}
      />

      <section className="flex h-[calc(100vh-2rem)] w-full flex-col overflow-hidden rounded-lg border border-border/70 bg-card/85 shadow-[var(--shadow-soft)] backdrop-blur sm:h-[calc(100vh-3rem)] lg:h-[calc(100vh-4rem)]">
        <div className="grid min-h-0 flex-1 lg:grid-cols-[400px_minmax(0,1fr)]">
          <aside className="flex min-h-0 flex-col border-b border-border/70 bg-card/75 lg:border-b-0 lg:border-r">
            <div className="space-y-3 border-b border-border/70 px-4 py-4 sm:px-5">
              <div className="rounded-lg border border-border/80 bg-background/80 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      当前选中
                    </p>
                    <p className="mt-1 truncate text-sm font-medium">{selectedNode.relativePath}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {selectedNode.type === 'folder' ? '文件夹' : '文件'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-start gap-2">
                    <span className="rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground">
                      操作目录 {activeFolderPath}
                    </span>
                    <button
                      type="button"
                      aria-label="刷新文件树"
                      title="刷新文件树"
                      onClick={() => void refreshTree(selectedPath)}
                      className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
                    >
                      <RefreshCw className={['size-4', loading ? 'animate-spin' : ''].join(' ')} />
                    </button>
                    <button
                      type="button"
                      aria-label={resolvedTheme === 'dark' ? '切换浅色模式' : '切换深色模式'}
                      title={resolvedTheme === 'dark' ? '切换浅色模式' : '切换深色模式'}
                      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                      className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
                    >
                      {resolvedTheme === 'dark' ? <SunMedium className="size-4" /> : <MoonStar className="size-4" />}
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full border border-border bg-card px-2.5 py-1">
                    文件夹 {treeStats.folders}
                  </span>
                  <span className="rounded-full border border-border bg-card px-2.5 py-1">
                    文件 {treeStats.files}
                  </span>
                  <span className="rounded-full border border-border bg-card px-2.5 py-1">
                    修改时间 {formatTime(selectedNode.modifiedTime)}
                  </span>
                  <span className="rounded-full border border-border bg-card px-2.5 py-1">
                    大小 {formatFileSize(selectedNode.size)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="tree-search" className="text-xs font-medium text-muted-foreground">
                  搜索文件或文件夹
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="tree-search"
                    value={searchKeyword}
                    onChange={(event) => setSearchKeyword(event.target.value)}
                    placeholder="按名称或路径搜索"
                    className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/20"
                  />
                </div>
                {deferredSearchKeyword ? (
                  <p className="text-xs text-muted-foreground">
                    当前显示 {visibleNodeCount} 个匹配节点，搜索期间自动展开匹配目录。
                  </p>
                ) : null}
              </div>

              {feedback ? (
                <div
                  className={[
                    'rounded-lg border px-4 py-3 text-sm',
                    feedback.type === 'success'
                      ? 'border-primary/25 bg-primary/10 text-foreground'
                      : 'border-destructive/25 bg-destructive/10 text-foreground',
                  ].join(' ')}
                >
                  {feedback.text}
                </div>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 overflow-auto px-2 py-3 sm:px-3">
              <TreeNodeList
                nodes={[{ ...rootNode, children: visibleTree }]}
                selectedPath={selectedPath}
                expandedPaths={visibleExpandedPaths}
                composingPath={composingPath}
                folderName={folderName}
                submitting={submitting}
                onSelect={handleSelect}
                onToggleExpand={handleToggleExpand}
                onStartCreateFolder={handleStartCreateFolder}
                onFolderNameChange={setFolderName}
                onCreateFolder={() => void handleCreateFolder()}
                onCancelCreateFolder={handleCancelCreateFolder}
                onUpload={handleStartUpload}
                onDelete={(pathName) => void handleDeleteTarget(pathName)}
              />

              {loading ? (
                <div className="px-3 py-6 text-sm text-muted-foreground">正在读取文件树...</div>
              ) : null}

              {!loading && deferredSearchKeyword && visibleTree.length === 0 ? (
                <div className="px-3 py-6 text-sm text-muted-foreground">
                  没有匹配的文件或文件夹。
                </div>
              ) : null}

              {!loading && !deferredSearchKeyword && tree.length === 0 ? (
                <div className="px-3 py-6 text-sm text-muted-foreground">
                  当前 `file` 目录为空，可在根节点上直接新建文件夹或上传文件。
                </div>
              ) : null}
            </div>
          </aside>

          <section className="min-h-0 bg-background/10" />
        </div>
      </section>
    </main>
  )
}
