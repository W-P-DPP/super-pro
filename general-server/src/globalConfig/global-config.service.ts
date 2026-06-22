import { HttpStatus } from '@super-pro/shared-constants';
import {
  GLOBAL_CONFIG_TYPES,
  isGlobalConfigType,
  type GlobalConfigType,
} from '@super-pro/shared-types';
import type { ProjectRepositoryPort } from '../project/project.repository.ts';
import { projectRepository } from '../project/project.repository.ts';
import type {
  CreateGlobalConfigRequestDto,
  GlobalConfigListDto,
  GlobalConfigListQueryDto,
  GlobalConfigResponseDto,
  GlobalConfigValidationErrorContextDto,
  PublicGlobalConfigDto,
  UpdateGlobalConfigRequestDto,
} from './global-config.dto.ts';
import type { GlobalConfigEntity } from './global-config.entity.ts';
import {
  globalConfigRepository,
  type GlobalConfigDetailRepositoryRecord,
  type GlobalConfigListItemRepositoryRecord,
  type GlobalConfigRepositoryPort,
} from './global-config.repository.ts';

const DEFAULT_GLOBAL_CONFIG_LIST_PAGE = 1;
const DEFAULT_GLOBAL_CONFIG_LIST_PAGE_SIZE = 10;
const MAX_GLOBAL_CONFIG_LIST_PAGE_SIZE = 100;
const MAX_CONFIG_KEY_LENGTH = 128;
const MAX_CONFIG_NAME_LENGTH = 64;
const MAX_CONFIG_VALUE_LENGTH = 1000;
const MAX_REMARK_LENGTH = 255;
const MAX_PROJECT_CODE_LENGTH = 64;
const DEFAULT_STATUS = 1;

export class GlobalConfigBusinessError extends Error {
  constructor(
    message: string,
    public readonly context: GlobalConfigValidationErrorContextDto,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'GlobalConfigBusinessError';
  }
}

function ensurePositiveInteger(value: number, field: string, label: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new GlobalConfigBusinessError(
      `${label}不合法`,
      {
        nodePath: 'globalConfig',
        field,
        reason: `${label}必须为正整数`,
        value,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  return value;
}

function ensureRequiredString(
  value: unknown,
  field: string,
  label: string,
  maxLength: number,
): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new GlobalConfigBusinessError(
      `${label}不能为空`,
      {
        nodePath: 'globalConfig',
        field,
        reason: `${label}必须是非空字符串`,
        value,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  const normalizedValue = value.trim();
  if (normalizedValue.length > maxLength) {
    throw new GlobalConfigBusinessError(
      `${label}长度不能超过 ${maxLength} 个字符`,
      {
        nodePath: 'globalConfig',
        field,
        reason: `${label}长度超出限制`,
        value: normalizedValue.length,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  return normalizedValue;
}

function ensureConfigKey(value: unknown, field: string): string {
  const configKey = ensureRequiredString(value, field, '配置键', MAX_CONFIG_KEY_LENGTH);

  if (!/^[A-Za-z0-9]+(?:[._-][A-Za-z0-9]+)*$/.test(configKey)) {
    throw new GlobalConfigBusinessError(
      '配置键格式不合法',
      {
        nodePath: 'globalConfig',
        field,
        reason: '配置键仅支持字母、数字、点、下划线和中划线组合',
        value: configKey,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  return configKey;
}

function ensureProjectCode(value: unknown, field = 'projectCode'): string {
  const projectCode = ensureRequiredString(value, field, '项目编码', MAX_PROJECT_CODE_LENGTH);

  if (!/^[A-Za-z0-9]+(?:[._-][A-Za-z0-9]+)*$/.test(projectCode)) {
    throw new GlobalConfigBusinessError(
      '项目编码格式不合法',
      {
        nodePath: 'globalConfig',
        field,
        reason: '项目编码仅支持字母、数字、点、下划线和中划线组合',
        value: projectCode,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  return projectCode;
}

function ensureConfigType(value: unknown, field: string): GlobalConfigType {
  if (typeof value !== 'string' || !isGlobalConfigType(value)) {
    throw new GlobalConfigBusinessError(
      '配置类型不合法',
      {
        nodePath: 'globalConfig',
        field,
        reason: `配置类型必须是 ${GLOBAL_CONFIG_TYPES.join(' / ')} 之一`,
        value,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  return value;
}

function ensureStatus(value: unknown, field: string): number {
  if (value === undefined) {
    return DEFAULT_STATUS;
  }

  const parsedValue =
    typeof value === 'string' ? Number(value.trim()) : typeof value === 'number' ? value : Number.NaN;

  if (!Number.isInteger(parsedValue) || ![0, 1].includes(parsedValue)) {
    throw new GlobalConfigBusinessError(
      '状态不合法',
      {
        nodePath: 'globalConfig',
        field,
        reason: '状态必须是 0 或 1',
        value,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  return parsedValue;
}

function normalizeOptionalKeyword(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new GlobalConfigBusinessError(
      '搜索关键词必须是字符串',
      {
        nodePath: 'globalConfig',
        field: 'keyword',
        reason: '搜索关键词必须是字符串',
        value,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  const normalizedValue = value.trim();
  return normalizedValue || undefined;
}

function normalizePaginationInteger(
  value: unknown,
  field: 'page' | 'pageSize',
  defaultValue: number,
  options?: { min?: number; max?: number },
): number {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  const parsedValue =
    typeof value === 'string' ? Number(value.trim()) : typeof value === 'number' ? value : Number.NaN;

  if (!Number.isInteger(parsedValue)) {
    throw new GlobalConfigBusinessError(
      `${field === 'page' ? '页码' : '分页大小'}不合法`,
      {
        nodePath: 'globalConfig',
        field,
        reason: `${field === 'page' ? '页码' : '分页大小'}必须为正整数`,
        value,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  const minValue = options?.min ?? 1;
  const maxValue = options?.max;
  if (parsedValue < minValue || (maxValue !== undefined && parsedValue > maxValue)) {
    throw new GlobalConfigBusinessError(
      `${field === 'page' ? '页码' : '分页大小'}不合法`,
      {
        nodePath: 'globalConfig',
        field,
        reason:
          field === 'page'
            ? '页码必须大于等于 1'
            : `分页大小必须在 ${minValue} 到 ${maxValue ?? Number.MAX_SAFE_INTEGER} 之间`,
        value,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  return parsedValue;
}

function normalizeOptionalRemark(value: unknown): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return '';
  }

  if (typeof value !== 'string') {
    throw new GlobalConfigBusinessError(
      '备注必须是字符串',
      {
        nodePath: 'globalConfig',
        field: 'remark',
        reason: '备注必须是字符串',
        value,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  const normalizedValue = value.trim();
  if (normalizedValue.length > MAX_REMARK_LENGTH) {
    throw new GlobalConfigBusinessError(
      `备注长度不能超过 ${MAX_REMARK_LENGTH} 个字符`,
      {
        nodePath: 'globalConfig',
        field: 'remark',
        reason: '备注长度超出限制',
        value: normalizedValue.length,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  return normalizedValue;
}

function normalizeDateTime(value: unknown): string | undefined {
  if (!value) {
    return undefined;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return undefined;
}

function normalizeConfigValueByType(
  type: GlobalConfigType,
  value: unknown,
): { storedValue: string; responseValue: string | number | boolean } {
  if (type === 'text') {
    const normalizedValue = ensureRequiredString(value, 'configValue', '配置值', MAX_CONFIG_VALUE_LENGTH);
    return {
      storedValue: normalizedValue,
      responseValue: normalizedValue,
    };
  }

  if (type === 'number') {
    const parsedValue =
      typeof value === 'string' ? Number(value.trim()) : typeof value === 'number' ? value : Number.NaN;

    if (!Number.isFinite(parsedValue)) {
      throw new GlobalConfigBusinessError(
        '数字类型配置值不合法',
        {
          nodePath: 'globalConfig',
          field: 'configValue',
          reason: '数字类型配置值必须是有限数字',
          value,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return {
      storedValue: String(parsedValue),
      responseValue: parsedValue,
    };
  }

  if (typeof value === 'boolean') {
    return {
      storedValue: value ? 'true' : 'false',
      responseValue: value,
    };
  }

  if (typeof value === 'number' && (value === 0 || value === 1)) {
    return {
      storedValue: value === 1 ? 'true' : 'false',
      responseValue: value === 1,
    };
  }

  if (typeof value === 'string') {
    const normalizedValue = value.trim().toLowerCase();
    if (['true', '1'].includes(normalizedValue)) {
      return {
        storedValue: 'true',
        responseValue: true,
      };
    }

    if (['false', '0'].includes(normalizedValue)) {
      return {
        storedValue: 'false',
        responseValue: false,
      };
    }
  }

  throw new GlobalConfigBusinessError(
    '布尔类型配置值不合法',
    {
      nodePath: 'globalConfig',
      field: 'configValue',
      reason: '布尔类型配置值必须是 true / false / 1 / 0',
      value,
    },
    HttpStatus.BAD_REQUEST,
  );
}

function parseStoredConfigValue(type: GlobalConfigType, value: string): string | number | boolean {
  return normalizeConfigValueByType(type, value).responseValue;
}

function toResponseDto(record: GlobalConfigDetailRepositoryRecord): GlobalConfigResponseDto {
  const createTime = normalizeDateTime(record.entity.createTime);
  const updateTime = normalizeDateTime(record.entity.updateTime);

  return {
    id: record.entity.id,
    projectId: record.entity.projectId,
    projectName: record.projectName,
    projectCode: record.projectCode,
    configKey: record.entity.configKey,
    configName: record.entity.configName,
    configType: record.entity.configType,
    configValue: parseStoredConfigValue(record.entity.configType, record.entity.configValue),
    status: record.entity.status,
    ...(record.entity.remark !== undefined ? { remark: record.entity.remark } : {}),
    ...(record.entity.createBy ? { createBy: record.entity.createBy } : {}),
    ...(createTime ? { createTime } : {}),
    ...(record.entity.updateBy ? { updateBy: record.entity.updateBy } : {}),
    ...(updateTime ? { updateTime } : {}),
  };
}

function toListItemResponseDto(record: GlobalConfigListItemRepositoryRecord): GlobalConfigResponseDto {
  return toResponseDto(record);
}

function validateCreateInput(input: Record<string, unknown>): CreateGlobalConfigRequestDto {
  const configType = ensureConfigType(input.configType, 'configType');
  const normalizedValue = normalizeConfigValueByType(configType, input.configValue);
  const payload: CreateGlobalConfigRequestDto = {
    projectId: ensurePositiveInteger(Number(input.projectId), 'projectId', '项目 ID'),
    configKey: ensureConfigKey(input.configKey, 'configKey'),
    configName: ensureRequiredString(input.configName, 'configName', '配置名称', MAX_CONFIG_NAME_LENGTH),
    configType,
    configValue: normalizedValue.responseValue,
    status: ensureStatus(input.status, 'status'),
  };

  const remark = normalizeOptionalRemark(input.remark);
  if (remark !== undefined) {
    payload.remark = remark;
  }

  return payload;
}

function validateUpdateInput(input: Record<string, unknown>): UpdateGlobalConfigRequestDto {
  const payload: UpdateGlobalConfigRequestDto = {};

  if (Object.prototype.hasOwnProperty.call(input, 'projectId') && input.projectId !== undefined) {
    payload.projectId = ensurePositiveInteger(Number(input.projectId), 'projectId', '项目 ID');
  }
  if (Object.prototype.hasOwnProperty.call(input, 'configKey') && input.configKey !== undefined) {
    payload.configKey = ensureConfigKey(input.configKey, 'configKey');
  }
  if (Object.prototype.hasOwnProperty.call(input, 'configName') && input.configName !== undefined) {
    payload.configName = ensureRequiredString(
      input.configName,
      'configName',
      '配置名称',
      MAX_CONFIG_NAME_LENGTH,
    );
  }
  if (Object.prototype.hasOwnProperty.call(input, 'configType') && input.configType !== undefined) {
    payload.configType = ensureConfigType(input.configType, 'configType');
  }
  if (Object.prototype.hasOwnProperty.call(input, 'status') && input.status !== undefined) {
    payload.status = ensureStatus(input.status, 'status');
  }
  if (Object.prototype.hasOwnProperty.call(input, 'remark')) {
    payload.remark = normalizeOptionalRemark(input.remark);
  }
  if (Object.prototype.hasOwnProperty.call(input, 'configValue')) {
    payload.configValue = input.configValue as string | number | boolean;
  }

  if (Object.keys(payload).length === 0) {
    throw new GlobalConfigBusinessError(
      '更新全局配置参数不能为空',
      {
        nodePath: 'globalConfig',
        field: 'payload',
        reason: '至少需要提供一个可更新字段',
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  return payload;
}

function validateGlobalConfigListQuery(input: Record<string, unknown>): GlobalConfigListQueryDto {
  const payload: GlobalConfigListQueryDto = {
    page: normalizePaginationInteger(input.page, 'page', DEFAULT_GLOBAL_CONFIG_LIST_PAGE),
    pageSize: normalizePaginationInteger(
      input.pageSize,
      'pageSize',
      DEFAULT_GLOBAL_CONFIG_LIST_PAGE_SIZE,
      { min: 1, max: MAX_GLOBAL_CONFIG_LIST_PAGE_SIZE },
    ),
  };

  const keyword = normalizeOptionalKeyword(input.keyword);
  if (keyword) {
    payload.keyword = keyword;
  }

  if (input.projectId !== undefined && input.projectId !== null && input.projectId !== '') {
    payload.projectId = ensurePositiveInteger(Number(input.projectId), 'projectId', '项目 ID');
  }

  if (input.status !== undefined && input.status !== null && input.status !== '') {
    payload.status = ensureStatus(input.status, 'status');
  }

  return payload;
}

export class GlobalConfigService {
  constructor(
    private readonly repository: GlobalConfigRepositoryPort = globalConfigRepository,
    private readonly projectLookup: Pick<ProjectRepositoryPort, 'getProjectById' | 'getProjectByCode'> = projectRepository,
  ) {}

  async getGlobalConfigList(
    input: GlobalConfigListQueryDto | Record<string, unknown> = {},
  ): Promise<GlobalConfigListDto> {
    const query = validateGlobalConfigListQuery(input as Record<string, unknown>);

    try {
      const result = await this.repository.getGlobalConfigList(query);
      return {
        items: result.items.map((item) => toListItemResponseDto(item)),
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
      };
    } catch {
      throw new GlobalConfigBusinessError(
        '读取全局配置列表失败',
        {
          nodePath: 'globalConfig',
          field: 'source',
          reason: '全局配置数据源读取失败',
        },
        HttpStatus.ERROR,
      );
    }
  }

  async getGlobalConfigDetail(id: number): Promise<GlobalConfigResponseDto> {
    const targetId = ensurePositiveInteger(id, 'id', '配置 ID');
    const record = await this.repository.getGlobalConfigById(targetId);

    if (!record) {
      throw new GlobalConfigBusinessError(
        '全局配置不存在',
        {
          nodePath: 'globalConfig',
          field: 'id',
          reason: '未找到对应全局配置',
          value: id,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    return toResponseDto(record);
  }

  async getPublicGlobalConfigByProjectCode(projectCode: string): Promise<PublicGlobalConfigDto> {
    const normalizedProjectCode = ensureProjectCode(projectCode);
    const project = await this.projectLookup.getProjectByCode(normalizedProjectCode);

    if (!project) {
      throw new GlobalConfigBusinessError(
        '项目不存在',
        {
          nodePath: 'globalConfig',
          field: 'projectCode',
          reason: '未找到对应项目',
          value: normalizedProjectCode,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const records = await this.repository.getEnabledGlobalConfigsByProjectId(project.id);
    const items = records.map((record) => toResponseDto(record));

    return Object.fromEntries(items.map((item) => [item.configKey, item.configValue]));
  }

  async createGlobalConfig(
    input: CreateGlobalConfigRequestDto | Record<string, unknown>,
  ): Promise<GlobalConfigResponseDto> {
    const payload = validateCreateInput(input as Record<string, unknown>);
    const project = await this.projectLookup.getProjectById(payload.projectId);

    if (!project) {
      throw new GlobalConfigBusinessError(
        '所属项目不存在',
        {
          nodePath: 'globalConfig',
          field: 'projectId',
          reason: '未找到对应项目',
          value: payload.projectId,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const existed = await this.repository.getGlobalConfigByProjectIdAndKey(
      payload.projectId,
      payload.configKey,
    );

    if (existed) {
      throw new GlobalConfigBusinessError(
        '同一项目下配置键已存在',
        {
          nodePath: 'globalConfig',
          field: 'configKey',
          reason: '同一项目下配置键不能重复',
          value: payload.configKey,
        },
        HttpStatus.CONFLICT,
      );
    }

    const normalizedValue = normalizeConfigValueByType(payload.configType, payload.configValue);
    const created = await this.repository.createGlobalConfig({
      projectId: payload.projectId,
      projectName: project.projectName,
      projectCode: project.projectCode,
      configKey: payload.configKey,
      configName: payload.configName,
      configType: payload.configType,
      configValue: normalizedValue.storedValue,
      status: payload.status ?? DEFAULT_STATUS,
      remark: payload.remark,
    });

    if (!created) {
      throw new GlobalConfigBusinessError(
        '新增全局配置失败',
        {
          nodePath: 'globalConfig',
          field: 'create',
          reason: '全局配置创建失败',
        },
        HttpStatus.ERROR,
      );
    }

    return toResponseDto(created);
  }

  async updateGlobalConfig(
    id: number,
    input: UpdateGlobalConfigRequestDto | Record<string, unknown>,
  ): Promise<GlobalConfigResponseDto> {
    const targetId = ensurePositiveInteger(id, 'id', '配置 ID');
    const current = await this.repository.getGlobalConfigById(targetId);

    if (!current) {
      throw new GlobalConfigBusinessError(
        '全局配置不存在',
        {
          nodePath: 'globalConfig',
          field: 'id',
          reason: '未找到对应全局配置',
          value: id,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const payload = validateUpdateInput(input as Record<string, unknown>);
    const targetProjectId = payload.projectId ?? current.entity.projectId;
    const targetProject = await this.projectLookup.getProjectById(targetProjectId);

    if (!targetProject) {
      throw new GlobalConfigBusinessError(
        '所属项目不存在',
        {
          nodePath: 'globalConfig',
          field: 'projectId',
          reason: '未找到对应项目',
          value: targetProjectId,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const targetConfigKey = payload.configKey ?? current.entity.configKey;
    if (
      targetProjectId !== current.entity.projectId ||
      targetConfigKey !== current.entity.configKey
    ) {
      const existed = await this.repository.getGlobalConfigByProjectIdAndKey(
        targetProjectId,
        targetConfigKey,
      );
      if (existed && existed.id !== targetId) {
        throw new GlobalConfigBusinessError(
          '同一项目下配置键已存在',
          {
            nodePath: 'globalConfig',
            field: 'configKey',
            reason: '同一项目下配置键不能重复',
            value: targetConfigKey,
          },
          HttpStatus.CONFLICT,
        );
      }
    }

    const nextConfigType = payload.configType ?? current.entity.configType;
    const nextRawValue =
      payload.configValue ?? parseStoredConfigValue(current.entity.configType, current.entity.configValue);
    const normalizedValue = normalizeConfigValueByType(nextConfigType, nextRawValue);

    const updated = await this.repository.updateGlobalConfig(targetId, {
      ...(payload.projectId !== undefined ? { projectId: payload.projectId } : {}),
      ...(payload.configKey !== undefined ? { configKey: payload.configKey } : {}),
      ...(payload.configName !== undefined ? { configName: payload.configName } : {}),
      ...(payload.configType !== undefined ? { configType: payload.configType } : {}),
      configValue: normalizedValue.storedValue,
      ...(payload.status !== undefined ? { status: payload.status } : {}),
      ...(payload.remark !== undefined ? { remark: payload.remark } : {}),
      projectName: targetProject.projectName,
      projectCode: targetProject.projectCode,
    });

    if (!updated) {
      throw new GlobalConfigBusinessError(
        '更新全局配置失败',
        {
          nodePath: 'globalConfig',
          field: 'update',
          reason: '全局配置更新失败',
          value: id,
        },
        HttpStatus.ERROR,
      );
    }

    return toResponseDto(updated);
  }

  async deleteGlobalConfig(id: number): Promise<GlobalConfigResponseDto> {
    const targetId = ensurePositiveInteger(id, 'id', '配置 ID');
    const deleted = await this.repository.deleteGlobalConfig(targetId);

    if (!deleted) {
      throw new GlobalConfigBusinessError(
        '全局配置不存在',
        {
          nodePath: 'globalConfig',
          field: 'id',
          reason: '未找到对应全局配置',
          value: id,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    return toResponseDto(deleted);
  }
}

export const globalConfigService = new GlobalConfigService();
