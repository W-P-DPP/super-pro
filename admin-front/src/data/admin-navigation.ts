import type { LucideIcon } from 'lucide-react'
import {
  BarChart3Icon,
  FileTextIcon,
  HomeIcon,
  Settings2Icon,
  ShieldCheckIcon,
  ShoppingCartIcon,
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
      { label: '已挂载菜单', value: '7', hint: '可继续扩展子模块' },
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
    title: '角色权限',
    shortTitle: '权限',
    group: '组织与权限',
    description: '定义后台角色、页面菜单权限和按钮级操作范围。',
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
      { title: '最小授权', detail: '优先按岗位模板生成权限，再做个体化收敛。', status: '建议' },
      { title: '变更留痕', detail: '权限修改应补充审计日志与审批备注。', status: '必备' },
      { title: '联动菜单', detail: '后续可直接复用当前静态菜单配置衍生成权限树。', status: '可实施' },
    ],
    table: {
      title: '角色模板',
      description: '用于展示首版后台的角色模块结构。',
      columns: ['角色', '成员数', '权限范围', '更新时间'],
      rows: [
        ['超级管理员', '2', '全部菜单', '今天 09:20'],
        ['运营主管', '6', '内容/订单/报表', '昨天 19:10'],
        ['审核专员', '12', '内容审核', '昨天 14:30'],
        ['财务专员', '4', '订单结算', '05-06 11:45'],
      ],
    },
  },
  {
    slug: 'content',
    title: '内容管理',
    shortTitle: '内容',
    group: '运营与交易',
    description: '承接文章、公告、素材与发布流程等内容型后台能力。',
    icon: FileTextIcon,
    primaryAction: '发布内容',
    secondaryAction: '新建栏目',
    metrics: [
      { label: '草稿箱', value: '36', hint: '4 篇待终审' },
      { label: '今日发布', value: '12', hint: '图文 9 / 公告 3' },
      { label: '退回修改', value: '5', hint: '集中在专题页' },
      { label: '素材占用', value: '68%', hint: '接近预警线' },
    ],
    highlights: [
      { title: '审核流占位', detail: '建议后续扩展初审、复审、发布三段流转。', status: '建议' },
      { title: '草稿协作', detail: '可在右侧详情展示编辑人、锁定状态与版本说明。', status: '可扩展' },
      { title: '素材中心', detail: '适合拆分为独立二级菜单与媒体库页面。', status: '规划中' },
    ],
    table: {
      title: '最近内容任务',
      description: '作为后台内容页的默认信息密度示例。',
      columns: ['标题', '栏目', '当前节点', '负责人'],
      rows: [
        ['五一活动页', '专题', '待终审', '于菲'],
        ['系统升级公告', '公告', '待发布', '陆远'],
        ['会员权益说明', '帮助中心', '退回修改', '白薇'],
        ['首页 Banner 替换', '素材', '已完成', '韩涛'],
      ],
    },
  },
  {
    slug: 'orders',
    title: '订单中心',
    shortTitle: '订单',
    group: '运营与交易',
    description: '用于查看订单状态、售后进度、异常交易与对账处理。',
    icon: ShoppingCartIcon,
    primaryAction: '创建工单',
    secondaryAction: '对账下载',
    metrics: [
      { label: '今日订单', value: '2,418', hint: '支付成功率 97.8%' },
      { label: '退款处理中', value: '17', hint: '平均 2.4 小时' },
      { label: '异常交易', value: '6', hint: '需人工复核' },
      { label: '待对账', value: '1', hint: '昨日账单未确认' },
    ],
    highlights: [
      { title: '售后抽屉', detail: '建议通过抽屉承接订单详情和沟通记录。', status: '建议' },
      { title: '异常标记', detail: '可为风控、财务、客服提供不同状态色。', status: '建议' },
      { title: '导出任务', detail: '大批量下载应转为异步任务，避免阻塞界面。', status: '必备' },
    ],
    table: {
      title: '最近订单状态',
      description: '展示后台交易页常见的状态型数据块。',
      columns: ['订单号', '用户', '金额', '状态'],
      rows: [
        ['SO20260508001', '林晨', '¥299.00', '已支付'],
        ['SO20260508002', '陈雪', '¥88.00', '退款中'],
        ['SO20260508003', '周宁', '¥1,099.00', '待发货'],
        ['SO20260508004', '王凯', '¥56.00', '异常'],
      ],
    },
  },
  {
    slug: 'reports',
    title: '数据报表',
    shortTitle: '报表',
    group: '数据与系统',
    description: '承接经营指标、渠道分析、转化漏斗和运营日报等分析页面。',
    icon: BarChart3Icon,
    primaryAction: '创建看板',
    secondaryAction: '订阅日报',
    metrics: [
      { label: '核心看板', value: '9', hint: '含 3 个团队共享' },
      { label: '日报订阅', value: '42', hint: '今天新增 5 个' },
      { label: '数据延迟', value: '3 min', hint: '在阈值内' },
      { label: '异常指标', value: '1', hint: '转化率波动偏高' },
    ],
    highlights: [
      { title: '看板路由', detail: '后续适合扩展多级 Tab 和时间筛选。', status: '建议' },
      { title: '指标卡片', detail: '当前可直接复用首页统计卡组件。', status: '可复用' },
      { title: '导出策略', detail: '建议支持截图导出和 CSV 导出双模式。', status: '规划中' },
    ],
    table: {
      title: '最近报表任务',
      description: '模拟报表模块的常见任务列表。',
      columns: ['报表', '周期', '负责人', '状态'],
      rows: [
        ['经营日报', '每日', '数据组', '正常'],
        ['渠道周报', '每周', '运营组', '生成中'],
        ['月度复盘', '每月', '管理层', '待确认'],
        ['活动复盘', '按活动', '项目组', '异常提醒'],
      ],
    },
  },
  {
    slug: 'settings',
    title: '系统设置',
    shortTitle: '设置',
    group: '数据与系统',
    description: '集中放置基础配置、通知渠道、环境开关与系统级元数据。',
    icon: Settings2Icon,
    primaryAction: '新增配置',
    secondaryAction: '查看变更记录',
    metrics: [
      { label: '配置项', value: '84', hint: '16 个为敏感项' },
      { label: '通知渠道', value: '5', hint: '含短信与企业微信' },
      { label: '环境开关', value: '12', hint: '2 个待下线' },
      { label: '最近变更', value: '7', hint: '过去 24 小时' },
    ],
    highlights: [
      { title: '灰度能力', detail: '建议用配置项隔离灰度策略和流量控制。', status: '建议' },
      { title: '敏感操作', detail: '系统配置变更应强制二次确认与审计。', status: '必备' },
      { title: '通知模板', detail: '短信、邮件、站内信建议统一管理。', status: '规划中' },
    ],
    table: {
      title: '最近系统变更',
      description: '作为系统设置页的默认占位信息。',
      columns: ['配置项', '环境', '变更人', '状态'],
      rows: [
        ['支付回调域名', '生产', '管理员', '已生效'],
        ['首页灰度开关', '测试', '前端', '已开启'],
        ['短信签名模板', '生产', '运营', '待审批'],
        ['文件清理周期', '生产', '运维', '已回滚'],
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
    label: '运营与交易',
    items: adminModules.filter((item) => item.group === '运营与交易'),
  },
  {
    label: '数据与系统',
    items: adminModules.filter((item) => item.group === '数据与系统'),
  },
]

export function getAdminModuleBySlug(slug?: string) {
  return adminModules.find((item) => item.slug === slug)
}
