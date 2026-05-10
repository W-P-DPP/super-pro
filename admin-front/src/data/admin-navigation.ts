import type { LucideIcon } from 'lucide-react'
import {
  BarChart3Icon,
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

export const adminModules: AdminModule[] = [
  {
    slug: 'dashboard',
    title: '工作台',
    shortTitle: '总览',
    group: '总览',
    description: '后台单页面应用的默认入口，用来承接菜单、统计、快捷操作和后续业务模块。',
    badge: 'Beta',
    icon: HomeIcon,
    primaryAction: '创建任务',
    secondaryAction: '查看部署说明',
    metrics: [
      { label: '今日访问', value: '12,480', hint: '较昨日 +8.2%' },
      { label: '待处理事项', value: '18', hint: '其中 5 项超过 SLA' },
      { label: '告警数量', value: '2', hint: '均为低优先级' },
      { label: '已挂载菜单', value: '6', hint: '含 2 个系统管理菜单' },
    ],
    highlights: [
      { title: '菜单骨架已就位', detail: '支持桌面侧栏与移动端抽屉双形态切换。', status: '已完成' },
      { title: '主题切换已接入', detail: '浅色与深色均基于 shadcn-default token 工作。', status: '已完成' },
      { title: '业务页占位准备中', detail: '后续接入 API 与鉴权时可直接替换内容区。', status: '进行中' },
    ],
    table: {
      title: '近期推进事项',
      description: '用来模拟后台首页的运营与研发任务面板。',
      columns: ['事项', '负责人', '状态', '更新时间'],
      rows: [
        ['初始化管理后台项目', '前端', '已完成', '今天 20:45'],
        ['梳理菜单权限模型', '产品', '待确认', '今天 18:10'],
        ['接入真实统计接口', '后端', '未开始', '昨天 16:20'],
        ['补充移动端交互校验', '测试', '进行中', '昨天 10:05'],
      ],
    },
  },
  {
    slug: 'users',
    title: '用户管理',
    shortTitle: '用户',
    group: '组织与权限',
    description: '管理用户列表、账户状态、实名信息与最近登录行为。',
    icon: Users2Icon,
    primaryAction: '新增用户',
    secondaryAction: '导出用户',
    metrics: [
      { label: '总用户数', value: '12,840', hint: '近 7 日 +426' },
      { label: '今日新增', value: '126', hint: '转化率 14.6%' },
      { label: '冻结账户', value: '8', hint: '需要风控复核' },
      { label: '实名完成率', value: '92%', hint: '目标 95%' },
    ],
    highlights: [
      { title: '批量导入', detail: '支持后续扩展 CSV 导入和异步校验任务。', status: '规划中' },
      { title: '标签体系', detail: '建议在此页面补充用户分层和画像标签。', status: '建议' },
      { title: '登录轨迹', detail: '可在右侧详情抽屉承接设备与地域记录。', status: '建议' },
    ],
    table: {
      title: '最近用户变更',
      description: '列表区未来可替换成真实分页表格和筛选表单。',
      columns: ['用户', '手机号', '角色', '状态'],
      rows: [
        ['林晨', '138****1024', '运营', '正常'],
        ['周宁', '139****8812', '审核员', '正常'],
        ['陈雪', '136****4211', '访客', '待激活'],
        ['王凯', '137****2209', '管理员', '冻结'],
      ],
    },
  },
  {
    slug: 'roles',
    title: '角色管理',
    shortTitle: '角色',
    group: '组织与权限',
    description: '定义后台岗位角色、成员归属与角色模板，作为权限分配的承载对象。',
    icon: ShieldCheckIcon,
    primaryAction: '新建角色',
    secondaryAction: '查看审计',
    metrics: [
      { label: '角色数量', value: '14', hint: '覆盖 5 个业务域' },
      { label: '待审批变更', value: '3', hint: '涉及生产权限' },
      { label: '菜单节点', value: '48', hint: '含 11 个隐藏入口' },
      { label: '按钮权限', value: '132', hint: '建议按模块分组' },
    ],
    highlights: [
      { title: '岗位模板', detail: '建议按运营、审核、财务等岗位预置角色模板，再做细粒度调整。', status: '建议' },
      { title: '成员留痕', detail: '角色成员增删应补充审计日志与审批备注。', status: '必备' },
      { title: '联动权限', detail: '角色可直接关联菜单、按钮和数据范围等权限集合。', status: '可实施' },
    ],
    table: {
      title: '角色模板',
      description: '用于展示首版后台的角色定义与岗位覆盖情况。',
      columns: ['角色', '成员数', '覆盖岗位', '更新时间'],
      rows: [
        ['超级管理员', '2', '全部系统', '今天 09:20'],
        ['运营主管', '6', '用户/权限', '昨天 19:10'],
        ['审核专员', '12', '内容审核', '昨天 14:30'],
        ['财务专员', '4', '订单结算', '05-06 11:45'],
      ],
    },
  },
  {
    slug: 'permissions',
    title: '权限管理',
    shortTitle: '权限',
    group: '组织与权限',
    description: '统一维护页面菜单、按钮操作和数据范围权限，并为角色分配提供能力。',
    icon: ShieldCheckIcon,
    primaryAction: '新建权限',
    secondaryAction: '查看变更记录',
    metrics: [
      { label: '菜单权限', value: '48', hint: '含 11 个隐藏入口' },
      { label: '按钮权限', value: '132', hint: '建议按模块分组' },
      { label: '数据权限', value: '9', hint: '覆盖部门与区域范围' },
      { label: '待发布变更', value: '3', hint: '涉及生产权限调整' },
    ],
    highlights: [
      { title: '最小授权', detail: '优先按角色模板分配权限，再按个体例外项收敛。', status: '建议' },
      { title: '菜单联动', detail: '页面菜单、按钮与数据范围建议共用一套权限编码体系。', status: '必备' },
      { title: '灰度发布', detail: '高风险权限调整可先在测试环境或指定角色范围内验证。', status: '可实施' },
    ],
    table: {
      title: '权限清单',
      description: '作为权限管理页的默认占位信息，用于承接后续树形结构与分组筛选。',
      columns: ['权限项', '类型', '作用范围', '状态'],
      rows: [
        ['user:view', '菜单', '用户管理', '启用'],
        ['role:edit', '按钮', '角色管理', '启用'],
        ['site:publish', '按钮', '站点菜单', '待审批'],
        ['report:region', '数据', '区域维度', '启用'],
      ],
    },
  },
  {
    slug: 'reports',
    title: 'BMS菜单',
    shortTitle: 'BMS',
    group: '系统管理',
    description: '维护 BMS 端菜单结构、显示顺序、入口状态与权限挂载关系。',
    icon: BarChart3Icon,
    primaryAction: '新增菜单',
    secondaryAction: '查看发布记录',
    metrics: [
      { label: '菜单节点', value: '36', hint: '含 6 个一级菜单' },
      { label: '隐藏入口', value: '11', hint: '用于直达或灰度功能' },
      { label: '待发布变更', value: '2', hint: '需运营确认排序' },
      { label: '关联权限', value: '48', hint: '与权限编码保持同步' },
    ],
    highlights: [
      { title: '菜单排序', detail: '支持后续扩展拖拽排序、显隐控制和新旧版本切换。', status: '建议' },
      { title: '权限映射', detail: '菜单节点应直接映射到权限管理中的菜单权限编码。', status: '必备' },
      { title: '发布留痕', detail: '菜单发布建议保留操作人、发布时间与变更摘要。', status: '规划中' },
    ],
    table: {
      title: '最近菜单变更',
      description: '用于承接 BMS 菜单配置的默认信息结构。',
      columns: ['菜单', '层级', '负责人', '状态'],
      rows: [
        ['工作台', '一级', '前端', '已发布'],
        ['用户管理', '二级', '产品', '待确认'],
        ['站点菜单', '二级', '运营', '已发布'],
        ['系统管理', '一级', '管理员', '编辑中'],
      ],
    },
  },
  {
    slug: 'settings',
    title: '站点菜单',
    shortTitle: '站点',
    group: '系统管理',
    description: '维护站点侧菜单配置、展示入口和站点级导航组织结构。',
    icon: Settings2Icon,
    primaryAction: '新增站点菜单',
    secondaryAction: '查看同步状态',
    metrics: [
      { label: '站点栏目', value: '24', hint: '覆盖 4 个站点分区' },
      { label: '导航入口', value: '58', hint: '含 9 个隐藏节点' },
      { label: '待同步项', value: '4', hint: '含 1 个线上差异' },
      { label: '最近变更', value: '7', hint: '过去 24 小时' },
    ],
    highlights: [
      { title: '站点分层', detail: '建议按首页、频道页、工具页等维度拆分站点菜单层级。', status: '建议' },
      { title: '入口校验', detail: '菜单发布前应校验链接、图标和展示终端的可用性。', status: '必备' },
      { title: '同步能力', detail: '后续可扩展为多站点、多环境同步发布流程。', status: '规划中' },
    ],
    table: {
      title: '最近站点菜单调整',
      description: '作为站点菜单页的默认占位信息。',
      columns: ['菜单项', '站点', '变更人', '状态'],
      rows: [
        ['首页快捷入口', '主站', '管理员', '已生效'],
        ['工具导航分组', '工具站', '前端', '待审核'],
        ['帮助中心入口', '主站', '运营', '已发布'],
        ['页脚导航结构', '品牌站', '产品', '编辑中'],
      ],
    },
  },
]

export const adminNavGroups: AdminNavGroup[] = [
  {
    label: '总览',
    items: adminModules.filter((item) => item.group === '总览'),
  },
  {
    label: '组织与权限',
    items: adminModules.filter((item) => item.group === '组织与权限'),
  },
  {
    label: '系统管理',
    items: adminModules.filter((item) => item.group === '系统管理'),
  },
]

export function getAdminModuleBySlug(slug?: string) {
  return adminModules.find((item) => item.slug === slug)
}
