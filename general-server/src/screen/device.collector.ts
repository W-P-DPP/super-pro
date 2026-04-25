import os from 'node:os';
import si from 'systeminformation';
import type {
  ScreenDeviceResponse,
  ScreenDiskUsageItem,
  ScreenNetworkPoint,
  ScreenTimePoint,
} from '@super-pro/shared-types';
import type { ScreenWindow } from './screen.dto.ts';

type DeviceSample = {
  time: number;
  cpuUsageRate: number;
  memoryUsageRate: number;
  totalMemoryBytes: number;
  usedMemoryBytes: number;
  freeMemoryBytes: number;
  processRssBytes: number;
  processHeapUsedBytes: number;
  processHeapTotalBytes: number;
  processCpuUsageRate: number;
  rxBytesPerSec: number;
  txBytesPerSec: number;
  diskUsage: ScreenDiskUsageItem[];
};

const SAMPLE_INTERVAL_MS = 5000;
const MAX_SAMPLE_COUNT = 720;

function clampPercentage(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, value));
}

function formatIsoTime(value: number) {
  return new Date(value).toISOString();
}

function resolveWindowMs(window: ScreenWindow) {
  switch (window) {
    case '5m':
      return 5 * 60 * 1000;
    case '1h':
      return 60 * 60 * 1000;
    case '15m':
    default:
      return 15 * 60 * 1000;
  }
}

export class DeviceMetricsCollector {
  private readonly history: DeviceSample[] = [];

  private sampleTimer: NodeJS.Timeout | null = null;

  private pendingSample: Promise<void> | null = null;

  private lastProcessCpuUsage = process.cpuUsage();

  private lastProcessCpuTime = process.hrtime.bigint();

  start() {
    if (this.sampleTimer) {
      return;
    }

    void this.sample();
    this.sampleTimer = setInterval(() => {
      void this.sample();
    }, SAMPLE_INTERVAL_MS);
    this.sampleTimer.unref?.();
  }

  private async sample() {
    if (this.pendingSample) {
      return this.pendingSample;
    }

    this.pendingSample = (async () => {
      const [load, memory, fileSystems, networkStats] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.fsSize(),
        si.networkStats(),
      ]);

      const memoryInfo = process.memoryUsage();
      const now = process.hrtime.bigint();
      const currentProcessCpuUsage = process.cpuUsage(this.lastProcessCpuUsage);
      const elapsedMicros = Number(now - this.lastProcessCpuTime) / 1000;
      const cpuCount = Math.max(os.cpus().length, 1);
      const processCpuUsageRate =
        elapsedMicros > 0
          ? ((currentProcessCpuUsage.user + currentProcessCpuUsage.system) /
              (elapsedMicros * cpuCount)) *
            100
          : 0;

      this.lastProcessCpuUsage = process.cpuUsage();
      this.lastProcessCpuTime = now;

      const totalMemoryBytes = memory.total ?? 0;
      const freeMemoryBytes = memory.available ?? memory.free ?? 0;
      const usedMemoryBytes = Math.max(totalMemoryBytes - freeMemoryBytes, 0);

      const diskUsage = fileSystems
        .filter((entry) => Number.isFinite(entry.size) && entry.size > 0)
        .map<ScreenDiskUsageItem>((entry) => {
          const totalBytes = Number(entry.size ?? 0);
          const usedBytes = Number(entry.used ?? 0);
          const freeBytes = Math.max(totalBytes - usedBytes, 0);
          return {
            name: entry.fs?.trim() || entry.mount?.trim() || 'disk',
            mount: entry.mount?.trim() || entry.fs?.trim() || '/',
            totalBytes,
            usedBytes,
            freeBytes,
            usageRate: clampPercentage(totalBytes > 0 ? (usedBytes / totalBytes) * 100 : 0),
          };
        })
        .sort((left, right) => right.usedBytes - left.usedBytes);

      const sample: DeviceSample = {
        time: Date.now(),
        cpuUsageRate: clampPercentage(load.currentLoad ?? 0),
        memoryUsageRate: clampPercentage(
          totalMemoryBytes > 0 ? (usedMemoryBytes / totalMemoryBytes) * 100 : 0,
        ),
        totalMemoryBytes,
        usedMemoryBytes,
        freeMemoryBytes,
        processRssBytes: memoryInfo.rss,
        processHeapUsedBytes: memoryInfo.heapUsed,
        processHeapTotalBytes: memoryInfo.heapTotal,
        processCpuUsageRate: clampPercentage(processCpuUsageRate),
        rxBytesPerSec: networkStats.reduce(
          (total, entry) => total + Number(entry.rx_sec ?? 0),
          0,
        ),
        txBytesPerSec: networkStats.reduce(
          (total, entry) => total + Number(entry.tx_sec ?? 0),
          0,
        ),
        diskUsage,
      };

      this.history.push(sample);
      if (this.history.length > MAX_SAMPLE_COUNT) {
        this.history.splice(0, this.history.length - MAX_SAMPLE_COUNT);
      }
    })().finally(() => {
      this.pendingSample = null;
    });

    return this.pendingSample;
  }

  async getSnapshot(window: ScreenWindow = '15m'): Promise<ScreenDeviceResponse> {
    this.start();
    if (this.history.length === 0) {
      await this.sample();
    }

    const now = Date.now();
    const cutoff = now - resolveWindowMs(window);
    const samples = this.history.filter((sample) => sample.time >= cutoff);
    const current = samples.at(-1) ?? this.history.at(-1);

    if (!current) {
      return {
        generatedAt: new Date().toISOString(),
        window,
        supportedWindows: ['5m', '15m', '1h'],
        node: {
          hostname: os.hostname(),
          platform: os.platform(),
          arch: os.arch(),
          uptimeSec: os.uptime(),
        },
        current: {
          cpuUsageRate: 0,
          memoryUsageRate: 0,
          totalMemoryBytes: 0,
          usedMemoryBytes: 0,
          freeMemoryBytes: 0,
          processRssBytes: 0,
          processHeapUsedBytes: 0,
          processHeapTotalBytes: 0,
          processCpuUsageRate: 0,
        },
        cpuTrend: [],
        memoryTrend: [],
        networkTrend: [],
        diskUsage: [],
      };
    }

    const cpuTrend = samples.map<ScreenTimePoint>((sample) => ({
      time: formatIsoTime(sample.time),
      value: sample.cpuUsageRate,
    }));
    const memoryTrend = samples.map<ScreenTimePoint>((sample) => ({
      time: formatIsoTime(sample.time),
      value: sample.memoryUsageRate,
    }));
    const networkTrend = samples.map<ScreenNetworkPoint>((sample) => ({
      time: formatIsoTime(sample.time),
      rxBytesPerSec: sample.rxBytesPerSec,
      txBytesPerSec: sample.txBytesPerSec,
    }));

    return {
      generatedAt: new Date().toISOString(),
      window,
      supportedWindows: ['5m', '15m', '1h'],
      node: {
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        uptimeSec: os.uptime(),
      },
      current: {
        cpuUsageRate: current.cpuUsageRate,
        memoryUsageRate: current.memoryUsageRate,
        totalMemoryBytes: current.totalMemoryBytes,
        usedMemoryBytes: current.usedMemoryBytes,
        freeMemoryBytes: current.freeMemoryBytes,
        processRssBytes: current.processRssBytes,
        processHeapUsedBytes: current.processHeapUsedBytes,
        processHeapTotalBytes: current.processHeapTotalBytes,
        processCpuUsageRate: current.processCpuUsageRate,
      },
      cpuTrend,
      memoryTrend,
      networkTrend,
      diskUsage: current.diskUsage,
    };
  }
}

export const deviceMetricsCollector = new DeviceMetricsCollector();
