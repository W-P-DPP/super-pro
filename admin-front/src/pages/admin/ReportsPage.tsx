import type {
  AdminMenuNodeType,
  AdminMenuResponseDto,
  CreateAdminMenuRequestDto,
  UpdateAdminMenuRequestDto,
} from '@super-pro/shared-types'
import { useEffect, useMemo, useState } from 'react'
import { PlusIcon, RotateCcwIcon, SearchIcon } from 'lucide-react'
import {
  createAdminMenu,
  deleteAdminMenu,
  updateAdminMenu,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
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

type MenuRowRecord = {
  id: number
  parentId: number | null
  parentName: string
  level: number
  name: string
  shortTitle: string
  slug: string
  iconKey: string
  menuType: AdminMenuNodeType
  status: number
  sort: number
  description: string
  badge: string
  permissionCode: string
  remark: string
  updateTime: string
}

const TABLE_COLUMN_COUNT = 9

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

function flattenMenuTree(
  nodes: AdminMenuResponseDto[],
  level = 0,
  parentName = '',
): MenuRowRecord[] {
  return [...nodes]
    .sort((left, right) => left.sort - right.sort || left.id - right.id)
    .flatMap((node) => {
      const current: MenuRowRecord = {
        id: node.id,
        parentId: node.parentId,
        parentName,
        level,
        name: node.name,
        shortTitle: node.shortTitle,
        slug: node.slug ?? '',
        iconKey: node.iconKey,
        menuType: node.menuType,
        status: node.status,
        sort: node.sort,
        description: node.description,
        badge: node.badge,
        permissionCode: node.permissionCode,
        remark: node.remark,
        updateTime: node.updateTime || node.createTime || '--',
      }

      return [current, ...flattenMenuTree(node.children, level + 1, node.name)]
    })
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

function normalizeMenuPayload(draft: MenuFormState) {
  return {
    parentId: draft.menuType === 'group' ? null : Number(draft.parentId),
    name: draft.name.trim(),
    shortTitle: draft.shortTitle.trim(),
    slug: draft.menuType === 'group' ? null : draft.slug.trim(),
    iconKey: draft.iconKey,
    menuType: draft.menuType,
    status: Number(draft.status),
    sort: parseOptionalNonNegativeInteger(draft.sort),
    description: draft.description.trim(),
    badge: draft.badge.trim(),
    permissionCode: draft.menuType === 'group' ? '' : draft.permissionCode.trim(),
    remark: draft.remark.trim(),
  } satisfies Omit<CreateAdminMenuRequestDto, 'iconKey'> & { iconKey: string }
}

export function ReportsPage() {
  const {
    status: menuLoadStatus,
    errorMessage,
    menuTree,
    reload,
  } = useAdminMenu()
  const groupOptions = useMemo(
    () => menuTree.filter((node) => node.menuType === 'group'),
    [menuTree],
  )
  const menuRecords = useMemo(() => flattenMenuTree(menuTree), [menuTree])
  const [keyword, setKeyword] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isCreatingMenu, setIsCreatingMenu] = useState(false)
  const [editingMenu, setEditingMenu] = useState<MenuRowRecord | null>(null)
  const [isSavingMenu, setIsSavingMenu] = useState(false)
  const [deletingMenu, setDeletingMenu] = useState<MenuRowRecord | null>(null)
  const [isDeletingMenu, setIsDeletingMenu] = useState(false)
  const [createDraft, setCreateDraft] = useState<MenuFormState>(() => buildEmptyDraft(groupOptions))
  const [editingDraft, setEditingDraft] = useState<MenuFormState>(() => buildEmptyDraft(groupOptions))

  const filteredMenuRecords = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase()

    return menuRecords.filter((record) => {
      const matchesKeyword =
        !normalizedKeyword ||
        `${record.name} ${record.shortTitle} ${record.parentName} ${record.slug} ${record.permissionCode} ${record.description} ${record.remark}`
          .toLowerCase()
          .includes(normalizedKeyword)
      const matchesType = typeFilter === 'all' || record.menuType === typeFilter
      const matchesStatus = statusFilter === 'all' || record.status === Number(statusFilter)

      return matchesKeyword && matchesType && matchesStatus
    })
  }, [keyword, menuRecords, statusFilter, typeFilter])

  const totalMenus = filteredMenuRecords.length
  const totalPages = Math.max(1, Math.ceil(totalMenus / pageSize))
  const normalizedCurrentPage = Math.min(currentPage, totalPages)
  const pagedMenuRecords = totalMenus === 0
    ? []
    : filteredMenuRecords.slice(
        (normalizedCurrentPage - 1) * pageSize,
        normalizedCurrentPage * pageSize,
      )
  const isEditDialogOpen = editingMenu !== null
  const canCreateMenu =
    createDraft.name.trim().length > 0 &&
    (createDraft.menuType === 'group' || createDraft.slug.trim().length > 0)
  const canSaveMenu =
    editingDraft.name.trim().length > 0 &&
    (editingDraft.menuType === 'group' || editingDraft.slug.trim().length > 0)

  useEffect(() => {
    if (normalizedCurrentPage !== currentPage) {
      setCurrentPage(normalizedCurrentPage)
    }
  }, [currentPage, normalizedCurrentPage])

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
      const payload = normalizeMenuPayload(createDraft)

      await createAdminMenu(payload as CreateAdminMenuRequestDto)
      toast.success('后台菜单已新增')
      handleCloseCreateDialog()
      setCurrentPage(1)
      reload()
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
      const payload = normalizeMenuPayload(editingDraft)

      await updateAdminMenu(editingMenu.id, payload as UpdateAdminMenuRequestDto)
      toast.success('后台菜单已更新')
      handleCloseEditDialog()
      reload()
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

      if (currentPage > 1 && pagedMenuRecords.length === 1) {
        setCurrentPage(currentPage - 1)
      }

      reload()
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
              placeholder="搜索菜单名称、路由、权限编码或说明"
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>菜单名称</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>父级</TableHead>
                  <TableHead>路由标识</TableHead>
                  <TableHead>图标</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>排序</TableHead>
                  <TableHead>权限编码</TableHead>
                  <TableHead className="w-[10rem]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {menuLoadStatus === 'loading' ? (
                  <TableRow>
                    <TableCell colSpan={TABLE_COLUMN_COUNT} className="h-24 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Spinner className="size-4" />
                        <span>正在加载后台菜单...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : menuLoadStatus === 'error' ? (
                  <TableRow>
                    <TableCell colSpan={TABLE_COLUMN_COUNT} className="h-24 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <span>{errorMessage || '后台菜单加载失败，请稍后重试。'}</span>
                        <Button type="button" variant="outline" size="sm" onClick={reload}>
                          重试
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : pagedMenuRecords.length > 0 ? (
                  pagedMenuRecords.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div style={{ paddingLeft: `${row.level * 1.25}rem` }}>
                          <div className="font-medium">{row.name}</div>
                        </div>
                      </TableCell>
                      <TableCell>{row.menuType === 'group' ? '分组菜单' : '页面菜单'}</TableCell>
                      <TableCell>{row.parentName || '--'}</TableCell>
                      <TableCell className="font-mono text-sm">{row.slug || '--'}</TableCell>
                      <TableCell>{row.iconKey}</TableCell>
                      <TableCell>{formatStatus(row.status)}</TableCell>
                      <TableCell>{row.sort}</TableCell>
                      <TableCell className="font-mono text-sm">{row.permissionCode || '--'}</TableCell>
                      <TableCell>
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
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={TABLE_COLUMN_COUNT} className="h-24 text-center text-muted-foreground">
                      没有匹配的后台菜单数据。
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <ListPagination
            currentPage={normalizedCurrentPage}
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

      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => (!open ? handleCloseCreateDialog() : setIsCreateDialogOpen(true))}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>新增后台菜单</DialogTitle>
            <DialogDescription>维护 admin-front 的菜单分组、页面入口、图标、排序和权限编码。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <div className="text-sm font-medium">菜单类型</div>
                <ModuleSelect
                  value={createDraft.menuType}
                  onValueChange={(value) =>
                    setCreateDraft((currentDraft) => ({
                      ...currentDraft,
                      menuType: value as AdminMenuNodeType,
                      parentId: value === 'group' ? '' : currentDraft.parentId || (groupOptions[0] ? String(groupOptions[0].id) : ''),
                      slug: value === 'group' ? '' : currentDraft.slug,
                      iconKey: value === 'group' ? 'layout-grid' : currentDraft.iconKey,
                    }))
                  }
                  options={[
                    { value: 'group', label: '分组菜单' },
                    { value: 'item', label: '页面菜单' },
                  ]}
                />
              </div>
              <div className="grid gap-2">
                <div className="text-sm font-medium">状态</div>
                <ModuleSelect
                  value={createDraft.status}
                  onValueChange={(value) => setCreateDraft((currentDraft) => ({ ...currentDraft, status: value }))}
                  options={[
                    { value: '1', label: '正常' },
                    { value: '0', label: '冻结' },
                  ]}
                />
              </div>
            </div>

            {createDraft.menuType === 'item' ? (
              <div className="grid gap-2">
                <div className="text-sm font-medium">父级分组</div>
                <ModuleSelect
                  value={createDraft.parentId}
                  onValueChange={(value) => setCreateDraft((currentDraft) => ({ ...currentDraft, parentId: value }))}
                  options={groupOptions.map((group) => ({
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
                  value={createDraft.name}
                  onChange={(event) => setCreateDraft((currentDraft) => ({ ...currentDraft, name: event.target.value }))}
                  placeholder="请输入菜单名称"
                />
              </div>
              <div className="grid gap-2">
                <div className="text-sm font-medium">菜单简称</div>
                <Input
                  value={createDraft.shortTitle}
                  onChange={(event) => setCreateDraft((currentDraft) => ({ ...currentDraft, shortTitle: event.target.value }))}
                  placeholder="请输入菜单简称"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <div className="text-sm font-medium">图标标识</div>
                <ModuleSelect
                  value={createDraft.iconKey}
                  onValueChange={(value) => setCreateDraft((currentDraft) => ({ ...currentDraft, iconKey: value }))}
                  options={ADMIN_MENU_ICON_OPTIONS.map((option) => ({
                    value: option.value,
                    label: option.label,
                  }))}
                />
              </div>
              <div className="grid gap-2">
                <div className="text-sm font-medium">排序值</div>
                <Input
                  value={createDraft.sort}
                  onChange={(event) => setCreateDraft((currentDraft) => ({ ...currentDraft, sort: event.target.value }))}
                  placeholder="留空默认追加到末尾"
                />
              </div>
            </div>

            {createDraft.menuType === 'item' ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <div className="text-sm font-medium">路由标识</div>
                  <Input
                    value={createDraft.slug}
                    onChange={(event) => setCreateDraft((currentDraft) => ({ ...currentDraft, slug: event.target.value }))}
                    placeholder="例如 reports-center"
                  />
                </div>
                <div className="grid gap-2">
                  <div className="text-sm font-medium">权限编码</div>
                  <Input
                    value={createDraft.permissionCode}
                    onChange={(event) =>
                      setCreateDraft((currentDraft) => ({ ...currentDraft, permissionCode: event.target.value }))
                    }
                    placeholder="例如 admin-console.menu.reports.view"
                  />
                </div>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <div className="text-sm font-medium">菜单说明</div>
                <Input
                  value={createDraft.description}
                  onChange={(event) => setCreateDraft((currentDraft) => ({ ...currentDraft, description: event.target.value }))}
                  placeholder="请输入菜单说明"
                />
              </div>
              <div className="grid gap-2">
                <div className="text-sm font-medium">角标文案</div>
                <Input
                  value={createDraft.badge}
                  onChange={(event) => setCreateDraft((currentDraft) => ({ ...currentDraft, badge: event.target.value }))}
                  placeholder="例如 Beta"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <div className="text-sm font-medium">备注</div>
              <Input
                value={createDraft.remark}
                onChange={(event) => setCreateDraft((currentDraft) => ({ ...currentDraft, remark: event.target.value }))}
                placeholder="请输入备注"
              />
            </div>
          </div>
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
            <DialogDescription>支持调整分组、菜单名称、图标、状态、排序和权限编码。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <div className="text-sm font-medium">菜单类型</div>
                <ModuleSelect
                  value={editingDraft.menuType}
                  onValueChange={(value) =>
                    setEditingDraft((currentDraft) => ({
                      ...currentDraft,
                      menuType: value as AdminMenuNodeType,
                      parentId: value === 'group' ? '' : currentDraft.parentId || (groupOptions[0] ? String(groupOptions[0].id) : ''),
                      slug: value === 'group' ? '' : currentDraft.slug,
                      iconKey: value === 'group' ? 'layout-grid' : currentDraft.iconKey,
                    }))
                  }
                  options={[
                    { value: 'group', label: '分组菜单' },
                    { value: 'item', label: '页面菜单' },
                  ]}
                />
              </div>
              <div className="grid gap-2">
                <div className="text-sm font-medium">状态</div>
                <ModuleSelect
                  value={editingDraft.status}
                  onValueChange={(value) => setEditingDraft((currentDraft) => ({ ...currentDraft, status: value }))}
                  options={[
                    { value: '1', label: '正常' },
                    { value: '0', label: '冻结' },
                  ]}
                />
              </div>
            </div>

            {editingDraft.menuType === 'item' ? (
              <div className="grid gap-2">
                <div className="text-sm font-medium">父级分组</div>
                <ModuleSelect
                  value={editingDraft.parentId}
                  onValueChange={(value) => setEditingDraft((currentDraft) => ({ ...currentDraft, parentId: value }))}
                  options={groupOptions
                    .filter((group) => group.id !== editingMenu?.id)
                    .map((group) => ({
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
                  value={editingDraft.name}
                  onChange={(event) => setEditingDraft((currentDraft) => ({ ...currentDraft, name: event.target.value }))}
                  placeholder="请输入菜单名称"
                />
              </div>
              <div className="grid gap-2">
                <div className="text-sm font-medium">菜单简称</div>
                <Input
                  value={editingDraft.shortTitle}
                  onChange={(event) => setEditingDraft((currentDraft) => ({ ...currentDraft, shortTitle: event.target.value }))}
                  placeholder="请输入菜单简称"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <div className="text-sm font-medium">图标标识</div>
                <ModuleSelect
                  value={editingDraft.iconKey}
                  onValueChange={(value) => setEditingDraft((currentDraft) => ({ ...currentDraft, iconKey: value }))}
                  options={ADMIN_MENU_ICON_OPTIONS.map((option) => ({
                    value: option.value,
                    label: option.label,
                  }))}
                />
              </div>
              <div className="grid gap-2">
                <div className="text-sm font-medium">排序值</div>
                <Input
                  value={editingDraft.sort}
                  onChange={(event) => setEditingDraft((currentDraft) => ({ ...currentDraft, sort: event.target.value }))}
                  placeholder="请输入排序值"
                />
              </div>
            </div>

            {editingDraft.menuType === 'item' ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <div className="text-sm font-medium">路由标识</div>
                  <Input
                    value={editingDraft.slug}
                    onChange={(event) => setEditingDraft((currentDraft) => ({ ...currentDraft, slug: event.target.value }))}
                    placeholder="例如 reports-center"
                  />
                </div>
                <div className="grid gap-2">
                  <div className="text-sm font-medium">权限编码</div>
                  <Input
                    value={editingDraft.permissionCode}
                    onChange={(event) =>
                      setEditingDraft((currentDraft) => ({ ...currentDraft, permissionCode: event.target.value }))
                    }
                    placeholder="例如 admin-console.menu.reports.view"
                  />
                </div>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <div className="text-sm font-medium">菜单说明</div>
                <Input
                  value={editingDraft.description}
                  onChange={(event) => setEditingDraft((currentDraft) => ({ ...currentDraft, description: event.target.value }))}
                  placeholder="请输入菜单说明"
                />
              </div>
              <div className="grid gap-2">
                <div className="text-sm font-medium">角标文案</div>
                <Input
                  value={editingDraft.badge}
                  onChange={(event) => setEditingDraft((currentDraft) => ({ ...currentDraft, badge: event.target.value }))}
                  placeholder="例如 Beta"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <div className="text-sm font-medium">备注</div>
              <Input
                value={editingDraft.remark}
                onChange={(event) => setEditingDraft((currentDraft) => ({ ...currentDraft, remark: event.target.value }))}
                placeholder="请输入备注"
              />
            </div>
          </div>
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
              {deletingMenu ? `确认删除菜单“${deletingMenu.name}”吗？若为分组菜单，将同时删除其下级菜单。` : ''}
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
