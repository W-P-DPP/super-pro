import { useEffect, useMemo, useState } from 'react'
import { ADMIN_CONSOLE_PERMISSION_CODES } from '@super-pro/shared-types'
import type {
  CreateTodoRequestDto,
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
  type TodoListQueryInput,
  TODO_PRIORITY_LABELS,
  TODO_STATUS_LABELS,
  updateTodo,
} from '@/api/modules/todos'
import { getProjects, type ProjectResponseDto } from '@/api/modules/projects'
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
import { cn } from '@/lib/utils'

type TodoFilters = {
  keyword: string
  status: string
  priority: string
  projectId: number | null
}

type ProjectOption = Pick<ProjectResponseDto, 'id' | 'projectName' | 'projectCode'>

type TodoFormState = {
  title: string
  description: string
  priority: TodoPriority
  projectId: number | null
  project: ProjectOption | null
  status: TodoStatus
}

const TABLE_COLUMN_COUNT = 6
const PROJECT_QUERY_LIMIT = 100
const TEXT = {
  titlePlaceholder: '\u8bf7\u8f93\u5165\u5f85\u529e\u6807\u9898',
  descriptionPlaceholder: '\u53ef\u9009\uff0c\u8865\u5145\u4efb\u52a1\u80cc\u666f\u6216\u6267\u884c\u8bf4\u660e',
  listKeywordPlaceholder: '\u641c\u7d22\u6807\u9898\u6216\u63cf\u8ff0',
  projectSelectPlaceholder: '\u8bf7\u9009\u62e9\u5f52\u5c5e\u9879\u76ee',
  filterProjectEmptyLabel: '\u5168\u90e8\u9879\u76ee',
  createProjectHelper: '\u4ec5\u5c55\u793a\u524d 100 \u4e2a\u9879\u76ee\uff0c\u5982\u9700\u66f4\u591a\u9879\u76ee\u53ef\u5728\u9879\u76ee\u7ba1\u7406\u4e2d\u5148\u68c0\u67e5\u3002',
  searchButton: '\u641c\u7d22',
  resetButton: '\u91cd\u7f6e',
  createButton: '\u65b0\u5efa\u5f85\u529e',
  editButton: '\u7f16\u8f91',
  deleteButton: '\u5220\u9664',
  moveToTodoButton: '\u8f6c\u5f85\u529e',
  startButton: '\u5f00\u59cb',
  completeButton: '\u5b8c\u6210',
  cancelStatusButton: '\u53d6\u6d88',
  reopenButton: '\u91cd\u5f00',
  cancelButton: '\u53d6\u6d88',
  saveButton: '\u4fdd\u5b58',
  createDialogTitle: '\u65b0\u5efa\u5f85\u529e',
  createDialogDescription: '\u586b\u5199\u4efb\u52a1\u57fa\u7840\u4fe1\u606f\u540e\u521b\u5efa\u5f85\u529e\u3002\u521b\u5efa\u540e\u9ed8\u8ba4\u4e3a\u201c\u5f85\u5ba1\u6838\u201d\u3002',
  editDialogTitle: '\u7f16\u8f91\u5f85\u529e',
  editDialogDescription: '\u652f\u6301\u8c03\u6574\u6807\u9898\u3001\u63cf\u8ff0\u3001\u4f18\u5148\u7ea7\u3001\u5f52\u5c5e\u9879\u76ee\u548c\u72b6\u6001\u3002',
  deleteDialogTitle: '\u5220\u9664\u5f85\u529e',
  deleteDialogDescriptionPrefix: '\u786e\u8ba4\u5220\u9664\u5f85\u529e\u201c',
  deleteDialogDescriptionSuffix: '\u201d\u5417\uff1f\u5220\u9664\u540e\u5f53\u524d\u5217\u8868\u5c06\u7acb\u5373\u66f4\u65b0\u3002',
  titleLabel: '\u6807\u9898',
  descriptionLabel: '\u63cf\u8ff0',
  priorityLabel: '\u4f18\u5148\u7ea7',
  statusLabel: '\u72b6\u6001',
  projectLabel: '\u5f52\u5c5e\u9879\u76ee',
  allStatuses: '\u5168\u90e8\u72b6\u6001',
  allPriorities: '\u5168\u90e8\u4f18\u5148\u7ea7',
  loadingList: '\u6b63\u5728\u52a0\u8f7d\u5f85\u529e\u5217\u8868...',
  loadListError: '\u52a0\u8f7d\u5f85\u529e\u5217\u8868\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002',
  emptyList: '\u6682\u65e0\u5339\u914d\u7684\u5f85\u529e\u6570\u636e\u3002',
  retryButton: '\u91cd\u8bd5',
  titleColumn: '\u6807\u9898',
  statusColumn: '\u72b6\u6001',
  priorityColumn: '\u4f18\u5148\u7ea7',
  projectColumn: '\u5f52\u5c5e\u9879\u76ee',
  updateTimeColumn: '\u66f4\u65b0\u65f6\u95f4',
  actionColumn: '\u64cd\u4f5c',
  projectLoading: '\u6b63\u5728\u52a0\u8f7d\u9879\u76ee...',
  createSuccess: '\u5f85\u529e\u5df2\u521b\u5efa\uff0c\u9ed8\u8ba4\u8fdb\u5165\u5f85\u5ba1\u6838\u3002',
  createFail: '\u65b0\u589e\u5f85\u529e\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002',
  updateSuccess: '\u5f85\u529e\u4fe1\u606f\u5df2\u66f4\u65b0\u3002',
  updateFail: '\u66f4\u65b0\u5f85\u529e\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002',
  deleteSuccess: '\u5f85\u529e\u5df2\u5220\u9664\u3002',
  deleteFail: '\u5220\u9664\u5f85\u529e\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002',
  quickStatusSuccessPrefix: '\u5f85\u529e\u72b6\u6001\u5df2\u66f4\u65b0\u4e3a\uff1a',
  quickStatusFail: '\u5feb\u6377\u5207\u6362\u72b6\u6001\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002',
  creating: '\u521b\u5efa\u4e2d...',
  saving: '\u4fdd\u5b58\u4e2d...',
  deleting: '\u5220\u9664\u4e2d...',
} as const

const TODO_STATUS_BADGE_CLASS_NAMES: Record<TodoStatus, string> = {
  pending_review: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-300',
  todo: 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200',
  in_progress: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/70 dark:bg-sky-950/40 dark:text-sky-300',
  completed: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300',
  canceled: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-300',
}

const TODO_PRIORITY_BADGE_CLASS_NAMES: Record<TodoPriority, string> = {
  low: 'border-lime-200 bg-lime-50 text-lime-700 dark:border-lime-900/70 dark:bg-lime-950/40 dark:text-lime-300',
  medium: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/70 dark:bg-orange-950/40 dark:text-orange-300',
  high: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300',
}

const QUICK_STATUS_ACTIONS: Record<TodoStatus, Array<{ label: string; nextStatus: TodoStatus; tone: 'default' | 'danger' }>> = {
  pending_review: [
    { label: TEXT.moveToTodoButton, nextStatus: 'todo', tone: 'default' },
    { label: TEXT.cancelStatusButton, nextStatus: 'canceled', tone: 'danger' },
  ],
  todo: [
    { label: TEXT.startButton, nextStatus: 'in_progress', tone: 'default' },
    { label: TEXT.cancelStatusButton, nextStatus: 'canceled', tone: 'danger' },
  ],
  in_progress: [
    { label: TEXT.completeButton, nextStatus: 'completed', tone: 'default' },
    { label: TEXT.cancelStatusButton, nextStatus: 'canceled', tone: 'danger' },
  ],
  completed: [
    { label: TEXT.reopenButton, nextStatus: 'todo', tone: 'default' },
  ],
  canceled: [
    { label: TEXT.reopenButton, nextStatus: 'todo', tone: 'default' },
  ],
}

function buildCreateDraft(): TodoFormState {
  return {
    title: '',
    description: '',
    priority: 'medium',
    projectId: null,
    project: null,
    status: 'pending_review',
  }
}

function buildEditDraft(todo: TodoResponseDto): TodoFormState {
  return {
    title: todo.title,
    description: todo.description ?? '',
    priority: todo.priority,
    projectId: todo.projectId,
    project: todo.project,
    status: todo.status,
  }
}

function formatDateTimeCell(value?: string) {
  if (!value) {
    return '--'
  }

  return value.replace('T', ' ').slice(0, 16)
}

function formatProjectLabel(project: ProjectOption | null | undefined) {
  if (!project) {
    return '--'
  }

  return `${project.projectName} (${project.projectCode})`
}

function buildProjectSelectOptions(
  options: ProjectOption[],
  selectedProject: ProjectOption | null,
  emptyLabel: string,
) {
  const mergedOptions =
    selectedProject && !options.some((option) => option.id === selectedProject.id)
      ? [selectedProject, ...options]
      : options

  return [
    {
      value: 'unselected',
      label: emptyLabel,
    },
    ...mergedOptions.map((option) => ({
      value: String(option.id),
      label: formatProjectLabel(option),
    })),
  ]
}

function TodoStatusBadge({ status }: { status: TodoStatus }) {
  return (
    <Badge variant="outline" className={cn('rounded-full px-2.5 font-medium', TODO_STATUS_BADGE_CLASS_NAMES[status])}>
      {TODO_STATUS_LABELS[status]}
    </Badge>
  )
}

function TodoPriorityBadge({ priority }: { priority: TodoPriority }) {
  return (
    <Badge
      variant="outline"
      className={cn('rounded-full px-2.5 font-medium', TODO_PRIORITY_BADGE_CLASS_NAMES[priority])}
    >
      {TODO_PRIORITY_LABELS[priority]}
    </Badge>
  )
}

function TodoProjectField({
  selectedProjectId,
  selectedProject,
  options,
  loadState,
  helperText,
  emptyLabel,
  hideLabel = false,
  onSelect,
}: {
  selectedProjectId: number | null
  selectedProject: ProjectOption | null
  options: ProjectOption[]
  loadState: LoadState
  helperText?: string
  emptyLabel: string
  hideLabel?: boolean
  onSelect: (project: ProjectOption | null) => void
}) {
  const selectOptions = useMemo(
    () => buildProjectSelectOptions(options, selectedProject, emptyLabel),
    [emptyLabel, options, selectedProject],
  )

  return (
    <div className="grid gap-2">
      {hideLabel ? null : <div className="text-sm font-medium">{TEXT.projectLabel}</div>}
      <ModuleSelect
        value={selectedProjectId ? String(selectedProjectId) : 'unselected'}
        onValueChange={(value) => {
          if (value === 'unselected') {
            onSelect(null)
            return
          }

          const nextProject =
            options.find((option) => String(option.id) === value) ??
            (selectedProject && String(selectedProject.id) === value ? selectedProject : null)
          onSelect(nextProject)
        }}
        options={selectOptions}
        placeholder={loadState === 'loading' ? TEXT.projectLoading : TEXT.projectSelectPlaceholder}
      />
      {helperText ? (
        <div className="text-xs text-muted-foreground">{loadState === 'loading' ? TEXT.projectLoading : helperText}</div>
      ) : null}
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
  const [filterProject, setFilterProject] = useState<ProjectOption | null>(null)
  const [appliedFilters, setAppliedFilters] = useState<TodoFilters>({
    keyword: '',
    status: 'all',
    priority: 'all',
    projectId: null,
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
  const [statusUpdatingKey, setStatusUpdatingKey] = useState('')
  const [createDraft, setCreateDraft] = useState<TodoFormState>(buildCreateDraft())
  const [editingDraft, setEditingDraft] = useState<TodoFormState>(buildCreateDraft())
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([])
  const [projectLoadState, setProjectLoadState] = useState<LoadState>('idle')

  const totalPages = Math.max(1, Math.ceil(totalTodos / pageSize))
  const isEditDialogOpen = editingTodo !== null
  const canCreateTodoAction = hasPermission(ADMIN_CONSOLE_PERMISSION_CODES.todoCreate)
  const canUpdateTodoAction = hasPermission(ADMIN_CONSOLE_PERMISSION_CODES.todoUpdate)
  const canDeleteTodoAction = hasPermission(ADMIN_CONSOLE_PERMISSION_CODES.todoDelete)
  const canCreateTodo = createDraft.title.trim().length > 0 && createDraft.projectId !== null
  const canSaveTodo = editingDraft.title.trim().length > 0 && editingDraft.projectId !== null

  function buildTodoListQuery(filters: TodoFilters, page: number, nextPageSize: number): TodoListQueryInput {
    return {
      ...(filters.keyword.trim() ? { keyword: filters.keyword.trim() } : {}),
      ...(filters.status !== 'all' ? { status: filters.status as TodoStatus } : {}),
      ...(filters.priority !== 'all' ? { priority: filters.priority as TodoPriority } : {}),
      ...(filters.projectId !== null ? { projectId: filters.projectId } : {}),
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
      setErrorMessage(error instanceof Error ? error.message : TEXT.loadListError)
    }
  }

  async function loadProjectOptions() {
    setProjectLoadState('loading')

    try {
      const result = await getProjects({
        page: 1,
        pageSize: PROJECT_QUERY_LIMIT,
      })

      setProjectOptions(result.items.map((item) => ({
        id: item.id,
        projectName: item.projectName,
        projectCode: item.projectCode,
      })))
      setProjectLoadState('success')
    } catch {
      setProjectOptions([])
      setProjectLoadState('error')
    }
  }

  useEffect(() => {
    void loadTodos()
  }, [appliedFilters, currentPage, pageSize, reloadKey])

  useEffect(() => {
    void loadProjectOptions()
  }, [])

  function handleCloseCreateDialog() {
    setIsCreateDialogOpen(false)
    setCreateDraft(buildCreateDraft())
  }

  function handleEditTodo(todo: TodoResponseDto) {
    setEditingTodo(todo)
    setEditingDraft(buildEditDraft(todo))
  }

  function handleCloseEditDialog() {
    setEditingTodo(null)
    setEditingDraft(buildCreateDraft())
  }

  async function handleCreateTodo() {
    if (!canCreateTodo || isCreatingTodo || createDraft.projectId === null) {
      return
    }

    setIsCreatingTodo(true)

    try {
      await createTodo({
        title: createDraft.title.trim(),
        ...(createDraft.description.trim() ? { description: createDraft.description.trim() } : {}),
        priority: createDraft.priority,
        projectId: createDraft.projectId,
      } satisfies CreateTodoRequestDto)

      toast.success(TEXT.createSuccess)
      handleCloseCreateDialog()
      setCurrentPage(1)
      setReloadKey((currentValue) => currentValue + 1)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : TEXT.createFail)
    } finally {
      setIsCreatingTodo(false)
    }
  }

  async function handleSaveTodo() {
    if (!editingTodo || !canSaveTodo || isSavingTodo || editingDraft.projectId === null) {
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
          projectId: editingDraft.projectId,
          status: editingDraft.status,
        } satisfies UpdateTodoRequestDto,
      )

      toast.success(TEXT.updateSuccess)
      handleCloseEditDialog()
      setReloadKey((currentValue) => currentValue + 1)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : TEXT.updateFail)
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
      toast.success(TEXT.deleteSuccess)
      setDeletingTodo(null)

      if (currentPage > 1 && todoRows.length === 1) {
        setCurrentPage(currentPage - 1)
      } else {
        setReloadKey((currentValue) => currentValue + 1)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : TEXT.deleteFail)
    } finally {
      setIsDeletingTodo(false)
    }
  }

  async function handleQuickStatusUpdate(todo: TodoResponseDto, nextStatus: TodoStatus) {
    if (!canUpdateTodoAction || isSavingTodo) {
      return
    }

    const nextKey = `${todo.id}:${nextStatus}`
    setStatusUpdatingKey(nextKey)

    try {
      await updateTodo(todo.id, {
        status: nextStatus,
      } satisfies UpdateTodoRequestDto)

      toast.success(`${TEXT.quickStatusSuccessPrefix}${TODO_STATUS_LABELS[nextStatus]}`)
      setReloadKey((currentValue) => currentValue + 1)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : TEXT.quickStatusFail)
    } finally {
      setStatusUpdatingKey('')
    }
  }

  return (
    <section className={ADMIN_PAGE_FILL_LAYOUT_CLASS}>
      <section className={ADMIN_PAGE_TOOLBAR_CLASS}>
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_minmax(10rem,0.7fr)_minmax(10rem,0.7fr)_minmax(0,1fr)_auto_auto_auto]">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder={TEXT.listKeywordPlaceholder}
              className="h-9 pl-9"
            />
          </div>
          <ModuleSelect
            value={statusFilter}
            onValueChange={setStatusFilter}
            options={[
              { value: 'all', label: TEXT.allStatuses },
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
              { value: 'all', label: TEXT.allPriorities },
              ...TODO_PRIORITIES.map((priority) => ({
                value: priority,
                label: TODO_PRIORITY_LABELS[priority],
              })),
            ]}
          />
          <TodoProjectField
            selectedProjectId={filterProject?.id ?? null}
            selectedProject={filterProject}
            options={projectOptions}
            loadState={projectLoadState}
            emptyLabel={TEXT.filterProjectEmptyLabel}
            hideLabel
            onSelect={setFilterProject}
          />
          <Button
            type="button"
            className="h-9 self-start"
            onClick={() => {
              setCurrentPage(1)
              setAppliedFilters({
                keyword,
                status: statusFilter,
                priority: priorityFilter,
                projectId: filterProject?.id ?? null,
              })
              setReloadKey((currentValue) => currentValue + 1)
            }}
          >
            <SearchIcon data-icon="inline-start" />
            {TEXT.searchButton}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-9 self-start"
            onClick={() => {
              const nextFilters = {
                keyword: '',
                status: 'all',
                priority: 'all',
                projectId: null,
              } satisfies TodoFilters
              setKeyword('')
              setStatusFilter('all')
              setPriorityFilter('all')
              setFilterProject(null)
              setCurrentPage(1)
              setAppliedFilters(nextFilters)
              setReloadKey((currentValue) => currentValue + 1)
            }}
          >
            <RotateCcwIcon data-icon="inline-start" />
            {TEXT.resetButton}
          </Button>
          {canCreateTodoAction ? (
            <Button type="button" className="h-9 self-start" onClick={() => setIsCreateDialogOpen(true)}>
              <PlusIcon data-icon="inline-start" />
              {TEXT.createButton}
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
                  <TableHead>{TEXT.titleColumn}</TableHead>
                  <TableHead>{TEXT.statusColumn}</TableHead>
                  <TableHead>{TEXT.priorityColumn}</TableHead>
                  <TableHead>{TEXT.projectColumn}</TableHead>
                  <TableHead>{TEXT.updateTimeColumn}</TableHead>
                  <TableHead className="w-[17rem]">{TEXT.actionColumn}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadState === 'loading' ? (
                  <TableRow>
                    <TableCell colSpan={TABLE_COLUMN_COUNT} className="h-24 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Spinner className="size-4" />
                        <span>{TEXT.loadingList}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : loadState === 'error' ? (
                  <TableRow>
                    <TableCell colSpan={TABLE_COLUMN_COUNT} className="h-24 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <span>{errorMessage || TEXT.loadListError}</span>
                        <Button type="button" variant="outline" size="sm" onClick={() => void loadTodos()}>
                          {TEXT.retryButton}
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
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{row.project?.projectName ?? '--'}</div>
                          {row.project?.projectCode ? (
                            <div className="font-mono text-xs text-muted-foreground">{row.project.projectCode}</div>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>{formatDateTimeCell(row.updateTime || row.createTime)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          {canUpdateTodoAction
                            ? QUICK_STATUS_ACTIONS[row.status].map((action) => {
                                const nextKey = `${row.id}:${action.nextStatus}`
                                const isUpdating = statusUpdatingKey === nextKey

                                return (
                                  <Button
                                    key={nextKey}
                                    type="button"
                                    variant={action.tone === 'danger' ? 'outline' : 'secondary'}
                                    size="sm"
                                    className={cn(
                                      'h-8 rounded-full px-3',
                                      action.tone === 'danger'
                                        ? 'border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-900/70 dark:text-rose-300 dark:hover:bg-rose-950/40'
                                        : 'bg-sky-100 text-sky-700 hover:bg-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:hover:bg-sky-900/60',
                                    )}
                                    onClick={() => void handleQuickStatusUpdate(row, action.nextStatus)}
                                    disabled={Boolean(statusUpdatingKey) || isSavingTodo}
                                  >
                                    {isUpdating ? TEXT.saving : action.label}
                                  </Button>
                                )
                              })
                            : null}
                          {canUpdateTodoAction ? (
                            <Button type="button" variant="ghost" size="sm" onClick={() => handleEditTodo(row)}>
                              {TEXT.editButton}
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
                              {TEXT.deleteButton}
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={TABLE_COLUMN_COUNT} className="h-24 text-center text-muted-foreground">
                      {TEXT.emptyList}
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
            <DialogTitle>{TEXT.createDialogTitle}</DialogTitle>
            <DialogDescription>{TEXT.createDialogDescription}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <div className="text-sm font-medium">{TEXT.titleLabel}</div>
              <Input
                value={createDraft.title}
                onChange={(event) => setCreateDraft((currentDraft) => ({ ...currentDraft, title: event.target.value }))}
                placeholder={TEXT.titlePlaceholder}
              />
            </div>
            <div className="grid gap-2">
              <div className="text-sm font-medium">{TEXT.descriptionLabel}</div>
              <Textarea
                value={createDraft.description}
                onChange={(event) =>
                  setCreateDraft((currentDraft) => ({ ...currentDraft, description: event.target.value }))
                }
                placeholder={TEXT.descriptionPlaceholder}
                rows={4}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="grid gap-2">
                <div className="text-sm font-medium">{TEXT.priorityLabel}</div>
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
              <div className="rounded-2xl border border-dashed border-border/70 px-4 py-3 text-sm text-muted-foreground">
                {TEXT.createDialogDescription}
              </div>
            </div>
            <TodoProjectField
              selectedProjectId={createDraft.projectId}
              selectedProject={createDraft.project}
              options={projectOptions}
              loadState={projectLoadState}
              helperText={TEXT.createProjectHelper}
              emptyLabel={TEXT.projectSelectPlaceholder}
              onSelect={(project) =>
                setCreateDraft((currentDraft) => ({
                  ...currentDraft,
                  projectId: project?.id ?? null,
                  project,
                }))
              }
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCloseCreateDialog}>
              {TEXT.cancelButton}
            </Button>
            <Button type="button" onClick={() => void handleCreateTodo()} disabled={!canCreateTodo || isCreatingTodo}>
              {isCreatingTodo ? TEXT.creating : TEXT.createButton}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={(open) => (!open ? handleCloseEditDialog() : null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{TEXT.editDialogTitle}</DialogTitle>
            <DialogDescription>{TEXT.editDialogDescription}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <div className="text-sm font-medium">{TEXT.titleLabel}</div>
              <Input
                value={editingDraft.title}
                onChange={(event) => setEditingDraft((currentDraft) => ({ ...currentDraft, title: event.target.value }))}
                placeholder={TEXT.titlePlaceholder}
              />
            </div>
            <div className="grid gap-2">
              <div className="text-sm font-medium">{TEXT.descriptionLabel}</div>
              <Textarea
                value={editingDraft.description}
                onChange={(event) =>
                  setEditingDraft((currentDraft) => ({ ...currentDraft, description: event.target.value }))
                }
                placeholder={TEXT.descriptionPlaceholder}
                rows={4}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="grid gap-2">
                <div className="text-sm font-medium">{TEXT.statusLabel}</div>
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
                <div className="text-sm font-medium">{TEXT.priorityLabel}</div>
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
            </div>
            <TodoProjectField
              selectedProjectId={editingDraft.projectId}
              selectedProject={editingDraft.project}
              options={projectOptions}
              loadState={projectLoadState}
              helperText={TEXT.createProjectHelper}
              emptyLabel={TEXT.projectSelectPlaceholder}
              onSelect={(project) =>
                setEditingDraft((currentDraft) => ({
                  ...currentDraft,
                  projectId: project?.id ?? null,
                  project,
                }))
              }
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCloseEditDialog}>
              {TEXT.cancelButton}
            </Button>
            <Button type="button" onClick={() => void handleSaveTodo()} disabled={!canSaveTodo || isSavingTodo}>
              {isSavingTodo ? TEXT.saving : TEXT.saveButton}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deletingTodo !== null} onOpenChange={(open) => (!open ? setDeletingTodo(null) : null)}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{TEXT.deleteDialogTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingTodo
                ? `${TEXT.deleteDialogDescriptionPrefix}${deletingTodo.title}${TEXT.deleteDialogDescriptionSuffix}`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingTodo}>{TEXT.cancelButton}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void handleDeleteTodo()}>
              {isDeletingTodo ? TEXT.deleting : TEXT.deleteButton}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
