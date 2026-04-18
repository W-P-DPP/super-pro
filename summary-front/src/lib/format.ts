export function formatNumber(value: number, precision = 0) {
  return new Intl.NumberFormat('zh-CN', {
    maximumFractionDigits: precision,
    minimumFractionDigits: precision,
  }).format(value);
}

export function formatPercent(value: number, precision = 1) {
  return `${formatNumber(value, precision)}%`;
}

export function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = value;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }

  return `${formatNumber(size, size >= 100 || index === 0 ? 0 : 1)} ${units[index]}`;
}

export function formatMetricValue(value: number, unit?: string, precision = 0) {
  if (unit === 'ms') {
    return `${formatNumber(value, precision)} ms`;
  }

  return unit ? `${formatNumber(value, precision)} ${unit}` : formatNumber(value, precision);
}

export function formatDateTime(value?: string) {
  if (!value) {
    return '--';
  }

  return new Date(value).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatClock(value: Date) {
  return value.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function formatUptime(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return '0 分钟';
  }

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days} 天`);
  }
  if (hours > 0) {
    parts.push(`${hours} 小时`);
  }
  if (minutes > 0 || parts.length === 0) {
    parts.push(`${minutes} 分钟`);
  }

  return parts.join(' ');
}
