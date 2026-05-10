import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  LayoutGridIcon,
  PlusIcon,
  RotateCcwIcon,
  SearchIcon,
  SparklesIcon,
} from 'lucide-react'
import { Navigate, useParams } from 'react-router-dom'
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
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  NativeSelect,
  NativeSelectOption,
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
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
  createUser as createUserRequest,
  deleteUser as deleteUserRequest,
  getUsers,
  type CreateUserRequestDto,
  type UpdateUserRequestDto,
  updateUser as updateUserRequest,
  UserRoleEnum,
  type UserResponseDto,
} from '@/api/modules/users'
import { adminModules, getAdminModuleBySlug, type AdminModule } from '@/data/admin-navigation'

const DEFAULT_USERS_PAGE_SIZE = 10
const USER_PAGE_SIZE_OPTIONS = [10, 20, 50]
const USER_ROLE_OPTIONS = [
  UserRoleEnum.Admin,
  UserRoleEnum.Employee,
  UserRoleEnum.Approver,
  UserRoleEnum.Guest,
] as const
const USER_ROLE_LABELS: Record<UserRoleEnum, string> = {
  [UserRoleEnum.Admin]: '管理员',
  [UserRoleEnum.Employee]: '员工',
  [UserRoleEnum.Approver]: '审批人',
  [UserRoleEnum.Guest]: '访客',
}
const USER_STATUS_LABELS: Record<number, string> = {
  0: '冻结',
  1: '正常',
}

type LoadState = 'idle' | 'loading' | 'success' | 'error'

function buildPaginationItems(currentPage: number, totalPages: number) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, 'end-ellipsis', totalPages] as const
  }

  if (currentPage >= totalPages - 2) {
    return [1, 'start-ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages] as const
  }

  return [
    1,
    'start-ellipsis',
    currentPage - 1,
    currentPage,
    currentPage + 1,
    'end-ellipsis',
    totalPages,
  ] as const
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card className="border border-border/70 bg-card/90 shadow-sm">
      <CardHeader className="gap-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl font-semibold tracking-tight">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  )
}

function formatUserRole(role: UserRoleEnum) {
  return USER_ROLE_LABELS[role] ?? role
}

function formatUserStatus(status: number) {
  return USER_STATUS_LABELS[status] ?? `状态 ${status}`
}

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

function UsersModuleContent({ module }: { module: AdminModule }) {
  const [userRows, setUserRows] = useState<UserResponseDto[]>([])
  const [totalUsers, setTotalUsers] = useState(0)
  const [loadState, setLoadState] = useState<LoadState>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [keyword, setKeyword] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_USERS_PAGE_SIZE)
  const [reloadKey, setReloadKey] = useState(0)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [createDraft, setCreateDraft] = useState<UserFormState>({
    username: '',
    nickname: '',
    phone: '',
    role: UserRoleEnum.Employee,
    status: 1,
  })
  const [isCreatingUser, setIsCreatingUser] = useState(false)
  const [editingUserId, setEditingUserId] = useState<number | null>(null)
  const [editingDraft, setEditingDraft] = useState<Omit<UserFormState, 'username'>>({
    nickname: '',
    phone: '',
    role: UserRoleEnum.Employee,
    status: 1,
  })
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [deletingUser, setDeletingUser] = useState<UserResponseDto | null>(null)
  const [isDeletingUser, setIsDeletingUser] = useState(false)
  const [togglingUserId, setTogglingUserId] = useState<number | null>(null)
  const [appliedFilters, setAppliedFilters] = useState({
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
      const message = error instanceof Error ? error.message : '加载用户列表失败，请稍后重试。'
      setErrorMessage(message)
      setUserRows([])
      setTotalUsers(0)
      setLoadState('error')
    }
  }

  useEffect(() => {
    void loadUsers()
  }, [appliedFilters, currentPage, pageSize, reloadKey])

  const totalPages = Math.max(1, Math.ceil(totalUsers / pageSize))
  const paginationItems = useMemo(() => buildPaginationItems(currentPage, totalPages), [currentPage, totalPages])
  const isEditDialogOpen = editingUserId !== null
  const canCreateUser =
    createDraft.username.trim().length > 0 && createDraft.nickname.trim().length > 0
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
    })
  }

  function handleCloseEditDialog() {
    setEditingUserId(null)
    setEditingDraft({
      nickname: '',
      phone: '',
      role: UserRoleEnum.Employee,
      status: 1,
    })
  }

  async function handleCreateUser() {
    if (!canCreateUser || isCreatingUser) {
      return
    }

    setIsCreatingUser(true)

    try {
      await createUserRequest({
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
      await updateUserRequest(editingUserId, {
        nickname: editingDraft.nickname.trim(),
        phone: editingDraft.phone.trim(),
        role: editingDraft.role,
        status: editingDraft.status,
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

  async function handleDeleteUser() {
    if (!deletingUser || isDeletingUser) {
      return
    }

    setIsDeletingUser(true)

    try {
      await deleteUserRequest(deletingUser.id)
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
      const updated = await updateUserRequest(user.id, {
        status: checked ? 1 : 0,
      } satisfies UpdateUserRequestDto)
      toast.success(`用户状态已切换为${formatUserStatus(updated.status)}`)
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
              placeholder="搜索姓名或手机号"
              className="h-9 pl-9"
            />
          </div>
          <NativeSelect
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            className="w-full"
          >
            <NativeSelectOption value="all">全部角色</NativeSelectOption>
            {USER_ROLE_OPTIONS.map((role) => (
              <NativeSelectOption key={role} value={role}>
                {formatUserRole(role)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <NativeSelect
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="w-full"
          >
            <NativeSelectOption value="all">全部状态</NativeSelectOption>
            <NativeSelectOption value="1">正常</NativeSelectOption>
            <NativeSelectOption value="0">冻结</NativeSelectOption>
          </NativeSelect>
          <Button
            type="button"
            className="h-9"
            onClick={() => {
              const nextFilters = {
                keyword,
                role: roleFilter,
                status: statusFilter,
              }

              setCurrentPage(1)
              setAppliedFilters(nextFilters)
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
              const nextFilters = {
                keyword: '',
                role: 'all',
                status: 'all',
              }

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
                {module.table.columns.map((column) => (
                  <TableHead key={column}>{column}</TableHead>
                ))}
                <TableHead className="w-[10rem]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadState === 'loading' ? (
                <TableRow>
                  <TableCell colSpan={module.table.columns.length + 1} className="h-24 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Spinner className="size-4" />
                      <span>正在加载用户列表...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : loadState === 'error' ? (
                <TableRow>
                  <TableCell colSpan={module.table.columns.length + 1} className="h-24 text-center text-muted-foreground">
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
                          disabled={togglingUserId === row.id}
                          onCheckedChange={(checked) => void handleStatusSwitchChange(row, checked)}
                          aria-label={`${row.nickname.trim() || row.username}状态开关`}
                        />
                        <span className="text-sm text-muted-foreground">{formatUserStatus(row.status)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={togglingUserId === row.id}
                          onClick={() => handleEditUser(row)}
                        >
                          修改
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={togglingUserId === row.id}
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
                  <TableCell colSpan={module.table.columns.length + 1} className="h-24 text-center text-muted-foreground">
                    没有匹配的用户数据。
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {loadState === 'success' && totalUsers > 0 ? (
            <div className="flex flex-col gap-3 border-t border-border/70 pt-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center">
                <div>
                  第 {currentPage} / {totalPages} 页，共 {totalUsers} 条
                </div>
                <div className="flex items-center gap-2">
                  <span>每页</span>
                  <NativeSelect
                    value={String(pageSize)}
                    onChange={(event) => {
                      setPageSize(Number(event.target.value))
                      setCurrentPage(1)
                      setReloadKey((currentValue) => currentValue + 1)
                    }}
                    className="w-24"
                  >
                    {USER_PAGE_SIZE_OPTIONS.map((option) => (
                      <NativeSelectOption key={option} value={String(option)}>
                        {option} 条
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </div>
              </div>
              <Pagination className="mx-0 w-auto justify-start md:justify-end">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      text="上一页"
                      aria-disabled={currentPage === 1}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : undefined}
                      onClick={(event) => {
                        event.preventDefault()
                        if (currentPage > 1) {
                          setCurrentPage(currentPage - 1)
                        }
                      }}
                    />
                  </PaginationItem>

                  {paginationItems.map((item) => (
                    <PaginationItem key={item}>
                      {typeof item === 'number' ? (
                        <PaginationLink
                          href="#"
                          isActive={item === currentPage}
                          onClick={(event) => {
                            event.preventDefault()
                            setCurrentPage(item)
                          }}
                        >
                          {item}
                        </PaginationLink>
                      ) : (
                        <PaginationEllipsis />
                      )}
                    </PaginationItem>
                  ))}

                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      text="下一页"
                      aria-disabled={currentPage === totalPages}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : undefined}
                      onClick={(event) => {
                        event.preventDefault()
                        if (currentPage < totalPages) {
                          setCurrentPage(currentPage + 1)
                        }
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          ) : null}
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
                onChange={(event) =>
                  setCreateDraft((currentDraft) => ({ ...currentDraft, username: event.target.value }))
                }
                placeholder="请输入账号"
              />
            </div>
            <div className="grid gap-2">
              <div className="text-sm font-medium">用户姓名</div>
              <Input
                value={createDraft.nickname}
                onChange={(event) =>
                  setCreateDraft((currentDraft) => ({ ...currentDraft, nickname: event.target.value }))
                }
                placeholder="请输入用户姓名"
              />
            </div>
            <div className="grid gap-2">
              <div className="text-sm font-medium">手机号</div>
              <Input
                value={createDraft.phone}
                onChange={(event) =>
                  setCreateDraft((currentDraft) => ({ ...currentDraft, phone: event.target.value }))
                }
                placeholder="请输入手机号"
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <div className="text-sm font-medium">角色</div>
                <NativeSelect
                  value={createDraft.role}
                  onChange={(event) =>
                    setCreateDraft((currentDraft) => ({
                      ...currentDraft,
                      role: event.target.value as UserRoleEnum,
                    }))
                  }
                >
                  {USER_ROLE_OPTIONS.map((role) => (
                    <NativeSelectOption key={role} value={role}>
                      {formatUserRole(role)}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
              <div className="grid gap-2">
                <div className="text-sm font-medium">状态</div>
                <NativeSelect
                  value={String(createDraft.status)}
                  onChange={(event) =>
                    setCreateDraft((currentDraft) => ({
                      ...currentDraft,
                      status: Number(event.target.value),
                    }))
                  }
                >
                  {[1, 0].map((status) => (
                    <NativeSelectOption key={status} value={String(status)}>
                      {formatUserStatus(status)}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
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
            <DialogDescription>调整用户姓名、手机号、角色和状态。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <div className="text-sm font-medium">用户姓名</div>
              <Input
                value={editingDraft.nickname}
                onChange={(event) =>
                  setEditingDraft((currentDraft) => ({ ...currentDraft, nickname: event.target.value }))
                }
                placeholder="请输入用户姓名"
              />
            </div>
            <div className="grid gap-2">
              <div className="text-sm font-medium">手机号</div>
              <Input
                value={editingDraft.phone}
                onChange={(event) =>
                  setEditingDraft((currentDraft) => ({ ...currentDraft, phone: event.target.value }))
                }
                placeholder="请输入手机号"
              />
            </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-2">
                  <div className="text-sm font-medium">角色</div>
                  <NativeSelect
                    value={editingDraft.role}
                    onChange={(event) =>
                      setEditingDraft((currentDraft) => ({
                        ...currentDraft,
                        role: event.target.value as UserRoleEnum,
                      }))
                    }
                  >
                    {USER_ROLE_OPTIONS.map((role) => (
                      <NativeSelectOption key={role} value={role}>
                        {formatUserRole(role)}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </div>
                <div className="grid gap-2">
                  <div className="text-sm font-medium">状态</div>
                  <NativeSelect
                    value={String(editingDraft.status)}
                    onChange={(event) =>
                      setEditingDraft((currentDraft) => ({
                        ...currentDraft,
                        status: Number(event.target.value),
                      }))
                    }
                  >
                    {[1, 0].map((status) => (
                      <NativeSelectOption key={status} value={String(status)}>
                        {formatUserStatus(status)}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </div>
              </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCloseEditDialog}>
              取消
            </Button>
            <Button
              type="button"
              onClick={() => void handleSaveEditingUser()}
              disabled={!canSaveEditingUser || isSavingEdit}
            >
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
              {deletingUser
                ? `确认删除用户“${deletingUser.nickname.trim() || deletingUser.username}”吗？删除后当前列表将立即更新。`
                : ''}
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

export function ModulePage() {
  const { moduleSlug } = useParams()
  const module = getAdminModuleBySlug(moduleSlug)

  if (!module) {
    return <Navigate to="/404" replace />
  }

  if (module.slug === 'users') {
    return <UsersModuleContent module={module} />
  }

  const Icon = module.icon
  const shortcutModules = adminModules.filter((item) => item.slug !== 'dashboard')

  return (
    <section className="mx-auto flex w-full max-w-[var(--app-shell-page-width)] flex-col gap-4 px-4 py-4 md:px-6 md:py-6">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.8fr)]">
        <Card className="border border-border/70 bg-card/95 shadow-sm">
          <CardHeader className="gap-3 border-b border-border/70">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="rounded-full">
                {module.group}
              </Badge>
              {module.badge ? <Badge className="rounded-full">{module.badge}</Badge> : null}
            </div>
            <div className="flex items-start gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-muted/60">
                <Icon className="size-5" />
              </div>
              <div className="min-w-0 space-y-2">
                <CardTitle className="text-2xl font-semibold tracking-tight">{module.title}</CardTitle>
                <CardDescription className="max-w-3xl text-sm leading-6">
                  {module.description}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pt-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              <Button type="button" className="rounded-full px-4">
                <SparklesIcon data-icon="inline-start" />
                {module.primaryAction}
              </Button>
              <Button type="button" variant="outline" className="rounded-full px-4">
                {module.secondaryAction}
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              当前页面为静态后台壳层，可直接替换为真实业务内容。
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/70 bg-card/95 shadow-sm">
          <CardHeader className="border-b border-border/70">
            <CardTitle className="text-base">本页可承接的能力</CardTitle>
            <CardDescription>先把页面层次和信息密度搭好，再逐步接真实接口。</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 pt-4">
            {module.highlights.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-border/70 bg-muted/35 p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium">{item.title}</div>
                  <Badge variant="outline" className="rounded-full">
                    {item.status}
                  </Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {module.metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <Card className="border border-border/70 bg-card/95 shadow-sm">
          <CardHeader className="border-b border-border/70">
            <CardTitle className="text-base">{module.table.title}</CardTitle>
            <CardDescription>{module.table.description}</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  {module.table.columns.map((column) => (
                    <TableHead key={column}>{column}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {module.table.rows.map((row) => (
                  <TableRow key={row.join('-')}>
                    {row.map((cell) => (
                      <TableCell key={cell}>{cell}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border border-border/70 bg-card/95 shadow-sm">
          <CardHeader className="border-b border-border/70">
            <CardTitle className="text-base">页面结构建议</CardTitle>
            <CardDescription>作为后台项目首版，这些区块通常都值得预留。</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 pt-4">
            {[
              '顶部筛选区：查询、状态、时间和快捷操作。',
              '中部主体区：表格、卡片或图表，按业务密度自行切换。',
              '右侧详情层：承接查看、审批、备注、日志等次级信息。',
              '底部反馈区：加载、空态、错误、成功提示与导出任务状态。',
            ].map((line) => (
              <div key={line} className="flex gap-3 rounded-xl border border-border/70 bg-muted/35 p-3">
                <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <p className="text-sm leading-6 text-muted-foreground">{line}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {module.slug === 'dashboard' ? (
        <Card className="border border-border/70 bg-card/95 shadow-sm">
          <CardHeader className="border-b border-border/70">
            <CardTitle className="text-base">快捷入口</CardTitle>
            <CardDescription>用于模拟后台首页的常用模块导航。</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 pt-4 md:grid-cols-2 xl:grid-cols-3">
            {shortcutModules.map((item) => {
              const ShortcutIcon = item.icon

              return (
                <a
                  key={item.slug}
                  href={`#/${item.slug}`}
                  className="group rounded-2xl border border-border/70 bg-muted/30 p-4 transition-colors hover:bg-accent/60"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl border border-border/70 bg-background">
                      <ShortcutIcon className="size-4" />
                    </div>
                    <ArrowRightIcon className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <div className="mt-4">
                    <div className="font-medium">{item.title}</div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </a>
              )
            })}
          </CardContent>
        </Card>
      ) : (
        <Card className="border border-dashed border-border/70 bg-card/80 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LayoutGridIcon className="size-4" />
              下一步建议
            </CardTitle>
            <CardDescription>
              如果要把当前占位页继续推进成真实后台模块，优先处理下面三项。
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {[
              '补充筛选表单和分页协议。',
              '从 src/api/modules 接真实接口。',
              '接入角色权限与按钮级禁用逻辑。',
            ].map((item) => (
              <div key={item} className="rounded-xl border border-border/70 bg-muted/35 p-4 text-sm text-muted-foreground">
                {item}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </section>
  )
}
