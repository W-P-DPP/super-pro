import { useEffect, useMemo, useState } from 'react'
import { ADMIN_CONSOLE_PERMISSION_CODES } from '@super-pro/shared-types'
import { PlusIcon, RotateCcwIcon, SearchIcon } from 'lucide-react'
import {
  createAuthorizationRole,
  deleteAuthorizationRole,
  getAuthorizationPermissions,
  getAuthorizationRoles,
  updateAuthorizationRole,
  type AuthorizationPermissionResponseDto,
  type AuthorizationRoleResponseDto,
  type UpdateAuthorizationRoleRequestDto,
} from '@/api/modules/authorization'
import { getProjects, type ProjectResponseDto } from '@/api/modules/projects'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
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
  Checkbox,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  ScrollArea,
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
import { useAdminMenu } from '@/contexts/admin-menu-context'
import {
  ADMIN_PAGE_FILL_CARD_CLASS,
  ADMIN_PAGE_FILL_LAYOUT_CLASS,
  DEFAULT_PAGE_SIZE,
  ListPagination,
  type LoadState,
  ModuleSelect,
  formatStatus,
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
  description: string
  permissions: AuthorizationPermissionResponseDto[]
  status: number
  updatedAt: string
}

type RoleFormState = {
  name: string
  code: string
  description: string
  status: number
}

type PermissionProjectGroup = {
  projectCode: string
  projectName: string
  projectRemark: string
  allPermissions: AuthorizationPermissionResponseDto[]
  visiblePermissions: AuthorizationPermissionResponseDto[]
  projectMatches: boolean
}

const TABLE_COLUMN_COUNT = 6
const PROJECT_LIST_PAGE_SIZE = 100

function buildRoleFormState(): RoleFormState {
  return {
    name: '',
    code: '',
    description: '',
    status: 1,
  }
}

function mapRoleRecord(role: AuthorizationRoleResponseDto, current?: RoleRecord | null): RoleRecord {
  return {
    id: role.id,
    name: role.name,
    code: role.code,
    memberCount: role.memberCount ?? current?.memberCount ?? 0,
    description: role.description ?? '',
    permissions: role.permissions ?? [],
    status: role.status ?? 1,
    updatedAt: role.updateTime ?? '--',
  }
}

function matchesPermissionKeyword(
  permission: AuthorizationPermissionResponseDto,
  normalizedKeyword: string,
) {
  return `${permission.name} ${permission.code} ${permission.resourceCode} ${permission.action} ${permission.description ?? ''}`
    .toLowerCase()
    .includes(normalizedKeyword)
}

export function RolesPage() {
  const { hasPermission } = useAdminMenu()
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
  const [assigningRole, setAssigningRole] = useState<RoleRecord | null>(null)
  const [projectRecords, setProjectRecords] = useState<ProjectResponseDto[]>([])
  const [permissionRecords, setPermissionRecords] = useState<AuthorizationPermissionResponseDto[]>([])
  const [permissionLoadState, setPermissionLoadState] = useState<LoadState>('idle')
  const [permissionErrorMessage, setPermissionErrorMessage] = useState('')
  const [permissionKeyword, setPermissionKeyword] = useState('')
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<number[]>([])
  const [isSavingPermissionAssignments, setIsSavingPermissionAssignments] = useState(false)
  const [createDraft, setCreateDraft] = useState<RoleFormState>(buildRoleFormState())
  const [editingDraft, setEditingDraft] = useState<RoleFormState>(buildRoleFormState())

  useEffect(() => {
    async function syncRoles() {
      setLoadState('loading')
      setErrorMessage('')

      try {
        const result = await getAuthorizationRoles({
          keyword: appliedFilters.keyword.trim() || undefined,
          status: appliedFilters.status === 'all' ? undefined : Number(appliedFilters.status),
          page: currentPage,
          pageSize,
        })

        setRoleRows(result.items.map((role) => mapRoleRecord(role)))
        setTotalRoles(result.total)
        setLoadState('success')

        if (result.page !== currentPage) {
          setCurrentPage(result.page)
        }
      } catch (error) {
        setRoleRows([])
        setTotalRoles(0)
        setLoadState('error')
        setErrorMessage(error instanceof Error ? error.message : '加载角色列表失败，请稍后重试。')
      }
    }

    void syncRoles()
  }, [appliedFilters, currentPage, pageSize, reloadKey])

  const totalPages = Math.max(1, Math.ceil(totalRoles / pageSize))
  const isEditDialogOpen = editingRoleId !== null
  const canCreateRoleAction = hasPermission(ADMIN_CONSOLE_PERMISSION_CODES.roleCreate)
  const canUpdateRoleAction = hasPermission(ADMIN_CONSOLE_PERMISSION_CODES.roleUpdate)
  const canDeleteRoleAction = hasPermission(ADMIN_CONSOLE_PERMISSION_CODES.roleDelete)
  const canAssignRoleAction = hasPermission(ADMIN_CONSOLE_PERMISSION_CODES.roleAssign)
  const canCreateRole = createDraft.name.trim().length > 0 && createDraft.code.trim().length > 0
  const canSaveRole = editingDraft.name.trim().length > 0 && editingDraft.code.trim().length > 0

  const permissionProjectGroups = useMemo<PermissionProjectGroup[]>(() => {
    const normalizedKeyword = permissionKeyword.trim().toLowerCase()
    const permissionsByProjectCode = new Map<string, AuthorizationPermissionResponseDto[]>()

    for (const permission of permissionRecords) {
      const currentPermissions = permissionsByProjectCode.get(permission.appCode) ?? []
      currentPermissions.push(permission)
      permissionsByProjectCode.set(permission.appCode, currentPermissions)
    }

    return projectRecords
      .map((project) => {
        const allPermissions = permissionsByProjectCode.get(project.projectCode) ?? []
        const projectMatches =
          !normalizedKeyword ||
          `${project.projectName} ${project.projectCode}`.toLowerCase().includes(normalizedKeyword)
        const visiblePermissions =
          !normalizedKeyword || projectMatches
            ? allPermissions
            : allPermissions.filter((permission) =>
                matchesPermissionKeyword(permission, normalizedKeyword),
              )

        return {
          projectCode: project.projectCode,
          projectName: project.projectName,
          projectRemark: project.remark?.trim() ?? '',
          allPermissions,
          visiblePermissions,
          projectMatches,
        }
      })
      .filter(
        (group) =>
          !normalizedKeyword || group.projectMatches || group.visiblePermissions.length > 0,
      )
  }, [permissionKeyword, permissionRecords, projectRecords])

  function handleCloseCreateDialog() {
    setIsCreateDialogOpen(false)
    setCreateDraft(buildRoleFormState())
  }

  function handleEditRole(role: RoleRecord) {
    setEditingRoleId(role.id)
    setEditingDraft({
      name: role.name,
      code: role.code,
      description: role.description,
      status: role.status,
    })
  }

  function handleCloseEditDialog() {
    setEditingRoleId(null)
    setEditingDraft(buildRoleFormState())
  }

  function handleClosePermissionAssignmentDialog() {
    setAssigningRole(null)
    setProjectRecords([])
    setPermissionRecords([])
    setPermissionLoadState('idle')
    setPermissionErrorMessage('')
    setPermissionKeyword('')
    setSelectedPermissionIds([])
    setIsSavingPermissionAssignments(false)
  }

  async function loadPermissionCandidates() {
    setPermissionLoadState('loading')
    setPermissionErrorMessage('')

    try {
      const [projectResult, permissionResult] = await Promise.all([
        getProjects({
          page: 1,
          pageSize: PROJECT_LIST_PAGE_SIZE,
        }),
        getAuthorizationPermissions(),
      ])

      setProjectRecords(projectResult.items)
      setPermissionRecords(permissionResult.items)
      setPermissionLoadState('success')
    } catch (error) {
      setProjectRecords([])
      setPermissionRecords([])
      setPermissionLoadState('error')
      setPermissionErrorMessage(error instanceof Error ? error.message : '加载权限列表失败，请稍后重试。')
    }
  }

  function handleOpenPermissionAssignment(role: RoleRecord) {
    setAssigningRole(role)
    setPermissionKeyword('')
    setSelectedPermissionIds(role.permissions.map((permission) => permission.id))
    void loadPermissionCandidates()
  }

  function handlePermissionSelectionChange(permissionId: number, checked: boolean) {
    setSelectedPermissionIds((currentIds) => {
      if (checked) {
        return currentIds.includes(permissionId) ? currentIds : [...currentIds, permissionId]
      }

      return currentIds.filter((id) => id !== permissionId)
    })
  }

  function handleProjectPermissionSelectionChange(permissionIds: number[], checked: boolean) {
    setSelectedPermissionIds((currentIds) => {
      if (checked) {
        return Array.from(new Set([...currentIds, ...permissionIds]))
      }

      const permissionIdSet = new Set(permissionIds)
      return currentIds.filter((id) => !permissionIdSet.has(id))
    })
  }

  async function handleCreateRole() {
    if (!canCreateRole || isCreatingRole) {
      return
    }

    setIsCreatingRole(true)

    try {
      await createAuthorizationRole({
        name: createDraft.name.trim(),
        code: createDraft.code.trim(),
        description: createDraft.description.trim(),
        status: createDraft.status,
      })
      toast.success('角色已新增')
      handleCloseCreateDialog()
      setCurrentPage(1)
      setReloadKey((currentValue) => currentValue + 1)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '创建角色失败，请稍后重试。')
    } finally {
      setIsCreatingRole(false)
    }
  }

  async function handleSaveRole() {
    if (!editingRoleId || !canSaveRole || isSavingRole) {
      return
    }

    setIsSavingRole(true)

    try {
      await updateAuthorizationRole(editingRoleId, {
        name: editingDraft.name.trim(),
        code: editingDraft.code.trim(),
        description: editingDraft.description.trim(),
        status: editingDraft.status,
      } satisfies UpdateAuthorizationRoleRequestDto)
      toast.success('角色信息已更新')
      handleCloseEditDialog()
      setReloadKey((currentValue) => currentValue + 1)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '更新角色失败，请稍后重试。')
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
      await deleteAuthorizationRole(deletingRole.id)
      toast.success('角色已删除')
      setDeletingRole(null)
      setReloadKey((currentValue) => currentValue + 1)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除角色失败，请稍后重试。')
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
      toast.success(`角色状态已切换为 ${formatStatus(nextStatus)}`)
      setReloadKey((currentValue) => currentValue + 1)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '切换角色状态失败，请稍后重试。')
    } finally {
      setTogglingRoleId(null)
    }
  }

  async function handleSavePermissionAssignments() {
    if (!assigningRole || isSavingPermissionAssignments) {
      return
    }

    setIsSavingPermissionAssignments(true)

    try {
      const updatedRole = await updateAuthorizationRole(assigningRole.id, {
        permissionIds: selectedPermissionIds,
      } satisfies UpdateAuthorizationRoleRequestDto)

      setRoleRows((currentRows) =>
        currentRows.map((record) =>
          record.id === updatedRole.id ? mapRoleRecord(updatedRole, record) : record,
        ),
      )
      toast.success('角色权限已更新')
      handleClosePermissionAssignmentDialog()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '更新角色权限失败，请稍后重试。')
    } finally {
      setIsSavingPermissionAssignments(false)
    }
  }

  return (
    <section className={ADMIN_PAGE_FILL_LAYOUT_CLASS}>
      <Card className="shrink-0 border border-border/70 bg-card/95 shadow-sm">
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.7fr)_minmax(11rem,0.8fr)_auto_auto_auto]">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索角色名称或角色编码"
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
            }}
          >
            <RotateCcwIcon data-icon="inline-start" />
            重置
          </Button>
          {canCreateRoleAction ? (
            <Button type="button" className="h-9" onClick={() => setIsCreateDialogOpen(true)}>
              <PlusIcon data-icon="inline-start" />
              新增角色
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Card className={ADMIN_PAGE_FILL_CARD_CLASS}>
        <CardContent className="flex h-full min-h-0 flex-col gap-4">
          <div className="min-h-0 flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>角色名称</TableHead>
                  <TableHead>角色编码</TableHead>
                  <TableHead>成员数</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>更新时间</TableHead>
                  <TableHead className="w-[16rem]">操作</TableHead>
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
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setReloadKey((value) => value + 1)}
                        >
                          重试
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : roleRows.length > 0 ? (
                  roleRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell>{row.code}</TableCell>
                      <TableCell>{row.memberCount}</TableCell>
                      <TableCell>
                        <div className="flex min-w-[7rem] items-center gap-2">
                          <Switch
                            checked={row.status === 1}
                            disabled={togglingRoleId === row.id || !canUpdateRoleAction}
                            onCheckedChange={(checked) => void handleRoleStatusSwitchChange(row, checked)}
                            aria-label={`${row.name}状态开关`}
                          />
                          <span className="text-sm text-muted-foreground">{formatStatus(row.status)}</span>
                        </div>
                      </TableCell>
                      <TableCell>{row.updatedAt}</TableCell>
                      <TableCell>
                        <div className="flex flex-nowrap items-center gap-2 whitespace-nowrap">
                          {canAssignRoleAction ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={togglingRoleId === row.id}
                              onClick={() => handleOpenPermissionAssignment(row)}
                            >
                              权限分配
                            </Button>
                          ) : null}
                          {canUpdateRoleAction ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={togglingRoleId === row.id}
                              onClick={() => handleEditRole(row)}
                            >
                              修改
                            </Button>
                          ) : null}
                          {canDeleteRoleAction ? (
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
                          ) : null}
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
          </div>

          <ListPagination
            currentPage={currentPage}
            totalPages={totalPages}
            total={totalRoles}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(nextPageSize) => {
              setPageSize(nextPageSize)
              setCurrentPage(1)
            }}
          />
        </CardContent>
      </Card>

      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => (!open ? handleCloseCreateDialog() : setIsCreateDialogOpen(true))}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>新增角色</DialogTitle>
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
            <div className="grid gap-2">
              <div className="text-sm font-medium">状态</div>
              <ModuleSelect
                value={String(createDraft.status)}
                onValueChange={(value) => setCreateDraft((currentDraft) => ({ ...currentDraft, status: Number(value) }))}
                options={[1, 0].map((status) => ({
                  value: String(status),
                  label: formatStatus(status),
                }))}
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
            <div className="grid gap-2">
              <div className="text-sm font-medium">状态</div>
              <ModuleSelect
                value={String(editingDraft.status)}
                onValueChange={(value) => setEditingDraft((currentDraft) => ({ ...currentDraft, status: Number(value) }))}
                options={[1, 0].map((status) => ({
                  value: String(status),
                  label: formatStatus(status),
                }))}
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

      <Dialog open={assigningRole !== null} onOpenChange={(open) => (!open ? handleClosePermissionAssignmentDialog() : null)}>
        <DialogContent
          className="flex flex-col"
          style={{
            minWidth: '90vw',
            width: '90vw',
            maxWidth: '96vw',
            minHeight: '90vh',
            height: '90vh',
            maxHeight: '96vh',
          }}
        >
          <DialogHeader>
            <DialogTitle>权限分配</DialogTitle>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={permissionKeyword}
                onChange={(event) => setPermissionKeyword(event.target.value)}
                placeholder="搜索权限名称、编码、资源或动作"
                className="h-9 pl-9"
              />
            </div>

            <div className="min-h-0 flex-1 rounded-xl border border-border/70">
              {permissionLoadState === 'loading' ? (
                <div className="flex h-full min-h-[16rem] items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Spinner className="size-4" />
                  <span>正在加载权限列表...</span>
                </div>
              ) : permissionLoadState === 'error' ? (
                <div className="flex h-full min-h-[16rem] flex-col items-center justify-center gap-3 px-4 text-center text-sm text-muted-foreground">
                  <span>{permissionErrorMessage || '加载权限列表失败，请稍后重试。'}</span>
                  <Button type="button" variant="outline" size="sm" onClick={() => void loadPermissionCandidates()}>
                    重试
                  </Button>
                </div>
              ) : permissionProjectGroups.length > 0 ? (
                <ScrollArea className="h-full">
                  <div className="p-3">
                    <Accordion type="multiple" className="gap-2">
                      {permissionProjectGroups.map((group) => {
                        const selectedPermissionCount = group.allPermissions.filter((permission) =>
                          selectedPermissionIds.includes(permission.id),
                        ).length
                        const projectCheckboxState =
                          selectedPermissionCount === 0
                            ? false
                            : selectedPermissionCount === group.allPermissions.length
                              ? true
                              : 'indeterminate'

                        return (
                          <AccordionItem
                            key={group.projectCode}
                            value={group.projectCode}
                            className="rounded-xl border border-border/70 bg-background px-3"
                          >
                            <div className="flex items-start gap-3">
                              <div className="pt-3.5">
                                <Checkbox
                                  checked={projectCheckboxState}
                                  disabled={isSavingPermissionAssignments || group.allPermissions.length === 0}
                                  onCheckedChange={(checked) =>
                                    handleProjectPermissionSelectionChange(
                                      group.allPermissions.map((permission) => permission.id),
                                      checked === true,
                                    )
                                  }
                                />
                              </div>
                              <AccordionTrigger className="py-3 hover:no-underline">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 text-sm">
                                    <span className="font-medium">{group.projectName}</span>
                                    {group.projectRemark ? (
                                      <span className="truncate text-xs text-muted-foreground">- {group.projectRemark}</span>
                                    ) : null}
                                  </div>
                                  <div className="mt-1 text-xs text-muted-foreground">
                                    {group.projectCode} / 已选 {selectedPermissionCount} / 共 {group.allPermissions.length}
                                  </div>
                                </div>
                              </AccordionTrigger>
                            </div>
                            <AccordionContent className="pt-1 pb-1 pl-7">
                              {group.visiblePermissions.length > 0 ? (
                                <div className="-mr-6 -mb-2 flex flex-wrap">
                                  {group.visiblePermissions.map((permission) => {
                                    const isChecked = selectedPermissionIds.includes(permission.id)

                                    return (
                                      <label
                                        key={permission.id}
                                        className="mr-6 mb-2 flex max-w-full cursor-pointer items-center gap-2"
                                      >
                                        <Checkbox
                                          checked={isChecked}
                                          disabled={isSavingPermissionAssignments}
                                          onCheckedChange={(checked) =>
                                            handlePermissionSelectionChange(permission.id, checked === true)
                                          }
                                        />
                                        <span className="truncate text-sm font-medium">{permission.name}</span>
                                      </label>
                                    )
                                  })}
                                </div>
                              ) : (
                                <div className="rounded-xl border border-dashed border-border/70 px-3 py-4 text-sm text-muted-foreground">
                                  当前项目下暂无可展示权限。
                                </div>
                              )}
                            </AccordionContent>
                          </AccordionItem>
                        )
                      })}
                    </Accordion>
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex h-full min-h-[16rem] items-center justify-center px-4 text-center text-sm text-muted-foreground">
                  {projectRecords.length > 0 || permissionRecords.length > 0 ? '没有匹配的项目或权限数据。' : '当前暂无可分配权限。'}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClosePermissionAssignmentDialog}>
              取消
            </Button>
            <Button
              type="button"
              onClick={() => void handleSavePermissionAssignments()}
              disabled={permissionLoadState !== 'success' || isSavingPermissionAssignments}
            >
              {isSavingPermissionAssignments ? '保存中...' : '保存分配'}
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
