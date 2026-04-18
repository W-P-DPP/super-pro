import type {
  ApiEnvelope,
  ScreenActivityResponse,
  ScreenAgentResponse,
  ScreenDeviceResponse,
  ScreenKnowledgeResponse,
  ScreenOverviewResponse,
  ScreenRange,
  ScreenWindow,
  ScreenTrendsResponse,
} from '@super-pro/shared-types';
import { request } from '@/api/request';

function withRange(range: ScreenRange) {
  return { params: { range } };
}

export function getScreenOverview(range: ScreenRange) {
  return request
    .get<ApiEnvelope<ScreenOverviewResponse>>('/screen/overview', withRange(range))
    .then((response) => response.data);
}

export function getScreenTrends(range: ScreenRange) {
  return request
    .get<ApiEnvelope<ScreenTrendsResponse>>('/screen/trends', withRange(range))
    .then((response) => response.data);
}

export function getScreenAgent(range: ScreenRange) {
  return request
    .get<ApiEnvelope<ScreenAgentResponse>>('/screen/agent', withRange(range))
    .then((response) => response.data);
}

export function getScreenKnowledge(range: ScreenRange) {
  return request
    .get<ApiEnvelope<ScreenKnowledgeResponse>>('/screen/knowledge', withRange(range))
    .then((response) => response.data);
}

export function getScreenActivity(range: ScreenRange) {
  return request
    .get<ApiEnvelope<ScreenActivityResponse>>('/screen/activity', withRange(range))
    .then((response) => response.data);
}

export function getScreenDevice(window: ScreenWindow = '15m') {
  return request
    .get<ApiEnvelope<ScreenDeviceResponse>>('/screen/device', { params: { window } })
    .then((response) => response.data);
}
