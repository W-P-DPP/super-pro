import { memo, useEffect, useState, type ReactNode } from 'react';
import { useTheme } from 'next-themes';
import type { ScreenDeviceResponse, ScreenWindow } from '@super-pro/shared-types';
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
import { getScreenDevice } from '@/api/modules/screen';
import { EChartPanel } from '@/components/echart-panel';
import { hasReusableAuthToken } from '@/lib/auth-session';
import {
  buildDiskChartOption,
  buildLineChartOption,
  buildNetworkChartOption,
  getThemeColor,
} from '@/lib/chart-options';
import { redirectToLoginWithCurrentPage } from '@/lib/login-redirect';
import {
  formatBytes,
  formatClock,
  formatDateTime,
  formatPercent,
  formatUptime,
} from '@/lib/format';

const DEVICE_WINDOW: ScreenWindow = '15m';
const DEFAULT_CHART_1_COLOR = '#5f7cff';
const DEFAULT_CHART_5_COLOR = '#22c55e';

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

function MoonStarIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M16 3a7 7 0 0 0 5 10 8 8 0 1 1-5-10Z" />
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

const DevicePanel = memo(function DevicePanel({
  device,
  deviceLoading,
  deviceRefreshing,
  deviceError,
  chart1Color,
  chart5Color,
}: {
  device: ScreenDeviceResponse | null;
  deviceLoading: boolean;
  deviceRefreshing: boolean;
  deviceError: string;
  chart1Color: string;
  chart5Color: string;
}) {
  return (
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
                option={buildLineChartOption('CPU', device?.cpuTrend ?? [], chart1Color)}
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
                option={buildLineChartOption('内存', device?.memoryTrend ?? [], chart5Color, {
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
  );
});

export function SummaryPage() {
  const { resolvedTheme, setTheme } = useTheme();
  const [chartColors, setChartColors] = useState(() => ({
    chart1: DEFAULT_CHART_1_COLOR,
    chart5: DEFAULT_CHART_5_COLOR,
  }));
  const [clock, setClock] = useState(() => new Date());
  const [deviceLoading, setDeviceLoading] = useState(true);
  const [deviceRefreshing, setDeviceRefreshing] = useState(false);
  const [deviceError, setDeviceError] = useState('');
  const [device, setDevice] = useState<ScreenDeviceResponse | null>(null);

  const environmentLabel = import.meta.env.MODE === 'production' ? '生产环境' : '开发环境';
  const generatedAt = device?.generatedAt;

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setChartColors({
      chart1: getThemeColor('--chart-1', DEFAULT_CHART_1_COLOR),
      chart5: getThemeColor('--chart-5', DEFAULT_CHART_5_COLOR),
    });
  }, [resolvedTheme]);

  async function loadDeviceData(manual = false) {
    if (!hasReusableAuthToken()) {
      redirectToLoginWithCurrentPage();
      return;
    }

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
    if (!hasReusableAuthToken()) {
      redirectToLoginWithCurrentPage();
      return;
    }

    void loadDeviceData();
  }, []);

  useEffect(() => {
    if (!hasReusableAuthToken()) {
      return;
    }

    const timer = window.setInterval(() => {
      void loadDeviceData(true);
    }, 5000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-5 md:px-6 lg:px-8">
        <div className="flex flex-col gap-4 rounded-[calc(var(--radius)+0.5rem)] border border-border/70 bg-card/92 px-5 py-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/55 px-3 py-1 text-xs text-muted-foreground">
                <CpuIcon className="size-3.5" />
                当前节点资源
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                  <span data-testid="dashboard-title">Super-Pro 节点资源看板</span>
                </h1>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  当前页面暂时只保留节点资源卡片，用于查看 CPU、内存、磁盘和网络状态。
                </p>
              </div>
              <Badge variant="outline" className="w-fit rounded-full px-2">
                {environmentLabel}
              </Badge>
            </div>

            <div className="flex flex-col gap-3 lg:items-end">
              <div className="text-sm text-muted-foreground lg:text-right">
                <div>{formatClock(clock)}</div>
                <div className="mt-1">最近同步 {generatedAt ? formatDateTime(generatedAt) : '--'}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-full px-3"
                  onClick={() => {
                    void loadDeviceData(true);
                  }}
                >
                  {deviceRefreshing ? (
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
          </div>
        </div>

        <DevicePanel
          device={device}
          deviceLoading={deviceLoading}
          deviceRefreshing={deviceRefreshing}
          deviceError={deviceError}
          chart1Color={chartColors.chart1}
          chart5Color={chartColors.chart5}
        />
      </section>
    </main>
  );
}
