import {
  ADMIN_CONSOLE_PERMISSION_CODES,
  type AdminMenuIconKey,
  type AdminMenuNodeType,
} from '@super-pro/shared-types';

export interface AdminMenuSeedNode {
  name: string;
  shortTitle?: string;
  slug?: string | null;
  iconKey: AdminMenuIconKey;
  menuType: AdminMenuNodeType;
  status?: number;
  description?: string;
  badge?: string;
  permissionCode?: string;
  remark?: string;
  children?: AdminMenuSeedNode[];
}

export const ADMIN_MENU_SEED_NODES: readonly AdminMenuSeedNode[] = [
  {
    name: '总览',
    iconKey: 'layout-grid',
    menuType: 'group',
    children: [
      {
        name: '工作台',
        shortTitle: '总览',
        slug: 'dashboard',
        iconKey: 'home',
        menuType: 'item',
        badge: 'Beta',
        description: '后台单页面应用的默认入口，用来承接菜单、统计、快捷操作和后续业务模块。',
        permissionCode: ADMIN_CONSOLE_PERMISSION_CODES.dashboardMenuView,
      },
    ],
  },
  {
    name: '组织与权限',
    iconKey: 'shield',
    menuType: 'group',
    children: [
      {
        name: '用户管理',
        shortTitle: '用户',
        slug: 'users',
        iconKey: 'users',
        menuType: 'item',
        description: '管理用户列表、账户状态、实名信息与最近登录行为。',
        permissionCode: ADMIN_CONSOLE_PERMISSION_CODES.usersMenuView,
      },
      {
        name: '角色管理',
        shortTitle: '角色',
        slug: 'roles',
        iconKey: 'shield',
        menuType: 'item',
        description: '定义后台岗位角色、成员归属与角色模板，作为权限分配的承载对象。',
        permissionCode: ADMIN_CONSOLE_PERMISSION_CODES.rolesMenuView,
      },
      {
        name: '权限管理',
        shortTitle: '权限',
        slug: 'permissions',
        iconKey: 'shield',
        menuType: 'item',
        description: '统一维护页面菜单、按钮操作和数据范围权限，并为角色分配提供能力。',
        permissionCode: ADMIN_CONSOLE_PERMISSION_CODES.permissionsMenuView,
      },
      {
        name: '项目管理',
        shortTitle: '项目',
        slug: 'projects',
        iconKey: 'briefcase',
        menuType: 'item',
        description: '统一维护后台项目档案，支持项目名称与项目编码的新建、修改、查询和删除。',
        permissionCode: ADMIN_CONSOLE_PERMISSION_CODES.projectsMenuView,
      },
    ],
  },
  {
    name: '系统管理',
    iconKey: 'settings-2',
    menuType: 'group',
    children: [
      {
        name: 'BMS菜单',
        shortTitle: 'BMS',
        slug: 'reports',
        iconKey: 'bar-chart-3',
        menuType: 'item',
        description: '维护 BMS 端菜单结构、显示顺序、入口状态与权限挂载关系。',
        permissionCode: ADMIN_CONSOLE_PERMISSION_CODES.reportsMenuView,
      },
      {
        name: '站点菜单',
        shortTitle: '站点',
        slug: 'settings',
        iconKey: 'settings-2',
        menuType: 'item',
        description: '维护站点侧菜单配置、展示入口和站点级导航组织结构。',
        permissionCode: ADMIN_CONSOLE_PERMISSION_CODES.settingsMenuView,
      },
    ],
  },
] as const;
