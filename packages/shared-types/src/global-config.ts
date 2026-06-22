export const GLOBAL_CONFIG_TYPES = ['text', 'number', 'boolean'] as const;

export type GlobalConfigType = (typeof GLOBAL_CONFIG_TYPES)[number];

export function isGlobalConfigType(value: string): value is GlobalConfigType {
  return GLOBAL_CONFIG_TYPES.includes(value as GlobalConfigType);
}

export interface GlobalConfigProjectSummaryDto {
  id: number;
  projectName: string;
  projectCode: string;
}

export interface GlobalConfigResponseDto {
  id: number;
  projectId: number;
  projectName: string;
  projectCode: string;
  configKey: string;
  configName: string;
  configType: GlobalConfigType;
  configValue: string | number | boolean;
  status: number;
  remark?: string;
  createBy?: string;
  createTime?: string;
  updateBy?: string;
  updateTime?: string;
}

export interface GlobalConfigListQueryDto {
  keyword?: string;
  projectId?: number;
  status?: number;
  page?: number;
  pageSize?: number;
}

export interface GlobalConfigListDto {
  items: GlobalConfigResponseDto[];
  total: number;
  page: number;
  pageSize: number;
}

export type PublicGlobalConfigDto = Record<string, string | number | boolean>;

export interface GlobalConfigValidationErrorContextDto {
  nodePath: string;
  field: string;
  reason: string;
  value?: unknown;
}

export interface GlobalConfigIdParamsDto {
  id: number;
}

export interface CreateGlobalConfigRequestDto {
  projectId: number;
  configKey: string;
  configName: string;
  configType: GlobalConfigType;
  configValue: string | number | boolean;
  status?: number;
  remark?: string;
}

export interface UpdateGlobalConfigRequestDto {
  projectId?: number;
  configKey?: string;
  configName?: string;
  configType?: GlobalConfigType;
  configValue?: string | number | boolean;
  status?: number;
  remark?: string;
}
