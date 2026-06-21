import type { AdminMenuIconKey } from '@super-pro/shared-types'
import type { LucideIcon } from 'lucide-react'
import {
  BarChart3Icon,
  BriefcaseIcon,
  FileTextIcon,
  FolderTreeIcon,
  HomeIcon,
  LayoutGridIcon,
  Settings2Icon,
  ShieldCheckIcon,
  SparklesIcon,
  Users2Icon,
} from 'lucide-react'

const adminMenuIconMap: Record<AdminMenuIconKey, LucideIcon> = {
  home: HomeIcon,
  users: Users2Icon,
  shield: ShieldCheckIcon,
  briefcase: BriefcaseIcon,
  'bar-chart-3': BarChart3Icon,
  'settings-2': Settings2Icon,
  'layout-grid': LayoutGridIcon,
  'folder-tree': FolderTreeIcon,
  'file-text': FileTextIcon,
  sparkles: SparklesIcon,
}

export const ADMIN_MENU_ICON_OPTIONS = [
  { value: 'home', label: '首页图标' },
  { value: 'users', label: '用户图标' },
  { value: 'shield', label: '权限图标' },
  { value: 'briefcase', label: '项目图标' },
  { value: 'bar-chart-3', label: '报表图标' },
  { value: 'settings-2', label: '设置图标' },
  { value: 'layout-grid', label: '分组图标' },
  { value: 'folder-tree', label: '树形图标' },
  { value: 'file-text', label: '文档图标' },
  { value: 'sparkles', label: '强调图标' },
] as const satisfies ReadonlyArray<{
  value: AdminMenuIconKey
  label: string
}>

export function resolveAdminMenuIcon(iconKey: AdminMenuIconKey | undefined, fallback: LucideIcon) {
  if (!iconKey) {
    return fallback
  }

  return adminMenuIconMap[iconKey] ?? fallback
}
