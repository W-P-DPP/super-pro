import { ArrowRightIcon, CheckCircle2Icon, LayoutGridIcon, SparklesIcon } from 'lucide-react'
import { Navigate, useParams } from 'react-router-dom'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui'
import { adminModules, getAdminModuleBySlug } from '@/data/admin-navigation'

function MetricCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card className="border border-border/70 bg-card/90 shadow-sm">
      <CardHeader className="gap-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl font-semibold tracking-tight">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  )
}

export function ModulePage() {
  const { moduleSlug } = useParams()
  const module = getAdminModuleBySlug(moduleSlug)

  if (!module) {
    return <Navigate to="/404" replace />
  }

  const Icon = module.icon
  const shortcutModules = adminModules.filter((item) => item.slug !== 'dashboard')

  return (
    <section className="mx-auto flex w-full max-w-[var(--app-shell-page-width)] flex-col gap-4 px-4 py-4 md:px-6 md:py-6">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.8fr)]">
        <Card className="border border-border/70 bg-card/95 shadow-sm">
          <CardHeader className="gap-3 border-b border-border/70">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="rounded-full">
                {module.group}
              </Badge>
              {module.badge ? <Badge className="rounded-full">{module.badge}</Badge> : null}
            </div>
            <div className="flex items-start gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-muted/60">
                <Icon className="size-5" />
              </div>
              <div className="min-w-0 space-y-2">
                <CardTitle className="text-2xl font-semibold tracking-tight">{module.title}</CardTitle>
                <CardDescription className="max-w-3xl text-sm leading-6">
                  {module.description}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pt-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              <Button type="button" className="rounded-full px-4">
                <SparklesIcon data-icon="inline-start" />
                {module.primaryAction}
              </Button>
              <Button type="button" variant="outline" className="rounded-full px-4">
                {module.secondaryAction}
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              当前页面为静态后台壳层，可直接替换为真实业务内容。
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/70 bg-card/95 shadow-sm">
          <CardHeader className="border-b border-border/70">
            <CardTitle className="text-base">本页可承接的能力</CardTitle>
            <CardDescription>先把页面层次和信息密度搭好，再逐步接真实接口。</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 pt-4">
            {module.highlights.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-border/70 bg-muted/35 p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium">{item.title}</div>
                  <Badge variant="outline" className="rounded-full">
                    {item.status}
                  </Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {module.metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <Card className="border border-border/70 bg-card/95 shadow-sm">
          <CardHeader className="border-b border-border/70">
            <CardTitle className="text-base">{module.table.title}</CardTitle>
            <CardDescription>{module.table.description}</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  {module.table.columns.map((column) => (
                    <TableHead key={column}>{column}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {module.table.rows.map((row) => (
                  <TableRow key={row.join('-')}>
                    {row.map((cell) => (
                      <TableCell key={cell}>{cell}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border border-border/70 bg-card/95 shadow-sm">
          <CardHeader className="border-b border-border/70">
            <CardTitle className="text-base">页面结构建议</CardTitle>
            <CardDescription>作为后台项目首版，这些区块通常都值得预留。</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 pt-4">
            {[
              '顶部筛选区：查询、状态、时间和快捷操作。',
              '中部主体区：表格、卡片或图表，按业务密度自行切换。',
              '右侧详情层：承接查看、审批、备注、日志等次级信息。',
              '底部反馈区：加载、空态、错误、成功提示与导出任务状态。',
            ].map((line) => (
              <div key={line} className="flex gap-3 rounded-xl border border-border/70 bg-muted/35 p-3">
                <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <p className="text-sm leading-6 text-muted-foreground">{line}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {module.slug === 'dashboard' ? (
        <Card className="border border-border/70 bg-card/95 shadow-sm">
          <CardHeader className="border-b border-border/70">
            <CardTitle className="text-base">快捷入口</CardTitle>
            <CardDescription>用于模拟后台首页的常用模块导航。</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 pt-4 md:grid-cols-2 xl:grid-cols-3">
            {shortcutModules.map((item) => {
              const ShortcutIcon = item.icon

              return (
                <a
                  key={item.slug}
                  href={`#/${item.slug}`}
                  className="group rounded-2xl border border-border/70 bg-muted/30 p-4 transition-colors hover:bg-accent/60"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl border border-border/70 bg-background">
                      <ShortcutIcon className="size-4" />
                    </div>
                    <ArrowRightIcon className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <div className="mt-4">
                    <div className="font-medium">{item.title}</div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </a>
              )
            })}
          </CardContent>
        </Card>
      ) : (
        <Card className="border border-dashed border-border/70 bg-card/80 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LayoutGridIcon className="size-4" />
              下一步建议
            </CardTitle>
            <CardDescription>
              如果要把当前占位页继续推进成真实后台模块，优先处理下面三项。
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {[
              '补充筛选表单和分页协议。',
              '从 src/api/modules 接真实接口。',
              '接入角色权限与按钮级禁用逻辑。',
            ].map((item) => (
              <div key={item} className="rounded-xl border border-border/70 bg-muted/35 p-4 text-sm text-muted-foreground">
                {item}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </section>
  )
}
