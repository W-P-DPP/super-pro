export type ScreenRange = '24h' | '7d' | '30d';

export type ScreenStatus = 'up' | 'down' | 'unknown';

export type ScreenServiceKey = 'agentServer' | 'generalServer' | 'fileServer';

export type ScreenWindow = '5m' | '15m' | '1h';

export type ScreenMetricDeltaDirection = 'up' | 'down' | 'flat';

export type ScreenMetricCard = {
  key:
    | 'activeUsers'
    | 'sessions'
    | 'messages'
    | 'knowledgeBases'
    | 'errors'
    | 'avgResponseTimeMs';
  label: string;
  value: number;
  unit?: string;
  precision?: number;
  delta?: {
    value: number;
    direction: ScreenMetricDeltaDirection;
  };
};

export type ScreenTimePoint = {
  time: string;
  value: number;
};

export type ScreenNamedValue = {
  name: string;
  value: number;
};

export type ScreenOverviewResponse = {
  range: ScreenRange;
  generatedAt: string;
  serviceStatus: Record<ScreenServiceKey, ScreenStatus>;
  metrics: ScreenMetricCard[];
};

export type ScreenTrendsResponse = {
  range: ScreenRange;
  generatedAt: string;
  bucket: 'hour' | 'day';
  sessionTrend: ScreenTimePoint[];
  messageTrend: ScreenTimePoint[];
  operationTrend: ScreenTimePoint[];
  errorTrend: ScreenTimePoint[];
};

export type ScreenAgentResponse = {
  range: ScreenRange;
  generatedAt: string;
  summary: {
    runCount: number;
    successCount: number;
    failedCount: number;
    runningCount: number;
    successRate: number;
    avgDurationMs: number;
    avgRetrievedChunkCount: number;
  };
  modelDistribution: ScreenNamedValue[];
  providerDistribution: ScreenNamedValue[];
  statusDistribution: ScreenNamedValue[];
  durationTrend: ScreenTimePoint[];
  retrievedChunkTrend: ScreenTimePoint[];
};

export type ScreenKnowledgeRankingItem = {
  knowledgeBaseId: number;
  knowledgeBaseName: string;
  value: number;
};

export type ScreenKnowledgeResponse = {
  range: ScreenRange;
  generatedAt: string;
  summary: {
    knowledgeBaseCount: number;
    documentCount: number;
    chunkCount: number;
    parseSuccessCount: number;
    parseFailedCount: number;
    parsePendingCount: number;
    parseSuccessRate: number;
  };
  parseStatusDistribution: ScreenNamedValue[];
  documentCountRanking: ScreenKnowledgeRankingItem[];
  chunkCountRanking: ScreenKnowledgeRankingItem[];
  recentDocumentTrend: ScreenTimePoint[];
};

export type ScreenNetworkPoint = {
  time: string;
  rxBytesPerSec: number;
  txBytesPerSec: number;
};

export type ScreenDiskUsageItem = {
  name: string;
  mount: string;
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  usageRate: number;
};

export type ScreenDeviceResponse = {
  generatedAt: string;
  window: ScreenWindow;
  supportedWindows: ScreenWindow[];
  node: {
    hostname: string;
    platform: string;
    arch: string;
    uptimeSec: number;
  };
  current: {
    cpuUsageRate: number;
    memoryUsageRate: number;
    totalMemoryBytes: number;
    usedMemoryBytes: number;
    freeMemoryBytes: number;
    processRssBytes: number;
    processHeapUsedBytes: number;
    processHeapTotalBytes: number;
    processCpuUsageRate: number;
  };
  cpuTrend: ScreenTimePoint[];
  memoryTrend: ScreenTimePoint[];
  networkTrend: ScreenNetworkPoint[];
  diskUsage: ScreenDiskUsageItem[];
};

export type ScreenActivityType =
  | 'error'
  | 'operation'
  | 'chat-session'
  | 'chat-run-failed'
  | 'knowledge-document';

export type ScreenActivityItem = {
  id: string;
  time: string;
  type: ScreenActivityType;
  title: string;
  description: string;
  level: 'info' | 'warning' | 'error';
  module?: string;
  extra?: Record<string, string | number | boolean | null>;
};

export type ScreenActivityResponse = {
  generatedAt: string;
  recentErrors: ScreenActivityItem[];
  recentOperations: ScreenActivityItem[];
  recentSessions: ScreenActivityItem[];
  recentKnowledgeChanges: ScreenActivityItem[];
};
