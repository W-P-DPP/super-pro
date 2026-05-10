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
  createUser,
  deleteUser,
  getUsers,
  type CreateUserRequestDto,
  type UpdateUserRequestDto,
  updateUser,
  UserRoleEnum,
  type UserResponseDto,
} from '@/api/modules/users'
import {
  DEFAULT_PAGE_SIZE,
  ListPagination,
  type LoadState,
  ModuleSelect,
  formatStatus,
  formatUserRole,
  USER_ROLE_OPTIONS,
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
  role: UserRoleEnum
  status: number
}

type EditableUserFormState = Omit<UserFormState, 'username'> & {
  password: string
}

const TABLE_COLUMN_COUNT = 5

export function UsersPage() {
  const [userRows, setUserRows] = useState<UserResponseDto[]>([])
  const [totalUsers, setTotalUsers] = useState(0)
  const [loadState, setLoadState] = useState<LoadState>('idle')
  const [errorMessage, setErrorMessage] = useState('')
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
  const [deletingUser, setDeletingUser] = useState<UserResponseDto | null>(null)
  const [isDeletingUser, setIsDeletingUser] = useState(false)
  const [togglingUserId, setTogglingUserId] = useState<number | null>(null)
  const [resettingUserId, setResettingUserId] = useState<number | null>(null)
  const [createDraft, setCreateDraft] = useState<UserFormState>({
    username: '',
    nickname: '',
    phone: '',
    role: UserRoleEnum.Employee,
    status: 1,
  })
  const [editingDraft, setEditingDraft] = useState<EditableUserFormState>({
    nickname: '',
    phone: '',
    role: UserRoleEnum.Employee,
    status: 1,
    password: '',
  })
  const [appliedFilters, setAppliedFilters] = useState<UserFilters>({
    keyword: '',
    role: 'all',
    status: 'all',
  })

  function buildUserListQuery(filters: UserFilters, page: number, nextPageSize: number) {
    return {
      ...(filters.keyword.trim() ? { keyword: filters.keyword.trim() } : {}),
      ...(filters.role !== 'all' ? { role: filters.role as UserRoleEnum } : {}),
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

  useEffect(() => {
    void loadUsers()
  }, [appliedFilters, currentPage, pageSize, reloadKey])

  const totalPages = Math.max(1, Math.ceil(totalUsers / pageSize))
  const isEditDialogOpen = editingUserId !== null
  const canCreateUser = createDraft.username.trim().length > 0 && createDraft.nickname.trim().length > 0
  const canSaveEditingUser = editingDraft.nickname.trim().length > 0

  function handleCloseCreateDialog() {
    setIsCreateDialogOpen(false)
    setCreateDraft({
      username: '',
      nickname: '',
      phone: '',
      role: UserRoleEnum.Employee,
      status: 1,
    })
  }

  function handleEditUser(user: UserResponseDto) {
    setEditingUserId(user.id)
    setEditingDraft({
      nickname: user.nickname,
      phone: user.phone,
      role: user.role,
      status: user.status,
      password: '',
    })
  }

  function handleCloseEditDialog() {
    setEditingUserId(null)
    setEditingDraft({
      nickname: '',
      phone: '',
      role: UserRoleEnum.Employee,
      status: 1,
      password: '',
    })
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
        role: createDraft.role,
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
        role: editingDraft.role,
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
    <section className="mx-auto flex w-full max-w-[var(--app-shell-page-width)] flex-col gap-4 px-4 py-4 md:px-6 md:py-6">
      <Card className="border border-border/70 bg-card/95 shadow-sm">
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
              ...USER_ROLE_OPTIONS.map((role) => ({
                value: role,
                label: formatUserRole(role),
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

      <Card className="border border-border/70 bg-card/95 shadow-sm">
        <CardContent className="space-y-4">
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
                    <TableCell>{formatUserRole(row.role)}</TableCell>
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
        <DialogContent className="sm:max-w-md">
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
                <div className="text-sm font-medium">角色</div>
                <ModuleSelect
                  value={createDraft.role}
                  onValueChange={(value) =>
                    setCreateDraft((currentDraft) => ({
                      ...currentDraft,
                      role: value as UserRoleEnum,
                    }))
                  }
                  options={USER_ROLE_OPTIONS.map((role) => ({
                    value: role,
                    label: formatUserRole(role),
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
        <DialogContent className="sm:max-w-md">
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
                <div className="text-sm font-medium">角色</div>
                <ModuleSelect
                  value={editingDraft.role}
                  onValueChange={(value) =>
                    setEditingDraft((currentDraft) => ({
                      ...currentDraft,
                      role: value as UserRoleEnum,
                    }))
                  }
                  options={USER_ROLE_OPTIONS.map((role) => ({
                    value: role,
                    label: formatUserRole(role),
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
