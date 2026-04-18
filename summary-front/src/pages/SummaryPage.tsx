import { useEffect, useState, type ReactNode } from 'react';
import { useTheme } from 'next-themes';
import type {
  ScreenActivityItem,
  ScreenAgentResponse,
  ScreenDeviceResponse,
  ScreenKnowledgeResponse,
  ScreenMetricCard,
  ScreenOverviewResponse,
  ScreenRange,
  ScreenServiceKey,
  ScreenStatus,
  ScreenTrendsResponse,
  ScreenWindow,
} from '@super-pro/shared-types';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Spinner,
} from '@super-pro/shared-ui';
import {
  getScreenActivity,
  getScreenAgent,
  getScreenDevice,
  getScreenKnowledge,
  getScreenOverview,
  getScreenTrends,
} from '@/api/modules/screen';
import { EChartPanel } from '@/components/echart-panel';
import {
  buildBarChartOption,
  buildDiskChartOption,
  buildDonutChartOption,
  buildLineChartOption,
  buildNetworkChartOption,
} from '@/lib/chart-options';
import {
  formatBytes,
  formatClock,
  formatDateTime,
  formatMetricValue,
  formatPercent,
  formatUptime,
} from '@/lib/format';

const RANGE_OPTIONS: ScreenRange[] = ['24h', '7d', '30d'];
const DEVICE_WINDOW: ScreenWindow = '15m';
const DONUT_COLORS = ['#5f7cff', '#22c55e', '#f97316', '#ef4444', '#8b5cf6'];

const SERVICE_LABELS: Record<ScreenServiceKey, string> = {
  agentServer: '智能体服务',
  generalServer: '平台服务',
  fileServer: '文件服务',
};

const STATUS_LABELS: Record<ScreenStatus, string> = {
  up: '正常',
  down: '异常',
  unknown: '未知',
};

const STATUS_BADGE_CLASSNAME: Record<ScreenStatus, string> = {
  up: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  down: 'border-destructive/30 bg-destructive/10 text-destructive',
  unknown: 'border-border/70 bg-muted/60 text-muted-foreground',
};

function IconBase({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function ActivityIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M4 12h4l2-5 4 10 2-5h4" />
    </IconBase>
  );
}

function BotIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <rect x="5" y="7" width="14" height="10" rx="3" />
      <path d="M12 4v3" />
      <path d="M9 12h.01" />
      <path d="M15 12h.01" />
      <path d="M9 16h6" />
    </IconBase>
  );
}

function CircleAlertIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5" />
      <path d="M12 16h.01" />
    </IconBase>
  );
}

function CpuIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <rect x="7" y="7" width="10" height="10" rx="2" />
      <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 15h3M1 9h3M1 15h3" />
    </IconBase>
  );
}

function DatabaseZapIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <ellipse cx="10" cy="6" rx="6" ry="3" />
      <path d="M4 6v6c0 1.7 2.7 3 6 3" />
      <path d="M16 6v3" />
      <path d="M15 14h4l-3 6 5-7h-4l2-4" />
    </IconBase>
  );
}

function MoonStarIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M16 3a7 7 0 1 0 5 10 8 8 0 1 1-5-10Z" />
      <path d="m6.5 3 .5 1.5L8.5 5 7 5.5 6.5 7 6 5.5 4.5 5 6 4.5 6.5 3Z" />
    </IconBase>
  );
}

function RefreshCwIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M20 11a8 8 0 0 0-14.9-3" />
      <path d="M4 4v4h4" />
      <path d="M4 13a8 8 0 0 0 14.9 3" />
      <path d="M20 20v-4h-4" />
    </IconBase>
  );
}

function ServerCogIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <rect x="4" y="4" width="16" height="6" rx="2" />
      <rect x="4" y="14" width="16" height="6" rx="2" />
      <path d="M8 7h.01M8 17h.01" />
      <path d="M17 16.5l.8.5-.2.9.7.6-.6.7-1-.2-.5.8-.9-.3-.4.8-.8-.5-.8.5-.4-.8-.9.3-.5-.8-1 .2-.6-.7.7-.6-.2-.9.8-.5-.1-.9.9-.2.2-.9.9.2.6-.7.7.7.9-.2.2.9.9.2Z" />
    </IconBase>
  );
}

function SunMediumIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </IconBase>
  );
}

function PanelFrame({
  title,
  description,
  icon,
  extra,
  panelId,
  children,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  extra?: ReactNode;
  panelId?: string;
  children: ReactNode;
}) {
  return (
    <Card className="border-border/70 bg-card/92 shadow-sm" data-testid={panelId}>
      <CardHeader className="flex flex-col gap-3 pb-3 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-muted/50 text-primary">
            {icon}
          </div>
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        {extra ? <div className="flex items-center gap-2">{extra}</div> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <div className="flex min-h-36 items-center justify-center rounded-2xl border border-dashed border-border/70 bg-background/35 px-4 text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function MetricSummaryCard({ metric }: { metric: ScreenMetricCard }) {
  return (
    <Card className="border-border/70 bg-card/92 shadow-sm">
      <CardContent className="space-y-3 px-4 py-4">
        <div className="text-sm text-muted-foreground">{metric.label}</div>
        <div className="text-2xl font-semibold tracking-tight text-foreground">
          {formatMetricValue(metric.value, metric.unit, metric.precision ?? 0)}
        </div>
        <div className="text-xs text-muted-foreground">
          {metric.delta
            ? `较上一周期${
                metric.delta.direction === 'up'
                  ? '上升'
                  : metric.delta.direction === 'down'
                    ? '下降'
                    : '持平'
              } ${formatPercent(metric.delta.value)}`
            : '当前累计指标'}
        </div>
      </CardContent>
    </Card>
  );
}

function ActivityList({ items }: { items: ScreenActivityItem[] }) {
  if (items.length === 0) {
    return <EmptyPanel message="当前时间范围内暂无事件。" />;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="rounded-2xl border border-border/70 bg-background/40 px-3 py-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-foreground">{item.title}</div>
              <div className="mt-2 text-sm text-muted-foreground">{item.description}</div>
            </div>
            <Badge variant="outline" className="shrink-0 rounded-full px-2">
              {item.type}
            </Badge>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">{formatDateTime(item.time)}</div>
        </div>
      ))}
    </div>
  );
}

export function SummaryPage() {
  const { resolvedTheme, setTheme } = useTheme();
  const [range, setRange] = useState<ScreenRange>('24h');
  const [clock, setClock] = useState(() => new Date());
  const [operationalLoading, setOperationalLoading] = useState(true);
  const [deviceLoading, setDeviceLoading] = useState(true);
  const [operationalRefreshing, setOperationalRefreshing] = useState(false);
  const [deviceRefreshing, setDeviceRefreshing] = useState(false);
  const [operationalError, setOperationalError] = useState('');
  const [deviceError, setDeviceError] = useState('');
  const [overview, setOverview] = useState<ScreenOverviewResponse | null>(null);
  const [trends, setTrends] = useState<ScreenTrendsResponse | null>(null);
  const [agent, setAgent] = useState<ScreenAgentResponse | null>(null);
  const [knowledge, setKnowledge] = useState<ScreenKnowledgeResponse | null>(null);
  const [device, setDevice] = useState<ScreenDeviceResponse | null>(null);
  const [activity, setActivity] = useState<{
    errors: ScreenActivityItem[];
    operations: ScreenActivityItem[];
    sessions: ScreenActivityItem[];
    knowledge: ScreenActivityItem[];
  }>({
    errors: [],
    operations: [],
    sessions: [],
    knowledge: [],
  });

  const environmentLabel = import.meta.env.MODE === 'production' ? '生产环境' : '开发环境';
  const serviceStatus = overview?.serviceStatus ?? {
    agentServer: 'unknown',
    generalServer: 'unknown',
    fileServer: 'unknown',
  };
  const generatedAt = device?.generatedAt ?? overview?.generatedAt;

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  async function loadOperationalData(nextRange: ScreenRange, manual = false) {
    if (manual) {
      setOperationalRefreshing(true);
    } else {
      setOperationalLoading(true);
    }

    try {
      setOperationalError('');
      const [nextOverview, nextTrends, nextAgent, nextKnowledge, nextActivity] =
        await Promise.all([
          getScreenOverview(nextRange),
          getScreenTrends(nextRange),
          getScreenAgent(nextRange),
          getScreenKnowledge(nextRange),
          getScreenActivity(nextRange),
        ]);

      setOverview(nextOverview);
      setTrends(nextTrends);
      setAgent(nextAgent);
      setKnowledge(nextKnowledge);
      setActivity({
        errors: nextActivity.recentErrors,
        operations: nextActivity.recentOperations,
        sessions: nextActivity.recentSessions,
        knowledge: nextActivity.recentKnowledgeChanges,
      });
    } catch (error) {
      setOperationalError(error instanceof Error ? error.message : '加载运营数据失败');
    } finally {
      setOperationalLoading(false);
      setOperationalRefreshing(false);
    }
  }

  async function loadDeviceData(manual = false) {
    if (manual) {
      setDeviceRefreshing(true);
    } else {
      setDeviceLoading(true);
    }

    try {
      setDeviceError('');
      const nextDevice = await getScreenDevice(DEVICE_WINDOW);
      setDevice(nextDevice);
    } catch (error) {
      setDeviceError(error instanceof Error ? error.message : '加载设备资源失败');
    } finally {
      setDeviceLoading(false);
      setDeviceRefreshing(false);
    }
  }

  useEffect(() => {
    void loadOperationalData(range);
  }, [range]);

  useEffect(() => {
    void loadDeviceData();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadOperationalData(range, true);
    }, 30000);

    return () => window.clearInterval(timer);
  }, [range]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadDeviceData(true);
    }, 5000);

    return () => window.clearInterval(timer);
  }, []);

  const trendCards = [
    {
      title: '会话趋势',
      option: buildLineChartOption('会话数', trends?.sessionTrend ?? [], '#5f7cff', { area: true }),
    },
    {
      title: '消息趋势',
      option: buildLineChartOption('消息数', trends?.messageTrend ?? [], '#8b5cf6', { area: true }),
    },
    {
      title: '平台操作趋势',
      option: buildLineChartOption('操作量', trends?.operationTrend ?? [], '#22c55e'),
    },
    {
      title: '错误趋势',
      option: buildLineChartOption('错误数', trends?.errorTrend ?? [], '#ef4444'),
    },
  ];

  const activityColumns = [
    { title: '最近异常', items: activity.errors },
    { title: '最近操作', items: activity.operations },
    { title: '最近会话', items: activity.sessions },
    { title: '知识变更', items: activity.knowledge },
  ];

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto flex w-full max-w-[1680px] flex-col gap-6 px-4 py-5 md:px-6 lg:px-8">
        <Card className="border-border/70 bg-card/92 shadow-sm">
          <CardContent className="flex flex-col gap-5 px-5 py-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/55 px-3 py-1 text-xs text-muted-foreground">
                <ActivityIcon className="size-3.5" />
                平台业务运营与设备监控
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                  <span data-testid="dashboard-title">Super-Pro 运行态势大屏</span>
                </h1>
                <p className="max-w-3xl text-sm text-muted-foreground">
                  统一查看平台业务热度、智能体运行、知识库资产和当前节点资源状态。
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="rounded-full px-2">
                  {environmentLabel}
                </Badge>
                {(Object.entries(serviceStatus) as Array<[ScreenServiceKey, ScreenStatus]>).map(
                  ([key, status]) => (
                  <Badge
                    key={key}
                    variant="outline"
                    className={`rounded-full px-2 ${STATUS_BADGE_CLASSNAME[status]}`}
                  >
                    {SERVICE_LABELS[key as ScreenServiceKey]} · {STATUS_LABELS[status]}
                  </Badge>
                  ),
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 xl:items-end">
              <div className="text-sm text-muted-foreground xl:text-right">
                <div>{formatClock(clock)}</div>
                <div className="mt-1">最近同步 {generatedAt ? formatDateTime(generatedAt) : '--'}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                {RANGE_OPTIONS.map((item) => (
                  <Button
                    key={item}
                    type="button"
                    size="sm"
                    variant={range === item ? 'default' : 'outline'}
                    className="rounded-full px-3"
                    onClick={() => setRange(item)}
                  >
                    {item}
                  </Button>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-full px-3"
                  onClick={() => {
                    void loadOperationalData(range, true);
                    void loadDeviceData(true);
                  }}
                >
                  {operationalRefreshing || deviceRefreshing ? (
                    <Spinner className="size-4" />
                  ) : (
                    <RefreshCwIcon className="size-4" />
                  )}
                  立即刷新
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-full px-3"
                  onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                >
                  {resolvedTheme === 'dark' ? (
                    <SunMediumIcon className="size-4" />
                  ) : (
                    <MoonStarIcon className="size-4" />
                  )}
                  {resolvedTheme === 'dark' ? '浅色' : '深色'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {operationalError ? (
          <Alert className="border-destructive/30 bg-destructive/5">
            <CircleAlertIcon className="size-4" />
            <AlertTitle>运营数据加载异常</AlertTitle>
            <AlertDescription>{operationalError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-6">
          {overview?.metrics.map((metric) => (
            <MetricSummaryCard key={metric.key} metric={metric} />
          ))}
          {overview?.metrics.length || !operationalLoading
            ? null
            : Array.from({ length: 6 }).map((_, index) => (
                <Card key={index} className="border-border/70 bg-card/92 shadow-sm">
                  <CardContent className="flex min-h-28 items-center justify-center px-4 py-4">
                    <Spinner className="size-5" />
                  </CardContent>
                </Card>
              ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.9fr)]">
          <PanelFrame
            title="业务趋势"
            description="查看当前时间范围内的平台热度和错误波动。"
            icon={<ActivityIcon className="size-5" />}
            panelId="panel-trends"
          >
            {operationalLoading && !trends ? (
              <EmptyPanel message="正在加载业务趋势..." />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {trendCards.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-border/70 bg-background/40 p-3"
                  >
                    <div className="mb-3 text-sm font-medium text-foreground">{item.title}</div>
                    <EChartPanel option={item.option} className="h-56 w-full" />
                  </div>
                ))}
              </div>
            )}
          </PanelFrame>

          <PanelFrame
            title="当前节点资源"
            description="高频查看 CPU、内存、磁盘和网络压力。"
            icon={<CpuIcon className="size-5" />}
            panelId="panel-device"
            extra={
              <>
                <Badge variant="outline" className="rounded-full px-2">
                  窗口 {device?.window ?? DEVICE_WINDOW}
                </Badge>
                {deviceRefreshing ? <Spinner className="size-4" /> : null}
              </>
            }
          >
            {deviceError ? (
              <Alert className="border-destructive/30 bg-destructive/5">
                <CircleAlertIcon className="size-4" />
                <AlertTitle>设备资源加载异常</AlertTitle>
                <AlertDescription>{deviceError}</AlertDescription>
              </Alert>
            ) : null}

            {deviceLoading && !device ? (
              <EmptyPanel message="正在加载设备资源..." />
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border/70 bg-background/40 p-3">
                    <div className="mb-2 text-sm font-medium text-foreground">CPU</div>
                    <div className="mb-3 text-xs text-muted-foreground">
                      当前 {formatPercent(device?.current.cpuUsageRate ?? 0)}
                    </div>
                    <EChartPanel
                      option={buildLineChartOption('CPU', device?.cpuTrend ?? [], '#5f7cff')}
                      className="h-44 w-full"
                    />
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/40 p-3">
                    <div className="mb-2 text-sm font-medium text-foreground">内存</div>
                    <div className="mb-3 text-xs text-muted-foreground">
                      已用 {formatBytes(device?.current.usedMemoryBytes ?? 0)} /{' '}
                      {formatBytes(device?.current.totalMemoryBytes ?? 0)}
                    </div>
                    <EChartPanel
                      option={buildLineChartOption('内存', device?.memoryTrend ?? [], '#8b5cf6', {
                        area: true,
                        valueFormatter: (value) => formatPercent(value),
                      })}
                      className="h-44 w-full"
                    />
                  </div>
                </div>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-border/70 bg-background/40 p-3">
                    <div className="mb-3 text-sm font-medium text-foreground">磁盘占用</div>
                    <EChartPanel
                      option={buildDiskChartOption(device?.diskUsage ?? [])}
                      className="h-56 w-full"
                    />
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/40 p-3">
                    <div className="mb-3 text-sm font-medium text-foreground">网络上下行</div>
                    <EChartPanel
                      option={buildNetworkChartOption(device?.networkTrend ?? [])}
                      className="h-56 w-full"
                    />
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-border/70 bg-muted/35 px-3 py-3">
                    <div className="text-xs text-muted-foreground">节点</div>
                    <div className="mt-2 truncate text-sm font-medium text-foreground">
                      {device?.node.hostname ?? '--'}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-muted/35 px-3 py-3">
                    <div className="text-xs text-muted-foreground">运行环境</div>
                    <div className="mt-2 text-sm font-medium text-foreground">
                      {device?.node.platform ?? '--'} / {device?.node.arch ?? '--'}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-muted/35 px-3 py-3">
                    <div className="text-xs text-muted-foreground">进程内存</div>
                    <div className="mt-2 text-sm font-medium text-foreground">
                      {formatBytes(device?.current.processRssBytes ?? 0)}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-muted/35 px-3 py-3">
                    <div className="text-xs text-muted-foreground">节点运行时长</div>
                    <div className="mt-2 text-sm font-medium text-foreground">
                      {formatUptime(device?.node.uptimeSec ?? 0)}
                    </div>
                  </div>
                </div>
              </>
            )}
          </PanelFrame>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <PanelFrame
            title="智能体运行态势"
            description="关注模型使用、运行状态和平均耗时。"
            icon={<BotIcon className="size-5" />}
            panelId="panel-agent"
          >
            {operationalLoading && !agent ? (
              <EmptyPanel message="正在加载智能体数据..." />
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="rounded-2xl border border-border/70 bg-background/40 p-3">
                    <div className="text-xs text-muted-foreground">运行总数</div>
                    <div className="mt-2 text-2xl font-semibold">{agent?.summary.runCount ?? 0}</div>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/40 p-3">
                    <div className="text-xs text-muted-foreground">成功率</div>
                    <div className="mt-2 text-2xl font-semibold">
                      {formatPercent(agent?.summary.successRate ?? 0)}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/40 p-3">
                    <div className="text-xs text-muted-foreground">平均耗时</div>
                    <div className="mt-2 text-2xl font-semibold">
                      {formatMetricValue(agent?.summary.avgDurationMs ?? 0, 'ms', 1)}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/40 p-3">
                    <div className="text-xs text-muted-foreground">平均召回切片</div>
                    <div className="mt-2 text-2xl font-semibold">
                      {(agent?.summary.avgRetrievedChunkCount ?? 0).toFixed(1)}
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-border/70 bg-background/40 p-3">
                    <div className="mb-3 text-sm font-medium text-foreground">模型分布</div>
                    <EChartPanel
                      option={buildBarChartOption(agent?.modelDistribution ?? [], '#5f7cff')}
                      className="h-60 w-full"
                    />
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/40 p-3">
                    <div className="mb-3 text-sm font-medium text-foreground">运行状态</div>
                    <EChartPanel
                      option={buildDonutChartOption(agent?.statusDistribution ?? [], DONUT_COLORS)}
                      className="h-60 w-full"
                    />
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/40 p-3">
                    <div className="mb-3 text-sm font-medium text-foreground">Provider 分布</div>
                    <EChartPanel
                      option={buildDonutChartOption(
                        agent?.providerDistribution ?? [],
                        DONUT_COLORS,
                      )}
                      className="h-60 w-full"
                    />
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/40 p-3">
                    <div className="mb-3 text-sm font-medium text-foreground">平均耗时趋势</div>
                    <EChartPanel
                      option={buildLineChartOption(
                        '平均耗时',
                        agent?.durationTrend ?? [],
                        '#22c55e',
                        {
                          area: true,
                          valueFormatter: (value) => `${value.toFixed(1)} ms`,
                        },
                      )}
                      className="h-60 w-full"
                    />
                  </div>
                </div>
              </>
            )}
          </PanelFrame>

          <PanelFrame
            title="知识库资产与解析健康度"
            description="关注知识规模、解析状态和知识库分布。"
            icon={<DatabaseZapIcon className="size-5" />}
            panelId="panel-knowledge"
          >
            {operationalLoading && !knowledge ? (
              <EmptyPanel message="正在加载知识库数据..." />
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="rounded-2xl border border-border/70 bg-background/40 p-3">
                    <div className="text-xs text-muted-foreground">知识库</div>
                    <div className="mt-2 text-2xl font-semibold">
                      {knowledge?.summary.knowledgeBaseCount ?? 0}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/40 p-3">
                    <div className="text-xs text-muted-foreground">文档</div>
                    <div className="mt-2 text-2xl font-semibold">
                      {knowledge?.summary.documentCount ?? 0}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/40 p-3">
                    <div className="text-xs text-muted-foreground">切片</div>
                    <div className="mt-2 text-2xl font-semibold">
                      {knowledge?.summary.chunkCount ?? 0}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/40 p-3">
                    <div className="text-xs text-muted-foreground">解析成功率</div>
                    <div className="mt-2 text-2xl font-semibold">
                      {formatPercent(knowledge?.summary.parseSuccessRate ?? 0)}
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-border/70 bg-background/40 p-3">
                    <div className="mb-3 text-sm font-medium text-foreground">解析状态</div>
                    <EChartPanel
                      option={buildDonutChartOption(
                        knowledge?.parseStatusDistribution ?? [],
                        DONUT_COLORS,
                      )}
                      className="h-60 w-full"
                    />
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/40 p-3">
                    <div className="mb-3 text-sm font-medium text-foreground">新增文档趋势</div>
                    <EChartPanel
                      option={buildLineChartOption(
                        '新增文档',
                        knowledge?.recentDocumentTrend ?? [],
                        '#f97316',
                        { area: true },
                      )}
                      className="h-60 w-full"
                    />
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/40 p-3">
                    <div className="mb-3 text-sm font-medium text-foreground">文档数量排行</div>
                    <EChartPanel
                      option={buildBarChartOption(
                        (knowledge?.documentCountRanking ?? []).map((item) => ({
                          name: item.knowledgeBaseName,
                          value: item.value,
                        })),
                        '#8b5cf6',
                      )}
                      className="h-60 w-full"
                    />
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/40 p-3">
                    <div className="mb-3 text-sm font-medium text-foreground">切片数量排行</div>
                    <EChartPanel
                      option={buildBarChartOption(
                        (knowledge?.chunkCountRanking ?? []).map((item) => ({
                          name: item.knowledgeBaseName,
                          value: item.value,
                        })),
                        '#22c55e',
                      )}
                      className="h-60 w-full"
                    />
                  </div>
                </div>
              </>
            )}
          </PanelFrame>
        </div>

        <PanelFrame
          title="最近动态流"
          description="统一查看异常、操作、会话和知识变更。"
          icon={<ServerCogIcon className="size-5" />}
          panelId="panel-activity"
          extra={operationalRefreshing ? <Spinner className="size-4" /> : null}
        >
          {operationalLoading && !activity.errors.length && !activity.operations.length ? (
            <EmptyPanel message="正在加载动态流..." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {activityColumns.map((column) => (
                <div key={column.title}>
                  <div className="mb-3 text-sm font-medium text-foreground">{column.title}</div>
                  <ActivityList items={column.items.slice(0, 6)} />
                </div>
              ))}
            </div>
          )}
        </PanelFrame>

        <div className="pb-6 text-sm text-muted-foreground">
          当前大屏仅展示平台、智能体、知识库和设备资源数据。
        </div>
      </section>
    </main>
  );
}
