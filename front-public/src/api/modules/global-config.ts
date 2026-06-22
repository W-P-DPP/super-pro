import type { ApiEnvelope, PublicGlobalConfigDto } from '@super-pro/shared-types';
import { RequestError, request } from '../request';

type ApiResponse<T> = ApiEnvelope<T> & {
  timestamp: number;
};

const EMPTY_GLOBAL_CONFIG: PublicGlobalConfigDto = {};

let cachedGlobalConfig: PublicGlobalConfigDto | null = null;
let cachedProjectCode = '';
let globalConfigRequest: Promise<PublicGlobalConfigDto> | null = null;

function getCurrentProjectCode() {
  return import.meta.env.VITE_SITE_MENU_CODE?.trim() ?? '';
}

async function fetchProjectGlobalConfig(projectCode: string): Promise<PublicGlobalConfigDto> {
  const response = await request.get<ApiResponse<PublicGlobalConfigDto>>(
    `/global-config/public/${encodeURIComponent(projectCode)}`,
    {
      requiresAuth: false,
    },
  );

  if (response.code !== 200) {
    throw new RequestError(response.msg || '获取项目全局配置失败，请稍后重试。', {
      status: response.code,
      details: response,
    });
  }

  return response.data ?? EMPTY_GLOBAL_CONFIG;
}

export async function getCurrentProjectGlobalConfig(
  options?: { forceRefresh?: boolean },
): Promise<PublicGlobalConfigDto> {
  const projectCode = getCurrentProjectCode();

  if (!projectCode) {
    return EMPTY_GLOBAL_CONFIG;
  }

  if (options?.forceRefresh) {
    cachedGlobalConfig = null;
    cachedProjectCode = '';
    globalConfigRequest = null;
  }

  const currentCachedGlobalConfig = cachedGlobalConfig;
  if (currentCachedGlobalConfig && cachedProjectCode === projectCode) {
    return currentCachedGlobalConfig;
  }

  if (!globalConfigRequest) {
    const requestPromise = fetchProjectGlobalConfig(projectCode)
      .then((data) => {
        cachedGlobalConfig = data;
        cachedProjectCode = projectCode;
        return data;
      })
      .finally(() => {
        globalConfigRequest = null;
      });
    globalConfigRequest = requestPromise;
  }

  return globalConfigRequest;
}

export type { PublicGlobalConfigDto };
