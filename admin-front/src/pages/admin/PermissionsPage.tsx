import { useEffect, useMemo, useState } from 'react'
import {
  ADMIN_CONSOLE_PERMISSION_CODES,
  type AuthorizationResourceType,
} from '@super-pro/shared-types'
import { PlusIcon, RotateCcwIcon, SearchIcon } from 'lucide-react'
import {
  AUTHORIZATION_RESOURCE_TYPE_OPTIONS,
  createAuthorizationPermission,
  deleteAuthorizationPermission,
  getAuthorizationPermissions,
  updateAuthorizationPermission,
  type CreateAuthorizationPermissionRequestDto,
  type UpdateAuthorizationPermissionRequestDto,
} from '@/api/modules/authorization'
import { getProjects, type ProjectResponseDto } from '@/api/modules/projects'
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
import { cn } from '@/lib/utils'
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

type PermissionFilters = {
  keyword: string
  type: string
  status: string
}

type PermissionFormState = {
  projectId: string
  code: string
  name: string
  type: AuthorizationResourceType
  resourceCode: string
  action: string
  description: string
  status: number
}

type PermissionRecord = {
  id: number
  code: string
  appCode: string
  name: string
  type: AuthorizationResourceType
  resourceCode: string
  action: string
  description: string
  status: number
  updateTime: string
}

const PROJECT_LIST_PAGE_SIZE = 100
const TABLE_COLUMN_COUNT = 8
const RESOURCE_TYPE_LABELS: Record<AuthorizationResourceType, string> = {
  menu: '菜单',
  route: '路由',
  button: '按钮',
  api: '接口',
  data: '数据',
}

function formatPermissionType(type: AuthorizationResourceType) {
  return RESOURCE_TYPE_LABELS[type] ?? type
}

function buildPermissionFormState(projectId?: number | null): PermissionFormState {
  return {
    projectId: projectId ? String(projectId) : '',
    code: '',
    name: '',
    type: 'button',
    resourceCode: '',
    action: '',
    description: '',
    status: 1,
  }
}

function mapPermissionRecord(permission: Awaited<ReturnType<typeof getAuthorizationPermissions>>['items'][number]): PermissionRecord {
  return {
    id: permission.id,
    code: permission.code,
    appCode: permission.appCode,
    name: permission.name,
    type: permission.resourceType,
    resourceCode: permission.resourceCode,
    action: permission.action,
    description: permission.description ?? '',
    status: permission.status ?? 1,
    updateTime: permission.updateTime ?? '--',
  }
}

export function PermissionsPage() {
  const { hasPermission } = useAdminMenu()
  const [projectRecords, setProjectRecords] = useState<ProjectResponseDto[]>([])
  const [projectLoadState, setProjectLoadState] = useState<LoadState>('idle')
  const [projectErrorMessage, setProjectErrorMessage] = useState('')
  const [projectKeyword, setProjectKeyword] = useState('')
  const [projectReloadKey, setProjectReloadKey] = useState(0)
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
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
  const [editingPermission, setEditingPermission] = useState<PermissionRecord | null>(null)
  const [isSavingPermission, setIsSavingPermission] = useState(false)
  const [deletingPermission, setDeletingPermission] = useState<PermissionRecord | null>(null)
  const [isDeletingPermission, setIsDeletingPermission] = useState(false)
  const [togglingPermissionId, setTogglingPermissionId] = useState<number | null>(null)
  const [createDraft, setCreateDraft] = useState<PermissionFormState>(buildPermissionFormState())
  const [editingDraft, setEditingDraft] = useState<PermissionFormState>(buildPermissionFormState())

  const visibleProjectRecords = useMemo(() => {
    const normalizedKeyword = projectKeyword.trim().toLowerCase()

    if (!normalizedKeyword) {
      return projectRecords
    }

    return projectRecords.filter((project) =>
      `${project.projectName} ${project.projectCode}`.toLowerCase().includes(normalizedKeyword),
    )
  }, [projectKeyword, projectRecords])

  const selectedProject = projectRecords.find((project) => project.id === selectedProjectId) ?? null

  async function loadProjects() {
    setProjectLoadState('loading')
    setProjectErrorMessage('')

    try {
      const result = await getProjects({
        page: 1,
        pageSize: PROJECT_LIST_PAGE_SIZE,
      })

      setProjectRecords(result.items)
      setProjectLoadState('success')
    } catch (error) {
      setProjectRecords([])
      setProjectLoadState('error')
      setProjectErrorMessage(error instanceof Error ? error.message : '加载项目列表失败，请稍后重试。')
    }
  }

  useEffect(() => {
    void loadProjects()
  }, [projectReloadKey])

  useEffect(() => {
    if (projectRecords.length === 0) {
      setSelectedProjectId(null)
      return
    }

    setSelectedProjectId((currentProjectId) =>
      currentProjectId !== null && projectRecords.some((project) => project.id === currentProjectId)
        ? currentProjectId
        : projectRecords[0]!.id,
    )
  }, [projectRecords])

  useEffect(() => {
    if (visibleProjectRecords.length === 0) {
      if (projectRecords.length === 0) {
        setSelectedProjectId(null)
      }

      return
    }

    setSelectedProjectId((currentProjectId) =>
      currentProjectId !== null && visibleProjectRecords.some((project) => project.id === currentProjectId)
        ? currentProjectId
        : visibleProjectRecords[0]!.id,
    )
  }, [projectRecords.length, visibleProjectRecords])

  useEffect(() => {
    setCurrentPage(1)
  }, [selectedProject?.projectCode])

  useEffect(() => {
    async function loadPermissions() {
      const selectedProjectCode = selectedProject?.projectCode?.trim()

      if (!selectedProjectCode) {
        setPermissionRows([])
        setTotalPermissions(0)
        setLoadState('idle')
        return
      }

      setLoadState('loading')
      setErrorMessage('')

      try {
        const result = await getAuthorizationPermissions({
          appCode: selectedProjectCode,
          keyword: appliedFilters.keyword.trim() || undefined,
          resourceType:
            appliedFilters.type === 'all'
              ? undefined
              : (appliedFilters.type as AuthorizationResourceType),
          status: appliedFilters.status === 'all' ? undefined : Number(appliedFilters.status),
          page: currentPage,
          pageSize,
        })

        setPermissionRows(result.items.map(mapPermissionRecord))
        setTotalPermissions(result.total)
        setLoadState('success')

        if (result.page !== currentPage) {
          setCurrentPage(result.page)
        }
      } catch (error) {
        setPermissionRows([])
        setTotalPermissions(0)
        setLoadState('error')
        setErrorMessage(error instanceof Error ? error.message : '加载权限列表失败，请稍后重试。')
      }
    }

    void loadPermissions()
  }, [appliedFilters, currentPage, pageSize, reloadKey, selectedProject?.projectCode])

  const totalPages = Math.max(1, Math.ceil(totalPermissions / pageSize))
  const isEditDialogOpen = editingPermission !== null
  const canCreatePermissionAction = hasPermission(ADMIN_CONSOLE_PERMISSION_CODES.permissionCreate)
  const canUpdatePermissionAction = hasPermission(ADMIN_CONSOLE_PERMISSION_CODES.permissionUpdate)
  const canDeletePermissionAction = hasPermission(ADMIN_CONSOLE_PERMISSION_CODES.permissionDelete)
  const canCreatePermission =
    createDraft.projectId.trim().length > 0 &&
    createDraft.code.trim().length > 0 &&
    createDraft.name.trim().length > 0 &&
    createDraft.resourceCode.trim().length > 0 &&
    createDraft.action.trim().length > 0
  const canSavePermission =
    editingDraft.projectId.trim().length > 0 &&
    editingDraft.code.trim().length > 0 &&
    editingDraft.name.trim().length > 0 &&
    editingDraft.resourceCode.trim().length > 0 &&
    editingDraft.action.trim().length > 0

  function resolveProjectById(projectId: string) {
    const normalizedProjectId = Number(projectId)

    if (!Number.isFinite(normalizedProjectId)) {
      return null
    }

    return projectRecords.find((project) => project.id === normalizedProjectId) ?? null
  }

  function handleOpenCreateDialog() {
    setCreateDraft(buildPermissionFormState(selectedProjectId))
    setIsCreateDialogOpen(true)
  }

  function handleCloseCreateDialog() {
    setIsCreateDialogOpen(false)
    setCreateDraft(buildPermissionFormState(selectedProjectId))
  }

  function handleEditPermission(permission: PermissionRecord) {
    const project = projectRecords.find((item) => item.projectCode === permission.appCode) ?? null
    setEditingPermission(permission)
    setEditingDraft({
      projectId: project ? String(project.id) : '',
      code: permission.code,
      name: permission.name,
      type: permission.type,
      resourceCode: permission.resourceCode,
      action: permission.action,
      description: permission.description,
      status: permission.status,
    })
  }

  function handleCloseEditDialog() {
    setEditingPermission(null)
    setEditingDraft(buildPermissionFormState())
  }

  async function handleCreatePermission() {
    if (!canCreatePermission || isCreatingPermission) {
      return
    }

    const project = resolveProjectById(createDraft.projectId)
    if (!project) {
      toast.error('请先选择关联项目')
      return
    }

    setIsCreatingPermission(true)

    try {
      await createAuthorizationPermission({
        code: createDraft.code.trim(),
        appCode: project.projectCode,
        resourceType: createDraft.type,
        resourceCode: createDraft.resourceCode.trim(),
        action: createDraft.action.trim(),
        name: createDraft.name.trim(),
        description: createDraft.description.trim(),
        status: createDraft.status,
      } satisfies CreateAuthorizationPermissionRequestDto)

      toast.success('权限已新增')
      handleCloseCreateDialog()
      setSelectedProjectId(project.id)
      setCurrentPage(1)
      setReloadKey((currentValue) => currentValue + 1)
      void loadProjects()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '新增权限失败，请稍后重试。')
    } finally {
      setIsCreatingPermission(false)
    }
  }

  async function handleSavePermission() {
    if (!editingPermission || !canSavePermission || isSavingPermission) {
      return
    }

    const project = resolveProjectById(editingDraft.projectId)
    if (!project) {
      toast.error('请先选择关联项目')
      return
    }

    setIsSavingPermission(true)

    try {
      await updateAuthorizationPermission(editingPermission.id, {
        code: editingDraft.code.trim(),
        appCode: project.projectCode,
        resourceType: editingDraft.type,
        resourceCode: editingDraft.resourceCode.trim(),
        action: editingDraft.action.trim(),
        name: editingDraft.name.trim(),
        description: editingDraft.description.trim(),
        status: editingDraft.status,
      } satisfies UpdateAuthorizationPermissionRequestDto)

      toast.success('权限信息已更新')
      handleCloseEditDialog()
      setSelectedProjectId(project.id)
      setReloadKey((currentValue) => currentValue + 1)
      void loadProjects()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '更新权限失败，请稍后重试。')
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
      await deleteAuthorizationPermission(deletingPermission.id)
      toast.success('权限已删除')
      setDeletingPermission(null)
      setReloadKey((currentValue) => currentValue + 1)
      void loadProjects()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除权限失败，请稍后重试。')
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
      const updated = await updateAuthorizationPermission(permission.id, {
        status: checked ? 1 : 0,
      } satisfies UpdateAuthorizationPermissionRequestDto)
      toast.success(`权限状态已切换为${formatStatus(updated.status ?? (checked ? 1 : 0))}`)
      setReloadKey((currentValue) => currentValue + 1)
      void loadProjects()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '切换权限状态失败，请稍后重试。')
    } finally {
      setTogglingPermissionId(null)
    }
  }

  function renderProjectListContent() {
    if (projectLoadState === 'loading') {
      return (
        <div className="flex h-56 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Spinner className="size-4" />
          <span>正在加载项目列表...</span>
        </div>
      )
    }

    if (projectLoadState === 'error') {
      return (
        <div className="flex h-56 flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground">
          <span>{projectErrorMessage || '加载项目列表失败，请稍后重试。'}</span>
          <Button type="button" variant="outline" size="sm" onClick={() => setProjectReloadKey((value) => value + 1)}>
            重试
          </Button>
        </div>
      )
    }

    if (visibleProjectRecords.length === 0) {
      return (
        <div className="flex h-56 flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground">
          <span>{projectRecords.length > 0 ? '没有匹配的项目。' : '暂无项目数据，请先在项目管理页创建项目。'}</span>
          {projectRecords.length > 0 ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setProjectKeyword('')}>
              清空筛选
            </Button>
          ) : null}
        </div>
      )
    }

    return (
      <ScrollArea className="min-h-0 flex-1">
        <div className="grid gap-2">
          {visibleProjectRecords.map((project) => {
            const isSelected = project.id === selectedProjectId
            const permissionCount = project.permissionCount ?? 0

            return (
              <button
                key={project.id}
                type="button"
                onClick={() => {
                  setSelectedProjectId(project.id)
                  setCurrentPage(1)
                }}
                className={cn(
                  'w-full rounded-2xl border px-3 py-3 text-left transition-colors',
                  isSelected
                    ? 'border-primary/35 bg-accent text-accent-foreground shadow-sm'
                    : 'border-border/70 bg-background hover:bg-muted/50',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{project.projectName}</div>
                    <div className="mt-1 font-mono text-xs text-muted-foreground">{project.projectCode}</div>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2.5 py-1 text-xs font-medium',
                      isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {permissionCount} 项
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </ScrollArea>
    )
  }

  function renderEmptyPermissionState() {
    if (selectedProject === null) {
      return '请选择左侧项目后查看权限。'
    }

    return '当前项目下暂无权限数据。'
  }

  return (
    <section className={ADMIN_PAGE_FILL_LAYOUT_CLASS}>
      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[18rem_minmax(0,1fr)]">
        <Card className="h-full min-h-0 border border-border/70 bg-card/95 pt-2 pb-4 shadow-sm">
          <CardContent className="flex h-full min-h-0 flex-col gap-3 pt-1">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={projectKeyword}
                onChange={(event) => setProjectKeyword(event.target.value)}
                placeholder="搜索项目名称或编码"
                className="h-9 pl-9"
              />
            </div>
            {renderProjectListContent()}
          </CardContent>
        </Card>

        <div className="flex min-h-0 min-w-0 flex-col gap-4">
          <Card className="shrink-0 border border-border/70 bg-card/95 pt-2 pb-4 shadow-sm">
            <CardContent className="grid gap-4 pt-1">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_minmax(11rem,0.7fr)_minmax(11rem,0.7fr)_auto_auto_auto]">
                <div className="relative">
                  <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    placeholder="搜索权限编码、名称、资源或动作"
                    className="h-9 pl-9"
                  />
                </div>
                <ModuleSelect
                  value={typeFilter}
                  onValueChange={setTypeFilter}
                  options={[
                    { value: 'all', label: '全部类型' },
                    ...AUTHORIZATION_RESOURCE_TYPE_OPTIONS.map((type) => ({
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
                  }}
                >
                  <RotateCcwIcon data-icon="inline-start" />
                  重置
                </Button>
                {canCreatePermissionAction ? (
                  <Button type="button" className="h-9" onClick={handleOpenCreateDialog} disabled={!selectedProject}>
                    <PlusIcon data-icon="inline-start" />
                    新增权限
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card className={cn(ADMIN_PAGE_FILL_CARD_CLASS, 'pt-2 pb-4')}>
            <CardContent className="flex h-full min-h-0 flex-col gap-4 pt-1">
              <div className="min-h-0 flex-1 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>权限编码</TableHead>
                      <TableHead>权限名称</TableHead>
                      <TableHead>类型</TableHead>
                      <TableHead>资源标识</TableHead>
                      <TableHead>动作</TableHead>
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
                          <TableCell className="font-mono text-sm">{row.code}</TableCell>
                          <TableCell className="font-medium">{row.name}</TableCell>
                          <TableCell>{formatPermissionType(row.type)}</TableCell>
                          <TableCell>{row.resourceCode}</TableCell>
                          <TableCell>{row.action}</TableCell>
                          <TableCell>
                            <div className="flex min-w-[7rem] items-center gap-2">
                              <Switch
                                checked={row.status === 1}
                                disabled={togglingPermissionId === row.id || !canUpdatePermissionAction}
                                onCheckedChange={(checked) => void handlePermissionStatusSwitchChange(row, checked)}
                                aria-label={`${row.name}状态开关`}
                              />
                              <span className="text-sm text-muted-foreground">{formatStatus(row.status)}</span>
                            </div>
                          </TableCell>
                          <TableCell>{row.updateTime}</TableCell>
                          <TableCell>
                            <div className="flex flex-nowrap items-center gap-2 whitespace-nowrap">
                              {canUpdatePermissionAction ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  disabled={togglingPermissionId === row.id}
                                  onClick={() => handleEditPermission(row)}
                                >
                                  修改
                                </Button>
                              ) : null}
                              {canDeletePermissionAction ? (
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
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={TABLE_COLUMN_COUNT} className="h-24 text-center text-muted-foreground">
                          {renderEmptyPermissionState()}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <ListPagination
                currentPage={currentPage}
                totalPages={totalPages}
                total={totalPermissions}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={(nextPageSize) => {
                  setPageSize(nextPageSize)
                  setCurrentPage(1)
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => (!open ? handleCloseCreateDialog() : setIsCreateDialogOpen(true))}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>新增权限</DialogTitle>
            <DialogDescription>填写项目、编码、资源和动作信息后创建权限。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <div className="text-sm font-medium">关联项目</div>
                <ModuleSelect
                  value={createDraft.projectId}
                  onValueChange={(value) => setCreateDraft((currentDraft) => ({ ...currentDraft, projectId: value }))}
                  options={projectRecords.map((project) => ({
                    value: String(project.id),
                    label: `${project.projectName} (${project.projectCode})`,
                  }))}
                  placeholder="请选择项目"
                />
              </div>
              <div className="grid gap-2">
                <div className="text-sm font-medium">类型</div>
                <ModuleSelect
                  value={createDraft.type}
                  onValueChange={(value) => setCreateDraft((currentDraft) => ({ ...currentDraft, type: value as AuthorizationResourceType }))}
                  options={AUTHORIZATION_RESOURCE_TYPE_OPTIONS.map((type) => ({
                    value: type,
                    label: formatPermissionType(type),
                  }))}
                />
              </div>
            </div>
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
                <div className="text-sm font-medium">资源标识</div>
                <Input
                  value={createDraft.resourceCode}
                  onChange={(event) => setCreateDraft((currentDraft) => ({ ...currentDraft, resourceCode: event.target.value }))}
                  placeholder="请输入资源标识"
                />
              </div>
              <div className="grid gap-2">
                <div className="text-sm font-medium">动作</div>
                <Input
                  value={createDraft.action}
                  onChange={(event) => setCreateDraft((currentDraft) => ({ ...currentDraft, action: event.target.value }))}
                  placeholder="请输入动作标识"
                />
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
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
                <div className="text-sm font-medium">权限说明</div>
                <Input
                  value={createDraft.description}
                  onChange={(event) => setCreateDraft((currentDraft) => ({ ...currentDraft, description: event.target.value }))}
                  placeholder="请输入权限说明"
                />
              </div>
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
            <DialogDescription>支持调整项目、编码、类型、资源、动作和状态。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <div className="text-sm font-medium">关联项目</div>
                <ModuleSelect
                  value={editingDraft.projectId}
                  onValueChange={(value) => setEditingDraft((currentDraft) => ({ ...currentDraft, projectId: value }))}
                  options={projectRecords.map((project) => ({
                    value: String(project.id),
                    label: `${project.projectName} (${project.projectCode})`,
                  }))}
                  placeholder="请选择项目"
                />
              </div>
              <div className="grid gap-2">
                <div className="text-sm font-medium">类型</div>
                <ModuleSelect
                  value={editingDraft.type}
                  onValueChange={(value) => setEditingDraft((currentDraft) => ({ ...currentDraft, type: value as AuthorizationResourceType }))}
                  options={AUTHORIZATION_RESOURCE_TYPE_OPTIONS.map((type) => ({
                    value: type,
                    label: formatPermissionType(type),
                  }))}
                />
              </div>
            </div>
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
                <div className="text-sm font-medium">资源标识</div>
                <Input
                  value={editingDraft.resourceCode}
                  onChange={(event) => setEditingDraft((currentDraft) => ({ ...currentDraft, resourceCode: event.target.value }))}
                  placeholder="请输入资源标识"
                />
              </div>
              <div className="grid gap-2">
                <div className="text-sm font-medium">动作</div>
                <Input
                  value={editingDraft.action}
                  onChange={(event) => setEditingDraft((currentDraft) => ({ ...currentDraft, action: event.target.value }))}
                  placeholder="请输入动作标识"
                />
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
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
                <div className="text-sm font-medium">权限说明</div>
                <Input
                  value={editingDraft.description}
                  onChange={(event) => setEditingDraft((currentDraft) => ({ ...currentDraft, description: event.target.value }))}
                  placeholder="请输入权限说明"
                />
              </div>
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
