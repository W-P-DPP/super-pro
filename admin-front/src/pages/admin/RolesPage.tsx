import { useEffect, useState } from 'react'
import { PlusIcon, RotateCcwIcon, SearchIcon } from 'lucide-react'
import {
  getAuthorizationRoles,
  updateAuthorizationRole,
  type AuthorizationRoleResponseDto,
  type UpdateAuthorizationRoleRequestDto,
} from '@/api/modules/authorization'
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
  parseIntegerInput,
} from './module-page-shared'

type RoleFilters = {
  keyword: string
  status: string
}

type RoleRecord = {
  id: number
  name: string
  code: string
  memberCount: number
  scope: string
  description: string
  status: number
  updatedAt: string
}

type RoleFormState = {
  name: string
  code: string
  memberCount: string
  scope: string
  description: string
  status: number
}

function mapRoleRecord(role: AuthorizationRoleResponseDto): RoleRecord {
  return {
    id: role.id,
    name: role.name,
    code: role.code,
    memberCount: 0,
    scope: role.appCode,
    description: role.description ?? '',
    status: role.status ?? 1,
    updatedAt: role.updateTime ?? '--',
  }
}

const TABLE_COLUMN_COUNT = 7

export function RolesPage() {
  const [roleRecords, setRoleRecords] = useState<RoleRecord[]>([])
  const [loadState, setLoadState] = useState<LoadState>('idle')
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [appliedFilters, setAppliedFilters] = useState<RoleFilters>({
    keyword: '',
    status: 'all',
  })
  const [roleRows, setRoleRows] = useState<RoleRecord[]>([])
  const [totalRoles, setTotalRoles] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [reloadKey, setReloadKey] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isCreatingRole, setIsCreatingRole] = useState(false)
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null)
  const [isSavingRole, setIsSavingRole] = useState(false)
  const [deletingRole, setDeletingRole] = useState<RoleRecord | null>(null)
  const [isDeletingRole, setIsDeletingRole] = useState(false)
  const [togglingRoleId, setTogglingRoleId] = useState<number | null>(null)
  const [createDraft, setCreateDraft] = useState<RoleFormState>({
    name: '',
    code: '',
    memberCount: '0',
    scope: '',
    description: '',
    status: 1,
  })
  const [editingDraft, setEditingDraft] = useState<RoleFormState>({
    name: '',
    code: '',
    memberCount: '0',
    scope: '',
    description: '',
    status: 1,
  })

  useEffect(() => {
    async function syncRoles() {
      setLoadState('loading')
      setErrorMessage('')

      try {
        const result = await getAuthorizationRoles()
        setRoleRecords(result.items.map(mapRoleRecord))
      } catch (error) {
        setRoleRecords([])
        setRoleRows([])
        setTotalRoles(0)
        setLoadState('error')
        setErrorMessage(error instanceof Error ? error.message : '加载角色列表失败，请稍后重试。')
      }
    }

    void syncRoles()
  }, [reloadKey])

  useEffect(() => {
    async function loadRoles() {
      setLoadState('loading')
      setErrorMessage('')

      try {
        const normalizedKeyword = appliedFilters.keyword.trim().toLowerCase()
        const filteredRecords = roleRecords.filter((record) => {
          const matchesKeyword =
            !normalizedKeyword ||
            `${record.name} ${record.code} ${record.scope}`.toLowerCase().includes(normalizedKeyword)
          const matchesStatus =
            appliedFilters.status === 'all' || record.status === Number(appliedFilters.status)

          return matchesKeyword && matchesStatus
        })

        const total = filteredRecords.length
        const totalPages = Math.max(1, Math.ceil(total / pageSize))
        const nextPage = Math.min(currentPage, totalPages)
        const startIndex = (nextPage - 1) * pageSize

        setRoleRows(total === 0 ? [] : filteredRecords.slice(startIndex, startIndex + pageSize))
        setTotalRoles(total)

        if (nextPage !== currentPage) {
          setCurrentPage(nextPage)
        }

        setLoadState('success')
      } catch (error) {
        setRoleRows([])
        setTotalRoles(0)
        setLoadState('error')
        setErrorMessage(error instanceof Error ? error.message : '加载角色列表失败，请稍后重试。')
      }
    }

    void loadRoles()
  }, [appliedFilters, currentPage, pageSize, roleRecords])

  const totalPages = Math.max(1, Math.ceil(totalRoles / pageSize))
  const isEditDialogOpen = editingRoleId !== null
  const canCreateRole = createDraft.name.trim().length > 0 && createDraft.code.trim().length > 0
  const canSaveRole = editingDraft.name.trim().length > 0 && editingDraft.code.trim().length > 0

  function handleCloseCreateDialog() {
    setIsCreateDialogOpen(false)
    setCreateDraft({
      name: '',
      code: '',
      memberCount: '0',
      scope: '',
      description: '',
      status: 1,
    })
  }

  function handleEditRole(role: RoleRecord) {
    setEditingRoleId(role.id)
    setEditingDraft({
      name: role.name,
      code: role.code,
      memberCount: String(role.memberCount),
      scope: role.scope,
      description: role.description,
      status: role.status,
    })
  }

  function handleCloseEditDialog() {
    setEditingRoleId(null)
    setEditingDraft({
      name: '',
      code: '',
      memberCount: '0',
      scope: '',
      description: '',
      status: 1,
    })
  }

  function hasDuplicateRoleCode(code: string, currentId?: number) {
    const normalizedCode = code.trim().toLowerCase()
    return roleRecords.some((record) => record.code.trim().toLowerCase() === normalizedCode && record.id !== currentId)
  }

  async function handleCreateRole() {
    if (!canCreateRole || isCreatingRole) {
      return
    }

    if (hasDuplicateRoleCode(createDraft.code)) {
      toast.error('角色编码已存在')
      return
    }

    setIsCreatingRole(true)

    try {
      const nextRole: RoleRecord = {
        id: Math.max(0, ...roleRecords.map((record) => record.id)) + 1,
        name: createDraft.name.trim(),
        code: createDraft.code.trim(),
        memberCount: parseIntegerInput(createDraft.memberCount),
        scope: createDraft.scope.trim() || '未配置',
        description: createDraft.description.trim(),
        status: createDraft.status,
        updatedAt: formatDateTimeLabel(),
      }

      setRoleRecords((currentRecords) => [nextRole, ...currentRecords])
      toast.success('角色已新增')
      handleCloseCreateDialog()
      setCurrentPage(1)
      setReloadKey((currentValue) => currentValue + 1)
    } finally {
      setIsCreatingRole(false)
    }
  }

  async function handleSaveRole() {
    if (!editingRoleId || !canSaveRole || isSavingRole) {
      return
    }

    if (hasDuplicateRoleCode(editingDraft.code, editingRoleId)) {
      toast.error('角色编码已存在')
      return
    }

    setIsSavingRole(true)

    try {
      setRoleRecords((currentRecords) =>
        currentRecords.map((record) =>
          record.id === editingRoleId
            ? {
                ...record,
                name: editingDraft.name.trim(),
                code: editingDraft.code.trim(),
                memberCount: parseIntegerInput(editingDraft.memberCount),
                scope: editingDraft.scope.trim() || '未配置',
                description: editingDraft.description.trim(),
                status: editingDraft.status,
                updatedAt: formatDateTimeLabel(),
              }
            : record,
        ),
      )

      toast.success('角色信息已更新')
      handleCloseEditDialog()
      setReloadKey((currentValue) => currentValue + 1)
    } finally {
      setIsSavingRole(false)
    }
  }

  async function handleDeleteRole() {
    if (!deletingRole || isDeletingRole) {
      return
    }

    setIsDeletingRole(true)

    try {
      setRoleRecords((currentRecords) => currentRecords.filter((record) => record.id !== deletingRole.id))
      toast.success('角色已删除')
      setDeletingRole(null)

      if (currentPage > 1 && roleRows.length === 1) {
        setCurrentPage(currentPage - 1)
      } else {
        setReloadKey((currentValue) => currentValue + 1)
      }
    } finally {
      setIsDeletingRole(false)
    }
  }

  async function handleRoleStatusSwitchChange(role: RoleRecord, checked: boolean) {
    if (togglingRoleId !== null) {
      return
    }

    setTogglingRoleId(role.id)

    try {
      const nextStatus = checked ? 1 : 0
      await updateAuthorizationRole(role.id, {
        status: nextStatus,
      } satisfies UpdateAuthorizationRoleRequestDto)
      toast.success(`角色状态已切换为${formatStatus(nextStatus)}`)
      setReloadKey((currentValue) => currentValue + 1)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '切换角色状态失败，请稍后重试。')
    } finally {
      setTogglingRoleId(null)
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-[var(--app-shell-page-width)] flex-col gap-4 px-4 py-4 md:px-6 md:py-6">
      <Card className="border border-border/70 bg-card/95 shadow-sm">
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.7fr)_minmax(11rem,0.8fr)_auto_auto_auto]">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索角色名称、角色编码或覆盖岗位"
              className="h-9 pl-9"
            />
          </div>
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
              setStatusFilter('all')
              setCurrentPage(1)
              setAppliedFilters({
                keyword: '',
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
            新增角色
          </Button>
        </CardContent>
      </Card>

      <Card className="border border-border/70 bg-card/95 shadow-sm">
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>角色名称</TableHead>
                <TableHead>角色编码</TableHead>
                <TableHead>成员数</TableHead>
                <TableHead>覆盖岗位</TableHead>
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
                      <span>正在加载角色列表...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : loadState === 'error' ? (
                <TableRow>
                  <TableCell colSpan={TABLE_COLUMN_COUNT} className="h-24 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <span>{errorMessage || '加载角色列表失败，请稍后重试。'}</span>
                      <Button type="button" variant="outline" size="sm" onClick={() => setReloadKey((value) => value + 1)}>
                        重试
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : roleRows.length > 0 ? (
                roleRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="min-w-0">
                        <div className="font-medium">{row.name}</div>
                        {row.description ? <div className="truncate text-xs text-muted-foreground">{row.description}</div> : null}
                      </div>
                    </TableCell>
                    <TableCell>{row.code}</TableCell>
                    <TableCell>{row.memberCount}</TableCell>
                    <TableCell>{row.scope}</TableCell>
                    <TableCell>
                      <div className="flex min-w-[7rem] items-center gap-2">
                        <Switch
                          checked={row.status === 1}
                          disabled={togglingRoleId === row.id}
                          onCheckedChange={(checked) => void handleRoleStatusSwitchChange(row, checked)}
                          aria-label={`${row.name}状态开关`}
                        />
                        <span className="text-sm text-muted-foreground">{formatStatus(row.status)}</span>
                      </div>
                    </TableCell>
                    <TableCell>{row.updatedAt}</TableCell>
                    <TableCell>
                      <div className="flex flex-nowrap items-center gap-2 whitespace-nowrap">
                        <Button type="button" variant="ghost" size="sm" disabled={togglingRoleId === row.id} onClick={() => handleEditRole(row)}>
                          修改
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={togglingRoleId === row.id}
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeletingRole(row)}
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
                    没有匹配的角色数据。
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <ListPagination
            currentPage={currentPage}
            totalPages={totalPages}
            total={totalRoles}
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
            <DialogTitle>新增角色</DialogTitle>
            <DialogDescription>沿用用户管理页的交互结构，补齐角色基础信息。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <div className="text-sm font-medium">角色名称</div>
                <Input
                  value={createDraft.name}
                  onChange={(event) => setCreateDraft((currentDraft) => ({ ...currentDraft, name: event.target.value }))}
                  placeholder="请输入角色名称"
                />
              </div>
              <div className="grid gap-2">
                <div className="text-sm font-medium">角色编码</div>
                <Input
                  value={createDraft.code}
                  onChange={(event) => setCreateDraft((currentDraft) => ({ ...currentDraft, code: event.target.value }))}
                  placeholder="请输入角色编码"
                />
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <div className="text-sm font-medium">成员数</div>
                <Input
                  type="number"
                  min={0}
                  value={createDraft.memberCount}
                  onChange={(event) => setCreateDraft((currentDraft) => ({ ...currentDraft, memberCount: event.target.value }))}
                  placeholder="请输入成员数"
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
              <div className="text-sm font-medium">覆盖岗位</div>
              <Input
                value={createDraft.scope}
                onChange={(event) => setCreateDraft((currentDraft) => ({ ...currentDraft, scope: event.target.value }))}
                placeholder="请输入覆盖岗位"
              />
            </div>
            <div className="grid gap-2">
              <div className="text-sm font-medium">角色说明</div>
              <Input
                value={createDraft.description}
                onChange={(event) => setCreateDraft((currentDraft) => ({ ...currentDraft, description: event.target.value }))}
                placeholder="请输入角色说明"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCloseCreateDialog}>
              取消
            </Button>
            <Button type="button" onClick={() => void handleCreateRole()} disabled={!canCreateRole || isCreatingRole}>
              {isCreatingRole ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={(open) => (!open ? handleCloseEditDialog() : null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>修改角色</DialogTitle>
            <DialogDescription>支持调整角色编码、成员数、岗位覆盖和状态。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <div className="text-sm font-medium">角色名称</div>
                <Input
                  value={editingDraft.name}
                  onChange={(event) => setEditingDraft((currentDraft) => ({ ...currentDraft, name: event.target.value }))}
                  placeholder="请输入角色名称"
                />
              </div>
              <div className="grid gap-2">
                <div className="text-sm font-medium">角色编码</div>
                <Input
                  value={editingDraft.code}
                  onChange={(event) => setEditingDraft((currentDraft) => ({ ...currentDraft, code: event.target.value }))}
                  placeholder="请输入角色编码"
                />
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <div className="text-sm font-medium">成员数</div>
                <Input
                  type="number"
                  min={0}
                  value={editingDraft.memberCount}
                  onChange={(event) => setEditingDraft((currentDraft) => ({ ...currentDraft, memberCount: event.target.value }))}
                  placeholder="请输入成员数"
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
              <div className="text-sm font-medium">覆盖岗位</div>
              <Input
                value={editingDraft.scope}
                onChange={(event) => setEditingDraft((currentDraft) => ({ ...currentDraft, scope: event.target.value }))}
                placeholder="请输入覆盖岗位"
              />
            </div>
            <div className="grid gap-2">
              <div className="text-sm font-medium">角色说明</div>
              <Input
                value={editingDraft.description}
                onChange={(event) => setEditingDraft((currentDraft) => ({ ...currentDraft, description: event.target.value }))}
                placeholder="请输入角色说明"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCloseEditDialog}>
              取消
            </Button>
            <Button type="button" onClick={() => void handleSaveRole()} disabled={!canSaveRole || isSavingRole}>
              {isSavingRole ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deletingRole !== null} onOpenChange={(open) => (!open ? setDeletingRole(null) : null)}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>删除角色</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingRole ? `确认删除角色“${deletingRole.name}”吗？删除后当前列表将立即更新。` : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingRole}>取消</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void handleDeleteRole()}>
              {isDeletingRole ? '删除中...' : '删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
