import { useEffect, useState } from 'react'
import { PlusIcon, RotateCcwIcon, SearchIcon } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Spinner,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
} from '@/components/ui'
import {
  DEFAULT_PAGE_SIZE,
  ListPagination,
  type LoadState,
  ModuleSelect,
  formatDateTimeLabel,
  formatStatus,
} from './module-page-shared'

type PermissionType = 'menu' | 'button' | 'data'

type PermissionFilters = {
  keyword: string
  type: string
  status: string
}

type PermissionRecord = {
  id: number
  code: string
  name: string
  type: PermissionType
  scope: string
  description: string
  status: number
  updatedAt: string
}

type PermissionFormState = {
  code: string
  name: string
  type: PermissionType
  scope: string
  description: string
  status: number
}

const PERMISSION_TYPE_OPTIONS = ['menu', 'button', 'data'] as const satisfies readonly PermissionType[]
const PERMISSION_TYPE_LABELS: Record<PermissionType, string> = {
  menu: '菜单',
  button: '按钮',
  data: '数据',
}
const INITIAL_PERMISSION_ROWS: PermissionRecord[] = [
  {
    id: 1,
    code: 'user:view',
    name: '用户管理查看',
    type: 'menu',
    scope: '用户管理',
    description: '允许查看用户管理页面和用户列表',
    status: 1,
    updatedAt: '2026-05-10 09:20',
  },
  {
    id: 2,
    code: 'role:edit',
    name: '角色管理编辑',
    type: 'button',
    scope: '角色管理',
    description: '允许新增、修改和删除角色信息',
    status: 1,
    updatedAt: '2026-05-09 18:40',
  },
  {
    id: 3,
    code: 'site:publish',
    name: '站点菜单发布',
    type: 'button',
    scope: '站点菜单',
    description: '允许发布站点菜单配置变更',
    status: 0,
    updatedAt: '2026-05-09 14:15',
  },
  {
    id: 4,
    code: 'report:region',
    name: '区域数据范围',
    type: 'data',
    scope: '区域维度',
    description: '允许按区域维度查看和筛选业务数据',
    status: 1,
    updatedAt: '2026-05-08 11:10',
  },
]

const TABLE_COLUMN_COUNT = 7

function formatPermissionType(type: PermissionType) {
  return PERMISSION_TYPE_LABELS[type] ?? type
}

export function PermissionsPage() {
  const [permissionRecords, setPermissionRecords] = useState<PermissionRecord[]>(INITIAL_PERMISSION_ROWS)
  const [loadState, setLoadState] = useState<LoadState>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [keyword, setKeyword] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [appliedFilters, setAppliedFilters] = useState<PermissionFilters>({
    keyword: '',
    type: 'all',
    status: 'all',
  })
  const [permissionRows, setPermissionRows] = useState<PermissionRecord[]>([])
  const [totalPermissions, setTotalPermissions] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [reloadKey, setReloadKey] = useState(0)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isCreatingPermission, setIsCreatingPermission] = useState(false)
  const [editingPermissionId, setEditingPermissionId] = useState<number | null>(null)
  const [isSavingPermission, setIsSavingPermission] = useState(false)
  const [deletingPermission, setDeletingPermission] = useState<PermissionRecord | null>(null)
  const [isDeletingPermission, setIsDeletingPermission] = useState(false)
  const [togglingPermissionId, setTogglingPermissionId] = useState<number | null>(null)
  const [createDraft, setCreateDraft] = useState<PermissionFormState>({
    code: '',
    name: '',
    type: 'menu',
    scope: '',
    description: '',
    status: 1,
  })
  const [editingDraft, setEditingDraft] = useState<PermissionFormState>({
    code: '',
    name: '',
    type: 'menu',
    scope: '',
    description: '',
    status: 1,
  })

  useEffect(() => {
    async function loadPermissions() {
      setLoadState('loading')
      setErrorMessage('')

      try {
        const normalizedKeyword = appliedFilters.keyword.trim().toLowerCase()
        const filteredRecords = permissionRecords.filter((record) => {
          const matchesKeyword =
            !normalizedKeyword ||
            `${record.code} ${record.name} ${record.scope}`.toLowerCase().includes(normalizedKeyword)
          const matchesType = appliedFilters.type === 'all' || record.type === appliedFilters.type
          const matchesStatus = appliedFilters.status === 'all' || record.status === Number(appliedFilters.status)

          return matchesKeyword && matchesType && matchesStatus
        })

        const total = filteredRecords.length
        const totalPages = Math.max(1, Math.ceil(total / pageSize))
        const nextPage = Math.min(currentPage, totalPages)
        const startIndex = (nextPage - 1) * pageSize

        setPermissionRows(total === 0 ? [] : filteredRecords.slice(startIndex, startIndex + pageSize))
        setTotalPermissions(total)

        if (nextPage !== currentPage) {
          setCurrentPage(nextPage)
        }

        setLoadState('success')
      } catch (error) {
        setPermissionRows([])
        setTotalPermissions(0)
        setLoadState('error')
        setErrorMessage(error instanceof Error ? error.message : '加载权限列表失败，请稍后重试。')
      }
    }

    void loadPermissions()
  }, [appliedFilters, currentPage, pageSize, reloadKey, permissionRecords])

  const totalPages = Math.max(1, Math.ceil(totalPermissions / pageSize))
  const isEditDialogOpen = editingPermissionId !== null
  const canCreatePermission = createDraft.code.trim().length > 0 && createDraft.name.trim().length > 0
  const canSavePermission = editingDraft.code.trim().length > 0 && editingDraft.name.trim().length > 0

  function handleCloseCreateDialog() {
    setIsCreateDialogOpen(false)
    setCreateDraft({
      code: '',
      name: '',
      type: 'menu',
      scope: '',
      description: '',
      status: 1,
    })
  }

  function handleEditPermission(permission: PermissionRecord) {
    setEditingPermissionId(permission.id)
    setEditingDraft({
      code: permission.code,
      name: permission.name,
      type: permission.type,
      scope: permission.scope,
      description: permission.description,
      status: permission.status,
    })
  }

  function handleCloseEditDialog() {
    setEditingPermissionId(null)
    setEditingDraft({
      code: '',
      name: '',
      type: 'menu',
      scope: '',
      description: '',
      status: 1,
    })
  }

  function hasDuplicatePermissionCode(code: string, currentId?: number) {
    const normalizedCode = code.trim().toLowerCase()
    return permissionRecords.some(
      (record) => record.code.trim().toLowerCase() === normalizedCode && record.id !== currentId,
    )
  }

  async function handleCreatePermission() {
    if (!canCreatePermission || isCreatingPermission) {
      return
    }

    if (hasDuplicatePermissionCode(createDraft.code)) {
      toast.error('权限编码已存在')
      return
    }

    setIsCreatingPermission(true)

    try {
      const nextRecord: PermissionRecord = {
        id: Math.max(0, ...permissionRecords.map((record) => record.id)) + 1,
        code: createDraft.code.trim(),
        name: createDraft.name.trim(),
        type: createDraft.type,
        scope: createDraft.scope.trim() || '未配置',
        description: createDraft.description.trim(),
        status: createDraft.status,
        updatedAt: formatDateTimeLabel(),
      }

      setPermissionRecords((currentRecords) => [nextRecord, ...currentRecords])
      toast.success('权限已新增')
      handleCloseCreateDialog()
      setCurrentPage(1)
      setReloadKey((currentValue) => currentValue + 1)
    } finally {
      setIsCreatingPermission(false)
    }
  }

  async function handleSavePermission() {
    if (!editingPermissionId || !canSavePermission || isSavingPermission) {
      return
    }

    if (hasDuplicatePermissionCode(editingDraft.code, editingPermissionId)) {
      toast.error('权限编码已存在')
      return
    }

    setIsSavingPermission(true)

    try {
      setPermissionRecords((currentRecords) =>
        currentRecords.map((record) =>
          record.id === editingPermissionId
            ? {
                ...record,
                code: editingDraft.code.trim(),
                name: editingDraft.name.trim(),
                type: editingDraft.type,
                scope: editingDraft.scope.trim() || '未配置',
                description: editingDraft.description.trim(),
                status: editingDraft.status,
                updatedAt: formatDateTimeLabel(),
              }
            : record,
        ),
      )

      toast.success('权限信息已更新')
      handleCloseEditDialog()
      setReloadKey((currentValue) => currentValue + 1)
    } finally {
      setIsSavingPermission(false)
    }
  }

  async function handleDeletePermission() {
    if (!deletingPermission || isDeletingPermission) {
      return
    }

    setIsDeletingPermission(true)

    try {
      setPermissionRecords((currentRecords) =>
        currentRecords.filter((record) => record.id !== deletingPermission.id),
      )
      toast.success('权限已删除')
      setDeletingPermission(null)

      if (currentPage > 1 && permissionRows.length === 1) {
        setCurrentPage(currentPage - 1)
      } else {
        setReloadKey((currentValue) => currentValue + 1)
      }
    } finally {
      setIsDeletingPermission(false)
    }
  }

  async function handlePermissionStatusSwitchChange(permission: PermissionRecord, checked: boolean) {
    if (togglingPermissionId !== null) {
      return
    }

    setTogglingPermissionId(permission.id)

    try {
      const nextStatus = checked ? 1 : 0
      setPermissionRecords((currentRecords) =>
        currentRecords.map((record) =>
          record.id === permission.id
            ? {
                ...record,
                status: nextStatus,
                updatedAt: formatDateTimeLabel(),
              }
            : record,
        ),
      )
      toast.success(`权限状态已切换为${formatStatus(nextStatus)}`)
      setReloadKey((currentValue) => currentValue + 1)
    } finally {
      setTogglingPermissionId(null)
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-[var(--app-shell-page-width)] flex-col gap-4 px-4 py-4 md:px-6 md:py-6">
      <Card className="border border-border/70 bg-card/95 shadow-sm">
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.6fr)_minmax(11rem,0.7fr)_minmax(11rem,0.7fr)_auto_auto_auto]">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索权限编码、权限名称或作用范围"
              className="h-9 pl-9"
            />
          </div>
          <ModuleSelect
            value={typeFilter}
            onValueChange={setTypeFilter}
            options={[
              { value: 'all', label: '全部类型' },
              ...PERMISSION_TYPE_OPTIONS.map((type) => ({
                value: type,
                label: formatPermissionType(type),
              })),
            ]}
          />
          <ModuleSelect
            value={statusFilter}
            onValueChange={setStatusFilter}
            options={[
              { value: 'all', label: '全部状态' },
              { value: '1', label: '正常' },
              { value: '0', label: '冻结' },
            ]}
          />
          <Button
            type="button"
            className="h-9"
            onClick={() => {
              setCurrentPage(1)
              setAppliedFilters({
                keyword,
                type: typeFilter,
                status: statusFilter,
              })
              setReloadKey((currentValue) => currentValue + 1)
            }}
          >
            <SearchIcon data-icon="inline-start" />
            搜索
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-9"
            onClick={() => {
              setKeyword('')
              setTypeFilter('all')
              setStatusFilter('all')
              setCurrentPage(1)
              setAppliedFilters({
                keyword: '',
                type: 'all',
                status: 'all',
              })
              setReloadKey((currentValue) => currentValue + 1)
            }}
          >
            <RotateCcwIcon data-icon="inline-start" />
            重置
          </Button>
          <Button type="button" className="h-9" onClick={() => setIsCreateDialogOpen(true)}>
            <PlusIcon data-icon="inline-start" />
            新增权限
          </Button>
        </CardContent>
      </Card>

      <Card className="border border-border/70 bg-card/95 shadow-sm">
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>权限编码</TableHead>
                <TableHead>权限名称</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>作用范围</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>更新时间</TableHead>
                <TableHead className="w-[12rem]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadState === 'loading' ? (
                <TableRow>
                  <TableCell colSpan={TABLE_COLUMN_COUNT} className="h-24 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Spinner className="size-4" />
                      <span>正在加载权限列表...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : loadState === 'error' ? (
                <TableRow>
                  <TableCell colSpan={TABLE_COLUMN_COUNT} className="h-24 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <span>{errorMessage || '加载权限列表失败，请稍后重试。'}</span>
                      <Button type="button" variant="outline" size="sm" onClick={() => setReloadKey((value) => value + 1)}>
                        重试
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : permissionRows.length > 0 ? (
                permissionRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.code}</TableCell>
                    <TableCell>
                      <div className="min-w-0">
                        <div className="font-medium">{row.name}</div>
                        {row.description ? <div className="truncate text-xs text-muted-foreground">{row.description}</div> : null}
                      </div>
                    </TableCell>
                    <TableCell>{formatPermissionType(row.type)}</TableCell>
                    <TableCell>{row.scope}</TableCell>
                    <TableCell>
                      <div className="flex min-w-[7rem] items-center gap-2">
                        <Switch
                          checked={row.status === 1}
                          disabled={togglingPermissionId === row.id}
                          onCheckedChange={(checked) => void handlePermissionStatusSwitchChange(row, checked)}
                          aria-label={`${row.name}状态开关`}
                        />
                        <span className="text-sm text-muted-foreground">{formatStatus(row.status)}</span>
                      </div>
                    </TableCell>
                    <TableCell>{row.updatedAt}</TableCell>
                    <TableCell>
                      <div className="flex flex-nowrap items-center gap-2 whitespace-nowrap">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={togglingPermissionId === row.id}
                          onClick={() => handleEditPermission(row)}
                        >
                          修改
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={togglingPermissionId === row.id}
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeletingPermission(row)}
                        >
                          删除
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={TABLE_COLUMN_COUNT} className="h-24 text-center text-muted-foreground">
                    没有匹配的权限数据。
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <ListPagination
            currentPage={currentPage}
            totalPages={totalPages}
            total={totalPermissions}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(nextPageSize) => {
              setPageSize(nextPageSize)
              setCurrentPage(1)
              setReloadKey((currentValue) => currentValue + 1)
            }}
          />
        </CardContent>
      </Card>

      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => (!open ? handleCloseCreateDialog() : setIsCreateDialogOpen(true))}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>新增权限</DialogTitle>
            <DialogDescription>沿用用户管理页的交互结构，补齐权限基础信息。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <div className="text-sm font-medium">权限编码</div>
                <Input
                  value={createDraft.code}
                  onChange={(event) => setCreateDraft((currentDraft) => ({ ...currentDraft, code: event.target.value }))}
                  placeholder="请输入权限编码"
                />
              </div>
              <div className="grid gap-2">
                <div className="text-sm font-medium">权限名称</div>
                <Input
                  value={createDraft.name}
                  onChange={(event) => setCreateDraft((currentDraft) => ({ ...currentDraft, name: event.target.value }))}
                  placeholder="请输入权限名称"
                />
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <div className="text-sm font-medium">类型</div>
                <ModuleSelect
                  value={createDraft.type}
                  onValueChange={(value) =>
                    setCreateDraft((currentDraft) => ({
                      ...currentDraft,
                      type: value as PermissionType,
                    }))
                  }
                  options={PERMISSION_TYPE_OPTIONS.map((type) => ({
                    value: type,
                    label: formatPermissionType(type),
                  }))}
                />
              </div>
              <div className="grid gap-2">
                <div className="text-sm font-medium">状态</div>
                <ModuleSelect
                  value={String(createDraft.status)}
                  onValueChange={(value) =>
                    setCreateDraft((currentDraft) => ({
                      ...currentDraft,
                      status: Number(value),
                    }))
                  }
                  options={[1, 0].map((status) => ({
                    value: String(status),
                    label: formatStatus(status),
                  }))}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <div className="text-sm font-medium">作用范围</div>
              <Input
                value={createDraft.scope}
                onChange={(event) => setCreateDraft((currentDraft) => ({ ...currentDraft, scope: event.target.value }))}
                placeholder="请输入作用范围"
              />
            </div>
            <div className="grid gap-2">
              <div className="text-sm font-medium">权限说明</div>
              <Input
                value={createDraft.description}
                onChange={(event) => setCreateDraft((currentDraft) => ({ ...currentDraft, description: event.target.value }))}
                placeholder="请输入权限说明"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCloseCreateDialog}>
              取消
            </Button>
            <Button type="button" onClick={() => void handleCreatePermission()} disabled={!canCreatePermission || isCreatingPermission}>
              {isCreatingPermission ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={(open) => (!open ? handleCloseEditDialog() : null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>修改权限</DialogTitle>
            <DialogDescription>支持调整权限编码、名称、类型、作用范围和状态。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <div className="text-sm font-medium">权限编码</div>
                <Input
                  value={editingDraft.code}
                  onChange={(event) => setEditingDraft((currentDraft) => ({ ...currentDraft, code: event.target.value }))}
                  placeholder="请输入权限编码"
                />
              </div>
              <div className="grid gap-2">
                <div className="text-sm font-medium">权限名称</div>
                <Input
                  value={editingDraft.name}
                  onChange={(event) => setEditingDraft((currentDraft) => ({ ...currentDraft, name: event.target.value }))}
                  placeholder="请输入权限名称"
                />
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <div className="text-sm font-medium">类型</div>
                <ModuleSelect
                  value={editingDraft.type}
                  onValueChange={(value) =>
                    setEditingDraft((currentDraft) => ({
                      ...currentDraft,
                      type: value as PermissionType,
                    }))
                  }
                  options={PERMISSION_TYPE_OPTIONS.map((type) => ({
                    value: type,
                    label: formatPermissionType(type),
                  }))}
                />
              </div>
              <div className="grid gap-2">
                <div className="text-sm font-medium">状态</div>
                <ModuleSelect
                  value={String(editingDraft.status)}
                  onValueChange={(value) =>
                    setEditingDraft((currentDraft) => ({
                      ...currentDraft,
                      status: Number(value),
                    }))
                  }
                  options={[1, 0].map((status) => ({
                    value: String(status),
                    label: formatStatus(status),
                  }))}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <div className="text-sm font-medium">作用范围</div>
              <Input
                value={editingDraft.scope}
                onChange={(event) => setEditingDraft((currentDraft) => ({ ...currentDraft, scope: event.target.value }))}
                placeholder="请输入作用范围"
              />
            </div>
            <div className="grid gap-2">
              <div className="text-sm font-medium">权限说明</div>
              <Input
                value={editingDraft.description}
                onChange={(event) => setEditingDraft((currentDraft) => ({ ...currentDraft, description: event.target.value }))}
                placeholder="请输入权限说明"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCloseEditDialog}>
              取消
            </Button>
            <Button type="button" onClick={() => void handleSavePermission()} disabled={!canSavePermission || isSavingPermission}>
              {isSavingPermission ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deletingPermission !== null} onOpenChange={(open) => (!open ? setDeletingPermission(null) : null)}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>删除权限</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingPermission ? `确认删除权限“${deletingPermission.name}”吗？删除后当前列表将立即更新。` : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingPermission}>取消</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void handleDeletePermission()}>
              {isDeletingPermission ? '删除中...' : '删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
