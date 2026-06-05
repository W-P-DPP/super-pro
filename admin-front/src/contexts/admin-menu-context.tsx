import type { AdminMenuResponseDto } from '@super-pro/shared-types'
import type { PropsWithChildren } from 'react'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { AdminModule } from '@/data/admin-navigation'
import { adminModules, getAdminModuleBySlug } from '@/data/admin-navigation'
import { getAdminMenuTree } from '@/api/modules/admin-menu'
import { resolveAdminMenuIcon } from '@/lib/admin-menu-icons'

export type AdminMenuLoadStatus = 'idle' | 'loading' | 'success' | 'error'

export interface RuntimeAdminModule extends AdminModule {
  id: number
  parentId: number | null
  status: number
  sort: number
  iconKey: AdminMenuResponseDto['iconKey']
  menuType: 'item'
  permissionCode: string
  remark: string
}

export interface RuntimeAdminNavGroup {
  id: number
  label: string
  status: number
  sort: number
  iconKey: AdminMenuResponseDto['iconKey']
  items: RuntimeAdminModule[]
}

type AdminMenuContextValue = {
  status: AdminMenuLoadStatus
  errorMessage: string
  menuTree: AdminMenuResponseDto[]
  navGroups: RuntimeAdminNavGroup[]
  visibleNavGroups: RuntimeAdminNavGroup[]
  modules: RuntimeAdminModule[]
  visibleModules: RuntimeAdminModule[]
  getModuleBySlug: (slug?: string) => RuntimeAdminModule | undefined
  reload: () => void
}

const AdminMenuContext = createContext<AdminMenuContextValue | null>(null)

function buildDefaultRuntimeModule(slug: string, title: string, group: string): AdminModule {
  return {
    slug,
    title,
    shortTitle: title,
    group,
    description: '当前菜单尚未配置说明，可继续补充页面信息与业务说明。',
    icon: resolveAdminMenuIcon('layout-grid', adminModules[0]!.icon),
    metrics: [
      { label: '当前菜单', value: title, hint: '来自后台菜单配置' },
      { label: '页面状态', value: '已接入', hint: '菜单已切换为后端驱动' },
      { label: '待完善字段', value: '3', hint: '可继续补充说明、角标和权限编码' },
      { label: '默认渲染', value: '占位页', hint: '未注册专属页面时会走统一占位模板' },
    ],
    highlights: [
      { title: '菜单已接入后端', detail: '当前模块已经由后台菜单控制显示、排序和分组。', status: '已完成' },
      { title: '页面可继续扩展', detail: '后续可按需把占位页替换成真实业务页面。', status: '可实施' },
      { title: '权限可继续挂载', detail: '建议为菜单补充对应权限编码，便于后续联动控制。', status: '建议' },
    ],
    table: {
      title: '默认菜单信息',
      description: '当前模块暂未配置专属占位内容，这里展示通用信息结构。',
      columns: ['字段', '说明', '来源', '状态'],
      rows: [
        ['菜单名称', title, '后台菜单', '已接入'],
        ['菜单分组', group, '后台菜单', '已接入'],
        ['页面说明', '可在 BMS 菜单页继续维护', '后台菜单', '可编辑'],
        ['路由能力', slug, '前端路由', '待确认'],
      ],
    },
    primaryAction: '新增菜单',
    secondaryAction: '查看详情',
  }
}

function buildRuntimeModule(
  node: AdminMenuResponseDto,
  parent: AdminMenuResponseDto,
): RuntimeAdminModule {
  const fallback = getAdminModuleBySlug(node.slug ?? undefined)
  const baseModule = fallback ?? buildDefaultRuntimeModule(node.slug ?? `menu-${node.id}`, node.name, parent.name)

  return {
    ...baseModule,
    id: node.id,
    parentId: node.parentId,
    slug: node.slug ?? baseModule.slug,
    title: node.name,
    shortTitle: node.shortTitle.trim() || baseModule.shortTitle,
    group: parent.name,
    description: node.description.trim() || baseModule.description,
    badge: node.badge.trim() || baseModule.badge,
    icon: resolveAdminMenuIcon(node.iconKey, baseModule.icon),
    status: node.status,
    sort: node.sort,
    iconKey: node.iconKey,
    menuType: 'item',
    permissionCode: node.permissionCode.trim(),
    remark: node.remark.trim(),
  }
}

function buildMenuViewModel(tree: AdminMenuResponseDto[]) {
  const navGroups = tree
    .filter((node) => node.menuType === 'group')
    .sort((left, right) => left.sort - right.sort || left.id - right.id)
    .map((group) => ({
      id: group.id,
      label: group.name,
      status: group.status,
      sort: group.sort,
      iconKey: group.iconKey,
      items: group.children
        .filter((item) => item.menuType === 'item' && item.slug)
        .sort((left, right) => left.sort - right.sort || left.id - right.id)
        .map((item) => buildRuntimeModule(item, group)),
    }))
    .filter((group) => group.items.length > 0)

  const modules = navGroups.flatMap((group) => group.items)
  const visibleNavGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.status === 1),
    }))
    .filter((group) => group.status === 1 && group.items.length > 0)
  const visibleModules = visibleNavGroups.flatMap((group) => group.items)

  return {
    navGroups,
    visibleNavGroups,
    modules,
    visibleModules,
  }
}

export function AdminMenuProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AdminMenuLoadStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [menuTree, setMenuTree] = useState<AdminMenuResponseDto[]>([])
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function loadMenuTree() {
      setStatus('loading')
      setErrorMessage('')

      try {
        const data = await getAdminMenuTree({ forceRefresh: reloadKey > 0 })

        if (cancelled) {
          return
        }

        setMenuTree(data)
        setStatus('success')
      } catch (error) {
        if (cancelled) {
          return
        }

        setMenuTree([])
        setStatus('error')
        setErrorMessage(error instanceof Error ? error.message : '获取后台菜单失败，请稍后重试。')
      }
    }

    void loadMenuTree()

    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const menuViewModel = useMemo(() => buildMenuViewModel(menuTree), [menuTree])

  const value = useMemo<AdminMenuContextValue>(
    () => ({
      status,
      errorMessage,
      menuTree,
      navGroups: menuViewModel.navGroups,
      visibleNavGroups: menuViewModel.visibleNavGroups,
      modules: menuViewModel.modules,
      visibleModules: menuViewModel.visibleModules,
      getModuleBySlug: (slug) => menuViewModel.modules.find((module) => module.slug === slug),
      reload: () => setReloadKey((currentValue) => currentValue + 1),
    }),
    [errorMessage, menuTree, menuViewModel, status],
  )

  return <AdminMenuContext.Provider value={value}>{children}</AdminMenuContext.Provider>
}

export function useAdminMenu() {
  const context = useContext(AdminMenuContext)

  if (!context) {
    throw new Error('useAdminMenu 必须在 AdminMenuProvider 内使用')
  }

  return context
}
