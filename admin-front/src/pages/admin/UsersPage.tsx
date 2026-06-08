import { useEffect, useMemo, useState } from 'react'
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
import { MultiSelect, type MultiSelectOption } from '@super-pro/shared-ui'
import {
  getUserProjectPermissions,
  getAuthorizationRoles,
  type AuthorizationUserProjectPermissionResponseDto,
  type AuthorizationRoleResponseDto,
} from '@/api/modules/authorization'
import {
  createUser,
  deleteUser,
  getUsers,
  type CreateUserRequestDto,
  type UpdateUserRequestDto,
  updateUser,
  type UserResponseDto,
} from '@/api/modules/users'
import {
  ADMIN_PAGE_FILL_CARD_CLASS,
  ADMIN_PAGE_FILL_LAYOUT_CLASS,
  DEFAULT_PAGE_SIZE,
  ListPagination,
  type LoadState,
  ModuleSelect,
  formatStatus,
} from './module-page-shared'

type UserFilters = {
  keyword: string
  role: string
  status: string
}

type UserFormState = {
  username: string
  nickname: string
  phone: string
  roleIds: number[]
  status: number
}

type EditableUserFormState = Omit<UserFormState, 'username'> & {
  password: string
}

const TABLE_COLUMN_COUNT = 5

function buildUserFormState(): UserFormState {
  return {
    username: '',
    nickname: '',
    phone: '',
    roleIds: [],
    status: 1,
  }
}

function buildEditableUserFormState(): EditableUserFormState {
  return {
    nickname: '',
    phone: '',
    roleIds: [],
    status: 1,
    password: '',
  }
}

/*
function formatAssignedRoleNames(user: UserResponseDto) {
  const roleNames = (user.assignedRoles ?? [])
    .map((role) => role.name.trim())
    .filter(Boolean)

  return roleNames.length > 0 ? roleNames.join(' / ') : '未分配角色'
}

*/
function formatAssignedRoleNames(user: UserResponseDto) {
  const roleNames = (user.assignedRoles ?? [])
    .map((role) => role.name.trim())
    .filter(Boolean)

  return roleNames.length > 0 ? roleNames.join(' / ') : '\u672a\u5206\u914d\u89d2\u8272'
}

export function UsersPage() {
  const [userRows, setUserRows] = useState<UserResponseDto[]>([])
  const [totalUsers, setTotalUsers] = useState(0)
  const [loadState, setLoadState] = useState<LoadState>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [roleOptions, setRoleOptions] = useState<AuthorizationRoleResponseDto[]>([])
  const [roleLoadState, setRoleLoadState] = useState<LoadState>('idle')
  const [roleErrorMessage, setRoleErrorMessage] = useState('')
  const [keyword, setKeyword] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [reloadKey, setReloadKey] = useState(0)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isCreatingUser, setIsCreatingUser] = useState(false)
  const [editingUserId, setEditingUserId] = useState<number | null>(null)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [viewingPermissionUser, setViewingPermissionUser] = useState<UserResponseDto | null>(null)
  const [projectPermissionRows, setProjectPermissionRows] = useState<AuthorizationUserProjectPermissionResponseDto[]>([])
  const [projectPermissionLoadState, setProjectPermissionLoadState] = useState<LoadState>('idle')
  const [projectPermissionErrorMessage, setProjectPermissionErrorMessage] = useState('')
  const [deletingUser, setDeletingUser] = useState<UserResponseDto | null>(null)
  const [isDeletingUser, setIsDeletingUser] = useState(false)
  const [togglingUserId, setTogglingUserId] = useState<number | null>(null)
  const [resettingUserId, setResettingUserId] = useState<number | null>(null)
  const [createDraft, setCreateDraft] = useState<UserFormState>(buildUserFormState())
  const [editingDraft, setEditingDraft] = useState<EditableUserFormState>(buildEditableUserFormState())
  const [appliedFilters, setAppliedFilters] = useState<UserFilters>({
    keyword: '',
    role: 'all',
    status: 'all',
  })

  function buildUserListQuery(filters: UserFilters, page: number, nextPageSize: number) {
    return {
      ...(filters.keyword.trim() ? { keyword: filters.keyword.trim() } : {}),
      ...(filters.role !== 'all' ? { roleId: Number(filters.role) } : {}),
      ...(filters.status !== 'all' ? { status: Number(filters.status) } : {}),
      page,
      pageSize: nextPageSize,
    }
  }

  async function loadUsers() {
    setLoadState('loading')
    setErrorMessage('')

    try {
      const result = await getUsers(buildUserListQuery(appliedFilters, currentPage, pageSize))
      setUserRows(result.items)
      setTotalUsers(result.total)

      if (result.page !== currentPage) {
        setCurrentPage(result.page)
      }

      setLoadState('success')
    } catch (error) {
      setUserRows([])
      setTotalUsers(0)
      setLoadState('error')
      setErrorMessage(error instanceof Error ? error.message : '加载用户列表失败，请稍后重试。')
    }
  }

  async function loadRoleOptions() {
    setRoleLoadState('loading')
    setRoleErrorMessage('')

    try {
      const result = await getAuthorizationRoles()
      setRoleOptions(result.items)
      setRoleLoadState('success')
    } catch (error) {
      setRoleOptions([])
      setRoleLoadState('error')
      setRoleErrorMessage(error instanceof Error ? error.message : '加载角色列表失败，请稍后重试。')
    }
  }

  useEffect(() => {
    void loadUsers()
  }, [appliedFilters, currentPage, pageSize, reloadKey])

  useEffect(() => {
    void loadRoleOptions()
  }, [])

  const totalPages = Math.max(1, Math.ceil(totalUsers / pageSize))
  const isEditDialogOpen = editingUserId !== null
  const isProjectPermissionDialogOpen = viewingPermissionUser !== null
  const canCreateUser = createDraft.username.trim().length > 0 && createDraft.nickname.trim().length > 0
  const canSaveEditingUser = editingDraft.nickname.trim().length > 0
  const roleSelectOptions = useMemo<MultiSelectOption[]>(
    () =>
      roleOptions.map((role) => ({
        value: String(role.id),
        label: role.name,
        description: role.code,
        keywords: `${role.name} ${role.code} ${role.description ?? ''}`,
      })),
    [roleOptions],
  )

  function handleCloseCreateDialog() {
    setIsCreateDialogOpen(false)
    setCreateDraft(buildUserFormState())
  }

  function handleEditUser(user: UserResponseDto) {
    setEditingUserId(user.id)
    setEditingDraft({
      nickname: user.nickname,
      phone: user.phone,
      roleIds: (user.assignedRoles ?? []).map((role) => role.id),
      status: user.status,
      password: '',
    })
  }

  function handleCloseEditDialog() {
    setEditingUserId(null)
    setEditingDraft(buildEditableUserFormState())
  }

  function handleCloseProjectPermissionDialog() {
    setViewingPermissionUser(null)
    setProjectPermissionRows([])
    setProjectPermissionLoadState('idle')
    setProjectPermissionErrorMessage('')
  }

  async function handleOpenProjectPermissionDialog(user: UserResponseDto) {
    setViewingPermissionUser(user)
    setProjectPermissionRows([])
    setProjectPermissionLoadState('loading')
    setProjectPermissionErrorMessage('')

    try {
      const result = await getUserProjectPermissions(user.id)
      setProjectPermissionRows(result.items)
      setProjectPermissionLoadState('success')
    } catch (error) {
      setProjectPermissionRows([])
      setProjectPermissionLoadState('error')
      setProjectPermissionErrorMessage(
        error instanceof Error ? error.message : '获取用户项目权限失败，请稍后重试。',
      )
    }
  }

  async function handleCreateUser() {
    if (!canCreateUser || isCreatingUser) {
      return
    }

    setIsCreatingUser(true)

    try {
      await createUser({
        username: createDraft.username.trim(),
        nickname: createDraft.nickname.trim(),
        phone: createDraft.phone.trim(),
        assignedRoleIds: createDraft.roleIds,
        status: createDraft.status,
      } satisfies CreateUserRequestDto)

      toast.success('用户已新增')
      handleCloseCreateDialog()
      setCurrentPage(1)
      setReloadKey((currentValue) => currentValue + 1)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '新增用户失败，请稍后重试。')
    } finally {
      setIsCreatingUser(false)
    }
  }

  async function handleSaveEditingUser() {
    if (!editingUserId || !canSaveEditingUser || isSavingEdit) {
      return
    }

    setIsSavingEdit(true)

    try {
      await updateUser(editingUserId, {
        nickname: editingDraft.nickname.trim(),
        phone: editingDraft.phone.trim(),
        assignedRoleIds: editingDraft.roleIds,
        status: editingDraft.status,
        ...(editingDraft.password.trim() ? { password: editingDraft.password.trim() } : {}),
      } satisfies UpdateUserRequestDto)

      toast.success('用户信息已更新')
      handleCloseEditDialog()
      setReloadKey((currentValue) => currentValue + 1)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '更新用户失败，请稍后重试。')
    } finally {
      setIsSavingEdit(false)
    }
  }

  async function handleResetPassword(user: UserResponseDto) {
    if (resettingUserId !== null) {
      return
    }

    setResettingUserId(user.id)

    try {
      await updateUser(user.id, {
        password: '123456',
      } satisfies UpdateUserRequestDto)
      toast.success('密码已重置为 123456')
      setReloadKey((currentValue) => currentValue + 1)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '重置密码失败，请稍后重试。')
    } finally {
      setResettingUserId(null)
    }
  }

  async function handleDeleteUser() {
    if (!deletingUser || isDeletingUser) {
      return
    }

    setIsDeletingUser(true)

    try {
      await deleteUser(deletingUser.id)
      toast.success('用户已删除')
      setDeletingUser(null)

      if (currentPage > 1 && userRows.length === 1) {
        setCurrentPage(currentPage - 1)
      } else {
        setReloadKey((currentValue) => currentValue + 1)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除用户失败，请稍后重试。')
    } finally {
      setIsDeletingUser(false)
    }
  }

  async function handleStatusSwitchChange(user: UserResponseDto, checked: boolean) {
    if (togglingUserId !== null) {
      return
    }

    setTogglingUserId(user.id)

    try {
      const updated = await updateUser(user.id, {
        status: checked ? 1 : 0,
      } satisfies UpdateUserRequestDto)
      toast.success(`用户状态已切换为${formatStatus(updated.status)}`)
      setReloadKey((currentValue) => currentValue + 1)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '切换用户状态失败，请稍后重试。')
    } finally {
      setTogglingUserId(null)
    }
  }

  return (
    <section className={ADMIN_PAGE_FILL_LAYOUT_CLASS}>
      <Card className="shrink-0 border border-border/70 bg-card/95 shadow-sm">
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.6fr)_minmax(11rem,0.7fr)_minmax(11rem,0.7fr)_auto_auto_auto]">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索用户姓名或手机号"
              className="h-9 pl-9"
            />
          </div>
          <ModuleSelect
            value={roleFilter}
            onValueChange={setRoleFilter}
            options={[
              { value: 'all', label: '全部角色' },
              ...roleOptions.map((role) => ({
                value: String(role.id),
                label: role.name,
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
                role: roleFilter,
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
              const nextFilters = { keyword: '', role: 'all', status: 'all' }
              setKeyword('')
              setRoleFilter('all')
              setStatusFilter('all')
              setCurrentPage(1)
              setAppliedFilters(nextFilters)
              setReloadKey((currentValue) => currentValue + 1)
            }}
          >
            <RotateCcwIcon data-icon="inline-start" />
            重置
          </Button>
          <Button type="button" className="h-9" onClick={() => setIsCreateDialogOpen(true)}>
            <PlusIcon data-icon="inline-start" />
            新增用户
          </Button>
        </CardContent>
      </Card>

      <Card className={ADMIN_PAGE_FILL_CARD_CLASS}>
        <CardContent className="flex h-full min-h-0 flex-col gap-4">
          <div className="min-h-0 flex-1 overflow-auto">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>用户姓名</TableHead>
                <TableHead>手机号</TableHead>
                <TableHead>角色</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="w-[14rem]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadState === 'loading' ? (
                <TableRow>
                  <TableCell colSpan={TABLE_COLUMN_COUNT} className="h-24 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Spinner className="size-4" />
                      <span>正在加载用户列表...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : loadState === 'error' ? (
                <TableRow>
                  <TableCell colSpan={TABLE_COLUMN_COUNT} className="h-24 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <span>{errorMessage || '加载用户列表失败，请稍后重试。'}</span>
                      <Button type="button" variant="outline" size="sm" onClick={() => void loadUsers()}>
                        重试
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : userRows.length > 0 ? (
                userRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.nickname.trim() || row.username}</TableCell>
                    <TableCell>{row.phone}</TableCell>
                    <TableCell>{formatAssignedRoleNames(row)}</TableCell>
                    <TableCell>
                      <div className="flex min-w-[7rem] items-center gap-2">
                        <Switch
                          checked={row.status === 1}
                          disabled={togglingUserId === row.id || resettingUserId === row.id}
                          onCheckedChange={(checked) => void handleStatusSwitchChange(row, checked)}
                          aria-label={`${row.nickname.trim() || row.username}状态开关`}
                        />
                        <span className="text-sm text-muted-foreground">{formatStatus(row.status)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-nowrap items-center gap-2 whitespace-nowrap">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={togglingUserId === row.id || resettingUserId === row.id}
                          onClick={() => void handleOpenProjectPermissionDialog(row)}
                        >
                          查看权限
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={togglingUserId === row.id || resettingUserId === row.id}
                          onClick={() => handleEditUser(row)}
                        >
                          修改
                        </Button>
                        {row.status === 1 ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={togglingUserId === row.id || resettingUserId === row.id}
                            onClick={() => void handleResetPassword(row)}
                          >
                            {resettingUserId === row.id ? '重置中...' : '重置密码'}
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={togglingUserId === row.id || resettingUserId === row.id}
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeletingUser(row)}
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
                    没有匹配的用户数据。
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            </Table>
          </div>

          <ListPagination
            currentPage={currentPage}
            totalPages={totalPages}
            total={totalUsers}
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
            <DialogTitle>新增用户</DialogTitle>
            <DialogDescription>填写基础信息后创建后台用户。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <div className="text-sm font-medium">账号</div>
              <Input
                value={createDraft.username}
                onChange={(event) => setCreateDraft((currentDraft) => ({ ...currentDraft, username: event.target.value }))}
                placeholder="请输入账号"
              />
            </div>
            <div className="grid gap-2">
              <div className="text-sm font-medium">用户姓名</div>
              <Input
                value={createDraft.nickname}
                onChange={(event) => setCreateDraft((currentDraft) => ({ ...currentDraft, nickname: event.target.value }))}
                placeholder="请输入用户姓名"
              />
            </div>
            <div className="grid gap-2">
              <div className="text-sm font-medium">手机号</div>
              <Input
                value={createDraft.phone}
                onChange={(event) => setCreateDraft((currentDraft) => ({ ...currentDraft, phone: event.target.value }))}
                placeholder="请输入手机号"
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium">角色</div>
                  <span className="text-xs text-muted-foreground">已选 {createDraft.roleIds.length} 个</span>
                </div>
                <MultiSelect
                  options={roleSelectOptions}
                  value={createDraft.roleIds.map(String)}
                  disabled={isCreatingUser}
                  loading={roleLoadState === 'loading'}
                  errorText={roleLoadState === 'error' ? roleErrorMessage || '加载角色列表失败，请稍后重试。' : undefined}
                  onRetry={() => void loadRoleOptions()}
                  placeholder="请选择角色"
                  searchPlaceholder="搜索角色名称或编码"
                  emptyText="没有匹配的角色。"
                  noOptionsText="当前暂无可分配角色。"
                  loadingText="正在加载角色列表..."
                  clearText="清空"
                  countText={(selectedCount, totalCount) => `共 ${totalCount} 个角色，已选 ${selectedCount} 个`}
                  renderValue={(selectedOptions) => {
                    if (selectedOptions.length === 0) {
                      return '请选择角色'
                    }

                    if (selectedOptions.length > 2) {
                      return `已选 ${selectedOptions.length} 个角色`
                    }

                    return selectedOptions.map((option) => option.label).join(' / ')
                  }}
                  onValueChange={(roleIds) =>
                    setCreateDraft((currentDraft) => ({
                      ...currentDraft,
                      roleIds: roleIds.map((roleId) => Number(roleId)),
                    }))
                  }
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
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCloseCreateDialog}>
              取消
            </Button>
            <Button type="button" onClick={() => void handleCreateUser()} disabled={!canCreateUser || isCreatingUser}>
              {isCreatingUser ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={(open) => (!open ? handleCloseEditDialog() : null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>修改用户</DialogTitle>
            <DialogDescription>调整用户姓名、手机号、角色、状态和密码。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <div className="text-sm font-medium">用户姓名</div>
              <Input
                value={editingDraft.nickname}
                onChange={(event) => setEditingDraft((currentDraft) => ({ ...currentDraft, nickname: event.target.value }))}
                placeholder="请输入用户姓名"
              />
            </div>
            <div className="grid gap-2">
              <div className="text-sm font-medium">手机号</div>
              <Input
                value={editingDraft.phone}
                onChange={(event) => setEditingDraft((currentDraft) => ({ ...currentDraft, phone: event.target.value }))}
                placeholder="请输入手机号"
              />
            </div>
            <div className="grid gap-2">
              <div className="text-sm font-medium">密码</div>
              <Input
                type="password"
                value={editingDraft.password}
                onChange={(event) => setEditingDraft((currentDraft) => ({ ...currentDraft, password: event.target.value }))}
                placeholder="不修改密码可留空"
                minLength={6}
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium">角色</div>
                  <span className="text-xs text-muted-foreground">已选 {editingDraft.roleIds.length} 个</span>
                </div>
                <MultiSelect
                  options={roleSelectOptions}
                  value={editingDraft.roleIds.map(String)}
                  disabled={isSavingEdit}
                  loading={roleLoadState === 'loading'}
                  errorText={roleLoadState === 'error' ? roleErrorMessage || '加载角色列表失败，请稍后重试。' : undefined}
                  onRetry={() => void loadRoleOptions()}
                  placeholder="请选择角色"
                  searchPlaceholder="搜索角色名称或编码"
                  emptyText="没有匹配的角色。"
                  noOptionsText="当前暂无可分配角色。"
                  loadingText="正在加载角色列表..."
                  clearText="清空"
                  countText={(selectedCount, totalCount) => `共 ${totalCount} 个角色，已选 ${selectedCount} 个`}
                  renderValue={(selectedOptions) => {
                    if (selectedOptions.length === 0) {
                      return '请选择角色'
                    }

                    if (selectedOptions.length > 2) {
                      return `已选 ${selectedOptions.length} 个角色`
                    }

                    return selectedOptions.map((option) => option.label).join(' / ')
                  }}
                  onValueChange={(roleIds) =>
                    setEditingDraft((currentDraft) => ({
                      ...currentDraft,
                      roleIds: roleIds.map((roleId) => Number(roleId)),
                    }))
                  }
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
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCloseEditDialog}>
              取消
            </Button>
            <Button type="button" onClick={() => void handleSaveEditingUser()} disabled={!canSaveEditingUser || isSavingEdit}>
              {isSavingEdit ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isProjectPermissionDialogOpen}
        onOpenChange={(open) => (!open ? handleCloseProjectPermissionDialog() : null)}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>查看权限</DialogTitle>
              {/*
                ? `查看 ${viewingPermissionUser.nickname.trim() || viewingPermissionUser.username} 拥有的项目权限`
                : '查看用户拥有的项目权限'}
              */}
          </DialogHeader>

          {projectPermissionLoadState === 'loading' ? (
            <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Spinner className="size-4" />
              <span>正在加载项目权限...</span>
            </div>
          ) : projectPermissionLoadState === 'error' ? (
            <div className="flex min-h-40 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
              <span>{projectPermissionErrorMessage || '获取用户项目权限失败，请稍后重试。'}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  viewingPermissionUser
                    ? void handleOpenProjectPermissionDialog(viewingPermissionUser)
                    : undefined
                }
              >
                重试
              </Button>
            </div>
          ) : projectPermissionRows.length === 0 ? (
            <div className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">
              当前用户未分配任何项目权限。
            </div>
          ) : (
            <ScrollArea className="max-h-[65vh] pr-4">
              <div className="grid gap-3">
                {projectPermissionRows.map((project) => (
                  <Card key={project.projectCode} className="border border-border/70 bg-muted/20 shadow-none">
                    <CardContent className="space-y-3 p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1">
                          <div className="text-sm font-medium">{project.projectName}</div>
                          <div className="text-xs text-muted-foreground">{project.projectCode}</div>
                        </div>
                        <Badge variant="secondary">{project.permissions.length} 项权限</Badge>
                      </div>

                      <div className="space-y-2">
                        <div className="text-xs font-medium text-muted-foreground">关联角色</div>
                        <div className="flex flex-wrap gap-2">
                          {project.roles.map((role) => (
                            <Badge key={`${project.projectCode}-${role.id}`} variant="outline">
                              {role.name}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="text-xs font-medium text-muted-foreground">权限明细</div>
                        <div className="flex flex-wrap gap-2">
                          {project.permissions.map((permission) => (
                            <Badge key={permission.id} variant="secondary" className="max-w-full">
                              {permission.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCloseProjectPermissionDialog}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deletingUser !== null} onOpenChange={(open) => (!open ? setDeletingUser(null) : null)}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>删除用户</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingUser ? `确认删除用户“${deletingUser.nickname.trim() || deletingUser.username}”吗？删除后当前列表将立即更新。` : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingUser}>取消</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void handleDeleteUser()}>
              {isDeletingUser ? '删除中...' : '删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
