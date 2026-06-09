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
    name: '\u5e94\u7528',
    iconKey: 'sparkles',
    menuType: 'group',
    children: [
      {
        name: '\u5f85\u529e\u7ba1\u7406',
        shortTitle: '\u5f85\u529e',
        slug: 'todos',
        iconKey: 'file-text',
        menuType: 'item',
        description:
          '\u7edf\u4e00\u7ba1\u7406\u56e2\u961f\u5f85\u529e\u4efb\u52a1\uff0c\u652f\u6301\u5f85\u5ba1\u6838\u3001\u8fdb\u884c\u4e2d\u3001\u5df2\u5b8c\u6210\u7b49\u72b6\u6001\u7684\u521b\u5efa\u3001\u67e5\u8be2\u3001\u7f16\u8f91\u4e0e\u5220\u9664\u3002',
        permissionCode: ADMIN_CONSOLE_PERMISSION_CODES.todosMenuView,
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
