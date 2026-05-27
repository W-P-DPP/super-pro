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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
} from '@/components/ui'
import {
  createProject,
  deleteProject,
  getProjects,
  type CreateProjectRequestDto,
  type ProjectResponseDto,
  type UpdateProjectRequestDto,
  updateProject,
} from '@/api/modules/projects'
import {
  DEFAULT_PAGE_SIZE,
  ListPagination,
  type LoadState,
} from './module-page-shared'

type ProjectFilters = {
  keyword: string
}

type ProjectFormState = {
  projectName: string
  projectCode: string
}

const TABLE_COLUMN_COUNT = 4

export function ProjectsPage() {
  const [projectRows, setProjectRows] = useState<ProjectResponseDto[]>([])
  const [totalProjects, setTotalProjects] = useState(0)
  const [loadState, setLoadState] = useState<LoadState>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [keyword, setKeyword] = useState('')
  const [appliedFilters, setAppliedFilters] = useState<ProjectFilters>({
    keyword: '',
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [reloadKey, setReloadKey] = useState(0)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const [editingProject, setEditingProject] = useState<ProjectResponseDto | null>(null)
  const [isSavingProject, setIsSavingProject] = useState(false)
  const [deletingProject, setDeletingProject] = useState<ProjectResponseDto | null>(null)
  const [isDeletingProject, setIsDeletingProject] = useState(false)
  const [createDraft, setCreateDraft] = useState<ProjectFormState>({
    projectName: '',
    projectCode: '',
  })
  const [editingDraft, setEditingDraft] = useState<ProjectFormState>({
    projectName: '',
    projectCode: '',
  })

  function buildProjectListQuery(filters: ProjectFilters, page: number, nextPageSize: number) {
    return {
      ...(filters.keyword.trim() ? { keyword: filters.keyword.trim() } : {}),
      page,
      pageSize: nextPageSize,
    }
  }

  async function loadProjects() {
    setLoadState('loading')
    setErrorMessage('')

    try {
      const result = await getProjects(buildProjectListQuery(appliedFilters, currentPage, pageSize))
      setProjectRows(result.items)
      setTotalProjects(result.total)

      if (result.page !== currentPage) {
        setCurrentPage(result.page)
      }

      setLoadState('success')
    } catch (error) {
      setProjectRows([])
      setTotalProjects(0)
      setLoadState('error')
      setErrorMessage(error instanceof Error ? error.message : '加载项目列表失败，请稍后重试。')
    }
  }

  useEffect(() => {
    void loadProjects()
  }, [appliedFilters, currentPage, pageSize, reloadKey])

  const totalPages = Math.max(1, Math.ceil(totalProjects / pageSize))
  const isEditDialogOpen = editingProject !== null
  const canCreateProject = createDraft.projectName.trim().length > 0 && createDraft.projectCode.trim().length > 0
  const canSaveProject = editingDraft.projectName.trim().length > 0 && editingDraft.projectCode.trim().length > 0

  function handleCloseCreateDialog() {
    setIsCreateDialogOpen(false)
    setCreateDraft({
      projectName: '',
      projectCode: '',
    })
  }

  function handleEditProject(project: ProjectResponseDto) {
    setEditingProject(project)
    setEditingDraft({
      projectName: project.projectName,
      projectCode: project.projectCode,
    })
  }

  function handleCloseEditDialog() {
    setEditingProject(null)
    setEditingDraft({
      projectName: '',
      projectCode: '',
    })
  }

  async function handleCreateProject() {
    if (!canCreateProject || isCreatingProject) {
      return
    }

    setIsCreatingProject(true)

    try {
      await createProject({
        projectName: createDraft.projectName.trim(),
        projectCode: createDraft.projectCode.trim(),
      } satisfies CreateProjectRequestDto)

      toast.success('项目已新增')
      handleCloseCreateDialog()
      setCurrentPage(1)
      setReloadKey((currentValue) => currentValue + 1)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '新增项目失败，请稍后重试。')
    } finally {
      setIsCreatingProject(false)
    }
  }

  async function handleSaveProject() {
    if (!editingProject || !canSaveProject || isSavingProject) {
      return
    }

    setIsSavingProject(true)

    try {
      await updateProject(editingProject.id, {
        projectName: editingDraft.projectName.trim(),
        projectCode: editingDraft.projectCode.trim(),
      } satisfies UpdateProjectRequestDto)

      toast.success('项目信息已更新')
      handleCloseEditDialog()
      setReloadKey((currentValue) => currentValue + 1)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '更新项目失败，请稍后重试。')
    } finally {
      setIsSavingProject(false)
    }
  }

  async function handleDeleteProject() {
    if (!deletingProject || isDeletingProject) {
      return
    }

    setIsDeletingProject(true)

    try {
      await deleteProject(deletingProject.id)
      toast.success('项目已删除')
      setDeletingProject(null)

      if (currentPage > 1 && projectRows.length === 1) {
        setCurrentPage(currentPage - 1)
      } else {
        setReloadKey((currentValue) => currentValue + 1)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除项目失败，请稍后重试。')
    } finally {
      setIsDeletingProject(false)
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-[var(--app-shell-page-width)] flex-col gap-4 px-4 py-4 md:px-6 md:py-6">
      <Card className="border border-border/70 bg-card/95 shadow-sm">
        <CardContent className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索项目名称或项目编码"
              className="h-9 pl-9"
            />
          </div>
          <Button
            type="button"
            className="h-9"
            onClick={() => {
              setCurrentPage(1)
              setAppliedFilters({ keyword })
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
              setKeyword('')
              setCurrentPage(1)
              setAppliedFilters({ keyword: '' })
              setReloadKey((currentValue) => currentValue + 1)
            }}
          >
            <RotateCcwIcon data-icon="inline-start" />
            重置
          </Button>
          <Button type="button" className="h-9" onClick={() => setIsCreateDialogOpen(true)}>
            <PlusIcon data-icon="inline-start" />
            新增项目
          </Button>
        </CardContent>
      </Card>

      <Card className="border border-border/70 bg-card/95 shadow-sm">
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>项目名称</TableHead>
                <TableHead>项目编码</TableHead>
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
                      <span>正在加载项目列表...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : loadState === 'error' ? (
                <TableRow>
                  <TableCell colSpan={TABLE_COLUMN_COUNT} className="h-24 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <span>{errorMessage || '加载项目列表失败，请稍后重试。'}</span>
                      <Button type="button" variant="outline" size="sm" onClick={() => void loadProjects()}>
                        重试
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : projectRows.length > 0 ? (
                projectRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.projectName}</TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{row.projectCode}</span>
                    </TableCell>
                    <TableCell>{row.updateTime || row.createTime || '--'}</TableCell>
                    <TableCell>
                      <div className="flex flex-nowrap items-center gap-2 whitespace-nowrap">
                        <Button type="button" variant="ghost" size="sm" onClick={() => handleEditProject(row)}>
                          修改
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeletingProject(row)}
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
                    没有匹配的项目数据。
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <ListPagination
            currentPage={currentPage}
            totalPages={totalPages}
            total={totalProjects}
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
            <DialogTitle>新增项目</DialogTitle>
            <DialogDescription>填写项目名称和项目编码后创建项目。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <div className="text-sm font-medium">项目名称</div>
              <Input
                value={createDraft.projectName}
                onChange={(event) => setCreateDraft((currentDraft) => ({ ...currentDraft, projectName: event.target.value }))}
                placeholder="请输入项目名称"
              />
            </div>
            <div className="grid gap-2">
              <div className="text-sm font-medium">项目编码</div>
              <Input
                value={createDraft.projectCode}
                onChange={(event) => setCreateDraft((currentDraft) => ({ ...currentDraft, projectCode: event.target.value }))}
                placeholder="请输入项目编码，例如 user-center"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCloseCreateDialog}>
              取消
            </Button>
            <Button type="button" onClick={() => void handleCreateProject()} disabled={!canCreateProject || isCreatingProject}>
              {isCreatingProject ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={(open) => (!open ? handleCloseEditDialog() : null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>修改项目</DialogTitle>
            <DialogDescription>支持调整项目名称和项目编码。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <div className="text-sm font-medium">项目名称</div>
              <Input
                value={editingDraft.projectName}
                onChange={(event) => setEditingDraft((currentDraft) => ({ ...currentDraft, projectName: event.target.value }))}
                placeholder="请输入项目名称"
              />
            </div>
            <div className="grid gap-2">
              <div className="text-sm font-medium">项目编码</div>
              <Input
                value={editingDraft.projectCode}
                onChange={(event) => setEditingDraft((currentDraft) => ({ ...currentDraft, projectCode: event.target.value }))}
                placeholder="请输入项目编码"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCloseEditDialog}>
              取消
            </Button>
            <Button type="button" onClick={() => void handleSaveProject()} disabled={!canSaveProject || isSavingProject}>
              {isSavingProject ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deletingProject !== null} onOpenChange={(open) => (!open ? setDeletingProject(null) : null)}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>删除项目</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingProject ? `确认删除项目“${deletingProject.projectName}”吗？删除后当前列表将立即更新。` : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingProject}>取消</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void handleDeleteProject()}>
              {isDeletingProject ? '删除中...' : '删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
