import { useEffect, useMemo, useState } from 'react'
import {
  ADMIN_CONSOLE_PERMISSION_CODES,
  type GlobalConfigResponseDto,
  type GlobalConfigType,
} from '@super-pro/shared-types'
import { PlusIcon, RotateCcwIcon, SearchIcon } from 'lucide-react'
import {
  createGlobalConfig,
  deleteGlobalConfig,
  getGlobalConfigs,
  updateGlobalConfig,
} from '@/api/modules/global-config'
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
  Textarea,
  toast,
} from '@/components/ui'
import { useAdminMenu } from '@/contexts/admin-menu-context'
import { cn } from '@/lib/utils'
import {
  ADMIN_PAGE_FILL_CARD_CLASS,
  ADMIN_PAGE_FILL_LAYOUT_CLASS,
  ADMIN_PAGE_TOOLBAR_CLASS,
  DEFAULT_PAGE_SIZE,
  ListPagination,
  ModuleSelect,
  type LoadState,
  formatStatus,
} from './module-page-shared'
import {
  normalizeConfigValueByType,
  resolveSelectedProjectId,
  stringifyConfigValue,
  type GlobalConfigProjectOption,
} from './global-config-page-helpers'

type GlobalConfigFilters = {
  keyword: string
  status: string
}

type GlobalConfigFormState = {
  configKey: string
  configName: string
  configType: GlobalConfigType
  configValue: string
  status: number
  remark: string
}

type GlobalConfigRecord = GlobalConfigResponseDto

const PROJECT_LIST_PAGE_SIZE = 100
const TABLE_COLUMN_COUNT = 10
const CONFIG_TYPE_LABELS: Record<GlobalConfigType, string> = {
  text: '文本',
  number: '数字',
  boolean: '布尔',
}

function buildFormState(): GlobalConfigFormState {
  return {
    configKey: '',
    configName: '',
    configType: 'text',
    configValue: '',
    status: 1,
    remark: '',
  }
}

function toProjectOption(project: ProjectResponseDto): GlobalConfigProjectOption {
  return {
    id: project.id,
    projectName: project.projectName,
    projectCode: project.projectCode,
  }
}

function formatConfigType(type: GlobalConfigType) {
  return CONFIG_TYPE_LABELS[type] ?? type
}

function formatConfigValue(value: string | number | boolean) {
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }

  return String(value)
}

function normalizeDraftForType(
  draft: GlobalConfigFormState,
  nextType: GlobalConfigType,
): GlobalConfigFormState {
  if (nextType === 'boolean') {
    return {
      ...draft,
      configType: nextType,
      configValue:
        draft.configValue.trim().toLowerCase() === 'true' || draft.configValue.trim() === '1'
          ? 'true'
          : 'false',
    }
  }

  return {
    ...draft,
    configType: nextType,
  }
}

function parseFormValue(
  draft: GlobalConfigFormState,
): string | number | boolean {
  const normalizedValue = normalizeConfigValueByType(draft.configType, draft.configValue)

  if (draft.configType === 'text' && String(normalizedValue).trim().length === 0) {
    throw new Error('请输入配置值')
  }

  if (
    draft.configType === 'number' &&
    (typeof normalizedValue !== 'number' || Number.isNaN(normalizedValue))
  ) {
    throw new Error('请输入合法数字')
  }

  return normalizedValue
}

export function GlobalConfigPage() {
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
  const [statusFilter, setStatusFilter] = useState('all')
  const [appliedFilters, setAppliedFilters] = useState<GlobalConfigFilters>({
    keyword: '',
    status: 'all',
  })
  const [configRows, setConfigRows] = useState<GlobalConfigRecord[]>([])
  const [totalConfigs, setTotalConfigs] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [reloadKey, setReloadKey] = useState(0)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isCreatingConfig, setIsCreatingConfig] = useState(false)
  const [editingConfig, setEditingConfig] = useState<GlobalConfigRecord | null>(null)
  const [isSavingConfig, setIsSavingConfig] = useState(false)
  const [deletingConfig, setDeletingConfig] = useState<GlobalConfigRecord | null>(null)
  const [isDeletingConfig, setIsDeletingConfig] = useState(false)
  const [togglingConfigId, setTogglingConfigId] = useState<number | null>(null)
  const [createDraft, setCreateDraft] = useState<GlobalConfigFormState>(buildFormState())
  const [editingDraft, setEditingDraft] = useState<GlobalConfigFormState>(buildFormState())

  const visibleProjects = useMemo(() => {
    const normalizedKeyword = projectKeyword.trim().toLowerCase()
    const options = projectRecords.map(toProjectOption)

    if (!normalizedKeyword) {
      return options
    }

    return options.filter((project) =>
      `${project.projectName} ${project.projectCode}`.toLowerCase().includes(normalizedKeyword),
    )
  }, [projectKeyword, projectRecords])

  const selectedProject =
    projectRecords.find((project) => project.id === selectedProjectId) ?? null

  const totalPages = Math.max(1, Math.ceil(totalConfigs / pageSize))
  const isEditDialogOpen = editingConfig !== null
  const canCreateConfigAction = hasPermission(ADMIN_CONSOLE_PERMISSION_CODES.globalConfigCreate)
  const canUpdateConfigAction = hasPermission(ADMIN_CONSOLE_PERMISSION_CODES.globalConfigUpdate)
  const canDeleteConfigAction = hasPermission(ADMIN_CONSOLE_PERMISSION_CODES.globalConfigDelete)
  const canCreateConfig =
    selectedProject !== null &&
    createDraft.configKey.trim().length > 0 &&
    createDraft.configName.trim().length > 0 &&
    createDraft.configValue.trim().length > 0
  const canSaveConfig =
    editingConfig !== null &&
    editingDraft.configKey.trim().length > 0 &&
    editingDraft.configName.trim().length > 0 &&
    editingDraft.configValue.trim().length > 0

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
      setProjectErrorMessage(
        error instanceof Error ? error.message : '加载项目列表失败，请稍后重试。',
      )
    }
  }

  useEffect(() => {
    void loadProjects()
  }, [projectReloadKey])

  useEffect(() => {
    setSelectedProjectId((currentProjectId) =>
      resolveSelectedProjectId(currentProjectId, visibleProjects),
    )
  }, [visibleProjects])

  useEffect(() => {
    setCurrentPage(1)
  }, [selectedProjectId])

  useEffect(() => {
    async function loadGlobalConfigs() {
      if (selectedProjectId === null) {
        setConfigRows([])
        setTotalConfigs(0)
        setLoadState('idle')
        return
      }

      setLoadState('loading')
      setErrorMessage('')

      try {
        const result = await getGlobalConfigs({
          keyword: appliedFilters.keyword,
          status: appliedFilters.status === 'all' ? '' : Number(appliedFilters.status),
          projectId: selectedProjectId,
          page: currentPage,
          pageSize,
        })

        setConfigRows(result.items)
        setTotalConfigs(result.total)
        setLoadState('success')

        if (result.page !== currentPage) {
          setCurrentPage(result.page)
        }
      } catch (error) {
        setConfigRows([])
        setTotalConfigs(0)
        setLoadState('error')
        setErrorMessage(
          error instanceof Error ? error.message : '加载全局配置列表失败，请稍后重试。',
        )
      }
    }

    void loadGlobalConfigs()
  }, [appliedFilters, currentPage, pageSize, reloadKey, selectedProjectId])

  function handleOpenCreateDialog() {
    setCreateDraft(buildFormState())
    setIsCreateDialogOpen(true)
  }

  function handleCloseCreateDialog() {
    setIsCreateDialogOpen(false)
    setCreateDraft(buildFormState())
  }

  function handleEditConfig(record: GlobalConfigRecord) {
    setEditingConfig(record)
    setEditingDraft({
      configKey: record.configKey,
      configName: record.configName,
      configType: record.configType,
      configValue: stringifyConfigValue(record.configType, record.configValue),
      status: record.status,
      remark: record.remark ?? '',
    })
  }

  function handleCloseEditDialog() {
    setEditingConfig(null)
    setEditingDraft(buildFormState())
  }

  async function handleCreateConfig() {
    if (!selectedProject || !canCreateConfig || isCreatingConfig) {
      return
    }

    let configValue: string | number | boolean
    try {
      configValue = parseFormValue(createDraft)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '配置值不合法')
      return
    }

    setIsCreatingConfig(true)

    try {
      await createGlobalConfig({
        projectId: selectedProject.id,
        configKey: createDraft.configKey.trim(),
        configName: createDraft.configName.trim(),
        configType: createDraft.configType,
        configValue,
        status: createDraft.status,
        remark: createDraft.remark.trim(),
      })

      toast.success('全局配置已新增')
      handleCloseCreateDialog()
      setCurrentPage(1)
      setReloadKey((value) => value + 1)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '新增全局配置失败，请稍后重试。')
    } finally {
      setIsCreatingConfig(false)
    }
  }

  async function handleSaveConfig() {
    if (!editingConfig || !canSaveConfig || isSavingConfig) {
      return
    }

    let configValue: string | number | boolean
    try {
      configValue = parseFormValue(editingDraft)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '配置值不合法')
      return
    }

    setIsSavingConfig(true)

    try {
      await updateGlobalConfig(editingConfig.id, {
        configKey: editingDraft.configKey.trim(),
        configName: editingDraft.configName.trim(),
        configType: editingDraft.configType,
        configValue,
        status: editingDraft.status,
        remark: editingDraft.remark.trim(),
      })

      toast.success('全局配置已更新')
      handleCloseEditDialog()
      setReloadKey((value) => value + 1)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '更新全局配置失败，请稍后重试。')
    } finally {
      setIsSavingConfig(false)
    }
  }

  async function handleDeleteConfig() {
    if (!deletingConfig || isDeletingConfig) {
      return
    }

    setIsDeletingConfig(true)

    try {
      await deleteGlobalConfig(deletingConfig.id)
      toast.success('全局配置已删除')
      setDeletingConfig(null)

      if (currentPage > 1 && configRows.length === 1) {
        setCurrentPage(currentPage - 1)
      } else {
        setReloadKey((value) => value + 1)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除全局配置失败，请稍后重试。')
    } finally {
      setIsDeletingConfig(false)
    }
  }

  async function handleStatusSwitchChange(record: GlobalConfigRecord, checked: boolean) {
    if (togglingConfigId !== null) {
      return
    }

    setTogglingConfigId(record.id)

    try {
      await updateGlobalConfig(record.id, {
        status: checked ? 1 : 0,
      })

      toast.success(`配置状态已切换为 ${formatStatus(checked ? 1 : 0)}`)
      setReloadKey((value) => value + 1)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '切换配置状态失败，请稍后重试。')
    } finally {
      setTogglingConfigId(null)
    }
  }

  function renderConfigValueField(
    draft: GlobalConfigFormState,
    onChange: (nextValue: string) => void,
  ) {
    if (draft.configType === 'boolean') {
      return (
        <ModuleSelect
          value={draft.configValue || 'false'}
          onValueChange={onChange}
          options={[
            { value: 'true', label: 'true' },
            { value: 'false', label: 'false' },
          ]}
        />
      )
    }

    return (
      <Input
        value={draft.configValue}
        onChange={(event) => onChange(event.target.value)}
        inputMode={draft.configType === 'number' ? 'decimal' : undefined}
        placeholder={
          draft.configType === 'number' ? '请输入数字配置值' : '请输入配置值'
        }
      />
    )
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setProjectReloadKey((value) => value + 1)}
          >
            重试
          </Button>
        </div>
      )
    }

    if (visibleProjects.length === 0) {
      return (
        <div className="flex h-56 flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground">
          <span>
            {projectRecords.length > 0 ? '没有匹配的项目。' : '暂无项目数据，请先在项目管理页创建项目。'}
          </span>
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
          {visibleProjects.map((project) => {
            const isSelected = project.id === selectedProjectId

            return (
              <button
                key={project.id}
                type="button"
                onClick={() => setSelectedProjectId(project.id)}
                className={cn(
                  'w-full rounded-2xl border px-3 py-3 text-left transition-colors',
                  isSelected
                    ? 'border-primary/35 bg-accent text-accent-foreground shadow-sm'
                    : 'border-border/70 bg-background hover:bg-muted/50',
                )}
              >
                <div className="truncate text-sm font-medium">{project.projectName}</div>
                <div className="mt-1 font-mono text-xs text-muted-foreground">
                  {project.projectCode}
                </div>
              </button>
            )
          })}
        </div>
      </ScrollArea>
    )
  }

  function renderEmptyState() {
    if (selectedProject === null) {
      return '请选择左侧项目后查看全局配置。'
    }

    return '当前项目下暂无全局配置数据。'
  }

  return (
    <section className={ADMIN_PAGE_FILL_LAYOUT_CLASS}>
      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[18rem_minmax(0,1fr)]">
        <section className="h-full min-h-0 rounded-3xl border border-border/70 bg-background/85">
          <div className="flex h-full min-h-0 flex-col gap-3 px-4 py-4 md:px-5 md:py-5">
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
          </div>
        </section>

        <div className="flex min-h-0 min-w-0 flex-col gap-4">
          <section className={ADMIN_PAGE_TOOLBAR_CLASS}>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(11rem,0.7fr)_auto_auto_auto]">
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="搜索配置键、配置名称或备注"
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
              {canCreateConfigAction ? (
                <Button
                  type="button"
                  className="h-9"
                  onClick={handleOpenCreateDialog}
                  disabled={!selectedProject}
                >
                  <PlusIcon data-icon="inline-start" />
                  新增配置
                </Button>
              ) : null}
            </div>
          </section>

          <section className={ADMIN_PAGE_FILL_CARD_CLASS}>
            <div className="flex h-full min-h-0 flex-col gap-4 px-4 py-4 md:px-5 md:py-5">
              <div className="min-h-0 flex-1 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>项目名称</TableHead>
                      <TableHead>项目编码</TableHead>
                      <TableHead>配置键</TableHead>
                      <TableHead>配置名称</TableHead>
                      <TableHead>类型</TableHead>
                      <TableHead>配置值</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>更新时间</TableHead>
                      <TableHead>备注</TableHead>
                      <TableHead className="w-[12rem]">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadState === 'loading' ? (
                      <TableRow>
                        <TableCell colSpan={TABLE_COLUMN_COUNT} className="h-24 text-center text-muted-foreground">
                          <div className="flex items-center justify-center gap-2">
                            <Spinner className="size-4" />
                            <span>正在加载全局配置列表...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : loadState === 'error' ? (
                      <TableRow>
                        <TableCell colSpan={TABLE_COLUMN_COUNT} className="h-24 text-center text-muted-foreground">
                          <div className="flex flex-col items-center justify-center gap-3">
                            <span>{errorMessage || '加载全局配置列表失败，请稍后重试。'}</span>
                            <Button type="button" variant="outline" size="sm" onClick={() => setReloadKey((value) => value + 1)}>
                              重试
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : configRows.length > 0 ? (
                      configRows.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>{row.projectName}</TableCell>
                          <TableCell className="font-mono text-sm">{row.projectCode}</TableCell>
                          <TableCell className="font-mono text-sm">{row.configKey}</TableCell>
                          <TableCell className="font-medium">{row.configName}</TableCell>
                          <TableCell>{formatConfigType(row.configType)}</TableCell>
                          <TableCell className="max-w-[16rem] truncate">{formatConfigValue(row.configValue)}</TableCell>
                          <TableCell>
                            <div className="flex min-w-[7rem] items-center gap-2">
                              <Switch
                                checked={row.status === 1}
                                disabled={togglingConfigId === row.id || !canUpdateConfigAction}
                                onCheckedChange={(checked) => void handleStatusSwitchChange(row, checked)}
                                aria-label={`${row.configName}状态开关`}
                              />
                              <span className="text-sm text-muted-foreground">
                                {formatStatus(row.status)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{row.updateTime ?? '--'}</TableCell>
                          <TableCell className="max-w-[16rem] truncate">{row.remark || '--'}</TableCell>
                          <TableCell>
                            <div className="flex flex-nowrap items-center gap-2 whitespace-nowrap">
                              {canUpdateConfigAction ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  disabled={togglingConfigId === row.id}
                                  onClick={() => handleEditConfig(row)}
                                >
                                  修改
                                </Button>
                              ) : null}
                              {canDeleteConfigAction ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  disabled={togglingConfigId === row.id}
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => setDeletingConfig(row)}
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
                          {renderEmptyState()}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <ListPagination
                currentPage={currentPage}
                totalPages={totalPages}
                total={totalConfigs}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={(nextPageSize) => {
                  setPageSize(nextPageSize)
                  setCurrentPage(1)
                }}
              />
            </div>
          </section>
        </div>
      </div>

      <Dialog
        open={isCreateDialogOpen}
        onOpenChange={(open) => (!open ? handleCloseCreateDialog() : setIsCreateDialogOpen(true))}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>新增全局配置</DialogTitle>
            <DialogDescription>
              配置将直接挂到当前选中项目下，并按类型校验配置值。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <div className="text-sm font-medium">所属项目</div>
              <Input
                value={selectedProject ? `${selectedProject.projectName} (${selectedProject.projectCode})` : ''}
                disabled
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <div className="text-sm font-medium">配置键</div>
                <Input
                  value={createDraft.configKey}
                  onChange={(event) => setCreateDraft((draft) => ({ ...draft, configKey: event.target.value }))}
                  placeholder="如 site.title"
                />
              </div>
              <div className="grid gap-2">
                <div className="text-sm font-medium">配置名称</div>
                <Input
                  value={createDraft.configName}
                  onChange={(event) => setCreateDraft((draft) => ({ ...draft, configName: event.target.value }))}
                  placeholder="请输入配置名称"
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <div className="text-sm font-medium">配置类型</div>
                <ModuleSelect
                  value={createDraft.configType}
                  onValueChange={(value) =>
                    setCreateDraft((draft) => normalizeDraftForType(draft, value as GlobalConfigType))
                  }
                  options={[
                    { value: 'text', label: '文本' },
                    { value: 'number', label: '数字' },
                    { value: 'boolean', label: '布尔' },
                  ]}
                />
              </div>
              <div className="grid gap-2">
                <div className="text-sm font-medium">状态</div>
                <ModuleSelect
                  value={String(createDraft.status)}
                  onValueChange={(value) => setCreateDraft((draft) => ({ ...draft, status: Number(value) }))}
                  options={[
                    { value: '1', label: '正常' },
                    { value: '0', label: '冻结' },
                  ]}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <div className="text-sm font-medium">配置值</div>
              {renderConfigValueField(createDraft, (nextValue) =>
                setCreateDraft((draft) => ({ ...draft, configValue: nextValue })),
              )}
            </div>
            <div className="grid gap-2">
              <div className="text-sm font-medium">备注</div>
              <Textarea
                value={createDraft.remark}
                onChange={(event) => setCreateDraft((draft) => ({ ...draft, remark: event.target.value }))}
                placeholder="请输入备注"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCloseCreateDialog}>
              取消
            </Button>
            <Button type="button" onClick={() => void handleCreateConfig()} disabled={!canCreateConfig || isCreatingConfig}>
              {isCreatingConfig ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isEditDialogOpen}
        onOpenChange={(open) => (!open ? handleCloseEditDialog() : null)}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>修改全局配置</DialogTitle>
            <DialogDescription>
              支持调整配置键、名称、类型、配置值和状态。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <div className="text-sm font-medium">所属项目</div>
              <Input
                value={
                  editingConfig ? `${editingConfig.projectName} (${editingConfig.projectCode})` : ''
                }
                disabled
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <div className="text-sm font-medium">配置键</div>
                <Input
                  value={editingDraft.configKey}
                  onChange={(event) => setEditingDraft((draft) => ({ ...draft, configKey: event.target.value }))}
                  placeholder="如 site.title"
                />
              </div>
              <div className="grid gap-2">
                <div className="text-sm font-medium">配置名称</div>
                <Input
                  value={editingDraft.configName}
                  onChange={(event) => setEditingDraft((draft) => ({ ...draft, configName: event.target.value }))}
                  placeholder="请输入配置名称"
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <div className="text-sm font-medium">配置类型</div>
                <ModuleSelect
                  value={editingDraft.configType}
                  onValueChange={(value) =>
                    setEditingDraft((draft) => normalizeDraftForType(draft, value as GlobalConfigType))
                  }
                  options={[
                    { value: 'text', label: '文本' },
                    { value: 'number', label: '数字' },
                    { value: 'boolean', label: '布尔' },
                  ]}
                />
              </div>
              <div className="grid gap-2">
                <div className="text-sm font-medium">状态</div>
                <ModuleSelect
                  value={String(editingDraft.status)}
                  onValueChange={(value) => setEditingDraft((draft) => ({ ...draft, status: Number(value) }))}
                  options={[
                    { value: '1', label: '正常' },
                    { value: '0', label: '冻结' },
                  ]}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <div className="text-sm font-medium">配置值</div>
              {renderConfigValueField(editingDraft, (nextValue) =>
                setEditingDraft((draft) => ({ ...draft, configValue: nextValue })),
              )}
            </div>
            <div className="grid gap-2">
              <div className="text-sm font-medium">备注</div>
              <Textarea
                value={editingDraft.remark}
                onChange={(event) => setEditingDraft((draft) => ({ ...draft, remark: event.target.value }))}
                placeholder="请输入备注"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCloseEditDialog}>
              取消
            </Button>
            <Button type="button" onClick={() => void handleSaveConfig()} disabled={!canSaveConfig || isSavingConfig}>
              {isSavingConfig ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deletingConfig !== null}
        onOpenChange={(open) => (!open ? setDeletingConfig(null) : null)}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>删除全局配置</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingConfig ? `确认删除配置“${deletingConfig.configName}”吗？删除后当前列表将立即更新。` : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingConfig}>取消</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void handleDeleteConfig()}>
              {isDeletingConfig ? '删除中...' : '删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
