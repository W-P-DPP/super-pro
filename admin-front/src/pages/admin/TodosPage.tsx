import { useEffect, useMemo, useState } from 'react'
import { ADMIN_CONSOLE_PERMISSION_CODES } from '@super-pro/shared-types'
import type {
  CreateTodoRequestDto,
  TodoListQueryDto,
  TodoPriority,
  TodoResponseDto,
  TodoStatus,
  UpdateTodoRequestDto,
} from '@super-pro/shared-types'
import { TODO_PRIORITIES, TODO_STATUSES } from '@super-pro/shared-types'
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
  Textarea,
  toast,
} from '@/components/ui'
import {
  createTodo,
  deleteTodo,
  getTodos,
  TODO_PRIORITY_LABELS,
  TODO_STATUS_LABELS,
  updateTodo,
} from '@/api/modules/todos'
import { getUsers, type UserListQueryDto, type UserResponseDto } from '@/api/modules/users'
import { useAdminMenu } from '@/contexts/admin-menu-context'
import {
  ADMIN_PAGE_FILL_CARD_CLASS,
  ADMIN_PAGE_FILL_LAYOUT_CLASS,
  ADMIN_PAGE_TOOLBAR_CLASS,
  DEFAULT_PAGE_SIZE,
  ListPagination,
  ModuleSelect,
  type LoadState,
} from './module-page-shared'

type TodoFilters = {
  keyword: string
  status: string
  priority: string
  assigneeKeyword: string
}

type AssigneeOption = Pick<UserResponseDto, 'id' | 'username' | 'nickname' | 'status'>

type TodoFormState = {
  title: string
  description: string
  priority: TodoPriority
  assigneeUserId: number | null
  assignee: AssigneeOption | null
  dueAt: string
  status: TodoStatus
}

const TABLE_COLUMN_COUNT = 7
const ACTIVE_ASSIGNEE_QUERY_LIMIT = 20

function buildCreateDraft(): TodoFormState {
  return {
    title: '',
    description: '',
    priority: 'medium',
    assigneeUserId: null,
    assignee: null,
    dueAt: '',
    status: 'pending_review',
  }
}

function buildEditDraft(todo: TodoResponseDto): TodoFormState {
  return {
    title: todo.title,
    description: todo.description ?? '',
    priority: todo.priority,
    assigneeUserId: todo.assigneeUserId,
    assignee: todo.assignee,
    dueAt: toDateTimeLocalValue(todo.dueAt),
    status: todo.status,
  }
}

function formatAssigneeLabel(assignee: AssigneeOption | null | undefined) {
  if (!assignee) {
    return '未指定'
  }

  return assignee.nickname.trim() || assignee.username
}

function formatDateTimeCell(value?: string) {
  if (!value) {
    return '--'
  }

  return value.replace('T', ' ').slice(0, 16)
}

function toDateTimeLocalValue(value?: string) {
  if (!value) {
    return ''
  }

  const normalizedValue = value.trim().replace(' ', 'T')
  return normalizedValue.length >= 16 ? normalizedValue.slice(0, 16) : normalizedValue
}

function toApiDueAt(value: string) {
  const normalizedValue = value.trim()
  return normalizedValue ? normalizedValue : null
}

function buildAssigneeSelectOptions(options: AssigneeOption[], selectedAssignee: AssigneeOption | null) {
  const mergedOptions = selectedAssignee && !options.some((option) => option.id === selectedAssignee.id)
    ? [selectedAssignee, ...options]
    : options

  return [
    {
      value: 'unselected',
      label: '请选择负责人',
    },
    ...mergedOptions.map((option) => ({
      value: String(option.id),
      label: `${formatAssigneeLabel(option)} (${option.username})`,
    })),
  ]
}

function TodoStatusBadge({ status }: { status: TodoStatus }) {
  const variant = status === 'completed' ? 'secondary' : status === 'canceled' ? 'outline' : 'default'
  return <Badge variant={variant}>{TODO_STATUS_LABELS[status]}</Badge>
}

function TodoPriorityBadge({ priority }: { priority: TodoPriority }) {
  const variant = priority === 'high' ? 'destructive' : priority === 'medium' ? 'default' : 'secondary'
  return <Badge variant={variant}>{TODO_PRIORITY_LABELS[priority]}</Badge>
}

function TodoAssigneeField({
  searchKeyword,
  onSearchKeywordChange,
  selectedAssigneeId,
  selectedAssignee,
  options,
  loadState,
  disabled,
  helperText,
  onSelect,
}: {
  searchKeyword: string
  onSearchKeywordChange: (value: string) => void
  selectedAssigneeId: number | null
  selectedAssignee: AssigneeOption | null
  options: AssigneeOption[]
  loadState: LoadState
  disabled: boolean
  helperText: string
  onSelect: (assignee: AssigneeOption | null) => void
}) {
  const selectOptions = useMemo(
    () => buildAssigneeSelectOptions(options, selectedAssignee),
    [options, selectedAssignee],
  )

  return (
    <div className="grid gap-2">
      <div className="text-sm font-medium">负责人</div>
      <Input
        value={searchKeyword}
        onChange={(event) => onSearchKeywordChange(event.target.value)}
        placeholder="搜索负责人昵称或用户名"
        disabled={disabled}
      />
      <ModuleSelect
        value={selectedAssigneeId ? String(selectedAssigneeId) : 'unselected'}
        onValueChange={(value) => {
          if (value === 'unselected') {
            onSelect(null)
            return
          }

          const nextAssignee =
            options.find((option) => String(option.id) === value) ??
            (selectedAssignee && String(selectedAssignee.id) === value ? selectedAssignee : null)
          onSelect(nextAssignee)
        }}
        options={selectOptions}
        placeholder={loadState === 'loading' ? '正在加载负责人...' : '请选择负责人'}
      />
      <div className="text-xs text-muted-foreground">
        {loadState === 'loading' ? '正在远程搜索已启用用户...' : helperText}
      </div>
    </div>
  )
}

export function TodosPage() {
  const { hasPermission } = useAdminMenu()
  const [todoRows, setTodoRows] = useState<TodoResponseDto[]>([])
  const [totalTodos, setTotalTodos] = useState(0)
  const [loadState, setLoadState] = useState<LoadState>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [assigneeKeyword, setAssigneeKeyword] = useState('')
  const [appliedFilters, setAppliedFilters] = useState<TodoFilters>({
    keyword: '',
    status: 'all',
    priority: 'all',
    assigneeKeyword: '',
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [reloadKey, setReloadKey] = useState(0)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isCreatingTodo, setIsCreatingTodo] = useState(false)
  const [editingTodo, setEditingTodo] = useState<TodoResponseDto | null>(null)
  const [isSavingTodo, setIsSavingTodo] = useState(false)
  const [deletingTodo, setDeletingTodo] = useState<TodoResponseDto | null>(null)
  const [isDeletingTodo, setIsDeletingTodo] = useState(false)
  const [createDraft, setCreateDraft] = useState<TodoFormState>(buildCreateDraft())
  const [editingDraft, setEditingDraft] = useState<TodoFormState>(buildCreateDraft())
  const [createAssigneeKeyword, setCreateAssigneeKeyword] = useState('')
  const [editAssigneeKeyword, setEditAssigneeKeyword] = useState('')
  const [createAssigneeOptions, setCreateAssigneeOptions] = useState<AssigneeOption[]>([])
  const [editAssigneeOptions, setEditAssigneeOptions] = useState<AssigneeOption[]>([])
  const [createAssigneeLoadState, setCreateAssigneeLoadState] = useState<LoadState>('idle')
  const [editAssigneeLoadState, setEditAssigneeLoadState] = useState<LoadState>('idle')

  const totalPages = Math.max(1, Math.ceil(totalTodos / pageSize))
  const isEditDialogOpen = editingTodo !== null
  const canCreateTodoAction = hasPermission(ADMIN_CONSOLE_PERMISSION_CODES.todoCreate)
  const canUpdateTodoAction = hasPermission(ADMIN_CONSOLE_PERMISSION_CODES.todoUpdate)
  const canDeleteTodoAction = hasPermission(ADMIN_CONSOLE_PERMISSION_CODES.todoDelete)
  const canCreateTodo = createDraft.title.trim().length > 0 && createDraft.assigneeUserId !== null
  const canSaveTodo = editingDraft.title.trim().length > 0 && editingDraft.assigneeUserId !== null

  function buildTodoListQuery(filters: TodoFilters, page: number, nextPageSize: number): TodoListQueryDto {
    return {
      ...(filters.keyword.trim() ? { keyword: filters.keyword.trim() } : {}),
      ...(filters.status !== 'all' ? { status: filters.status as TodoStatus } : {}),
      ...(filters.priority !== 'all' ? { priority: filters.priority as TodoPriority } : {}),
      ...(filters.assigneeKeyword.trim() ? { assigneeKeyword: filters.assigneeKeyword.trim() } : {}),
      page,
      pageSize: nextPageSize,
    }
  }

  async function loadTodos() {
    setLoadState('loading')
    setErrorMessage('')

    try {
      const result = await getTodos(buildTodoListQuery(appliedFilters, currentPage, pageSize))
      setTodoRows(result.items)
      setTotalTodos(result.total)

      if (result.page !== currentPage) {
        setCurrentPage(result.page)
      }

      setLoadState('success')
    } catch (error) {
      setTodoRows([])
      setTotalTodos(0)
      setLoadState('error')
      setErrorMessage(
        error instanceof Error
          ? error.message
          : '加载待办列表失败，请稍后重试。',
      )
    }
  }

  async function loadAssigneeOptions(
    query: string,
    selectedAssignee: AssigneeOption | null,
    setOptions: (options: AssigneeOption[]) => void,
    setState: (state: LoadState) => void,
  ) {
    setState('loading')

    try {
      const result = await getUsers({
        ...(query.trim() ? { keyword: query.trim() } : {}),
        status: 1,
        page: 1,
        pageSize: ACTIVE_ASSIGNEE_QUERY_LIMIT,
      } satisfies UserListQueryDto)

      const nextOptions = result.items.map((item) => ({
        id: item.id,
        username: item.username,
        nickname: item.nickname,
        status: item.status,
      }))

      setOptions(
        selectedAssignee && !nextOptions.some((option) => option.id === selectedAssignee.id)
          ? [selectedAssignee, ...nextOptions]
          : nextOptions,
      )
      setState('success')
    } catch {
      setOptions(selectedAssignee ? [selectedAssignee] : [])
      setState('error')
    }
  }

  useEffect(() => {
    void loadTodos()
  }, [appliedFilters, currentPage, pageSize, reloadKey])

  useEffect(() => {
    if (!isCreateDialogOpen) {
      return
    }

    const timer = window.setTimeout(() => {
      void loadAssigneeOptions(
        createAssigneeKeyword,
        createDraft.assignee,
        setCreateAssigneeOptions,
        setCreateAssigneeLoadState,
      )
    }, 250)

    return () => window.clearTimeout(timer)
  }, [createAssigneeKeyword, createDraft.assignee, isCreateDialogOpen])

  useEffect(() => {
    if (!isEditDialogOpen) {
      return
    }

    const timer = window.setTimeout(() => {
      void loadAssigneeOptions(
        editAssigneeKeyword,
        editingDraft.assignee,
        setEditAssigneeOptions,
        setEditAssigneeLoadState,
      )
    }, 250)

    return () => window.clearTimeout(timer)
  }, [editAssigneeKeyword, editingDraft.assignee, isEditDialogOpen])

  function handleCloseCreateDialog() {
    setIsCreateDialogOpen(false)
    setCreateDraft(buildCreateDraft())
    setCreateAssigneeKeyword('')
    setCreateAssigneeOptions([])
    setCreateAssigneeLoadState('idle')
  }

  function handleEditTodo(todo: TodoResponseDto) {
    setEditingTodo(todo)
    setEditingDraft(buildEditDraft(todo))
    setEditAssigneeKeyword(todo.assignee?.nickname ?? todo.assignee?.username ?? '')
    setEditAssigneeOptions(todo.assignee ? [todo.assignee] : [])
    setEditAssigneeLoadState('idle')
  }

  function handleCloseEditDialog() {
    setEditingTodo(null)
    setEditingDraft(buildCreateDraft())
    setEditAssigneeKeyword('')
    setEditAssigneeOptions([])
    setEditAssigneeLoadState('idle')
  }

  async function handleCreateTodo() {
    if (!canCreateTodo || isCreatingTodo || createDraft.assigneeUserId === null) {
      return
    }

    setIsCreatingTodo(true)

    try {
      await createTodo({
        title: createDraft.title.trim(),
        ...(createDraft.description.trim() ? { description: createDraft.description.trim() } : {}),
        priority: createDraft.priority,
        assigneeUserId: createDraft.assigneeUserId,
        ...(createDraft.dueAt.trim() ? { dueAt: toApiDueAt(createDraft.dueAt) } : {}),
      } satisfies CreateTodoRequestDto)

      toast.success('待办已创建，默认进入待审核。')
      handleCloseCreateDialog()
      setCurrentPage(1)
      setReloadKey((currentValue) => currentValue + 1)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '新增待办失败，请稍后重试。')
    } finally {
      setIsCreatingTodo(false)
    }
  }

  async function handleSaveTodo() {
    if (!editingTodo || !canSaveTodo || isSavingTodo || editingDraft.assigneeUserId === null) {
      return
    }

    setIsSavingTodo(true)

    try {
      await updateTodo(
        editingTodo.id,
        {
          title: editingDraft.title.trim(),
          description: editingDraft.description.trim(),
          priority: editingDraft.priority,
          assigneeUserId: editingDraft.assigneeUserId,
          dueAt: toApiDueAt(editingDraft.dueAt),
          status: editingDraft.status,
        } satisfies UpdateTodoRequestDto,
      )

      toast.success('待办信息已更新。')
      handleCloseEditDialog()
      setReloadKey((currentValue) => currentValue + 1)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '更新待办失败，请稍后重试。')
    } finally {
      setIsSavingTodo(false)
    }
  }

  async function handleDeleteTodo() {
    if (!deletingTodo || isDeletingTodo) {
      return
    }

    setIsDeletingTodo(true)

    try {
      await deleteTodo(deletingTodo.id)
      toast.success('待办已删除。')
      setDeletingTodo(null)

      if (currentPage > 1 && todoRows.length === 1) {
        setCurrentPage(currentPage - 1)
      } else {
        setReloadKey((currentValue) => currentValue + 1)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除待办失败，请稍后重试。')
    } finally {
      setIsDeletingTodo(false)
    }
  }

  return (
    <section className={ADMIN_PAGE_FILL_LAYOUT_CLASS}>
      <section className={ADMIN_PAGE_TOOLBAR_CLASS}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.5fr)_minmax(10rem,0.7fr)_minmax(10rem,0.7fr)_minmax(0,1.1fr)_auto_auto_auto]">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索标题或描述"
              className="h-9 pl-9"
            />
          </div>
          <ModuleSelect
            value={statusFilter}
            onValueChange={setStatusFilter}
            options={[
              { value: 'all', label: '全部状态' },
              ...TODO_STATUSES.map((status) => ({
                value: status,
                label: TODO_STATUS_LABELS[status],
              })),
            ]}
          />
          <ModuleSelect
            value={priorityFilter}
            onValueChange={setPriorityFilter}
            options={[
              { value: 'all', label: '全部优先级' },
              ...TODO_PRIORITIES.map((priority) => ({
                value: priority,
                label: TODO_PRIORITY_LABELS[priority],
              })),
            ]}
          />
          <Input
            value={assigneeKeyword}
            onChange={(event) => setAssigneeKeyword(event.target.value)}
            placeholder="负责人昵称或用户名"
            className="h-9"
          />
          <Button
            type="button"
            className="h-9"
            onClick={() => {
              setCurrentPage(1)
              setAppliedFilters({
                keyword,
                status: statusFilter,
                priority: priorityFilter,
                assigneeKeyword,
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
              const nextFilters = {
                keyword: '',
                status: 'all',
                priority: 'all',
                assigneeKeyword: '',
              }
              setKeyword('')
              setStatusFilter('all')
              setPriorityFilter('all')
              setAssigneeKeyword('')
              setCurrentPage(1)
              setAppliedFilters(nextFilters)
              setReloadKey((currentValue) => currentValue + 1)
            }}
          >
            <RotateCcwIcon data-icon="inline-start" />
            重置
          </Button>
          {canCreateTodoAction ? (
            <Button type="button" className="h-9" onClick={() => setIsCreateDialogOpen(true)}>
              <PlusIcon data-icon="inline-start" />
              新建待办
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
                  <TableHead>标题</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>优先级</TableHead>
                  <TableHead>负责人</TableHead>
                  <TableHead>截止时间</TableHead>
                  <TableHead>更新时间</TableHead>
                  <TableHead className="w-[10rem]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadState === 'loading' ? (
                  <TableRow>
                    <TableCell colSpan={TABLE_COLUMN_COUNT} className="h-24 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Spinner className="size-4" />
                        <span>正在加载待办列表...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : loadState === 'error' ? (
                  <TableRow>
                    <TableCell colSpan={TABLE_COLUMN_COUNT} className="h-24 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <span>{errorMessage || '加载待办列表失败，请稍后重试。'}</span>
                        <Button type="button" variant="outline" size="sm" onClick={() => void loadTodos()}>
                          重试
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : todoRows.length > 0 ? (
                  todoRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{row.title}</div>
                          {row.description ? (
                            <div className="max-w-[32rem] truncate text-xs text-muted-foreground">{row.description}</div>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <TodoStatusBadge status={row.status} />
                      </TableCell>
                      <TableCell>
                        <TodoPriorityBadge priority={row.priority} />
                      </TableCell>
                      <TableCell>{formatAssigneeLabel(row.assignee)}</TableCell>
                      <TableCell>{formatDateTimeCell(row.dueAt)}</TableCell>
                      <TableCell>{formatDateTimeCell(row.updateTime || row.createTime)}</TableCell>
                      <TableCell>
                        <div className="flex flex-nowrap items-center gap-2 whitespace-nowrap">
                          {canUpdateTodoAction ? (
                            <Button type="button" variant="ghost" size="sm" onClick={() => handleEditTodo(row)}>
                              编辑
                            </Button>
                          ) : null}
                          {canDeleteTodoAction ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeletingTodo(row)}
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
                      暂无匹配的待办数据。
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <ListPagination
            currentPage={currentPage}
            totalPages={totalPages}
            total={totalTodos}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(nextPageSize) => {
              setPageSize(nextPageSize)
              setCurrentPage(1)
              setReloadKey((currentValue) => currentValue + 1)
            }}
          />
        </div>
      </section>

      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => (!open ? handleCloseCreateDialog() : setIsCreateDialogOpen(true))}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>新建待办</DialogTitle>
            <DialogDescription>
              填写任务基础信息后创建待办。创建后默认为“待审核”。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <div className="text-sm font-medium">标题</div>
              <Input
                value={createDraft.title}
                onChange={(event) => setCreateDraft((currentDraft) => ({ ...currentDraft, title: event.target.value }))}
                placeholder="请输入待办标题"
              />
            </div>
            <div className="grid gap-2">
              <div className="text-sm font-medium">描述</div>
              <Textarea
                value={createDraft.description}
                onChange={(event) =>
                  setCreateDraft((currentDraft) => ({ ...currentDraft, description: event.target.value }))
                }
                placeholder="可选，补充任务背景或执行说明"
                rows={4}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="grid gap-2">
                <div className="text-sm font-medium">优先级</div>
                <ModuleSelect
                  value={createDraft.priority}
                  onValueChange={(value) =>
                    setCreateDraft((currentDraft) => ({
                      ...currentDraft,
                      priority: value as TodoPriority,
                    }))
                  }
                  options={TODO_PRIORITIES.map((priority) => ({
                    value: priority,
                    label: TODO_PRIORITY_LABELS[priority],
                  }))}
                />
              </div>
              <div className="grid gap-2">
                <div className="text-sm font-medium">截止时间</div>
                <Input
                  type="datetime-local"
                  value={createDraft.dueAt}
                  onChange={(event) => setCreateDraft((currentDraft) => ({ ...currentDraft, dueAt: event.target.value }))}
                />
              </div>
            </div>
            <TodoAssigneeField
              searchKeyword={createAssigneeKeyword}
              onSearchKeywordChange={setCreateAssigneeKeyword}
              selectedAssigneeId={createDraft.assigneeUserId}
              selectedAssignee={createDraft.assignee}
              options={createAssigneeOptions}
              loadState={createAssigneeLoadState}
              disabled={isCreatingTodo}
              helperText={`只搜索已启用用户，单次最多返回 ${ACTIVE_ASSIGNEE_QUERY_LIMIT} 条。`}
              onSelect={(assignee) =>
                setCreateDraft((currentDraft) => ({
                  ...currentDraft,
                  assigneeUserId: assignee?.id ?? null,
                  assignee,
                }))
              }
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCloseCreateDialog}>
              取消
            </Button>
            <Button type="button" onClick={() => void handleCreateTodo()} disabled={!canCreateTodo || isCreatingTodo}>
              {isCreatingTodo ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={(open) => (!open ? handleCloseEditDialog() : null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>编辑待办</DialogTitle>
            <DialogDescription>支持调整标题、优先级、负责人、截止时间和状态。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <div className="text-sm font-medium">标题</div>
              <Input
                value={editingDraft.title}
                onChange={(event) => setEditingDraft((currentDraft) => ({ ...currentDraft, title: event.target.value }))}
                placeholder="请输入待办标题"
              />
            </div>
            <div className="grid gap-2">
              <div className="text-sm font-medium">描述</div>
              <Textarea
                value={editingDraft.description}
                onChange={(event) =>
                  setEditingDraft((currentDraft) => ({ ...currentDraft, description: event.target.value }))
                }
                placeholder="可选，补充任务背景或执行说明"
                rows={4}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="grid gap-2">
                <div className="text-sm font-medium">状态</div>
                <ModuleSelect
                  value={editingDraft.status}
                  onValueChange={(value) =>
                    setEditingDraft((currentDraft) => ({
                      ...currentDraft,
                      status: value as TodoStatus,
                    }))
                  }
                  options={TODO_STATUSES.map((status) => ({
                    value: status,
                    label: TODO_STATUS_LABELS[status],
                  }))}
                />
              </div>
              <div className="grid gap-2">
                <div className="text-sm font-medium">优先级</div>
                <ModuleSelect
                  value={editingDraft.priority}
                  onValueChange={(value) =>
                    setEditingDraft((currentDraft) => ({
                      ...currentDraft,
                      priority: value as TodoPriority,
                    }))
                  }
                  options={TODO_PRIORITIES.map((priority) => ({
                    value: priority,
                    label: TODO_PRIORITY_LABELS[priority],
                  }))}
                />
              </div>
              <div className="grid gap-2">
                <div className="text-sm font-medium">截止时间</div>
                <Input
                  type="datetime-local"
                  value={editingDraft.dueAt}
                  onChange={(event) => setEditingDraft((currentDraft) => ({ ...currentDraft, dueAt: event.target.value }))}
                />
              </div>
            </div>
            <TodoAssigneeField
              searchKeyword={editAssigneeKeyword}
              onSearchKeywordChange={setEditAssigneeKeyword}
              selectedAssigneeId={editingDraft.assigneeUserId}
              selectedAssignee={editingDraft.assignee}
              options={editAssigneeOptions}
              loadState={editAssigneeLoadState}
              disabled={isSavingTodo}
              helperText={`只搜索已启用用户，单次最多返回 ${ACTIVE_ASSIGNEE_QUERY_LIMIT} 条。`}
              onSelect={(assignee) =>
                setEditingDraft((currentDraft) => ({
                  ...currentDraft,
                  assigneeUserId: assignee?.id ?? null,
                  assignee,
                }))
              }
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCloseEditDialog}>
              取消
            </Button>
            <Button type="button" onClick={() => void handleSaveTodo()} disabled={!canSaveTodo || isSavingTodo}>
              {isSavingTodo ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deletingTodo !== null} onOpenChange={(open) => (!open ? setDeletingTodo(null) : null)}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>删除待办</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingTodo
                ? `确认删除待办“${deletingTodo.title}”吗？删除后当前列表将立即更新。`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingTodo}>取消</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void handleDeleteTodo()}>
              {isDeletingTodo ? '删除中...' : '删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
