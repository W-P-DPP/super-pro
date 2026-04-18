import initDataBase, { getDataSource } from '../../utils/mysql.ts';
import { HttpStatus } from '../../utils/constant/HttpStatus.ts';
import type {
  ScreenActivityItem,
  ScreenActivityResponse,
  ScreenAgentResponse,
  ScreenKnowledgeRankingItem,
  ScreenKnowledgeResponse,
  ScreenMetricCard,
  ScreenNamedValue,
  ScreenOverviewResponse,
  ScreenRange,
  ScreenServiceKey,
  ScreenStatus,
  ScreenTimePoint,
  ScreenTrendsResponse,
} from '@super-pro/shared-types';
import type { ScreenWindow } from './screen.dto.ts';
import { deviceMetricsCollector } from './device.collector.ts';

type DashboardRangeContext = {
  range: ScreenRange;
  start: Date;
  end: Date;
  previousStart: Date;
  previousEnd: Date;
  bucket: 'hour' | 'day';
  currentBuckets: string[];
};

type QueryValueRow = {
  value: number | string | null;
};

type QueryTrendRow = {
  bucket: string;
  value: number | string;
};

export class ScreenBusinessError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = HttpStatus.BAD_REQUEST,
  ) {
    super(message);
    this.name = 'ScreenBusinessError';
  }
}

function padNumber(value: number) {
  return String(value).padStart(2, '0');
}

function formatBucketDate(date: Date, bucket: 'hour' | 'day') {
  const year = date.getFullYear();
  const month = padNumber(date.getMonth() + 1);
  const day = padNumber(date.getDate());
  if (bucket === 'day') {
    return `${year}-${month}-${day}`;
  }

  return `${year}-${month}-${day} ${padNumber(date.getHours())}:00:00`;
}

function normalizeRange(range: unknown): ScreenRange {
  if (range === '7d' || range === '30d') {
    return range;
  }

  return '24h';
}

function enumerateBuckets(start: Date, count: number, bucket: 'hour' | 'day') {
  const result: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const next = new Date(start);
    if (bucket === 'hour') {
      next.setHours(start.getHours() + index);
    } else {
      next.setDate(start.getDate() + index);
    }
    result.push(formatBucketDate(next, bucket));
  }
  return result;
}

function resolveRangeContext(range: unknown): DashboardRangeContext {
  const normalizedRange = normalizeRange(range);
  const now = new Date();

  if (normalizedRange === '24h') {
    const end = new Date(now);
    end.setMinutes(0, 0, 0);
    end.setHours(end.getHours() + 1);

    const start = new Date(end);
    start.setHours(start.getHours() - 24);

    const previousEnd = new Date(start);
    const previousStart = new Date(previousEnd);
    previousStart.setHours(previousStart.getHours() - 24);

    return {
      range: normalizedRange,
      start,
      end,
      previousStart,
      previousEnd,
      bucket: 'hour',
      currentBuckets: enumerateBuckets(start, 24, 'hour'),
    };
  }

  const totalDays = normalizedRange === '7d' ? 7 : 30;
  const end = new Date(now);
  end.setHours(0, 0, 0, 0);
  end.setDate(end.getDate() + 1);

  const start = new Date(end);
  start.setDate(start.getDate() - totalDays);

  const previousEnd = new Date(start);
  const previousStart = new Date(previousEnd);
  previousStart.setDate(previousStart.getDate() - totalDays);

  return {
    range: normalizedRange,
    start,
    end,
    previousStart,
    previousEnd,
    bucket: 'day',
    currentBuckets: enumerateBuckets(start, totalDays, 'day'),
  };
}

function toNumber(value: unknown) {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function buildDelta(current: number, previous: number) {
  if (previous <= 0) {
    return {
      value: current > 0 ? 100 : 0,
      direction: current > 0 ? 'up' : 'flat',
    } as const;
  }

  const nextValue = Number((((current - previous) / previous) * 100).toFixed(1));
  if (nextValue > 0) {
    return { value: nextValue, direction: 'up' as const };
  }
  if (nextValue < 0) {
    return { value: Math.abs(nextValue), direction: 'down' as const };
  }
  return { value: 0, direction: 'flat' as const };
}

function mapNamedValues(rows: Array<{ name: string; value: string | number }>): ScreenNamedValue[] {
  return rows.map((row) => ({
    name: row.name,
    value: toNumber(row.value),
  }));
}

function mapTrendValues(rows: QueryTrendRow[], context: DashboardRangeContext) {
  const values = new Map(rows.map((row) => [row.bucket, toNumber(row.value)]));
  return context.currentBuckets.map<ScreenTimePoint>((bucket) => ({
    time: bucket,
    value: values.get(bucket) ?? 0,
  }));
}

async function ensureDataSource() {
  const current = getDataSource();
  if (current?.isInitialized) {
    return current;
  }

  return initDataBase();
}

async function querySingleValue(sql: string, params: unknown[]) {
  const dataSource = await ensureDataSource();
  const [row] = (await dataSource.query(sql, params)) as QueryValueRow[];
  return toNumber(row?.value);
}

async function queryTrend(sql: string, params: unknown[]) {
  const dataSource = await ensureDataSource();
  return (await dataSource.query(sql, params)) as QueryTrendRow[];
}

async function queryRows<T>(sql: string, params: unknown[]) {
  const dataSource = await ensureDataSource();
  return (await dataSource.query(sql, params)) as T[];
}

function getBucketSql(bucket: 'hour' | 'day', column = 'create_time') {
  return bucket === 'hour'
    ? `DATE_FORMAT(${column}, '%Y-%m-%d %H:00:00')`
    : `DATE_FORMAT(${column}, '%Y-%m-%d')`;
}

function buildMetricCard(
  key: ScreenMetricCard['key'],
  label: string,
  value: number,
  previous?: number,
  options?: Pick<ScreenMetricCard, 'unit' | 'precision'>,
): ScreenMetricCard {
  return {
    key,
    label,
    value,
    ...(previous !== undefined ? { delta: buildDelta(value, previous) } : {}),
    ...(options?.unit ? { unit: options.unit } : {}),
    ...(options?.precision !== undefined ? { precision: options.precision } : {}),
  };
}

function buildServiceStatus(): Record<ScreenServiceKey, ScreenStatus> {
  const generalStatus = process.env.SCREEN_GENERAL_STATUS === 'down' ? 'down' : 'unknown';
  const fileStatus = process.env.SCREEN_FILE_STATUS === 'down' ? 'down' : 'unknown';

  return {
    agentServer: 'up',
    generalServer: generalStatus as ScreenStatus,
    fileServer: fileStatus as ScreenStatus,
  };
}

function normalizeActivityTime(value: unknown) {
  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date().toISOString();
}

export class ScreenService {
  async getOverview(range: unknown): Promise<ScreenOverviewResponse> {
    const context = resolveRangeContext(range);
    const [activeUsers, previousActiveUsers, sessions, previousSessions, messages, previousMessages] =
      await Promise.all([
        querySingleValue(
          "SELECT COUNT(DISTINCT `user`) AS value FROM sys_operation_log WHERE create_time >= ? AND create_time < ? AND `user` IS NOT NULL AND TRIM(`user`) <> ''",
          [context.start, context.end],
        ),
        querySingleValue(
          "SELECT COUNT(DISTINCT `user`) AS value FROM sys_operation_log WHERE create_time >= ? AND create_time < ? AND `user` IS NOT NULL AND TRIM(`user`) <> ''",
          [context.previousStart, context.previousEnd],
        ),
        querySingleValue(
          'SELECT COUNT(*) AS value FROM agent_chat_session WHERE create_time >= ? AND create_time < ?',
          [context.start, context.end],
        ),
        querySingleValue(
          'SELECT COUNT(*) AS value FROM agent_chat_session WHERE create_time >= ? AND create_time < ?',
          [context.previousStart, context.previousEnd],
        ),
        querySingleValue(
          'SELECT COUNT(*) AS value FROM agent_chat_message WHERE create_time >= ? AND create_time < ?',
          [context.start, context.end],
        ),
        querySingleValue(
          'SELECT COUNT(*) AS value FROM agent_chat_message WHERE create_time >= ? AND create_time < ?',
          [context.previousStart, context.previousEnd],
        ),
      ]);

    const [knowledgeBases, errors, previousErrors, avgResponseTimeMs, previousAvgResponseTimeMs] =
      await Promise.all([
        querySingleValue('SELECT COUNT(*) AS value FROM agent_knowledge_base', []),
        querySingleValue(
          "SELECT COUNT(*) AS value FROM sys_operation_log WHERE create_time >= ? AND create_time < ? AND (status = 'fail' OR response_code >= 400)",
          [context.start, context.end],
        ),
        querySingleValue(
          "SELECT COUNT(*) AS value FROM sys_operation_log WHERE create_time >= ? AND create_time < ? AND (status = 'fail' OR response_code >= 400)",
          [context.previousStart, context.previousEnd],
        ),
        querySingleValue(
          'SELECT COALESCE(AVG(cost_time), 0) AS value FROM sys_operation_log WHERE create_time >= ? AND create_time < ?',
          [context.start, context.end],
        ),
        querySingleValue(
          'SELECT COALESCE(AVG(cost_time), 0) AS value FROM sys_operation_log WHERE create_time >= ? AND create_time < ?',
          [context.previousStart, context.previousEnd],
        ),
      ]);

    return {
      range: context.range,
      generatedAt: new Date().toISOString(),
      serviceStatus: buildServiceStatus(),
      metrics: [
        buildMetricCard('activeUsers', '活跃用户', activeUsers, previousActiveUsers),
        buildMetricCard('sessions', '会话数', sessions, previousSessions),
        buildMetricCard('messages', '消息数', messages, previousMessages),
        buildMetricCard('knowledgeBases', '知识库总数', knowledgeBases),
        buildMetricCard('errors', '错误数', errors, previousErrors),
        buildMetricCard('avgResponseTimeMs', '平均耗时', avgResponseTimeMs, previousAvgResponseTimeMs, {
          unit: 'ms',
          precision: 1,
        }),
      ],
    };
  }

  async getTrends(range: unknown): Promise<ScreenTrendsResponse> {
    const context = resolveRangeContext(range);
    const bucketSql = getBucketSql(context.bucket);

    const [sessionRows, messageRows, operationRows, errorRows] = await Promise.all([
      queryTrend(
        `SELECT ${bucketSql} AS bucket, COUNT(*) AS value FROM agent_chat_session WHERE create_time >= ? AND create_time < ? GROUP BY bucket ORDER BY bucket ASC`,
        [context.start, context.end],
      ),
      queryTrend(
        `SELECT ${bucketSql} AS bucket, COUNT(*) AS value FROM agent_chat_message WHERE create_time >= ? AND create_time < ? GROUP BY bucket ORDER BY bucket ASC`,
        [context.start, context.end],
      ),
      queryTrend(
        `SELECT ${bucketSql} AS bucket, COUNT(*) AS value FROM sys_operation_log WHERE create_time >= ? AND create_time < ? GROUP BY bucket ORDER BY bucket ASC`,
        [context.start, context.end],
      ),
      queryTrend(
        `SELECT ${bucketSql} AS bucket, COUNT(*) AS value FROM sys_operation_log WHERE create_time >= ? AND create_time < ? AND (status = 'fail' OR response_code >= 400) GROUP BY bucket ORDER BY bucket ASC`,
        [context.start, context.end],
      ),
    ]);

    return {
      range: context.range,
      generatedAt: new Date().toISOString(),
      bucket: context.bucket,
      sessionTrend: mapTrendValues(sessionRows, context),
      messageTrend: mapTrendValues(messageRows, context),
      operationTrend: mapTrendValues(operationRows, context),
      errorTrend: mapTrendValues(errorRows, context),
    };
  }

  async getAgent(range: unknown): Promise<ScreenAgentResponse> {
    const context = resolveRangeContext(range);
    const bucketSql = getBucketSql(context.bucket, 'started_at');

    const [summaryRow] = await queryRows<
      {
        runCount: string | number;
        successCount: string | number;
        failedCount: string | number;
        runningCount: string | number;
        avgDurationMs: string | number;
        avgRetrievedChunkCount: string | number;
      }
    >(
      `SELECT
        COUNT(*) AS runCount,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS successCount,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failedCount,
        SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) AS runningCount,
        COALESCE(AVG(duration_ms), 0) AS avgDurationMs,
        COALESCE(AVG(retrieved_chunk_count), 0) AS avgRetrievedChunkCount
      FROM agent_chat_run
      WHERE started_at >= ? AND started_at < ?`,
      [context.start, context.end],
    );

    const [modelDistribution, providerDistribution, statusDistribution, durationRows, retrievedRows] =
      await Promise.all([
        queryRows<{ name: string; value: string | number }>(
          `SELECT model AS name, COUNT(*) AS value
           FROM agent_chat_run
           WHERE started_at >= ? AND started_at < ?
           GROUP BY model
           ORDER BY value DESC, name ASC`,
          [context.start, context.end],
        ),
        queryRows<{ name: string; value: string | number }>(
          `SELECT provider AS name, COUNT(*) AS value
           FROM agent_chat_run
           WHERE started_at >= ? AND started_at < ?
           GROUP BY provider
           ORDER BY value DESC, name ASC`,
          [context.start, context.end],
        ),
        queryRows<{ name: string; value: string | number }>(
          `SELECT status AS name, COUNT(*) AS value
           FROM agent_chat_run
           WHERE started_at >= ? AND started_at < ?
           GROUP BY status
           ORDER BY value DESC, name ASC`,
          [context.start, context.end],
        ),
        queryTrend(
          `SELECT ${bucketSql} AS bucket, COALESCE(AVG(duration_ms), 0) AS value
           FROM agent_chat_run
           WHERE started_at >= ? AND started_at < ?
           GROUP BY bucket
           ORDER BY bucket ASC`,
          [context.start, context.end],
        ),
        queryTrend(
          `SELECT ${bucketSql} AS bucket, COALESCE(AVG(retrieved_chunk_count), 0) AS value
           FROM agent_chat_run
           WHERE started_at >= ? AND started_at < ?
           GROUP BY bucket
           ORDER BY bucket ASC`,
          [context.start, context.end],
        ),
      ]);

    const runCount = toNumber(summaryRow?.runCount);
    const successCount = toNumber(summaryRow?.successCount);

    return {
      range: context.range,
      generatedAt: new Date().toISOString(),
      summary: {
        runCount,
        successCount,
        failedCount: toNumber(summaryRow?.failedCount),
        runningCount: toNumber(summaryRow?.runningCount),
        successRate: runCount > 0 ? Number(((successCount / runCount) * 100).toFixed(1)) : 0,
        avgDurationMs: Number(toNumber(summaryRow?.avgDurationMs).toFixed(1)),
        avgRetrievedChunkCount: Number(
          toNumber(summaryRow?.avgRetrievedChunkCount).toFixed(1),
        ),
      },
      modelDistribution: mapNamedValues(modelDistribution),
      providerDistribution: mapNamedValues(providerDistribution),
      statusDistribution: mapNamedValues(statusDistribution),
      durationTrend: mapTrendValues(durationRows, context),
      retrievedChunkTrend: mapTrendValues(retrievedRows, context),
    };
  }

  async getKnowledge(range: unknown): Promise<ScreenKnowledgeResponse> {
    const context = resolveRangeContext(range);
    const bucketSql = getBucketSql(context.bucket);

    const [summaryRow] = await queryRows<
      {
        knowledgeBaseCount: string | number;
        documentCount: string | number;
        chunkCount: string | number;
        parseSuccessCount: string | number;
        parseFailedCount: string | number;
        parsePendingCount: string | number;
      }
    >(
      `SELECT
        (SELECT COUNT(*) FROM agent_knowledge_base) AS knowledgeBaseCount,
        (SELECT COUNT(*) FROM agent_knowledge_document) AS documentCount,
        (SELECT COUNT(*) FROM agent_knowledge_chunk) AS chunkCount,
        (SELECT COUNT(*) FROM agent_knowledge_document WHERE parse_status = 'success') AS parseSuccessCount,
        (SELECT COUNT(*) FROM agent_knowledge_document WHERE parse_status = 'failed') AS parseFailedCount,
        (SELECT COUNT(*) FROM agent_knowledge_document WHERE parse_status IN ('pending', 'processing')) AS parsePendingCount`,
      [],
    );

    const [statusRows, documentRanking, chunkRanking, recentDocumentRows] = await Promise.all([
      queryRows<{ name: string; value: string | number }>(
        `SELECT parse_status AS name, COUNT(*) AS value
         FROM agent_knowledge_document
         GROUP BY parse_status
         ORDER BY value DESC, name ASC`,
        [],
      ),
      queryRows<ScreenKnowledgeRankingItem>(
        `SELECT base.id AS knowledgeBaseId, base.name AS knowledgeBaseName, COUNT(document.id) AS value
         FROM agent_knowledge_base base
         LEFT JOIN agent_knowledge_document document ON document.knowledge_base_id = base.id
         GROUP BY base.id, base.name
         ORDER BY value DESC, base.id DESC
         LIMIT 8`,
        [],
      ),
      queryRows<ScreenKnowledgeRankingItem>(
        `SELECT base.id AS knowledgeBaseId, base.name AS knowledgeBaseName, COUNT(chunk.id) AS value
         FROM agent_knowledge_base base
         LEFT JOIN agent_knowledge_chunk chunk ON chunk.knowledge_base_id = base.id
         GROUP BY base.id, base.name
         ORDER BY value DESC, base.id DESC
         LIMIT 8`,
        [],
      ),
      queryTrend(
        `SELECT ${bucketSql} AS bucket, COUNT(*) AS value
         FROM agent_knowledge_document
         WHERE create_time >= ? AND create_time < ?
         GROUP BY bucket
         ORDER BY bucket ASC`,
        [context.start, context.end],
      ),
    ]);

    const documentCount = toNumber(summaryRow?.documentCount);
    const parseSuccessCount = toNumber(summaryRow?.parseSuccessCount);

    return {
      range: context.range,
      generatedAt: new Date().toISOString(),
      summary: {
        knowledgeBaseCount: toNumber(summaryRow?.knowledgeBaseCount),
        documentCount,
        chunkCount: toNumber(summaryRow?.chunkCount),
        parseSuccessCount,
        parseFailedCount: toNumber(summaryRow?.parseFailedCount),
        parsePendingCount: toNumber(summaryRow?.parsePendingCount),
        parseSuccessRate:
          documentCount > 0 ? Number(((parseSuccessCount / documentCount) * 100).toFixed(1)) : 0,
      },
      parseStatusDistribution: mapNamedValues(statusRows),
      documentCountRanking: documentRanking.map((item) => ({
        ...item,
        knowledgeBaseId: toNumber(item.knowledgeBaseId),
        value: toNumber(item.value),
      })),
      chunkCountRanking: chunkRanking.map((item) => ({
        ...item,
        knowledgeBaseId: toNumber(item.knowledgeBaseId),
        value: toNumber(item.value),
      })),
      recentDocumentTrend: mapTrendValues(recentDocumentRows, context),
    };
  }

  async getActivity(range: unknown): Promise<ScreenActivityResponse> {
    const context = resolveRangeContext(range);
    const [errorRows, operationRows, sessionRows, knowledgeRows] = await Promise.all([
      queryRows<
        {
          id: string | number;
          createTime: string;
          requestMethod: string | null;
          requestUrl: string | null;
          responseCode: string | number | null;
          module: string | null;
          costTime: string | number | null;
        }
      >(
        `SELECT id, create_time AS createTime, request_method AS requestMethod, request_url AS requestUrl, response_code AS responseCode, module, cost_time AS costTime
         FROM sys_operation_log
         WHERE create_time >= ? AND create_time < ? AND (status = 'fail' OR response_code >= 400)
         ORDER BY create_time DESC
         LIMIT 8`,
        [context.start, context.end],
      ),
      queryRows<
        {
          id: string | number;
          createTime: string;
          requestMethod: string | null;
          requestUrl: string | null;
          module: string | null;
          costTime: string | number | null;
        }
      >(
        `SELECT id, create_time AS createTime, request_method AS requestMethod, request_url AS requestUrl, module, cost_time AS costTime
         FROM sys_operation_log
         WHERE create_time >= ? AND create_time < ?
         ORDER BY create_time DESC
         LIMIT 8`,
        [context.start, context.end],
      ),
      queryRows<
        {
          id: string | number;
          sessionId: string;
          title: string;
          createTime: string;
        }
      >(
        `SELECT id, session_id AS sessionId, title, create_time AS createTime
         FROM agent_chat_session
         WHERE create_time >= ? AND create_time < ?
         ORDER BY create_time DESC
         LIMIT 8`,
        [context.start, context.end],
      ),
      queryRows<
        {
          id: string | number;
          originalFileName: string;
          parseStatus: string;
          createTime: string;
        }
      >(
        `SELECT id, original_file_name AS originalFileName, parse_status AS parseStatus, create_time AS createTime
         FROM agent_knowledge_document
         WHERE create_time >= ? AND create_time < ?
         ORDER BY create_time DESC
         LIMIT 8`,
        [context.start, context.end],
      ),
    ]);

    const recentErrors: ScreenActivityItem[] = errorRows.map((row) => ({
      id: `error-${row.id}`,
      time: normalizeActivityTime(row.createTime),
      type: 'error',
      title: `${row.requestMethod ?? 'REQUEST'} ${row.requestUrl ?? ''}`.trim(),
      description: `状态码 ${toNumber(row.responseCode)}，耗时 ${toNumber(row.costTime)} ms`,
      level: 'error',
      module: row.module ?? undefined,
    }));

    const recentOperations: ScreenActivityItem[] = operationRows.map((row) => ({
      id: `operation-${row.id}`,
      time: normalizeActivityTime(row.createTime),
      type: 'operation',
      title: `${row.requestMethod ?? 'REQUEST'} ${row.requestUrl ?? ''}`.trim(),
      description: `模块 ${row.module ?? 'system'}，耗时 ${toNumber(row.costTime)} ms`,
      level: 'info',
      module: row.module ?? undefined,
    }));

    const recentSessions: ScreenActivityItem[] = sessionRows.map((row) => ({
      id: `session-${row.id}`,
      time: normalizeActivityTime(row.createTime),
      type: 'chat-session',
      title: row.title,
      description: `会话 ${row.sessionId}`,
      level: 'info',
      module: 'chat',
    }));

    const recentKnowledgeChanges: ScreenActivityItem[] = knowledgeRows.map((row) => ({
      id: `knowledge-${row.id}`,
      time: normalizeActivityTime(row.createTime),
      type: 'knowledge-document',
      title: row.originalFileName,
      description: `解析状态 ${row.parseStatus}`,
      level:
        row.parseStatus === 'failed'
          ? 'error'
          : row.parseStatus === 'success'
            ? 'info'
            : 'warning',
      module: 'knowledge',
    }));

    return {
      generatedAt: new Date().toISOString(),
      recentErrors,
      recentOperations,
      recentSessions,
      recentKnowledgeChanges,
    };
  }

  async getDevice(window: ScreenWindow) {
    return deviceMetricsCollector.getSnapshot(window);
  }
}

export const screenService = new ScreenService();
