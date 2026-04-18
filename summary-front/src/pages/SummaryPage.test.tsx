import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '@/components/theme-provider';
import { SummaryPage } from './SummaryPage';

const apiMocks = vi.hoisted(() => ({
  getScreenOverview: vi.fn(),
  getScreenTrends: vi.fn(),
  getScreenAgent: vi.fn(),
  getScreenKnowledge: vi.fn(),
  getScreenActivity: vi.fn(),
  getScreenDevice: vi.fn(),
}));

vi.mock('@/api/modules/screen', () => apiMocks);

vi.mock('@/components/echart-panel', () => ({
  EChartPanel: ({ className }: { className?: string }) => (
    <div className={className} data-testid="echart-panel" />
  ),
}));

function createOverview(range: '24h' | '7d' | '30d' = '24h') {
  return {
    range,
    generatedAt: '2026-04-17T08:00:00.000Z',
    serviceStatus: {
      agentServer: 'up',
      generalServer: 'unknown',
      fileServer: 'unknown',
    } as const,
    metrics: [
      { key: 'activeUsers', label: '活跃用户', value: 12, delta: { value: 20, direction: 'up' } },
      { key: 'sessions', label: '会话数', value: 36, delta: { value: 12, direction: 'up' } },
      { key: 'messages', label: '消息数', value: 148, delta: { value: 8, direction: 'up' } },
      { key: 'knowledgeBases', label: '知识库总数', value: 9 },
      { key: 'errors', label: '错误数', value: 3, delta: { value: 25, direction: 'down' } },
      { key: 'avgResponseTimeMs', label: '平均耗时', value: 185.5, unit: 'ms', precision: 1 },
    ],
  };
}

function createTrends(range: '24h' | '7d' | '30d' = '24h') {
  const values =
    range === '7d'
      ? ['2026-04-11', '2026-04-12', '2026-04-13', '2026-04-14', '2026-04-15', '2026-04-16', '2026-04-17']
      : ['2026-04-17T08:00:00.000Z', '2026-04-17T09:00:00.000Z', '2026-04-17T10:00:00.000Z'];

  return {
    range,
    generatedAt: '2026-04-17T08:00:00.000Z',
    bucket: range === '24h' ? 'hour' : 'day',
    sessionTrend: values.map((time, index) => ({ time, value: index + 1 })),
    messageTrend: values.map((time, index) => ({ time, value: (index + 1) * 3 })),
    operationTrend: values.map((time, index) => ({ time, value: (index + 1) * 2 })),
    errorTrend: values.map((time, index) => ({ time, value: index % 2 })),
  };
}

function createAgent(range: '24h' | '7d' | '30d' = '24h') {
  return {
    range,
    generatedAt: '2026-04-17T08:00:00.000Z',
    summary: {
      runCount: 24,
      successCount: 22,
      failedCount: 1,
      runningCount: 1,
      successRate: 91.7,
      avgDurationMs: 422.4,
      avgRetrievedChunkCount: 6.2,
    },
    modelDistribution: [{ name: 'gpt-5', value: 24 }],
    providerDistribution: [{ name: 'openai', value: 24 }],
    statusDistribution: [
      { name: 'success', value: 22 },
      { name: 'failed', value: 1 },
      { name: 'running', value: 1 },
    ],
    durationTrend: createTrends(range).sessionTrend,
    retrievedChunkTrend: createTrends(range).messageTrend,
  };
}

function createKnowledge(range: '24h' | '7d' | '30d' = '24h') {
  return {
    range,
    generatedAt: '2026-04-17T08:00:00.000Z',
    summary: {
      knowledgeBaseCount: 5,
      documentCount: 120,
      chunkCount: 1240,
      parseSuccessCount: 116,
      parseFailedCount: 2,
      parsePendingCount: 2,
      parseSuccessRate: 96.7,
    },
    parseStatusDistribution: [
      { name: 'success', value: 116 },
      { name: 'failed', value: 2 },
      { name: 'pending', value: 2 },
    ],
    documentCountRanking: [{ knowledgeBaseId: 1, knowledgeBaseName: '产品知识', value: 60 }],
    chunkCountRanking: [{ knowledgeBaseId: 1, knowledgeBaseName: '产品知识', value: 620 }],
    recentDocumentTrend: createTrends(range).sessionTrend,
  };
}

function createActivity(range: '24h' | '7d' | '30d' = '24h') {
  return {
    generatedAt: '2026-04-17T08:00:00.000Z',
    recentErrors: [
      {
        id: `error-${range}`,
        time: '2026-04-17T07:58:00.000Z',
        type: 'error',
        title: 'GET /api/screen/overview',
        description: '状态码 500，耗时 82 ms',
        level: 'error',
      },
    ],
    recentOperations: [
      {
        id: `operation-${range}`,
        time: '2026-04-17T07:57:00.000Z',
        type: 'operation',
        title: 'POST /api/chat/stream',
        description: '模块 chat，耗时 248 ms',
        level: 'info',
      },
    ],
    recentSessions: [
      {
        id: `session-${range}`,
        time: '2026-04-17T07:56:00.000Z',
        type: 'chat-session',
        title: '本周运营复盘',
        description: '会话 session-1',
        level: 'info',
      },
    ],
    recentKnowledgeChanges: [
      {
        id: `knowledge-${range}`,
        time: '2026-04-17T07:55:00.000Z',
        type: 'knowledge-document',
        title: '产品手册.pdf',
        description: '解析状态 success',
        level: 'info',
      },
    ],
  };
}

function createDevice(window: '5m' | '15m' | '1h' = '15m') {
  return {
    generatedAt: '2026-04-17T08:00:00.000Z',
    window,
    supportedWindows: ['5m', '15m', '1h'] as const,
    node: {
      hostname: 'node-a',
      platform: 'linux',
      arch: 'x64',
      uptimeSec: 7200,
    },
    current: {
      cpuUsageRate: 42.3,
      memoryUsageRate: 63.4,
      totalMemoryBytes: 16 * 1024 * 1024 * 1024,
      usedMemoryBytes: 10 * 1024 * 1024 * 1024,
      freeMemoryBytes: 6 * 1024 * 1024 * 1024,
      processRssBytes: 256 * 1024 * 1024,
      processHeapUsedBytes: 128 * 1024 * 1024,
      processHeapTotalBytes: 192 * 1024 * 1024,
      processCpuUsageRate: 18.4,
    },
    cpuTrend: [
      { time: '2026-04-17T07:55:00.000Z', value: 38 },
      { time: '2026-04-17T08:00:00.000Z', value: 42.3 },
    ],
    memoryTrend: [
      { time: '2026-04-17T07:55:00.000Z', value: 61.2 },
      { time: '2026-04-17T08:00:00.000Z', value: 63.4 },
    ],
    networkTrend: [
      { time: '2026-04-17T07:55:00.000Z', rxBytesPerSec: 1024, txBytesPerSec: 512 },
      { time: '2026-04-17T08:00:00.000Z', rxBytesPerSec: 2048, txBytesPerSec: 1024 },
    ],
    diskUsage: [
      {
        name: 'system',
        mount: '/',
        totalBytes: 512 * 1024 * 1024 * 1024,
        usedBytes: 220 * 1024 * 1024 * 1024,
        freeBytes: 292 * 1024 * 1024 * 1024,
        usageRate: 43,
      },
    ],
  };
}

function renderPage() {
  return render(
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <SummaryPage />
    </ThemeProvider>,
  );
}

describe('SummaryPage', () => {
  beforeEach(() => {
    apiMocks.getScreenOverview.mockImplementation(async (range: '24h' | '7d' | '30d') =>
      createOverview(range),
    );
    apiMocks.getScreenTrends.mockImplementation(async (range: '24h' | '7d' | '30d') =>
      createTrends(range),
    );
    apiMocks.getScreenAgent.mockImplementation(async (range: '24h' | '7d' | '30d') =>
      createAgent(range),
    );
    apiMocks.getScreenKnowledge.mockImplementation(async (range: '24h' | '7d' | '30d') =>
      createKnowledge(range),
    );
    apiMocks.getScreenActivity.mockImplementation(async (range: '24h' | '7d' | '30d') =>
      createActivity(range),
    );
    apiMocks.getScreenDevice.mockImplementation(async (window: '5m' | '15m' | '1h') =>
      createDevice(window),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders dashboard sections and excludes reimbursement content', async () => {
    renderPage();

    await waitFor(() => expect(apiMocks.getScreenOverview).toHaveBeenCalledWith('24h'));
    expect(screen.getByTestId('dashboard-title')).toBeInTheDocument();
    expect(screen.getByTestId('panel-trends')).toBeInTheDocument();
    expect(screen.getByTestId('panel-device')).toBeInTheDocument();
    expect(screen.getByTestId('panel-agent')).toBeInTheDocument();
    expect(screen.getByTestId('panel-knowledge')).toBeInTheDocument();
    expect(screen.getByTestId('panel-activity')).toBeInTheDocument();
    expect(screen.getByText('node-a')).toBeInTheDocument();
    expect(screen.queryByText(/报销/)).not.toBeInTheDocument();
    expect(apiMocks.getScreenDevice).toHaveBeenCalledWith('15m');
  });

  it('reloads range dependent data when switching range', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(apiMocks.getScreenOverview).toHaveBeenCalledWith('24h'));

    await user.click(screen.getAllByRole('button', { name: '7d' })[0]);

    await waitFor(() => {
      expect(apiMocks.getScreenOverview).toHaveBeenLastCalledWith('7d');
      expect(apiMocks.getScreenTrends).toHaveBeenLastCalledWith('7d');
      expect(apiMocks.getScreenAgent).toHaveBeenLastCalledWith('7d');
      expect(apiMocks.getScreenKnowledge).toHaveBeenLastCalledWith('7d');
      expect(apiMocks.getScreenActivity).toHaveBeenLastCalledWith('7d');
    });
    expect(apiMocks.getScreenDevice).toHaveBeenCalledTimes(1);
  });

  it('refreshes device metrics independently from slower operational data', async () => {
    vi.useFakeTimers();
    renderPage();

    await act(async () => {
      await Promise.resolve();
    });
    expect(apiMocks.getScreenOverview).toHaveBeenCalledTimes(1);
    expect(apiMocks.getScreenDevice).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(apiMocks.getScreenDevice).toHaveBeenCalledTimes(2);
    expect(apiMocks.getScreenOverview).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(25000);
    });

    expect(apiMocks.getScreenOverview).toHaveBeenCalledTimes(2);
  });
});
