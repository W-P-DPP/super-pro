import type {
  AdminMenuNodeType,
  AdminMenuResponseDto,
  CreateAdminMenuRequestDto,
  UpdateAdminMenuRequestDto,
} from '@super-pro/shared-types'
import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { ChevronDownIcon, ChevronRightIcon, PlusIcon, RotateCcwIcon, SearchIcon } from 'lucide-react'
import { TreeDataTable, type TreeDataTableColumn } from '@super-pro/shared-ui'
import {
  createAdminMenu,
  deleteAdminMenu,
  getAdminMenuList,
  updateAdminMenu,
  type AdminMenuListItemDto,
} from '@/api/modules/admin-menu'
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
  toast,
} from '@/components/ui'
import { useAdminMenu } from '@/contexts/admin-menu-context'
import { ADMIN_MENU_ICON_OPTIONS } from '@/lib/admin-menu-icons'
import {
  ADMIN_PAGE_FILL_CARD_CLASS,
  ADMIN_PAGE_FILL_LAYOUT_CLASS,
  DEFAULT_PAGE_SIZE,
  ListPagination,
  ModuleSelect,
  type LoadState,
  formatStatus,
} from './module-page-shared'

type MenuFormState = {
  parentId: string
  name: string
  shortTitle: string
  slug: string
  iconKey: string
  menuType: AdminMenuNodeType
  status: string
  sort: string
  description: string
  badge: string
  permissionCode: string
  remark: string
}

type MenuRowRecord = AdminMenuListItemDto

function buildEmptyDraft(groups: AdminMenuResponseDto[]): MenuFormState {
  return {
    parentId: groups[0] ? String(groups[0].id) : '',
    name: '',
    shortTitle: '',
    slug: '',
    iconKey: 'layout-grid',
    menuType: 'item',
    status: '1',
    sort: '',
    description: '',
    badge: '',
    permissionCode: '',
    remark: '',
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

function buildDraftFromRow(row: MenuRowRecord): MenuFormState {
  return {
    parentId: row.parentId ? String(row.parentId) : '',
    name: row.name,
    shortTitle: row.shortTitle,
    slug: row.slug,
    iconKey: row.iconKey,
    menuType: row.menuType,
    status: String(row.status),
    sort: String(row.sort),
    description: row.description,
    badge: row.badge,
    permissionCode: row.permissionCode,
    remark: row.remark,
  }
}

function normalizeMenuPayload(draft: MenuFormState): CreateAdminMenuRequestDto {
  const isGroup = draft.menuType === 'group'

  return {
    parentId: isGroup ? null : Number(draft.parentId),
    name: draft.name.trim(),
    shortTitle: draft.shortTitle.trim(),
    slug: isGroup ? null : draft.slug.trim(),
    iconKey: draft.iconKey as CreateAdminMenuRequestDto['iconKey'],
    menuType: draft.menuType,
    status: Number(draft.status),
    sort: parseOptionalNonNegativeInteger(draft.sort),
    description: draft.description.trim(),
    badge: draft.badge.trim(),
    permissionCode: isGroup ? '' : draft.permissionCode.trim(),
    remark: draft.remark.trim(),
  }
}

function canSubmitMenuDraft(draft: MenuFormState) {
  if (!draft.name.trim()) {
    return false
  }

  if (draft.menuType === 'group') {
    return true
  }

  return Boolean(draft.parentId.trim() && draft.slug.trim())
}

function updateDraftForMenuType(
  setDraft: Dispatch<SetStateAction<MenuFormState>>,
  value: string,
  groupOptions: AdminMenuResponseDto[],
) {
  setDraft((currentDraft) => ({
    ...currentDraft,
    menuType: value as AdminMenuNodeType,
    parentId:
      value === 'group'
        ? ''
        : currentDraft.parentId || (groupOptions[0] ? String(groupOptions[0].id) : ''),
    slug: value === 'group' ? '' : currentDraft.slug,
    iconKey: value === 'group' ? 'layout-grid' : currentDraft.iconKey,
  }))
}

function MenuFormFields({
  draft,
  setDraft,
  groupOptions,
  editingMenuId,
}: {
  draft: MenuFormState
  setDraft: Dispatch<SetStateAction<MenuFormState>>
  groupOptions: AdminMenuResponseDto[]
  editingMenuId?: number
}) {
  const availableGroups = editingMenuId
    ? groupOptions.filter((group) => group.id !== editingMenuId)
    : groupOptions

  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2">
          <div className="text-sm font-medium">菜单类型</div>
          <ModuleSelect
            value={draft.menuType}
            onValueChange={(value) => updateDraftForMenuType(setDraft, value, groupOptions)}
            options={[
              { value: 'group', label: '分组菜单' },
              { value: 'item', label: '页面菜单' },
            ]}
          />
        </div>
        <div className="grid gap-2">
          <div className="text-sm font-medium">状态</div>
          <ModuleSelect
            value={draft.status}
            onValueChange={(value) => setDraft((currentDraft) => ({ ...currentDraft, status: value }))}
            options={[
              { value: '1', label: '正常' },
              { value: '0', label: '冻结' },
            ]}
          />
        </div>
      </div>

      {draft.menuType === 'item' ? (
        <div className="grid gap-2">
          <div className="text-sm font-medium">父级分组</div>
          <ModuleSelect
            value={draft.parentId}
            onValueChange={(value) => setDraft((currentDraft) => ({ ...currentDraft, parentId: value }))}
            options={availableGroups.map((group) => ({
              value: String(group.id),
              label: group.name,
            }))}
            placeholder="请选择父级分组"
          />
        </div>
      ) : null}

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
          <div className="text-sm font-medium">菜单简称</div>
          <Input
            value={draft.shortTitle}
            onChange={(event) =>
              setDraft((currentDraft) => ({ ...currentDraft, shortTitle: event.target.value }))
            }
            placeholder="请输入菜单简称"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2">
          <div className="text-sm font-medium">图标标识</div>
          <ModuleSelect
            value={draft.iconKey}
            onValueChange={(value) => setDraft((currentDraft) => ({ ...currentDraft, iconKey: value }))}
            options={ADMIN_MENU_ICON_OPTIONS.map((option) => ({
              value: option.value,
              label: option.value,
            }))}
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

      {draft.menuType === 'item' ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-2">
            <div className="text-sm font-medium">路由标识</div>
            <Input
              value={draft.slug}
              onChange={(event) => setDraft((currentDraft) => ({ ...currentDraft, slug: event.target.value }))}
              placeholder="例如 reports-center"
            />
          </div>
          <div className="grid gap-2">
            <div className="text-sm font-medium">权限编码</div>
            <Input
              value={draft.permissionCode}
              onChange={(event) =>
                setDraft((currentDraft) => ({ ...currentDraft, permissionCode: event.target.value }))
              }
              placeholder="例如 admin.console.menu.reports.view"
            />
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2">
          <div className="text-sm font-medium">菜单描述</div>
          <Input
            value={draft.description}
            onChange={(event) =>
              setDraft((currentDraft) => ({ ...currentDraft, description: event.target.value }))
            }
            placeholder="请输入菜单描述"
          />
        </div>
        <div className="grid gap-2">
          <div className="text-sm font-medium">角标文案</div>
          <Input
            value={draft.badge}
            onChange={(event) => setDraft((currentDraft) => ({ ...currentDraft, badge: event.target.value }))}
            placeholder="例如 Beta"
          />
        </div>
      </div>

      <div className="grid gap-2">
        <div className="text-sm font-medium">备注</div>
        <Input
          value={draft.remark}
          onChange={(event) => setDraft((currentDraft) => ({ ...currentDraft, remark: event.target.value }))}
          placeholder="请输入备注"
        />
      </div>
    </div>
  )
}

export function ReportsPage() {
  const { menuTree, reload } = useAdminMenu()
  const groupOptions = useMemo(
    () => menuTree.filter((node) => node.menuType === 'group'),
    [menuTree],
  )
  const [keyword, setKeyword] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [menuRows, setMenuRows] = useState<MenuRowRecord[]>([])
  const [tableLoadState, setTableLoadState] = useState<LoadState>('idle')
  const [tableErrorMessage, setTableErrorMessage] = useState('')
  const [totalMenus, setTotalMenus] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [tableReloadKey, setTableReloadKey] = useState(0)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isCreatingMenu, setIsCreatingMenu] = useState(false)
  const [editingMenu, setEditingMenu] = useState<MenuRowRecord | null>(null)
  const [isSavingMenu, setIsSavingMenu] = useState(false)
  const [deletingMenu, setDeletingMenu] = useState<MenuRowRecord | null>(null)
  const [isDeletingMenu, setIsDeletingMenu] = useState(false)
  const [createDraft, setCreateDraft] = useState<MenuFormState>(() => buildEmptyDraft(groupOptions))
  const [editingDraft, setEditingDraft] = useState<MenuFormState>(() => buildEmptyDraft(groupOptions))

  const totalPages = Math.max(1, Math.ceil(totalMenus / pageSize))
  const isEditDialogOpen = editingMenu !== null
  const canCreateMenu = canSubmitMenuDraft(createDraft)
  const canSaveMenu = canSubmitMenuDraft(editingDraft)

  const tableColumns = useMemo<TreeDataTableColumn<MenuRowRecord>[]>(
    () => [
      {
        key: 'name',
        header: '菜单名称',
        cell: (row, context) => (
          <div className="flex items-center gap-2" style={{ paddingLeft: `${context.depth * 1.25}rem` }}>
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
        key: 'menuType',
        header: '类型',
        cell: (row) => (row.menuType === 'group' ? '分组菜单' : '页面菜单'),
      },
      {
        key: 'parentName',
        header: '父级',
        cell: (row) => row.parentName || '--',
      },
      {
        key: 'slug',
        header: '路由标识',
        cell: (row) => <span className="font-mono text-sm">{row.slug || '--'}</span>,
      },
      {
        key: 'iconKey',
        header: '图标',
        cell: (row) => row.iconKey,
      },
      {
        key: 'status',
        header: '状态',
        cell: (row) => formatStatus(row.status),
      },
      {
        key: 'sort',
        header: '排序',
        cell: (row) => row.sort,
      },
      {
        key: 'permissionCode',
        header: '权限编码',
        cell: (row) => <span className="font-mono text-sm">{row.permissionCode || '--'}</span>,
      },
      {
        key: 'actions',
        header: '操作',
        headerClassName: 'w-[10rem]',
        cell: (row) => (
          <div className="flex flex-nowrap items-center gap-2 whitespace-nowrap">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditingMenu(row)
                setEditingDraft(buildDraftFromRow(row))
              }}
            >
              修改
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeletingMenu(row)}
            >
              删除
            </Button>
          </div>
        ),
      },
    ],
    [],
  )

  useEffect(() => {
    async function loadMenuPage() {
      setTableLoadState('loading')
      setTableErrorMessage('')

      try {
        const result = await getAdminMenuList({
          keyword: keyword.trim() || undefined,
          menuType: typeFilter === 'all' ? undefined : (typeFilter as AdminMenuNodeType),
          status: statusFilter === 'all' ? undefined : Number(statusFilter),
          page: currentPage,
          pageSize,
        })

        setMenuRows(result.items)
        setTotalMenus(result.total)
        setTableLoadState('success')

        if (result.page !== currentPage) {
          setCurrentPage(result.page)
        }
      } catch (error) {
        setMenuRows([])
        setTotalMenus(0)
        setTableLoadState('error')
        setTableErrorMessage(error instanceof Error ? error.message : '加载后台菜单列表失败，请稍后重试。')
      }
    }

    void loadMenuPage()
  }, [currentPage, keyword, pageSize, statusFilter, tableReloadKey, typeFilter])

  function refreshTable() {
    setTableReloadKey((currentValue) => currentValue + 1)
  }

  function handleOpenCreateDialog() {
    setCreateDraft(buildEmptyDraft(groupOptions))
    setIsCreateDialogOpen(true)
  }

  function handleCloseCreateDialog() {
    setIsCreateDialogOpen(false)
    setCreateDraft(buildEmptyDraft(groupOptions))
  }

  function handleCloseEditDialog() {
    setEditingMenu(null)
    setEditingDraft(buildEmptyDraft(groupOptions))
  }

  async function handleCreateMenu() {
    if (!canCreateMenu || isCreatingMenu) {
      return
    }

    setIsCreatingMenu(true)

    try {
      await createAdminMenu(normalizeMenuPayload(createDraft))
      toast.success('后台菜单已新增')
      handleCloseCreateDialog()
      setCurrentPage(1)
      reload()
      refreshTable()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '新增后台菜单失败，请稍后重试。')
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
      await updateAdminMenu(
        editingMenu.id,
        normalizeMenuPayload(editingDraft) as UpdateAdminMenuRequestDto,
      )
      toast.success('后台菜单已更新')
      handleCloseEditDialog()
      reload()
      refreshTable()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '更新后台菜单失败，请稍后重试。')
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
      await deleteAdminMenu(deletingMenu.id)
      toast.success('后台菜单已删除')
      setDeletingMenu(null)
      reload()
      refreshTable()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除后台菜单失败，请稍后重试。')
    } finally {
      setIsDeletingMenu(false)
    }
  }

  return (
    <section className={ADMIN_PAGE_FILL_LAYOUT_CLASS}>
      <Card className="shrink-0 border border-border/70 bg-card/95 shadow-sm">
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_minmax(11rem,0.7fr)_minmax(11rem,0.7fr)_auto_auto]">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索菜单名称、路由、权限编码或备注"
              className="h-9 pl-9"
            />
          </div>
          <ModuleSelect
            value={typeFilter}
            onValueChange={setTypeFilter}
            options={[
              { value: 'all', label: '全部类型' },
              { value: 'group', label: '分组菜单' },
              { value: 'item', label: '页面菜单' },
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
            variant="outline"
            className="h-9"
            onClick={() => {
              setKeyword('')
              setTypeFilter('all')
              setStatusFilter('all')
              setCurrentPage(1)
            }}
          >
            <RotateCcwIcon data-icon="inline-start" />
            重置
          </Button>
          <Button type="button" className="h-9" onClick={handleOpenCreateDialog}>
            <PlusIcon data-icon="inline-start" />
            新增菜单
          </Button>
        </CardContent>
      </Card>

      <Card className={ADMIN_PAGE_FILL_CARD_CLASS}>
        <CardContent className="flex h-full min-h-0 flex-col gap-4">
          <div className="min-h-0 flex-1 overflow-auto">
            {tableLoadState === 'loading' ? (
              <div className="flex h-24 items-center justify-center gap-2 text-muted-foreground">
                <Spinner className="size-4" />
                <span>正在加载后台菜单...</span>
              </div>
            ) : tableLoadState === 'error' ? (
              <div className="flex h-24 flex-col items-center justify-center gap-3 text-muted-foreground">
                <span>{tableErrorMessage || '后台菜单列表加载失败，请稍后重试。'}</span>
                <Button type="button" variant="outline" size="sm" onClick={refreshTable}>
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
                emptyMessage="没有匹配的后台菜单数据。"
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
            <DialogTitle>新增后台菜单</DialogTitle>
            <DialogDescription>维护 admin-front 菜单，分页按一级菜单计算。</DialogDescription>
          </DialogHeader>
          <MenuFormFields draft={createDraft} setDraft={setCreateDraft} groupOptions={groupOptions} />
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

      <Dialog open={isEditDialogOpen} onOpenChange={(open) => (!open ? handleCloseEditDialog() : null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>修改后台菜单</DialogTitle>
            <DialogDescription>支持调整分组、名称、图标、状态、排序和权限编码。</DialogDescription>
          </DialogHeader>
          <MenuFormFields
            draft={editingDraft}
            setDraft={setEditingDraft}
            groupOptions={groupOptions}
            editingMenuId={editingMenu?.id}
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
            <AlertDialogTitle>删除后台菜单</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingMenu ? `确认删除菜单“${deletingMenu.name}”吗？如果是分组菜单，会同时删除其下级菜单。` : ''}
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
