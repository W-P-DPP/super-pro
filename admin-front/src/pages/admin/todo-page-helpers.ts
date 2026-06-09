import type { TodoProjectSummaryDto, TodoResponseDto } from '@super-pro/shared-types'

export type TodoProjectOption = {
  id: number
  projectName: string
  projectCode: string
}

function normalizeTodoProject(project: TodoProjectSummaryDto | TodoProjectOption | null | undefined): TodoProjectOption | null {
  if (!project) {
    return null
  }

  return {
    id: project.id,
    projectName: project.projectName,
    projectCode: project.projectCode,
  }
}

export function resolveTodoProjectOption(
  todo: Pick<TodoResponseDto, 'projectId' | 'project'>,
  options: TodoProjectOption[],
): TodoProjectOption | null {
  const projectFromResponse = normalizeTodoProject(todo.project)
  if (projectFromResponse) {
    return projectFromResponse
  }

  if (typeof todo.projectId !== 'number') {
    return null
  }

  return options.find((option) => option.id === todo.projectId) ?? null
}
