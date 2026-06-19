import type { GlobalConfigType } from '@super-pro/shared-types'

export type GlobalConfigProjectOption = {
  id: number
  projectName: string
  projectCode: string
}

export function resolveSelectedProjectId(
  currentProjectId: number | null,
  visibleProjects: GlobalConfigProjectOption[],
) {
  if (visibleProjects.length === 0) {
    return null
  }

  if (
    currentProjectId !== null &&
    visibleProjects.some((project) => project.id === currentProjectId)
  ) {
    return currentProjectId
  }

  return visibleProjects[0]!.id
}

export function normalizeConfigValueByType(
  type: GlobalConfigType,
  rawValue: string | number | boolean,
): string | number | boolean {
  if (type === 'text') {
    return typeof rawValue === 'string' ? rawValue.trim() : String(rawValue)
  }

  if (type === 'number') {
    if (typeof rawValue === 'number') {
      return rawValue
    }

    return Number(String(rawValue).trim())
  }

  if (typeof rawValue === 'boolean') {
    return rawValue
  }

  const normalizedValue = String(rawValue).trim().toLowerCase()
  return normalizedValue === 'true' || normalizedValue === '1'
}

export function stringifyConfigValue(
  type: GlobalConfigType,
  value: string | number | boolean,
) {
  if (type === 'boolean') {
    return value ? 'true' : 'false'
  }

  return String(value)
}
