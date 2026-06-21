import type { AdminMenuResponseDto } from '@super-pro/shared-types'
import { describe, expect, it } from 'vitest'
import { buildMenuViewModel } from '@/contexts/admin-menu-context'

const dashboardTree: AdminMenuResponseDto[] = [
  {
    id: 1,
    parentId: null,
    name: '概览',
    shortTitle: '概览',
    slug: null,
    iconKey: 'layout-grid',
    menuType: 'group',
    status: 1,
    sort: 0,
    description: '',
    badge: '',
    permissionCode: '',
    children: [
      {
        id: 2,
        parentId: 1,
        name: '工作台',
        shortTitle: '概览',
        slug: 'dashboard',
        iconKey: 'home',
        menuType: 'item',
        status: 1,
        sort: 0,
        description: '',
        badge: '',
        permissionCode: '',
        children: [],
        remark: '',
      },
    ],
    remark: '',
  },
]

const customModuleTree: AdminMenuResponseDto[] = [
  {
    id: 10,
    parentId: null,
    name: '应用',
    shortTitle: '应用',
    slug: null,
    iconKey: 'sparkles',
    menuType: 'group',
    status: 1,
    sort: 0,
    description: '',
    badge: '',
    permissionCode: '',
    children: [
      {
        id: 11,
        parentId: 10,
        name: '自定义模块',
        shortTitle: '自定义',
        slug: 'custom-module',
        iconKey: 'file-text',
        menuType: 'item',
        status: 1,
        sort: 0,
        description: '',
        badge: '',
        permissionCode: '',
        children: [],
        remark: '',
      },
    ],
    remark: '',
  },
]

describe('admin-menu-context buildMenuViewModel', () => {
  it('does not synthesize missing modules from static navigation metadata', () => {
    const viewModel = buildMenuViewModel(dashboardTree, () => true)

    expect(viewModel.modules.map((module) => module.slug)).toEqual(['dashboard'])
    expect(viewModel.modules.some((module) => module.slug === 'todos')).toBe(false)
    expect(viewModel.visibleModules.map((module) => module.slug)).toEqual(['dashboard'])
  })

  it('uses readable Chinese copy for unknown backend modules', () => {
    const viewModel = buildMenuViewModel(customModuleTree, () => true)
    const module = viewModel.modules[0]

    expect(module?.description).toBe('当前菜单尚未配置说明，可继续补充页面信息与业务说明。')
    expect(module?.metrics[0]).toEqual({
      label: '当前菜单',
      value: '自定义模块',
      hint: '来自后台菜单配置',
    })
    expect(module?.table.columns).toEqual(['字段', '说明', '来源', '状态'])
  })
})
