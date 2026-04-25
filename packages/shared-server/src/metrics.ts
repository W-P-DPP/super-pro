export type MetricsRegistry = {
  increment: (name: string, value?: number, labels?: Record<string, string>) => void;
  observe: (name: string, value: number, labels?: Record<string, string>) => void;
  set: (name: string, value: number, labels?: Record<string, string>) => void;
  render: () => string;
};

type MetricRecord = {
  name: string;
  labels: Record<string, string>;
  value: number;
};

type ObservationRecord = {
  name: string;
  labels: Record<string, string>;
  count: number;
  sum: number;
  max: number;
};

function normalizeLabels(labels?: Record<string, string>) {
  if (!labels) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(labels)
      .filter(([, value]) => value !== '')
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

function buildMetricKey(name: string, labels: Record<string, string>) {
  const encodedLabels = Object.entries(labels)
    .map(([key, value]) => `${key}=${value}`)
    .join(',');

  return `${name}|${encodedLabels}`;
}

function renderLabels(labels: Record<string, string>) {
  const entries = Object.entries(labels);
  if (entries.length === 0) {
    return '';
  }

  const encoded = entries
    .map(([key, value]) => `${key}="${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`)
    .join(',');

  return `{${encoded}}`;
}

export function createInMemoryMetricsRegistry(): MetricsRegistry {
  const counters = new Map<string, MetricRecord>();
  const gauges = new Map<string, MetricRecord>();
  const observations = new Map<string, ObservationRecord>();

  const updateMetricRecord = (
    target: Map<string, MetricRecord>,
    name: string,
    value: number,
    labels?: Record<string, string>,
    mode: 'set' | 'increment' = 'set',
  ) => {
    const normalizedLabels = normalizeLabels(labels);
    const key = buildMetricKey(name, normalizedLabels);
    const existing = target.get(key);

    if (existing) {
      existing.value = mode === 'increment' ? existing.value + value : value;
      return;
    }

    target.set(key, {
      name,
      labels: normalizedLabels,
      value,
    });
  };

  return {
    increment(name, value = 1, labels) {
      updateMetricRecord(counters, name, value, labels, 'increment');
    },
    observe(name, value, labels) {
      const normalizedLabels = normalizeLabels(labels);
      const key = buildMetricKey(name, normalizedLabels);
      const existing = observations.get(key);

      if (existing) {
        existing.count += 1;
        existing.sum += value;
        existing.max = Math.max(existing.max, value);
        return;
      }

      observations.set(key, {
        name,
        labels: normalizedLabels,
        count: 1,
        sum: value,
        max: value,
      });
    },
    set(name, value, labels) {
      updateMetricRecord(gauges, name, value, labels);
    },
    render() {
      const lines: string[] = [];
      const typesRendered = new Set<string>();

      for (const metric of counters.values()) {
        if (!typesRendered.has(metric.name)) {
          lines.push(`# TYPE ${metric.name} counter`);
          typesRendered.add(metric.name);
        }

        lines.push(`${metric.name}${renderLabels(metric.labels)} ${metric.value}`);
      }

      for (const metric of gauges.values()) {
        if (!typesRendered.has(metric.name)) {
          lines.push(`# TYPE ${metric.name} gauge`);
          typesRendered.add(metric.name);
        }

        lines.push(`${metric.name}${renderLabels(metric.labels)} ${metric.value}`);
      }

      for (const metric of observations.values()) {
        if (!typesRendered.has(metric.name)) {
          lines.push(`# TYPE ${metric.name} summary`);
          typesRendered.add(metric.name);
        }

        lines.push(`${metric.name}_count${renderLabels(metric.labels)} ${metric.count}`);
        lines.push(`${metric.name}_sum${renderLabels(metric.labels)} ${metric.sum}`);
        lines.push(`${metric.name}_max${renderLabels(metric.labels)} ${metric.max}`);
      }

      return `${lines.join('\n')}\n`;
    },
  };
}
