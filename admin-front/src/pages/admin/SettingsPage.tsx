import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { ADMIN_CONSOLE_PERMISSION_CODES } from '@super-pro/shared-types'
import { ChevronDownIcon, ChevronRightIcon, PlusIcon, RotateCcwIcon, SearchIcon } from 'lucide-react'
import { TreeDataTable, type TreeDataTableColumn } from '@super-pro/shared-ui'
import {
  createSiteMenu,
  deleteSiteMenu,
  getSiteMenuList,
  getSiteMenuTree,
  type CreateSiteMenuRequestDto,
  type SiteMenuListItemDto,
  type SiteMenuResponseDto,
  type UpdateSiteMenuRequestDto,
  updateSiteMenu,
} from '@/api/modules/site-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
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
  Textarea,
  toast,
} from '@/components/ui'
import { useAdminMenu } from '@/contexts/admin-menu-context'
import { resolveSiteMenuIcon } from '@/data/tool-directory'
import {
  ADMIN_PAGE_FILL_CARD_CLASS,
  ADMIN_PAGE_FILL_LAYOUT_CLASS,
  DEFAULT_PAGE_SIZE,
  ListPagination,
  ModuleSelect,
  type LoadState,
} from './module-page-shared'

type SiteMenuFormState = {
  parentId: string
  name: string
  path: string
  icon: string
  sort: string
  strict: boolean
  hide: boolean
  remark: string
}

type SiteMenuRowRecord = SiteMenuListItemDto

function buildEmptyDraft(): SiteMenuFormState {
  return {
    parentId: 'root',
    name: '',
    path: '',
    icon: '',
    sort: '',
    strict: false,
    hide: false,
    remark: '',
  }
}

function buildDraftFromRow(row: SiteMenuRowRecord): SiteMenuFormState {
  return {
    parentId: row.parentId === null ? 'root' : String(row.parentId),
    name: row.name,
    path: row.path,
    icon: row.icon,
    sort: String(row.sort),
    strict: row.strict,
    hide: row.hide,
    remark: row.remark,
  }
}

function parseOptionalNonNegativeInteger(value: string) {
  if (!value.trim()) {
    return undefined
  }

  const parsedValue = Number(value)
  if (!Number.isInteger(parsedValue) || parsedValue < 0) {
    return 0
  }

  return parsedValue
}

function flattenSiteMenuTree(
  nodes: SiteMenuResponseDto[],
  level = 0,
  parentName = '',
): SiteMenuRowRecord[] {
  return [...nodes]
    .sort((left, right) => left.sort - right.sort || left.id - right.id)
    .flatMap((node) => {
      const current: SiteMenuRowRecord = {
        id: node.id,
        parentId: node.parentId,
        parentName,
        level,
        name: node.name,
        path: node.path,
        icon: node.icon,
        strict: Boolean(node.strict),
        hide: Boolean(node.hide),
        sort: node.sort,
        remark: node.remark?.trim() ?? '',
        updateTime: node.updateTime || node.createTime || '--',
      }

      return [current, ...flattenSiteMenuTree(node.children, level + 1, node.name)]
    })
}

function collectDescendantIds(node: SiteMenuResponseDto): number[] {
  return node.children.flatMap((child) => [child.id, ...collectDescendantIds(child)])
}

function normalizeParentId(parentId: string) {
  return parentId === 'root' ? null : Number(parentId)
}

function normalizeSiteMenuPayload(draft: SiteMenuFormState): CreateSiteMenuRequestDto {
  const parentId = normalizeParentId(draft.parentId)

  return {
    parentId,
    name: draft.name.trim(),
    path: draft.path.trim(),
    icon: draft.icon.trim(),
    isTop: parentId === null,
    strict: draft.strict,
    hide: draft.hide,
    sort: parseOptionalNonNegativeInteger(draft.sort),
    remark: draft.remark.trim(),
  }
}

function SiteMenuFormFields({
  draft,
  setDraft,
  parentOptions,
}: {
  draft: SiteMenuFormState
  setDraft: Dispatch<SetStateAction<SiteMenuFormState>>
  parentOptions: Array<{ value: string; label: string }>
}) {
  const previewIcon = resolveSiteMenuIcon(draft.icon)

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2">
          <div className="text-sm font-medium">父级菜单</div>
          <ModuleSelect
            value={draft.parentId}
            onValueChange={(value) => setDraft((currentDraft) => ({ ...currentDraft, parentId: value }))}
            options={parentOptions}
          />
        </div>
        <div className="grid gap-2">
          <div className="text-sm font-medium">排序值</div>
          <Input
            value={draft.sort}
            onChange={(event) => setDraft((currentDraft) => ({ ...currentDraft, sort: event.target.value }))}
            placeholder="留空默认追加到末尾"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2">
          <div className="text-sm font-medium">菜单名称</div>
          <Input
            value={draft.name}
            onChange={(event) => setDraft((currentDraft) => ({ ...currentDraft, name: event.target.value }))}
            placeholder="请输入菜单名称"
          />
        </div>
        <div className="grid gap-2">
          <div className="text-sm font-medium">菜单路径</div>
          <Input
            value={draft.path}
            onChange={(event) => setDraft((currentDraft) => ({ ...currentDraft, path: event.target.value }))}
            placeholder="顶级菜单可留空，子菜单可填写链接或路由"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_5rem]">
        <div className="grid gap-2">
          <div className="text-sm font-medium">图标地址</div>
          <Input
            value={draft.icon}
            onChange={(event) => setDraft((currentDraft) => ({ ...currentDraft, icon: event.target.value }))}
            placeholder="支持 /public/icons/...、icons/... 或完整 http(s) 地址"
          />
        </div>
        <div className="grid gap-2">
          <div className="text-sm font-medium">预览</div>
          <div className="flex h-10 items-center justify-center rounded-lg border border-border/70 bg-muted/20">
            <img src={previewIcon} alt="" className="size-7 object-contain" />
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/15 px-3 py-3">
          <div>
            <div className="text-sm font-medium">严格跳转</div>
            <div className="text-xs text-muted-foreground">启用后按严格菜单跳转逻辑处理。</div>
          </div>
          <Switch
            checked={draft.strict}
            onCheckedChange={(checked) => setDraft((currentDraft) => ({ ...currentDraft, strict: checked }))}
            aria-label="严格跳转开关"
          />
        </div>
        <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/15 px-3 py-3">
          <div>
            <div className="text-sm font-medium">隐藏菜单</div>
            <div className="text-xs text-muted-foreground">隐藏后默认不在站点目录中展示。</div>
          </div>
          <Switch
            checked={draft.hide}
            onCheckedChange={(checked) => setDraft((currentDraft) => ({ ...currentDraft, hide: checked }))}
            aria-label="隐藏菜单开关"
          />
        </div>
      </div>

      <div className="grid gap-2">
        <div className="text-sm font-medium">备注</div>
        <Textarea
          value={draft.remark}
          onChange={(event) => setDraft((currentDraft) => ({ ...currentDraft, remark: event.target.value }))}
          placeholder="可填写菜单用途或备注"
          rows={4}
        />
      </div>
    </div>
  )
}

export function SettingsPage() {
  const { hasPermission } = useAdminMenu()
  const [menuTree, setMenuTree] = useState<SiteMenuResponseDto[]>([])
  const [loadState, setLoadState] = useState<LoadState>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [keyword, setKeyword] = useState('')
  const [visibilityFilter, setVisibilityFilter] = useState('all')
  const [strictFilter, setStrictFilter] = useState('all')
  const [menuRows, setMenuRows] = useState<SiteMenuRowRecord[]>([])
  const [totalMenus, setTotalMenus] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [reloadKey, setReloadKey] = useState(0)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isCreatingMenu, setIsCreatingMenu] = useState(false)
  const [editingMenu, setEditingMenu] = useState<SiteMenuResponseDto | null>(null)
  const [isSavingMenu, setIsSavingMenu] = useState(false)
  const [deletingMenu, setDeletingMenu] = useState<SiteMenuRowRecord | null>(null)
  const [isDeletingMenu, setIsDeletingMenu] = useState(false)
  const [createDraft, setCreateDraft] = useState<SiteMenuFormState>(buildEmptyDraft)
  const [editingDraft, setEditingDraft] = useState<SiteMenuFormState>(buildEmptyDraft)

  async function loadSiteMenuTree() {
    try {
      const data = await getSiteMenuTree({ forceRefresh: reloadKey > 0 })
      setMenuTree(data)
    } catch {
      setMenuTree([])
    }
  }

  useEffect(() => {
    void loadSiteMenuTree()
  }, [reloadKey])

  const flatMenuRecords = useMemo(() => flattenSiteMenuTree(menuTree), [menuTree])
  const menuNodeMap = useMemo(() => {
    const map = new Map<number, SiteMenuResponseDto>()

    function visit(nodes: SiteMenuResponseDto[]) {
      for (const node of nodes) {
        map.set(node.id, node)
        visit(node.children)
      }
    }

    visit(menuTree)
    return map
  }, [menuTree])

  const parentOptions = useMemo(
    () => [
      { value: 'root', label: '顶级菜单' },
      ...flatMenuRecords.map((record) => ({
        value: String(record.id),
        label: `${'· '.repeat(record.level)}${record.name}`,
      })),
    ],
    [flatMenuRecords],
  )

  const editingParentOptions = useMemo(() => {
    if (!editingMenu) {
      return parentOptions
    }

    const excludedIds = new Set<number>([editingMenu.id, ...collectDescendantIds(editingMenu)])

    return [
      { value: 'root', label: '顶级菜单' },
      ...flatMenuRecords
        .filter((record) => !excludedIds.has(record.id))
        .map((record) => ({
          value: String(record.id),
          label: `${'· '.repeat(record.level)}${record.name}`,
        })),
    ]
  }, [editingMenu, flatMenuRecords, parentOptions])

  const totalPages = Math.max(1, Math.ceil(totalMenus / pageSize))
  const canCreateMenuAction = hasPermission(ADMIN_CONSOLE_PERMISSION_CODES.settingCreate)
  const canUpdateMenuAction = hasPermission(ADMIN_CONSOLE_PERMISSION_CODES.settingUpdate)
  const canDeleteMenuAction = hasPermission(ADMIN_CONSOLE_PERMISSION_CODES.settingDelete)
  const canCreateMenu = createDraft.name.trim().length > 0
  const canSaveMenu = editingDraft.name.trim().length > 0

  const tableColumns = useMemo<TreeDataTableColumn<SiteMenuRowRecord>[]>(
    () => [
      {
        key: 'name',
        header: '菜单名称',
        cell: (row, context) => (
          <div
            className="flex min-w-[12rem] items-center gap-2"
            style={{ paddingLeft: `${context.depth * 1.25}rem` }}
          >
            {context.canExpand ? (
              <button
                type="button"
                onClick={context.toggle}
                className="flex size-5 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label={`${context.isExpanded ? '收起' : '展开'} ${row.name}`}
              >
                {context.isExpanded ? <ChevronDownIcon className="size-4" /> : <ChevronRightIcon className="size-4" />}
              </button>
            ) : (
              <span className="block size-5 shrink-0" aria-hidden="true" />
            )}
            <span className="font-medium">{row.name}</span>
          </div>
        ),
      },
      {
        key: 'parentName',
        header: '父级',
        cell: (row) => row.parentName || '顶级菜单',
      },
      {
        key: 'path',
        header: '路径',
        cell: (row) => <span className="font-mono text-sm">{row.path || '--'}</span>,
      },
      {
        key: 'icon',
        header: '图标',
        cell: (row) => (
          <div className="flex min-w-[4rem] items-center">
            <img
              src={resolveSiteMenuIcon(row.icon)}
              alt=""
              className="size-8 rounded-lg border border-border/70 bg-muted/30 object-contain p-1"
            />
          </div>
        ),
      },
      {
        key: 'mode',
        header: '模式',
        cell: (row) => (
          <div className="flex flex-wrap gap-2">
            {row.strict ? <Badge variant="secondary">严格跳转</Badge> : <Badge variant="outline">普通跳转</Badge>}
            {row.hide ? <Badge variant="outline">隐藏</Badge> : <Badge variant="secondary">显示</Badge>}
          </div>
        ),
      },
      {
        key: 'sort',
        header: '排序',
        cell: (row) => row.sort,
      },
      {
        key: 'updateTime',
        header: '更新时间',
        cell: (row) => row.updateTime,
      },
      {
        key: 'actions',
        header: '操作',
        headerClassName: 'w-[10rem]',
        cell: (row) => (
          <div className="flex flex-nowrap items-center gap-2 whitespace-nowrap">
            {canUpdateMenuAction ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  const source = menuNodeMap.get(row.id)
                  if (!source) {
                    return
                  }

                  setEditingMenu(source)
                  setEditingDraft(buildDraftFromRow(row))
                }}
              >
                修改
              </Button>
            ) : null}
            {canDeleteMenuAction ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setDeletingMenu(row)}
              >
                删除
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [canDeleteMenuAction, canUpdateMenuAction, menuNodeMap],
  )

  useEffect(() => {
    async function loadSiteMenuPage() {
      setLoadState('loading')
      setErrorMessage('')

      try {
        const result = await getSiteMenuList({
          keyword: keyword.trim() || undefined,
          hide: visibilityFilter === 'all' ? undefined : visibilityFilter === 'hidden',
          strict: strictFilter === 'all' ? undefined : strictFilter === 'strict',
          page: currentPage,
          pageSize,
        })

        setMenuRows(result.items)
        setTotalMenus(result.total)
        setLoadState('success')

        if (result.page !== currentPage) {
          setCurrentPage(result.page)
        }
      } catch (error) {
        setMenuRows([])
        setTotalMenus(0)
        setLoadState('error')
        setErrorMessage(error instanceof Error ? error.message : '加载站点菜单列表失败，请稍后重试。')
      }
    }

    void loadSiteMenuPage()
  }, [currentPage, keyword, pageSize, reloadKey, strictFilter, visibilityFilter])

  function reload() {
    setReloadKey((currentValue) => currentValue + 1)
  }

  function handleCloseCreateDialog() {
    setIsCreateDialogOpen(false)
    setCreateDraft(buildEmptyDraft())
  }

  function handleCloseEditDialog() {
    setEditingMenu(null)
    setEditingDraft(buildEmptyDraft())
  }

  async function handleCreateMenu() {
    if (!canCreateMenu || isCreatingMenu) {
      return
    }

    setIsCreatingMenu(true)

    try {
      await createSiteMenu(normalizeSiteMenuPayload(createDraft))
      toast.success('站点菜单已新增')
      handleCloseCreateDialog()
      setCurrentPage(1)
      reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '新增站点菜单失败，请稍后重试。')
    } finally {
      setIsCreatingMenu(false)
    }
  }

  async function handleSaveMenu() {
    if (!editingMenu || !canSaveMenu || isSavingMenu) {
      return
    }

    setIsSavingMenu(true)

    try {
      await updateSiteMenu(
        editingMenu.id,
        normalizeSiteMenuPayload(editingDraft) as UpdateSiteMenuRequestDto,
      )
      toast.success('站点菜单已更新')
      handleCloseEditDialog()
      reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '更新站点菜单失败，请稍后重试。')
    } finally {
      setIsSavingMenu(false)
    }
  }

  async function handleDeleteMenu() {
    if (!deletingMenu || isDeletingMenu) {
      return
    }

    setIsDeletingMenu(true)

    try {
      await deleteSiteMenu(deletingMenu.id)
      toast.success('站点菜单已删除')
      setDeletingMenu(null)
      reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除站点菜单失败，请稍后重试。')
    } finally {
      setIsDeletingMenu(false)
    }
  }

  return (
    <section className={ADMIN_PAGE_FILL_LAYOUT_CLASS}>
      <Card className="shrink-0 border border-border/70 bg-card/95 shadow-sm">
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.6fr)_minmax(11rem,0.75fr)_minmax(11rem,0.75fr)_auto_auto]">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索菜单名称、路径、图标或备注"
              className="h-9 pl-9"
            />
          </div>
          <ModuleSelect
            value={visibilityFilter}
            onValueChange={setVisibilityFilter}
            options={[
              { value: 'all', label: '全部显隐' },
              { value: 'visible', label: '仅显示可见' },
              { value: 'hidden', label: '仅显示隐藏' },
            ]}
          />
          <ModuleSelect
            value={strictFilter}
            onValueChange={setStrictFilter}
            options={[
              { value: 'all', label: '全部模式' },
              { value: 'strict', label: '仅严格跳转' },
              { value: 'normal', label: '仅普通跳转' },
            ]}
          />
          <Button
            type="button"
            variant="outline"
            className="h-9"
            onClick={() => {
              setKeyword('')
              setVisibilityFilter('all')
              setStrictFilter('all')
              setCurrentPage(1)
            }}
          >
            <RotateCcwIcon data-icon="inline-start" />
            重置
          </Button>
          {canCreateMenuAction ? (
            <Button type="button" className="h-9" onClick={() => setIsCreateDialogOpen(true)}>
              <PlusIcon data-icon="inline-start" />
              新增菜单
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Card className={ADMIN_PAGE_FILL_CARD_CLASS}>
        <CardContent className="flex h-full min-h-0 flex-col gap-4">
          <div className="min-h-0 flex-1 overflow-auto">
            {loadState === 'loading' ? (
              <div className="flex h-24 items-center justify-center gap-2 text-muted-foreground">
                <Spinner className="size-4" />
                <span>正在加载站点菜单...</span>
              </div>
            ) : loadState === 'error' ? (
              <div className="flex h-24 flex-col items-center justify-center gap-3 text-muted-foreground">
                <span>{errorMessage || '加载站点菜单失败，请稍后重试。'}</span>
                <Button type="button" variant="outline" size="sm" onClick={reload}>
                  重试
                </Button>
              </div>
            ) : (
              <TreeDataTable
                data={menuRows}
                columns={tableColumns}
                getRowId={(row) => row.id}
                getParentId={(row) => row.parentId}
                defaultExpanded
                emptyMessage="没有匹配的站点菜单数据。"
              />
            )}
          </div>

          <ListPagination
            currentPage={currentPage}
            totalPages={totalPages}
            total={totalMenus}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(nextPageSize) => {
              setPageSize(nextPageSize)
              setCurrentPage(1)
            }}
          />
        </CardContent>
      </Card>

      <Dialog
        open={isCreateDialogOpen}
        onOpenChange={(open) => (!open ? handleCloseCreateDialog() : setIsCreateDialogOpen(true))}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>新增站点菜单</DialogTitle>
            <DialogDescription>维护 site-menu，分页按一级菜单计算。</DialogDescription>
          </DialogHeader>
          <SiteMenuFormFields draft={createDraft} setDraft={setCreateDraft} parentOptions={parentOptions} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCloseCreateDialog}>
              取消
            </Button>
            <Button type="button" onClick={() => void handleCreateMenu()} disabled={!canCreateMenu || isCreatingMenu}>
              {isCreatingMenu ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editingMenu !== null} onOpenChange={(open) => (!open ? handleCloseEditDialog() : null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>修改站点菜单</DialogTitle>
            <DialogDescription>支持调整层级、路径、图标、显隐和跳转模式。</DialogDescription>
          </DialogHeader>
          <SiteMenuFormFields
            draft={editingDraft}
            setDraft={setEditingDraft}
            parentOptions={editingParentOptions}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCloseEditDialog}>
              取消
            </Button>
            <Button type="button" onClick={() => void handleSaveMenu()} disabled={!canSaveMenu || isSavingMenu}>
              {isSavingMenu ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deletingMenu !== null} onOpenChange={(open) => (!open ? setDeletingMenu(null) : null)}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>删除站点菜单</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingMenu ? `确认删除菜单“${deletingMenu.name}”吗？删除后其子树也会一起移除。` : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingMenu}>取消</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void handleDeleteMenu()}>
              {isDeletingMenu ? '删除中...' : '删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
