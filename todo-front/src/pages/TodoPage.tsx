import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import {
  CheckCircle2Icon,
  CircleIcon,
  ClockIcon,
  LoaderCircleIcon,
  PencilIcon,
  PlusIcon,
  RotateCcwIcon,
  SearchIcon,
  Trash2Icon,
  XCircleIcon,
} from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from '@super-pro/shared-ui'
import { TodoStatus } from '@/api/modules/todo'
import type { TodoItem } from '@/api/modules/todo'
import { useTodoStore } from '@/stores/todoStore'

const ALL_STATUS = 'all'
type StatusFilterValue = typeof ALL_STATUS | `${TodoStatus}`

const STATUS_CONFIG: Record<number, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof CircleIcon }> = {
  [TodoStatus.PENDING_REVIEW]: { label: '待审核', variant: 'outline', icon: ClockIcon },
  [TodoStatus.REVIEW_FAILED]: { label: '审核失败', variant: 'destructive', icon: XCircleIcon },
  [TodoStatus.TODO]: { label: '待办', variant: 'default', icon: CircleIcon },
  [TodoStatus.COMPLETED]: { label: '已完成', variant: 'secondary', icon: CheckCircle2Icon },
  [TodoStatus.CANCELLED]: { label: '已取消', variant: 'destructive', icon: XCircleIcon },
}

const STATUS_OPTIONS: Array<{ value: StatusFilterValue; label: string }> = [
  { value: ALL_STATUS, label: '全部状态' },
  { value: String(TodoStatus.PENDING_REVIEW) as `${TodoStatus}`, label: '待审核' },
  { value: String(TodoStatus.TODO) as `${TodoStatus}`, label: '待办' },
  { value: String(TodoStatus.COMPLETED) as `${TodoStatus}`, label: '已完成' },
  { value: String(TodoStatus.CANCELLED) as `${TodoStatus}`, label: '已取消' },
  { value: String(TodoStatus.REVIEW_FAILED) as `${TodoStatus}`, label: '审核失败' },
] as const

interface TodoFormState {
  id: number | null
  title: string
  description: string
}

const EMPTY_FORM: TodoFormState = {
  id: null,
  title: '',
  description: '',
}

type DrawerMode = 'create' | 'edit'

function toStatus(value: StatusFilterValue): TodoStatus | undefined {
  return value === ALL_STATUS ? undefined : Number(value) as TodoStatus
}

function formatDateTime(value?: string) {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

function matchesKeyword(todo: TodoItem, keyword: string) {
  if (!keyword) return true

  const normalizedKeyword = keyword.toLowerCase()
  return [todo.title, todo.description]
    .filter(Boolean)
    .some((value) => value.toLowerCase().includes(normalizedKeyword))
}

function StatusBadge({ status }: { status: number }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG[TodoStatus.PENDING_REVIEW]
  const Icon = config.icon
  return (
    <Badge variant={config.variant}>
      <Icon className="size-3" />
      {config.label}
    </Badge>
  )
}

function ActionButtons({ todo, onEdit, onApprove, onReject, onComplete, onCancel, onRollback, onDelete }: {
  todo: TodoItem
  onEdit: (todo: TodoItem) => void
  onApprove: (id: number) => Promise<void>
  onReject: (id: number) => Promise<void>
  onComplete: (id: number) => Promise<void>
  onCancel: (id: number) => Promise<void>
  onRollback: (id: number) => Promise<void>
  onDelete: (id: number) => Promise<void>
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {todo.status === TodoStatus.PENDING_REVIEW ? (
        <>
          <Button type="button" variant="outline" size="xs" onClick={() => void onApprove(todo.id)}>
            审核通过
          </Button>
          <Button type="button" variant="destructive" size="xs" onClick={() => void onReject(todo.id)}>
            <XCircleIcon className="size-3.5" />
            审核失败
          </Button>
        </>
      ) : null}
      {todo.status === TodoStatus.REVIEW_FAILED ? (
        <Button type="button" variant="outline" size="xs" onClick={() => void onApprove(todo.id)}>
          审核通过
        </Button>
      ) : null}
      {todo.status === TodoStatus.TODO ? (
        <Button type="button" variant="outline" size="xs" onClick={() => void onComplete(todo.id)}>
          完成
        </Button>
      ) : null}
      {todo.status === TodoStatus.COMPLETED ? (
        <>
          <Button type="button" variant="outline" size="xs" onClick={() => void onRollback(todo.id)}>
            回退
          </Button>
          <Button type="button" variant="destructive" size="xs" onClick={() => void onCancel(todo.id)}>
            <XCircleIcon className="size-3.5" />
            取消任务
          </Button>
        </>
      ) : null}
      <Button type="button" variant="outline" size="xs" onClick={() => onEdit(todo)}>
        <PencilIcon className="size-3.5" />
        编辑
      </Button>
      <Button type="button" variant="destructive" size="xs" onClick={() => void onDelete(todo.id)}>
        <Trash2Icon className="size-3.5" />
        删除
      </Button>
    </div>
  )
}

export function TodoPage() {
  const {
    todos, loading, error,
    clearError,
    fetchTodos, createTodo, updateTodo,
    approveTodo, rejectTodo, completeTodo, cancelTodo, rollbackTodo, deleteTodo,
  } = useTodoStore()

  const [statusInput, setStatusInput] = useState<StatusFilterValue>(ALL_STATUS)
  const [keywordInput, setKeywordInput] = useState('')
  const [appliedStatus, setAppliedStatus] = useState<StatusFilterValue>(ALL_STATUS)
  const [appliedKeyword, setAppliedKeyword] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('create')
  const [todoForm, setTodoForm] = useState(EMPTY_FORM)

  useEffect(() => {
    void fetchTodos()
  }, [fetchTodos])

  useEffect(() => {
    if (!error) return
    toast.error(error)
    clearError()
  }, [clearError, error])

  const filteredTodos = todos.filter((todo) => matchesKeyword(todo, appliedKeyword))

  const refreshTodos = async (statusValue = appliedStatus) => {
    await fetchTodos(toStatus(statusValue))
  }

  const handleSearch = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault()
    setAppliedKeyword(keywordInput.trim())
    setAppliedStatus(statusInput)
    await fetchTodos(toStatus(statusInput))
  }

  const handleReset = async () => {
    setKeywordInput('')
    setStatusInput(ALL_STATUS)
    setAppliedKeyword('')
    setAppliedStatus(ALL_STATUS)
    await fetchTodos()
  }

  const handleCreateClick = () => {
    setDrawerMode('create')
    setTodoForm(EMPTY_FORM)
    setDrawerOpen(true)
  }

  const handleEdit = (todo: TodoItem) => {
    setDrawerMode('edit')
    setTodoForm({
      id: todo.id,
      title: todo.title,
      description: todo.description ?? '',
    })
    setDrawerOpen(true)
  }

  const handleDrawerSubmit = async () => {
    const title = todoForm.title.trim()
    const description = todoForm.description.trim()
    if (!title) return

    if (drawerMode === 'create') {
      const created = await createTodo({ title, description })
      if (!created) return
      await refreshTodos()
      toast.success('待办已创建')
    } else {
      if (todoForm.id === null) return
      const updated = await updateTodo(todoForm.id, { title, description })
      if (!updated) return
      await refreshTodos()
      toast.success('待办已更新')
    }

    setDrawerOpen(false)
    setTodoForm(EMPTY_FORM)
  }

  const handleApprove = async (id: number) => {
    const updated = await approveTodo(id)
    if (!updated) return
    await refreshTodos()
    toast.success('审核通过')
  }

  const handleReject = async (id: number) => {
    const updated = await rejectTodo(id)
    if (!updated) return
    await refreshTodos()
    toast.warning('已标记为审核失败')
  }

  const handleComplete = async (id: number) => {
    const updated = await completeTodo(id)
    if (!updated) return
    await refreshTodos()
    toast.success('已标记完成')
  }

  const handleCancel = async (id: number) => {
    const updated = await cancelTodo(id)
    if (!updated) return
    await refreshTodos()
    toast.warning('任务已取消')
  }

  const handleRollback = async (id: number) => {
    const updated = await rollbackTodo(id)
    if (!updated) return
    await refreshTodos()
    toast.success('已回退到待办')
  }

  const handleDelete = async (id: number) => {
    const success = await deleteTodo(id)
    if (!success) return
    await refreshTodos()
    toast.success('已删除')
  }

  return (
    <div className="space-y-6">
      <Card size="sm">
        <CardContent className="space-y-4">
          <form className="grid gap-3 lg:grid-cols-[220px_220px_auto]" onSubmit={handleSearch}>
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
              <Label htmlFor="todo-keyword" className="shrink-0 text-sm text-foreground">
                关键词
              </Label>
              <Input
                id="todo-keyword"
                placeholder="搜索标题或描述"
                className="w-full sm:w-[220px]"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
              <Label htmlFor="todo-status" className="shrink-0 text-sm text-foreground">
                状态
              </Label>
              <Select value={statusInput} onValueChange={(value) => setStatusInput(value as StatusFilterValue)}>
                <SelectTrigger id="todo-status" className="w-full sm:w-[160px]">
                  <SelectValue placeholder="全部状态" />
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={6}>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col justify-end gap-2 sm:flex-row lg:justify-end">
              <Button type="submit" variant="outline" size="sm" disabled={loading}>
                <SearchIcon className="size-4" />
                搜索
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={loading} onClick={() => void handleReset()}>
                <RotateCcwIcon className="size-4" />
                重置
              </Button>
              <Button type="button" size="sm" onClick={handleCreateClick}>
                <PlusIcon className="size-4" />
                新增
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <Card size="sm">
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">结果列表</h3>
              <p className="text-sm text-muted-foreground">
                当前共 {filteredTodos.length} 条
                {appliedKeyword ? `，关键词“${appliedKeyword}”` : ''}
              </p>
            </div>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <LoaderCircleIcon className="size-4 animate-spin" />
                正在加载
              </div>
            ) : null}
          </div>
          {loading && todos.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <LoaderCircleIcon className="size-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">加载中...</span>
            </div>
          ) : filteredTodos.length === 0 ? (
            <Empty className="min-h-[220px]">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CircleIcon className="size-4" />
                </EmptyMedia>
                <EmptyTitle>暂无匹配结果</EmptyTitle>
                <EmptyDescription>调整关键词或状态后重试，也可以直接新增一条待办。</EmptyDescription>
              </EmptyHeader>
              <Button type="button" size="sm" onClick={handleCreateClick}>
                <PlusIcon className="size-4" />
                新增待办
              </Button>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-56">标题</TableHead>
                  <TableHead className="min-w-28">状态</TableHead>
                  <TableHead className="min-w-36">创建时间</TableHead>
                  <TableHead className="min-w-28 text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTodos.map((todo) => (
                  <TableRow key={todo.id}>
                    <TableCell className="align-top">
                      <div className="space-y-1">
                        <div className="font-medium text-foreground">{todo.title}</div>
                        <p className="max-w-md whitespace-normal text-sm leading-6 text-muted-foreground">
                          {todo.description || '暂无描述'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <StatusBadge status={todo.status} />
                    </TableCell>
                    <TableCell className="align-top text-muted-foreground">
                      {formatDateTime(todo.createTime)}
                    </TableCell>
                    <TableCell className="align-top text-right">
                      <ActionButtons
                        todo={todo}
                        onEdit={handleEdit}
                        onApprove={handleApprove}
                        onReject={handleReject}
                        onComplete={handleComplete}
                        onCancel={handleCancel}
                        onRollback={handleRollback}
                        onDelete={handleDelete}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Drawer open={drawerOpen} direction="right" onOpenChange={setDrawerOpen}>
        <DrawerContent className="w-full sm:max-w-lg">
          <DrawerHeader>
            <DrawerTitle>{drawerMode === 'create' ? '新增待办' : '编辑待办'}</DrawerTitle>
            <DrawerDescription>
              {drawerMode === 'create'
                ? '填写标题和描述后保存，新的待办会出现在当前列表中。'
                : '修改待办内容后保存，列表会按当前筛选条件重新刷新。'}
            </DrawerDescription>
          </DrawerHeader>
          <div className="space-y-4 px-4 pb-2">
            <div className="space-y-2">
              <Label htmlFor="todo-title">标题</Label>
              <Input
                id="todo-title"
                placeholder="请输入待办标题"
                value={todoForm.title}
                onChange={(e) => setTodoForm((prev) => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="todo-description">描述</Label>
              <Textarea
                id="todo-description"
                placeholder="补充待办描述（可选）"
                rows={4}
                value={todoForm.description}
                onChange={(e) => setTodoForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>
          <DrawerFooter className="sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setDrawerOpen(false)}>
              取消
            </Button>
            <Button type="button" disabled={!todoForm.title.trim()} onClick={() => void handleDrawerSubmit()}>
              保存
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
