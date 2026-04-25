import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '@/components/theme-provider';
import { SummaryPage } from './SummaryPage';

const loginRedirectMocks = vi.hoisted(() => ({
  redirectToLoginWithCurrentPage: vi.fn(),
}));

const apiMocks = vi.hoisted(() => ({
  getScreenDevice: vi.fn(),
}));

vi.mock('@/api/modules/screen', () => apiMocks);
vi.mock('@/lib/login-redirect', () => ({
  redirectToLoginWithCurrentPage: loginRedirectMocks.redirectToLoginWithCurrentPage,
}));

vi.mock('@/components/echart-panel', () => ({
  EChartPanel: ({ className }: { className?: string }) => (
    <div className={className} data-testid="echart-panel" />
  ),
}));

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
    window.localStorage.setItem('token', 'test-token');
    loginRedirectMocks.redirectToLoginWithCurrentPage.mockReset();
    apiMocks.getScreenDevice.mockImplementation(async (window: '5m' | '15m' | '1h') =>
      createDevice(window),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    window.localStorage.clear();
  });

  it('renders only the device resource panel', async () => {
    renderPage();

    await waitFor(() => expect(apiMocks.getScreenDevice).toHaveBeenCalledWith('15m'));

    expect(screen.getByTestId('dashboard-title')).toBeInTheDocument();
    expect(screen.getByTestId('panel-device')).toBeInTheDocument();
    expect(screen.getByText('node-a')).toBeInTheDocument();
    expect(screen.queryByTestId('panel-trends')).not.toBeInTheDocument();
    expect(screen.queryByTestId('panel-agent')).not.toBeInTheDocument();
    expect(screen.queryByTestId('panel-knowledge')).not.toBeInTheDocument();
    expect(screen.queryByTestId('panel-activity')).not.toBeInTheDocument();
  });

  it('refreshes device data when clicking the refresh button', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(apiMocks.getScreenDevice).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole('button', { name: '立即刷新' }));

    await waitFor(() => expect(apiMocks.getScreenDevice).toHaveBeenCalledTimes(2));
  });

  it('refreshes device metrics on the polling interval', async () => {
    vi.useFakeTimers();
    renderPage();

    await act(async () => {
      await Promise.resolve();
    });
    expect(apiMocks.getScreenDevice).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(apiMocks.getScreenDevice).toHaveBeenCalledTimes(2);
  });

  it('redirects to login instead of requesting when there is no token', async () => {
    window.localStorage.clear();
    renderPage();

    await waitFor(() =>
      expect(loginRedirectMocks.redirectToLoginWithCurrentPage).toHaveBeenCalled(),
    );
    expect(apiMocks.getScreenDevice).not.toHaveBeenCalled();
  });
});
