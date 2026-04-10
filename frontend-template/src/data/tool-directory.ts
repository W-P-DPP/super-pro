import type { SiteMenuResponseDto } from '@/api/modules/site-menu'

const DEFAULT_SITE_MENU_ICON = '/icons/tool.svg'

export type ToolStats = {
  sectionCount: number
  itemCount: number
}

export type ToolDirectoryLoadStatus = 'loading' | 'success' | 'error'

export type ToolDirectoryContextValue = {
  status: ToolDirectoryLoadStatus
  menuTree: SiteMenuResponseDto[]
  stats: ToolStats
  errorMessage: string
  reload: () => void
}

export function isExternalLink(path: string) {
  return path.startsWith('http://') || path.startsWith('https://')
}

export function resolveSiteMenuIcon(icon: string | undefined) {
  const normalizedIcon = icon?.trim() ?? ''

  if (!normalizedIcon || normalizedIcon === 'icon-path') {
    return DEFAULT_SITE_MENU_ICON
  }

  if (isExternalLink(normalizedIcon) || normalizedIcon.startsWith('/')) {
    return normalizedIcon
  }

  return `/${normalizedIcon}`
}

function sortSiteMenuNodes(nodes: SiteMenuResponseDto[]) {
  return [...nodes].sort((left, right) => left.sort - right.sort || left.id - right.id)
}

export function normalizeSiteMenuRemark(remark: string | undefined) {
  const normalizedRemark = remark?.trim() ?? ''
  return normalizedRemark
}

export function normalizeSiteMenuTree(nodes: SiteMenuResponseDto[]): SiteMenuResponseDto[] {
  return sortSiteMenuNodes(nodes).map((node) => ({
    ...node,
    remark: normalizeSiteMenuRemark(node.remark),
    children: normalizeSiteMenuTree(node.children),
  }))
}

export function getSiteMenuDescription(remark: string | undefined) {
  const normalizedRemark = normalizeSiteMenuRemark(remark)
  return normalizedRemark || '暂无菜单说明'
}

export function buildToolStats(nodes: SiteMenuResponseDto[]): ToolStats {
  const normalizedNodes = normalizeSiteMenuTree(nodes)

  return {
    sectionCount: normalizedNodes.length,
    itemCount: normalizedNodes.reduce(
      (count, section) => count + (section.children.length > 0 ? section.children.length : 1),
      0,
    ),
  }
}

export const emptyToolStats: ToolStats = {
  sectionCount: 0,
  itemCount: 0,
}

export const searchEngines = [
  {
    key: 'baidu',
    label: '百度',
    buildUrl: (query: string) => `https://www.baidu.com/s?wd=${encodeURIComponent(query)}`,
  },
  {
    key: 'google',
    label: 'Google',
    buildUrl: (query: string) =>
      `https://www.google.com/search?q=${encodeURIComponent(query)}`,
  },
  {
    key: 'bing',
    label: 'Bing',
    buildUrl: (query: string) => `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
  },
  {
    key: 'so360',
    label: '360',
    buildUrl: (query: string) => `https://www.so.com/s?q=${encodeURIComponent(query)}`,
  },
  {
    key: 'sogou',
    label: '搜狗',
    buildUrl: (query: string) =>
      `https://www.sogou.com/web?query=${encodeURIComponent(query)}`,
  },
] as const
