import { createHash, randomUUID } from 'node:crypto';
import dayjs from 'dayjs';

export function createAiDemandId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, '')}`.slice(0, 64);
}

export function formatAiDemandTimestamp(
  value: Date | string | null | undefined = new Date(),
): string {
  return dayjs(value ?? new Date()).format('YYYY-MM-DD HH:mm:ss');
}

export function normalizeNullableText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function toContentFingerprint(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}
