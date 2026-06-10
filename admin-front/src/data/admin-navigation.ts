import { ADMIN_CONSOLE_PERMISSION_CODES, type PermissionCode } from '@super-pro/shared-types'
import type { LucideIcon } from 'lucide-react'
import {
  BarChart3Icon,
  BriefcaseIcon,
  FileTextIcon,
  HomeIcon,
  Settings2Icon,
  ShieldCheckIcon,
  Users2Icon,
} from 'lucide-react'

export interface AdminMetric {
  label: string
  value: string
  hint: string
}

export interface AdminListItem {
  title: string
  detail: string
  status: string
}

export interface AdminTable {
  title: string
  description: string
  columns: string[]
  rows: string[][]
}

export interface AdminModule {
  slug: string
  title: string
  shortTitle: string
  group: string
  permissionCode?: PermissionCode
  description: string
  badge?: string
  icon: LucideIcon
  metrics: AdminMetric[]
  highlights: AdminListItem[]
  table: AdminTable
  primaryAction: string
  secondaryAction: string
}

export interface AdminNavGroup {
  label: string
  items: AdminModule[]
}

function buildModule(config: AdminModule): AdminModule {
  return config
}

export const adminModules: AdminModule[] = [
  buildModule({
    slug: 'dashboard',
    title: '\u5de5\u4f5c\u53f0',
    shortTitle: '\u6982\u89c8',
    group: '\u6982\u89c8',
    permissionCode: ADMIN_CONSOLE_PERMISSION_CODES.dashboardMenuView,
    description: '\u7ba1\u7406\u540e\u53f0\u7684\u9ed8\u8ba4\u9996\u9875\uff0c\u7528\u4e8e\u627f\u63a5\u6a21\u5757\u5165\u53e3\u3001\u6982\u89c8\u6570\u636e\u548c\u5feb\u6377\u64cd\u4f5c\u3002',
    badge: 'Beta',
    icon: HomeIcon,
    primaryAction: '\u521b\u5efa\u4efb\u52a1',
    secondaryAction: '\u67e5\u770b\u90e8\u7f72\u8bf4\u660e',
    metrics: [
      { label: '\u4eca\u65e5\u8bbf\u95ee', value: '12,480', hint: '\u8f83\u6628\u65e5 +8.2%' },
      { label: '\u5f85\u5904\u7406\u4e8b\u9879', value: '18', hint: '\u5176\u4e2d 5 \u9879\u8d85\u8fc7 SLA' },
      { label: '\u544a\u8b66\u6570\u91cf', value: '2', hint: '\u5747\u4e3a\u4f4e\u4f18\u5148\u7ea7' },
      { label: '\u6a21\u5757\u5165\u53e3', value: '7', hint: '\u53ef\u5feb\u901f\u8df3\u8f6c\u5230\u5df2\u63a5\u5165\u9875\u9762' },
    ],
    highlights: [
      { title: '\u83dc\u5355\u9aa8\u67b6', detail: '\u5df2\u63a5\u5165\u8def\u7531\u5b88\u536b\u3001\u6743\u9650\u63a7\u5236\u548c\u79fb\u52a8\u7aef\u5bf9\u5e94\u5e03\u5c40\u3002', status: '\u5df2\u5b8c\u6210' },
      { title: '\u4e3b\u9898\u80fd\u529b', detail: '\u57fa\u4e8e\u73b0\u6709 shadcn token \u4f53\u7cfb\u5ef6\u5c55\uff0c\u53ef\u7ee7\u7eed\u627f\u63a5\u771f\u5b9e\u4e1a\u52a1\u754c\u9762\u3002', status: '\u5df2\u5b8c\u6210' },
      { title: '\u6a21\u5757\u63a5\u5165', detail: '\u9875\u9762\u5360\u4f4d\u533a\u53ef\u968f\u65f6\u66ff\u6362\u4e3a\u771f\u5b9e CRUD \u6216\u5206\u6790\u4eea\u8868\u76d8\u3002', status: '\u8fdb\u884c\u4e2d' },
    ],
    table: {
      title: '\u8fd1\u671f\u63a8\u8fdb\u4e8b\u9879',
      description: '\u7528\u4e8e\u6a21\u62df\u540e\u53f0\u9996\u9875\u7684\u8fd0\u8425\u548c\u7814\u53d1\u4efb\u52a1\u9762\u677f\u3002',
      columns: ['\u4e8b\u9879', '\u8d1f\u8d23\u4eba', '\u72b6\u6001', '\u66f4\u65b0\u65f6\u95f4'],
      rows: [
        ['\u521d\u59cb\u5316\u7ba1\u7406\u540e\u53f0', '\u524d\u7aef', '\u5df2\u5b8c\u6210', '\u4eca\u5929 20:45'],
        ['\u68b3\u7406\u83dc\u5355\u6743\u9650\u6a21\u578b', '\u4ea7\u54c1', '\u5f85\u786e\u8ba4', '\u4eca\u5929 18:10'],
        ['\u63a5\u5165\u771f\u5b9e\u7edf\u8ba1\u63a5\u53e3', '\u540e\u7aef', '\u672a\u5f00\u59cb', '\u6628\u5929 16:20'],
        ['\u8865\u5145\u79fb\u52a8\u7aef\u4ea4\u4e92\u6821\u9a8c', '\u6d4b\u8bd5', '\u8fdb\u884c\u4e2d', '\u6628\u5929 10:05'],
      ],
    },
  }),
  buildModule({
    slug: 'users',
    title: '\u7528\u6237\u7ba1\u7406',
    shortTitle: '\u7528\u6237',
    group: '\u7ec4\u7ec7\u4e0e\u6743\u9650',
    permissionCode: ADMIN_CONSOLE_PERMISSION_CODES.usersMenuView,
    description: '\u7ba1\u7406\u540e\u53f0\u7528\u6237\u5217\u8868\u3001\u8d26\u53f7\u72b6\u6001\u3001\u89d2\u8272\u5206\u914d\u4e0e\u767b\u5f55\u4fe1\u606f\u3002',
    icon: Users2Icon,
    primaryAction: '\u65b0\u589e\u7528\u6237',
    secondaryAction: '\u5bfc\u51fa\u7528\u6237',
    metrics: [
      { label: '\u603b\u7528\u6237\u6570', value: '12,840', hint: '\u8fd17\u65e5 +426' },
      { label: '\u4eca\u65e5\u65b0\u589e', value: '126', hint: '\u8f6c\u5316\u7387 14.6%' },
      { label: '\u51bb\u7ed3\u8d26\u6237', value: '8', hint: '\u9700\u8981\u98ce\u63a7\u590d\u6838' },
      { label: '\u5b9e\u540d\u5b8c\u6210\u7387', value: '92%', hint: '\u76ee\u6807 95%' },
    ],
    highlights: [
      { title: '\u6279\u91cf\u5bfc\u5165', detail: '\u652f\u6301\u540e\u7eed\u6269\u5c55 CSV \u5bfc\u5165\u548c\u5f02\u6b65\u6821\u9a8c\u4efb\u52a1\u3002', status: '\u89c4\u5212\u4e2d' },
      { title: '\u6807\u7b7e\u4f53\u7cfb', detail: '\u53ef\u5728\u6b64\u9875\u9762\u8865\u5145\u7528\u6237\u5206\u5c42\u548c\u753b\u50cf\u6807\u7b7e\u3002', status: '\u5efa\u8bae' },
      { title: '\u767b\u5f55\u8f68\u8ff9', detail: '\u53ef\u5728\u8be6\u60c5\u62bd\u5c49\u6216\u72ec\u7acb\u9762\u677f\u4e2d\u627f\u63a5\u8bbe\u5907\u4e0e\u5730\u57df\u8bb0\u5f55\u3002', status: '\u5efa\u8bae' },
    ],
    table: {
      title: '\u6700\u8fd1\u7528\u6237\u53d8\u66f4',
      description: '\u5217\u8868\u533a\u53ef\u66ff\u6362\u4e3a\u771f\u5b9e\u5206\u9875\u8868\u683c\u4e0e\u7b5b\u9009\u8868\u5355\u3002',
      columns: ['\u7528\u6237', '\u624b\u673a\u53f7', '\u89d2\u8272', '\u72b6\u6001'],
      rows: [
        ['\u6797\u6668', '138****1024', '\u8fd0\u8425', '\u6b63\u5e38'],
        ['\u5468\u5b81', '139****8812', '\u5ba1\u6838\u5458', '\u6b63\u5e38'],
        ['\u9648\u96ea', '136****4211', '\u8bbf\u5ba2', '\u5f85\u6fc0\u6d3b'],
        ['\u738b\u51ef', '137****2209', '\u7ba1\u7406\u5458', '\u51bb\u7ed3'],
      ],
    },
  }),
  buildModule({
    slug: 'roles',
    title: '\u89d2\u8272\u7ba1\u7406',
    shortTitle: '\u89d2\u8272',
    group: '\u7ec4\u7ec7\u4e0e\u6743\u9650',
    permissionCode: ADMIN_CONSOLE_PERMISSION_CODES.rolesMenuView,
    description: '\u5b9a\u4e49\u540e\u53f0\u5c97\u4f4d\u89d2\u8272\u3001\u6210\u5458\u5f52\u5c5e\u4e0e\u9884\u8bbe\u6a21\u677f\uff0c\u4f5c\u4e3a\u6743\u9650\u5206\u914d\u7684\u6267\u884c\u5bf9\u8c61\u3002',
    icon: ShieldCheckIcon,
    primaryAction: '\u65b0\u5efa\u89d2\u8272',
    secondaryAction: '\u67e5\u770b\u5ba1\u8ba1',
    metrics: [
      { label: '\u89d2\u8272\u6570\u91cf', value: '14', hint: '\u8986\u76d6 5 \u4e2a\u4e1a\u52a1\u57df' },
      { label: '\u5f85\u5ba1\u6279\u53d8\u66f4', value: '3', hint: '\u6d89\u53ca\u751f\u4ea7\u6743\u9650' },
      { label: '\u83dc\u5355\u8282\u70b9', value: '48', hint: '\u542b 11 \u4e2a\u9690\u85cf\u5165\u53e3' },
      { label: '\u6309\u94ae\u6743\u9650', value: '132', hint: '\u5efa\u8bae\u6309\u6a21\u5757\u5206\u7ec4' },
    ],
    highlights: [
      { title: '\u5c97\u4f4d\u6a21\u677f', detail: '\u5efa\u8bae\u6309\u8fd0\u8425\u3001\u5ba1\u6838\u3001\u8d22\u52a1\u7b49\u5c97\u4f4d\u9884\u7f6e\u89d2\u8272\u6a21\u677f\u3002', status: '\u5efa\u8bae' },
      { title: '\u6210\u5458\u7559\u75d5', detail: '\u89d2\u8272\u6210\u5458\u589e\u5220\u5e94\u8865\u5145\u5ba1\u8ba1\u65e5\u5fd7\u4e0e\u5ba1\u6279\u5907\u6ce8\u3002', status: '\u5fc5\u5907' },
      { title: '\u8054\u52a8\u6743\u9650', detail: '\u89d2\u8272\u53ef\u76f4\u63a5\u5173\u8054\u83dc\u5355\u3001\u6309\u94ae\u548c\u6570\u636e\u8303\u56f4\u7b49\u6743\u9650\u96c6\u5408\u3002', status: '\u53ef\u5b9e\u65bd' },
    ],
    table: {
      title: '\u89d2\u8272\u6a21\u677f',
      description: '\u7528\u4e8e\u5c55\u793a\u89d2\u8272\u5b9a\u4e49\u4e0e\u5c97\u4f4d\u8986\u76d6\u60c5\u51b5\u3002',
      columns: ['\u89d2\u8272', '\u6210\u5458\u6570', '\u8986\u76d6\u5c97\u4f4d', '\u66f4\u65b0\u65f6\u95f4'],
      rows: [
        ['\u8d85\u7ea7\u7ba1\u7406\u5458', '2', '\u5168\u90e8\u7cfb\u7edf', '\u4eca\u5929 09:20'],
        ['\u8fd0\u8425\u4e3b\u7ba1', '6', '\u7528\u6237/\u6743\u9650', '\u6628\u5929 19:10'],
        ['\u5ba1\u6838\u4e13\u5458', '12', '\u5185\u5bb9\u5ba1\u6838', '\u6628\u5929 14:30'],
        ['\u8d22\u52a1\u4e13\u5458', '4', '\u8ba2\u5355\u7ed3\u7b97', '05-06 11:45'],
      ],
    },
  }),
  buildModule({
    slug: 'permissions',
    title: '\u6743\u9650\u7ba1\u7406',
    shortTitle: '\u6743\u9650',
    group: '\u7ec4\u7ec7\u4e0e\u6743\u9650',
    permissionCode: ADMIN_CONSOLE_PERMISSION_CODES.permissionsMenuView,
    description: '\u7edf\u4e00\u7ef4\u62a4\u83dc\u5355\u3001\u6309\u94ae\u3001\u63a5\u53e3\u548c\u6570\u636e\u8303\u56f4\u6743\u9650\uff0c\u5e76\u4e3a\u89d2\u8272\u5206\u914d\u63d0\u4f9b\u80fd\u529b\u3002',
    icon: ShieldCheckIcon,
    primaryAction: '\u65b0\u5efa\u6743\u9650',
    secondaryAction: '\u67e5\u770b\u53d8\u66f4\u8bb0\u5f55',
    metrics: [
      { label: '\u83dc\u5355\u6743\u9650', value: '48', hint: '\u542b 11 \u4e2a\u9690\u85cf\u5165\u53e3' },
      { label: '\u6309\u94ae\u6743\u9650', value: '132', hint: '\u5efa\u8bae\u6309\u6a21\u5757\u5206\u7ec4' },
      { label: '\u6570\u636e\u6743\u9650', value: '9', hint: '\u8986\u76d6\u90e8\u95e8\u4e0e\u533a\u57df\u8303\u56f4' },
      { label: '\u5f85\u53d1\u5e03\u53d8\u66f4', value: '3', hint: '\u6d89\u53ca\u751f\u4ea7\u6743\u9650\u8c03\u6574' },
    ],
    highlights: [
      { title: '\u6700\u5c0f\u6388\u6743', detail: '\u4f18\u5148\u6309\u89d2\u8272\u6a21\u677f\u5206\u914d\u6743\u9650\uff0c\u518d\u6309\u4e2a\u4f53\u4f8b\u5916\u9879\u6536\u6574\u3002', status: '\u5efa\u8bae' },
      { title: '\u83dc\u5355\u8054\u52a8', detail: '\u9875\u9762\u83dc\u5355\u3001\u6309\u94ae\u4e0e\u63a5\u53e3\u53ef\u5171\u7528\u4e00\u5957\u6743\u9650\u7f16\u7801\u4f53\u7cfb\u3002', status: '\u5fc5\u5907' },
      { title: '\u7070\u5ea6\u53d1\u5e03', detail: '\u9ad8\u98ce\u9669\u6743\u9650\u53ef\u5148\u5728\u6d4b\u8bd5\u73af\u5883\u6216\u6307\u5b9a\u89d2\u8272\u8303\u56f4\u5185\u9a8c\u8bc1\u3002', status: '\u53ef\u5b9e\u65bd' },
    ],
    table: {
      title: '\u6743\u9650\u6e05\u5355',
      description: '\u4f5c\u4e3a\u6743\u9650\u7ba1\u7406\u9875\u7684\u9ed8\u8ba4\u4fe1\u606f\uff0c\u7528\u4e8e\u627f\u63a5\u6811\u5f62\u7ed3\u6784\u4e0e\u5206\u7ec4\u7b5b\u9009\u3002',
      columns: ['\u6743\u9650\u9879', '\u7c7b\u578b', '\u4f5c\u7528\u8303\u56f4', '\u72b6\u6001'],
      rows: [
        ['user:view', '\u83dc\u5355', '\u7528\u6237\u7ba1\u7406', '\u542f\u7528'],
        ['role:edit', '\u6309\u94ae', '\u89d2\u8272\u7ba1\u7406', '\u542f\u7528'],
        ['site:publish', '\u63a5\u53e3', '\u7ad9\u70b9\u83dc\u5355', '\u5f85\u5ba1\u6838'],
        ['report:region', '\u6570\u636e', '\u533a\u57df\u7ef4\u5ea6', '\u542f\u7528'],
      ],
    },
  }),
  buildModule({
    slug: 'projects',
    title: '\u9879\u76ee\u7ba1\u7406',
    shortTitle: '\u9879\u76ee',
    group: '\u7ec4\u7ec7\u4e0e\u6743\u9650',
    permissionCode: ADMIN_CONSOLE_PERMISSION_CODES.projectsMenuView,
    description: '\u7edf\u4e00\u7ef4\u62a4\u540e\u53f0\u9879\u76ee\u6863\u6848\uff0c\u652f\u6301\u9879\u76ee\u540d\u79f0\u4e0e\u9879\u76ee\u7f16\u7801\u7684\u65b0\u589e\u3001\u4fee\u6539\u3001\u67e5\u8be2\u548c\u5220\u9664\u3002',
    icon: BriefcaseIcon,
    primaryAction: '\u65b0\u589e\u9879\u76ee',
    secondaryAction: '\u67e5\u770b\u7f16\u7801\u89c4\u8303',
    metrics: [
      { label: '\u9879\u76ee\u603b\u6570', value: '12', hint: '\u5efa\u8bae\u6309\u4e1a\u52a1\u7ebf\u6301\u7eed\u5f52\u6863' },
      { label: '\u672c\u5468\u65b0\u589e', value: '3', hint: '\u7528\u4e8e\u652f\u6491\u65b0\u6743\u9650\u4e0e\u65b0\u83dc\u5355\u6302\u8f7d' },
      { label: '\u5f85\u8865\u6743\u9650', value: '2', hint: '\u521b\u5efa\u540e\u53ef\u7ee7\u7eed\u8865\u9f50\u89d2\u8272\u4e0e\u6743\u9650\u6620\u5c04' },
      { label: '\u7f16\u7801\u51b2\u7a81', value: '0', hint: '\u4fdd\u6301\u5168\u5c40\u552f\u4e00' },
    ],
    highlights: [
      { title: '\u552f\u4e00\u7f16\u7801', detail: '\u9879\u76ee\u7f16\u7801\u5efa\u8bae\u4f5c\u4e3a\u6743\u9650\u3001\u83dc\u5355\u548c\u73af\u5883\u914d\u7f6e\u7684\u7edf\u4e00\u5173\u8054\u952e\u3002', status: '\u5fc5\u5907' },
      { title: '\u8f7b\u91cf\u7ef4\u62a4', detail: '\u5148\u63d0\u4f9b\u57fa\u7840 CRUD\uff0c\u540e\u7eed\u53ef\u7ee7\u7eed\u6269\u5c55\u8d1f\u8d23\u4eba\u3001\u72b6\u6001\u548c\u6743\u9650\u6620\u5c04\u3002', status: '\u53ef\u5b9e\u65bd' },
      { title: '\u7ec4\u7ec7\u590d\u7528', detail: '\u9879\u76ee\u53ef\u4f5c\u4e3a\u89d2\u8272\u5206\u914d\u3001\u8d44\u6e90\u9694\u79bb\u548c\u6570\u636e\u6743\u9650\u7684\u4e0a\u6e38\u7ef4\u5ea6\u3002', status: '\u5efa\u8bae' },
    ],
    table: {
      title: '\u6700\u8fd1\u9879\u76ee\u7ef4\u62a4',
      description: '\u7528\u4e8e\u627f\u63a5\u9879\u76ee\u7ba1\u7406\u9875\u7684\u9ed8\u8ba4\u4fe1\u606f\u7ed3\u6784\u3002',
      columns: ['\u9879\u76ee\u540d\u79f0', '\u9879\u76ee\u7f16\u7801', '\u7ef4\u62a4\u4eba', '\u72b6\u6001'],
      rows: [
        ['\u7528\u6237\u4e2d\u53f0', 'user-center', '\u7ba1\u7406\u5458', '\u5df2\u542f\u7528'],
        ['\u7ed3\u7b97\u7cfb\u7edf', 'finance-core', '\u8fd0\u8425', '\u5df2\u542f\u7528'],
        ['\u6570\u636e\u5e73\u53f0', 'data-platform', '\u4ea7\u54c1', '\u5f85\u8865\u5168'],
        ['\u7ba1\u7406\u540e\u53f0', 'admin-console', '\u524d\u7aef', '\u89c4\u5212\u4e2d'],
      ],
    },
  }),
  buildModule({
    slug: 'todos',
    title: '\u5f85\u529e\u7ba1\u7406',
    shortTitle: '\u5f85\u529e',
    group: '\u5e94\u7528',
    permissionCode: ADMIN_CONSOLE_PERMISSION_CODES.todosMenuView,
    description: '\u7edf\u4e00\u7ba1\u7406\u56e2\u961f\u5f85\u529e\u4efb\u52a1\uff0c\u652f\u6301\u5f85\u5ba1\u6838\u3001\u5f85\u529e\u3001\u8fdb\u884c\u4e2d\u3001\u5df2\u5b8c\u6210\u548c\u5df2\u53d6\u6d88\u7b49\u72b6\u6001\u7684 CRUD \u6d41\u7a0b\u3002',
    icon: FileTextIcon,
    primaryAction: '\u65b0\u5efa\u5f85\u529e',
    secondaryAction: '\u67e5\u770b\u534f\u4f5c\u8bf4\u660e',
    metrics: [
      { label: '\u5f85\u5ba1\u6838', value: '6', hint: '\u65b0\u5efa\u4efb\u52a1\u9ed8\u8ba4\u5165\u6b64\u961f\u5217' },
      { label: '\u8fdb\u884c\u4e2d', value: '14', hint: '\u5305\u542b\u524d\u540e\u7aef\u534f\u540c\u4efb\u52a1' },
      { label: '\u4eca\u65e5\u5b8c\u6210', value: '9', hint: '\u53ef\u7528\u4e8e\u89c2\u5bdf\u6267\u884c\u8282\u594f' },
      { label: '\u8d1f\u8d23\u4eba', value: '5', hint: '\u57fa\u4e8e\u542f\u7528\u7528\u6237\u8fdc\u7a0b\u9009\u62e9' },
    ],
    highlights: [
      { title: '\u72b6\u6001\u95ed\u73af', detail: '\u521b\u5efa\u540e\u9ed8\u8ba4\u8fdb\u5165\u5f85\u5ba1\u6838\uff0c\u540e\u7eed\u53ef\u5207\u6362\u4e3a\u5f85\u529e\u3001\u8fdb\u884c\u4e2d\u3001\u5df2\u5b8c\u6210\u6216\u5df2\u53d6\u6d88\u3002', status: '\u5df2\u89c4\u5212' },
      { title: '\u8fdc\u7a0b\u8d1f\u8d23\u4eba\u9009\u62e9', detail: '\u4e0d\u9884\u52a0\u8f7d\u5168\u91cf\u7528\u6237\uff0c\u53ea\u641c\u7d22\u5df2\u542f\u7528\u7528\u6237\uff0c\u5355\u6b21\u8fd4\u56de 20 \u6761\u3002', status: '\u5df2\u8bbe\u8ba1' },
      { title: '\u7ba1\u7406\u540e\u53f0 CRUD', detail: '\u9875\u9762\u652f\u6301\u5217\u8868\u3001\u7b5b\u9009\u3001\u65b0\u5efa\u3001\u7f16\u8f91\u548c\u5220\u9664\uff0c\u4fbf\u4e8e\u56e2\u961f\u76f4\u63a5\u7ba1\u7406\u4efb\u52a1\u3002', status: '\u5df2\u89c4\u5212' },
    ],
    table: {
      title: '\u5f85\u529e\u6267\u884c\u89c6\u56fe',
      description: '\u7528\u4e8e\u4fdd\u8bc1\u9759\u6001\u515c\u5e95\u83dc\u5355\u672a\u5237\u65b0\u65f6\uff0c\u4ecd\u80fd\u7ed9\u51fa\u4e00\u81f4\u7684\u6a21\u5757\u5b9a\u4f4d\u3002',
      columns: ['\u6807\u9898', '\u72b6\u6001', '\u8d1f\u8d23\u4eba', '\u622a\u6b62\u65f6\u95f4'],
      rows: [
        ['\u6743\u9650\u79cd\u5b50\u8865\u9f50', '\u5f85\u5ba1\u6838', '\u540e\u7aef', '06-09 18:00'],
        ['\u5f85\u529e\u9875\u9762\u8054\u8c03', '\u8fdb\u884c\u4e2d', '\u524d\u7aef', '06-10 12:00'],
        ['\u9a8c\u8bc1\u6743\u9650\u6309\u94ae', '\u5f85\u529e', '\u6d4b\u8bd5', '06-10 18:30'],
        ['\u53d1\u5e03\u5efa\u8868 DDL', '\u5df2\u5b8c\u6210', '\u8fd0\u7ef4', '06-11 09:00'],
      ],
    },
  }),
  buildModule({
    slug: 'reports',
    title: 'BMS\u83dc\u5355',
    shortTitle: 'BMS',
    group: '\u7cfb\u7edf\u7ba1\u7406',
    permissionCode: ADMIN_CONSOLE_PERMISSION_CODES.reportsMenuView,
    description: '\u7ef4\u62a4 BMS \u7aef\u83dc\u5355\u7ed3\u6784\u3001\u663e\u793a\u987a\u5e8f\u3001\u5165\u53e3\u72b6\u6001\u4e0e\u6743\u9650\u6302\u8f7d\u5173\u7cfb\u3002',
    icon: BarChart3Icon,
    primaryAction: '\u65b0\u589e\u83dc\u5355',
    secondaryAction: '\u67e5\u770b\u53d1\u5e03\u8bb0\u5f55',
    metrics: [
      { label: '\u83dc\u5355\u8282\u70b9', value: '36', hint: '\u542b 6 \u4e2a\u4e00\u7ea7\u83dc\u5355' },
      { label: '\u9690\u85cf\u5165\u53e3', value: '11', hint: '\u7528\u4e8e\u76f4\u8fbe\u6216\u7070\u5ea6\u529f\u80fd' },
      { label: '\u5f85\u53d1\u5e03\u53d8\u66f4', value: '2', hint: '\u9700\u8fd0\u8425\u786e\u8ba4\u6392\u5e8f' },
      { label: '\u5173\u8054\u6743\u9650', value: '48', hint: '\u4e0e\u6743\u9650\u7f16\u7801\u4fdd\u6301\u540c\u6b65' },
    ],
    highlights: [
      { title: '\u83dc\u5355\u6392\u5e8f', detail: '\u652f\u6301\u540e\u7eed\u6269\u5c55\u62d6\u62fd\u6392\u5e8f\u3001\u663e\u9690\u63a7\u5236\u548c\u7248\u672c\u5207\u6362\u3002', status: '\u5efa\u8bae' },
      { title: '\u6743\u9650\u6620\u5c04', detail: '\u83dc\u5355\u8282\u70b9\u5e94\u76f4\u63a5\u6620\u5c04\u5230\u6743\u9650\u7ba1\u7406\u4e2d\u7684\u83dc\u5355\u6743\u9650\u7f16\u7801\u3002', status: '\u5fc5\u5907' },
      { title: '\u53d1\u5e03\u7559\u75d5', detail: '\u83dc\u5355\u53d1\u5e03\u5efa\u8bae\u4fdd\u7559\u64cd\u4f5c\u4eba\u3001\u65f6\u95f4\u548c\u53d8\u66f4\u6458\u8981\u3002', status: '\u89c4\u5212\u4e2d' },
    ],
    table: {
      title: '\u6700\u8fd1\u83dc\u5355\u53d8\u66f4',
      description: '\u7528\u4e8e\u627f\u63a5 BMS \u83dc\u5355\u914d\u7f6e\u7684\u9ed8\u8ba4\u4fe1\u606f\u7ed3\u6784\u3002',
      columns: ['\u83dc\u5355', '\u5c42\u7ea7', '\u8d1f\u8d23\u4eba', '\u72b6\u6001'],
      rows: [
        ['\u5de5\u4f5c\u53f0', '\u4e00\u7ea7', '\u524d\u7aef', '\u5df2\u53d1\u5e03'],
        ['\u7528\u6237\u7ba1\u7406', '\u4e8c\u7ea7', '\u4ea7\u54c1', '\u5f85\u786e\u8ba4'],
        ['\u7ad9\u70b9\u83dc\u5355', '\u4e8c\u7ea7', '\u8fd0\u8425', '\u5df2\u53d1\u5e03'],
        ['\u7cfb\u7edf\u7ba1\u7406', '\u4e00\u7ea7', '\u7ba1\u7406\u5458', '\u7f16\u8f91\u4e2d'],
      ],
    },
  }),
  buildModule({
    slug: 'settings',
    title: '\u7ad9\u70b9\u83dc\u5355',
    shortTitle: '\u7ad9\u70b9',
    group: '\u7cfb\u7edf\u7ba1\u7406',
    permissionCode: ADMIN_CONSOLE_PERMISSION_CODES.settingsMenuView,
    description: '\u7ef4\u62a4\u7ad9\u70b9\u4fa7\u83dc\u5355\u914d\u7f6e\u3001\u5c55\u793a\u5165\u53e3\u548c\u7ad9\u70b9\u7ea7\u5bfc\u822a\u7ec4\u7ec7\u7ed3\u6784\u3002',
    icon: Settings2Icon,
    primaryAction: '\u65b0\u589e\u7ad9\u70b9\u83dc\u5355',
    secondaryAction: '\u67e5\u770b\u540c\u6b65\u72b6\u6001',
    metrics: [
      { label: '\u7ad9\u70b9\u680f\u76ee', value: '24', hint: '\u8986\u76d6 4 \u4e2a\u7ad9\u70b9\u5206\u533a' },
      { label: '\u5bfc\u822a\u5165\u53e3', value: '58', hint: '\u542b 9 \u4e2a\u9690\u85cf\u8282\u70b9' },
      { label: '\u5f85\u540c\u6b65\u9879', value: '4', hint: '\u542b 1 \u4e2a\u7ebf\u4e0a\u5dee\u5f02' },
      { label: '\u6700\u8fd1\u53d8\u66f4', value: '7', hint: '\u8fc7\u53bb 24 \u5c0f\u65f6' },
    ],
    highlights: [
      { title: '\u7ad9\u70b9\u5206\u5c42', detail: '\u5efa\u8bae\u6309\u9996\u9875\u3001\u9891\u9053\u9875\u3001\u5de5\u5177\u9875\u7b49\u7ef4\u5ea6\u62c6\u5206\u7ad9\u70b9\u83dc\u5355\u5c42\u7ea7\u3002', status: '\u5efa\u8bae' },
      { title: '\u5165\u53e3\u6821\u9a8c', detail: '\u83dc\u5355\u53d1\u5e03\u524d\u5e94\u6821\u9a8c\u94fe\u63a5\u3001\u56fe\u6807\u548c\u5c55\u793a\u7ec8\u7aef\u7684\u53ef\u7528\u6027\u3002', status: '\u5fc5\u5907' },
      { title: '\u540c\u6b65\u80fd\u529b', detail: '\u540e\u7eed\u53ef\u6269\u5c55\u4e3a\u591a\u7ad9\u70b9\u3001\u591a\u73af\u5883\u540c\u6b65\u53d1\u5e03\u6d41\u7a0b\u3002', status: '\u89c4\u5212\u4e2d' },
    ],
    table: {
      title: '\u6700\u8fd1\u7ad9\u70b9\u83dc\u5355\u8c03\u6574',
      description: '\u4f5c\u4e3a\u7ad9\u70b9\u83dc\u5355\u9875\u7684\u9ed8\u8ba4\u4fe1\u606f\u3002',
      columns: ['\u83dc\u5355\u9879', '\u7ad9\u70b9', '\u53d8\u66f4\u4eba', '\u72b6\u6001'],
      rows: [
        ['\u9996\u9875\u5feb\u6377\u5165\u53e3', '\u4e3b\u7ad9', '\u7ba1\u7406\u5458', '\u5df2\u751f\u6548'],
        ['\u5de5\u5177\u5bfc\u822a\u5206\u7ec4', '\u5de5\u5177\u7ad9', '\u524d\u7aef', '\u5f85\u5ba1\u6838'],
        ['\u5e2e\u52a9\u4e2d\u5fc3\u5165\u53e3', '\u4e3b\u7ad9', '\u8fd0\u8425', '\u5df2\u53d1\u5e03'],
        ['\u9875\u811a\u5bfc\u822a\u7ed3\u6784', '\u54c1\u724c\u7ad9', '\u4ea7\u54c1', '\u7f16\u8f91\u4e2d'],
      ],
    },
  }),
]

export const adminNavGroups: AdminNavGroup[] = [
  {
    label: '\u6982\u89c8',
    items: adminModules.filter((item) => item.group === '\u6982\u89c8'),
  },
  {
    label: '\u7ec4\u7ec7\u4e0e\u6743\u9650',
    items: adminModules.filter((item) => item.group === '\u7ec4\u7ec7\u4e0e\u6743\u9650'),
  },
  {
    label: '\u5e94\u7528',
    items: adminModules.filter((item) => item.group === '\u5e94\u7528'),
  },
  {
    label: '\u7cfb\u7edf\u7ba1\u7406',
    items: adminModules.filter((item) => item.group === '\u7cfb\u7edf\u7ba1\u7406'),
  },
]

export function getAdminModuleBySlug(slug?: string) {
  return adminModules.find((item) => item.slug === slug)
}
