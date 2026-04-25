import type {
  ScreenDiskUsageItem,
  ScreenNamedValue,
  ScreenNetworkPoint,
  ScreenTimePoint,
} from '@super-pro/shared-types';
import type { EChartsOption } from 'echarts';
import { formatBytes } from '@/lib/format';

type TooltipFormatter = (params: unknown) => string;

const AXIS_LABEL_COLOR = 'rgba(119, 119, 136, 0.92)';
const SPLIT_LINE_COLOR = 'rgba(140, 146, 172, 0.14)';
const TOOLTIP_BACKGROUND = 'rgba(18, 20, 34, 0.92)';
const TOOLTIP_TEXT_COLOR = '#f8fafc';

type ParsedColor = {
  red: number;
  green: number;
  blue: number;
  alpha: number;
};

function getResolvedCssColor(value: string) {
  if (typeof document === 'undefined') {
    return value;
  }

  const probe = document.createElement('span');
  probe.style.color = value;
  probe.style.position = 'absolute';
  probe.style.pointerEvents = 'none';
  probe.style.opacity = '0';

  const mountNode = document.body ?? document.documentElement;
  mountNode.appendChild(probe);

  const resolved = window.getComputedStyle(probe).color;
  probe.remove();

  return resolved && resolved !== 'rgba(0, 0, 0, 0)' ? resolved : value;
}

function parseCanvasColor(value: string): ParsedColor | null {
  if (typeof document === 'undefined') {
    return null;
  }

  if (typeof navigator !== 'undefined' && /\bjsdom\b/i.test(navigator.userAgent)) {
    return null;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    return null;
  }

  context.clearRect(0, 0, 1, 1);
  context.fillStyle = '#000';
  context.fillStyle = value;
  context.fillRect(0, 0, 1, 1);

  const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data;
  return {
    red,
    green,
    blue,
    alpha: alpha / 255,
  };
}

function stringifyColor({ red, green, blue, alpha }: ParsedColor) {
  if (alpha >= 1) {
    return `rgb(${red}, ${green}, ${blue})`;
  }

  return `rgba(${red}, ${green}, ${blue}, ${Number(alpha.toFixed(3))})`;
}

export function getThemeColor(variableName: string, fallback: string) {
  const parsed = parseCanvasColor(getResolvedCssColor(`var(${variableName})`));
  if (!parsed) {
    return fallback;
  }

  return stringifyColor(parsed);
}

function withAlpha(color: string, alpha: number) {
  const parsed = parseCanvasColor(color);
  if (!parsed) {
    return color;
  }

  return stringifyColor({
    ...parsed,
    alpha: Math.max(0, Math.min(1, alpha)),
  });
}

function formatAxisLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function mapLabels(data: ScreenTimePoint[] | ScreenNetworkPoint[]) {
  return data.map((item) => formatAxisLabel(item.time));
}

function normalizeTooltipValue(value: unknown) {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function buildAxisTooltipFormatter(
  valueFormatter?: (value: number) => string,
): TooltipFormatter {
  return (params: unknown) => {
    const items = Array.isArray(params) ? params : [params];
    if (items.length === 0) {
      return '';
    }

    const axisLabel =
      typeof items[0] === 'object' && items[0] && 'axisValueLabel' in items[0]
        ? String(items[0].axisValueLabel ?? '')
        : '';
    const lines = items.map((item) => {
      const marker =
        typeof item === 'object' && item && 'marker' in item ? String(item.marker ?? '') : '';
      const seriesName =
        typeof item === 'object' && item && 'seriesName' in item
          ? String(item.seriesName ?? '')
          : '';
      const value =
        typeof item === 'object' && item && 'value' in item ? normalizeTooltipValue(item.value) : 0;

      return `${marker}${seriesName}: ${
        valueFormatter ? valueFormatter(value) : value.toLocaleString('zh-CN')
      }`;
    });

    return [axisLabel, ...lines].join('<br/>');
  };
}

function buildItemTooltipFormatter(
  valueFormatter?: (value: number) => string,
): TooltipFormatter {
  return (params: unknown) => {
    if (!params || typeof params !== 'object') {
      return '';
    }

    const name = 'name' in params ? String(params.name ?? '') : '';
    const value = 'value' in params ? normalizeTooltipValue(params.value) : 0;
    const percent = 'percent' in params ? normalizeTooltipValue(params.percent) : 0;

    return `${name}<br/>Value: ${
      valueFormatter ? valueFormatter(value) : value.toLocaleString('zh-CN')
    }<br/>Percent: ${percent.toFixed(1)}%`;
  };
}

export function buildLineChartOption(
  seriesName: string,
  data: ScreenTimePoint[],
  color: string,
  options?: {
    area?: boolean;
    valueFormatter?: (value: number) => string;
  },
): EChartsOption {
  return {
    tooltip: {
      trigger: 'axis',
      formatter: buildAxisTooltipFormatter(options?.valueFormatter),
      backgroundColor: TOOLTIP_BACKGROUND,
      borderWidth: 0,
      textStyle: { color: TOOLTIP_TEXT_COLOR },
    },
    grid: { top: 16, left: 8, right: 8, bottom: 12, containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: mapLabels(data),
      axisLine: { lineStyle: { color: SPLIT_LINE_COLOR } },
      axisLabel: { color: AXIS_LABEL_COLOR, hideOverlap: true },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: AXIS_LABEL_COLOR },
      splitLine: { lineStyle: { color: SPLIT_LINE_COLOR } },
    },
    series: [
      {
        id: seriesName,
        name: seriesName,
        type: 'line',
        smooth: true,
        showSymbol: false,
        animationDurationUpdate: 300,
        data: data.map((item) => item.value),
        lineStyle: { width: 3, color },
        itemStyle: { color },
        areaStyle: options?.area
          ? {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: withAlpha(color, 0.6) },
                  { offset: 1, color: withAlpha(color, 0.03) },
                ],
              },
            }
          : undefined,
      },
    ],
  };
}

export function buildDonutChartOption(
  data: ScreenNamedValue[],
  colors: string[],
  valueFormatter?: (value: number) => string,
): EChartsOption {
  return {
    tooltip: {
      trigger: 'item',
      formatter: buildItemTooltipFormatter(valueFormatter),
      backgroundColor: TOOLTIP_BACKGROUND,
      borderWidth: 0,
      textStyle: { color: TOOLTIP_TEXT_COLOR },
    },
    color: colors,
    legend: { bottom: 0, textStyle: { color: AXIS_LABEL_COLOR } },
    series: [
      {
        type: 'pie',
        radius: ['56%', '76%'],
        center: ['50%', '42%'],
        itemStyle: {
          borderRadius: 6,
          borderColor: 'transparent',
          borderWidth: 2,
        },
        label: { color: AXIS_LABEL_COLOR, formatter: '{b}: {d}%' },
        data,
      },
    ],
  };
}

export function buildBarChartOption(
  data: ScreenNamedValue[],
  color: string,
  horizontal = true,
  valueFormatter?: (value: number) => string,
): EChartsOption {
  const names = data.map((item) => item.name);
  const values = data.map((item) => item.value);

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: buildAxisTooltipFormatter(valueFormatter),
      backgroundColor: TOOLTIP_BACKGROUND,
      borderWidth: 0,
      textStyle: { color: TOOLTIP_TEXT_COLOR },
    },
    grid: {
      top: 16,
      left: horizontal ? 84 : 16,
      right: 16,
      bottom: 16,
      containLabel: true,
    },
    xAxis: horizontal
      ? {
          type: 'value',
          axisLabel: { color: AXIS_LABEL_COLOR },
          splitLine: { lineStyle: { color: SPLIT_LINE_COLOR } },
        }
      : {
          type: 'category',
          data: names,
          axisLabel: { color: AXIS_LABEL_COLOR, interval: 0, rotate: 20 },
          axisLine: { lineStyle: { color: SPLIT_LINE_COLOR } },
        },
    yAxis: horizontal
      ? {
          type: 'category',
          data: names,
          axisLabel: { color: AXIS_LABEL_COLOR },
          axisLine: { lineStyle: { color: SPLIT_LINE_COLOR } },
        }
      : {
          type: 'value',
          axisLabel: { color: AXIS_LABEL_COLOR },
          splitLine: { lineStyle: { color: SPLIT_LINE_COLOR } },
        },
    series: [
      {
        type: 'bar',
        data: values,
        itemStyle: { color, borderRadius: 999 },
        barMaxWidth: 18,
      },
    ],
  };
}

export function buildDiskChartOption(disks: ScreenDiskUsageItem[]): EChartsOption {
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: unknown) => {
        const entries = Array.isArray(params) ? params : [];
        const diskName =
          typeof entries[0] === 'object' && entries[0] && 'name' in entries[0]
            ? String((entries[0] as { name: string }).name)
            : '';
        const disk = disks.find((item) => item.name === diskName);
        if (!disk) {
          return diskName;
        }

        return `${disk.name}<br/>Used ${formatBytes(disk.usedBytes)} / ${formatBytes(disk.totalBytes)}`;
      },
      backgroundColor: TOOLTIP_BACKGROUND,
      borderWidth: 0,
      textStyle: { color: TOOLTIP_TEXT_COLOR },
    },
    grid: { top: 16, left: 84, right: 16, bottom: 16, containLabel: true },
    xAxis: {
      type: 'value',
      max: 100,
      axisLabel: { color: AXIS_LABEL_COLOR, formatter: '{value}%' },
      splitLine: { lineStyle: { color: SPLIT_LINE_COLOR } },
    },
    yAxis: {
      type: 'category',
      data: disks.map((item) => item.name),
      axisLabel: { color: AXIS_LABEL_COLOR },
    },
    series: [
      {
        id: 'disk-usage',
        type: 'bar',
        animationDurationUpdate: 300,
        data: disks.map((item) => Number(item.usageRate.toFixed(1))),
        barMaxWidth: 18,
        itemStyle: {
          color: getThemeColor('--chart-1', '#5f7cff'),
          borderRadius: 999,
        },
        label: {
          show: true,
          position: 'right',
          color: AXIS_LABEL_COLOR,
          formatter: '{c}%',
        },
      },
    ],
  };
}

export function buildNetworkChartOption(data: ScreenNetworkPoint[]): EChartsOption {
  return {
    tooltip: {
      trigger: 'axis',
      formatter: buildAxisTooltipFormatter((value) => `${formatBytes(value)}/s`),
      backgroundColor: TOOLTIP_BACKGROUND,
      borderWidth: 0,
      textStyle: { color: TOOLTIP_TEXT_COLOR },
    },
    legend: { top: 0, right: 0, textStyle: { color: AXIS_LABEL_COLOR } },
    grid: { top: 36, left: 8, right: 8, bottom: 12, containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: mapLabels(data),
      axisLabel: { color: AXIS_LABEL_COLOR, hideOverlap: true },
      axisLine: { lineStyle: { color: SPLIT_LINE_COLOR } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: AXIS_LABEL_COLOR, formatter: (value: number) => formatBytes(value) },
      splitLine: { lineStyle: { color: SPLIT_LINE_COLOR } },
    },
    series: [
      {
        id: 'network-downlink',
        name: 'Downlink',
        type: 'line',
        smooth: true,
        showSymbol: false,
        animationDurationUpdate: 300,
        data: data.map((item) => item.rxBytesPerSec),
        lineStyle: { width: 3, color: getThemeColor('--chart-1', '#5f7cff') },
        itemStyle: { color: getThemeColor('--chart-1', '#5f7cff') },
      },
      {
        id: 'network-uplink',
        name: 'Uplink',
        type: 'line',
        smooth: true,
        showSymbol: false,
        animationDurationUpdate: 300,
        data: data.map((item) => item.txBytesPerSec),
        lineStyle: { width: 3, color: getThemeColor('--chart-5', '#22c55e') },
        itemStyle: { color: getThemeColor('--chart-5', '#22c55e') },
      },
    ],
  };
}
