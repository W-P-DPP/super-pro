import { HttpStatus } from '../../utils/constant/HttpStatus.ts';
import type {
  CreateProjectRequestDto,
  ProjectListDto,
  ProjectListQueryDto,
  ProjectResponseDto,
  ProjectValidationErrorContextDto,
  UpdateProjectRequestDto,
} from './project.dto.ts';
import type { ProjectEntity } from './project.entity.ts';
import {
  projectRepository,
  type ProjectListItemRepositoryRecord,
  type ProjectRepositoryPort,
} from './project.repository.ts';

const DEFAULT_PROJECT_LIST_PAGE = 1;
const DEFAULT_PROJECT_LIST_PAGE_SIZE = 10;
const MAX_PROJECT_LIST_PAGE_SIZE = 100;
const MAX_PROJECT_NAME_LENGTH = 64;
const MAX_PROJECT_CODE_LENGTH = 64;

export class ProjectBusinessError extends Error {
  constructor(
    message: string,
    public readonly context: ProjectValidationErrorContextDto,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'ProjectBusinessError';
  }
}

function ensurePositiveInteger(value: number, field: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new ProjectBusinessError(
      '项目标识不合法',
      {
        nodePath: 'project',
        field,
        reason: '项目标识必须为正整数',
        value,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  return value;
}

function ensureString(
  value: unknown,
  field: string,
  label: string,
  maxLength: number,
): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ProjectBusinessError(
      `${label}不能为空`,
      {
        nodePath: 'project',
        field,
        reason: `${label}必须是非空字符串`,
        value,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  const normalizedValue = value.trim();
  if (normalizedValue.length > maxLength) {
    throw new ProjectBusinessError(
      `${label}长度不能超过 ${maxLength} 个字符`,
      {
        nodePath: 'project',
        field,
        reason: `${label}长度超出限制`,
        value: normalizedValue.length,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  return normalizedValue;
}

function ensureProjectCode(value: unknown, field: string): string {
  const projectCode = ensureString(value, field, '项目编码', MAX_PROJECT_CODE_LENGTH);

  if (!/^[A-Za-z0-9]+(?:[._-][A-Za-z0-9]+)*$/.test(projectCode)) {
    throw new ProjectBusinessError(
      '项目编码格式不合法',
      {
        nodePath: 'project',
        field,
        reason: '项目编码仅支持字母、数字、点、下划线和中划线组合',
        value: projectCode,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  return projectCode;
}

function normalizeOptionalKeyword(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new ProjectBusinessError(
      '搜索关键词必须是字符串',
      {
        nodePath: 'project',
        field: 'keyword',
        reason: '搜索关键词必须是字符串',
        value,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  const trimmedValue = value.trim();
  return trimmedValue ? trimmedValue : undefined;
}

function normalizePaginationInteger(
  value: unknown,
  field: 'page' | 'pageSize',
  defaultValue: number,
  options?: {
    min?: number
    max?: number
  },
): number {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  const parsedValue =
    typeof value === 'string' ? Number(value.trim()) : typeof value === 'number' ? value : Number.NaN;

  if (!Number.isInteger(parsedValue)) {
    throw new ProjectBusinessError(
      `${field === 'page' ? '页码' : '分页大小'}不合法`,
      {
        nodePath: 'project',
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
    throw new ProjectBusinessError(
      `${field === 'page' ? '页码' : '分页大小'}不合法`,
      {
        nodePath: 'project',
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

function normalizeRemark(value: unknown): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return '';
  }

  if (typeof value !== 'string') {
    throw new ProjectBusinessError(
      '项目备注必须是字符串',
      {
        nodePath: 'project',
        field: 'remark',
        reason: '项目备注必须是字符串',
        value,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  return value.trim();
}

function toResponseDto(
  entity: ProjectEntity,
  options?: {
    permissionCount?: number
  },
): ProjectResponseDto {
  const createTime = normalizeDateTime(entity.createTime);
  const updateTime = normalizeDateTime(entity.updateTime);

  return {
    id: entity.id,
    projectName: entity.projectName,
    projectCode: entity.projectCode,
    ...(options?.permissionCount !== undefined ? { permissionCount: options.permissionCount } : {}),
    ...(entity.createBy ? { createBy: entity.createBy } : {}),
    ...(createTime ? { createTime } : {}),
    ...(entity.updateBy ? { updateBy: entity.updateBy } : {}),
    ...(updateTime ? { updateTime } : {}),
    ...(entity.remark ? { remark: entity.remark } : {}),
  };
}

function toProjectListResponseDto(item: ProjectListItemRepositoryRecord): ProjectResponseDto {
  return toResponseDto(item.entity, {
    permissionCount: item.permissionCount,
  });
}

function validateCreateInput(input: Record<string, unknown>): CreateProjectRequestDto {
  const payload: CreateProjectRequestDto = {
    projectName: ensureString(input.projectName, 'projectName', '项目名称', MAX_PROJECT_NAME_LENGTH),
    projectCode: ensureProjectCode(input.projectCode, 'projectCode'),
  };

  const remark = normalizeRemark(input.remark);
  if (remark !== undefined) {
    payload.remark = remark;
  }

  return payload;
}

function validateUpdateInput(input: Record<string, unknown>): UpdateProjectRequestDto {
  const payload: UpdateProjectRequestDto = {};

  if (Object.prototype.hasOwnProperty.call(input, 'projectName') && input.projectName !== undefined) {
    payload.projectName = ensureString(
      input.projectName,
      'projectName',
      '项目名称',
      MAX_PROJECT_NAME_LENGTH,
    );
  }

  if (Object.prototype.hasOwnProperty.call(input, 'projectCode') && input.projectCode !== undefined) {
    payload.projectCode = ensureProjectCode(input.projectCode, 'projectCode');
  }

  if (Object.prototype.hasOwnProperty.call(input, 'remark')) {
    payload.remark = normalizeRemark(input.remark);
  }

  if (Object.keys(payload).length === 0) {
    throw new ProjectBusinessError(
      '更新项目参数不能为空',
      {
        nodePath: 'project',
        field: 'payload',
        reason: '至少需要提供一个可更新字段',
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  return payload;
}

function validateProjectListQuery(input: Record<string, unknown>): ProjectListQueryDto {
  const keyword = normalizeOptionalKeyword(input.keyword);

  return {
    ...(keyword ? { keyword } : {}),
    page: normalizePaginationInteger(input.page, 'page', DEFAULT_PROJECT_LIST_PAGE),
    pageSize: normalizePaginationInteger(
      input.pageSize,
      'pageSize',
      DEFAULT_PROJECT_LIST_PAGE_SIZE,
      {
        min: 1,
        max: MAX_PROJECT_LIST_PAGE_SIZE,
      },
    ),
  };
}

export class ProjectService {
  constructor(private readonly repository: ProjectRepositoryPort = projectRepository) {}

  async getProjectList(
    input: ProjectListQueryDto | Record<string, unknown> = {},
  ): Promise<ProjectListDto> {
    const query = validateProjectListQuery(input as Record<string, unknown>);

    try {
      const result = await this.repository.getProjectList(query);
      return {
        items: result.items.map((item) => toProjectListResponseDto(item)),
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
      };
    } catch {
      throw new ProjectBusinessError(
        '读取项目列表失败',
        {
          nodePath: 'project',
          field: 'source',
          reason: '项目数据源读取失败',
        },
        HttpStatus.ERROR,
      );
    }
  }

  async getProjectDetail(id: number): Promise<ProjectResponseDto> {
    const targetId = ensurePositiveInteger(id, 'id');
    const entity = await this.repository.getProjectById(targetId);

    if (!entity) {
      throw new ProjectBusinessError(
        '项目不存在',
        {
          nodePath: 'project',
          field: 'id',
          reason: '未找到对应项目',
          value: id,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    return toResponseDto(entity);
  }

  async createProject(
    input: CreateProjectRequestDto | Record<string, unknown>,
  ): Promise<ProjectResponseDto> {
    const payload = validateCreateInput(input as Record<string, unknown>);
    const existed = await this.repository.getProjectByCode(payload.projectCode);

    if (existed) {
      throw new ProjectBusinessError(
        '项目编码已存在',
        {
          nodePath: 'project',
          field: 'projectCode',
          reason: '项目编码不能重复',
          value: payload.projectCode,
        },
        HttpStatus.CONFLICT,
      );
    }

    const created = await this.repository.createProject(payload);

    if (!created) {
      throw new ProjectBusinessError(
        '新增项目失败',
        {
          nodePath: 'project',
          field: 'create',
          reason: '项目创建失败',
        },
        HttpStatus.ERROR,
      );
    }

    return toResponseDto(created);
  }

  async updateProject(
    id: number,
    input: UpdateProjectRequestDto | Record<string, unknown>,
  ): Promise<ProjectResponseDto> {
    const targetId = ensurePositiveInteger(id, 'id');
    const current = await this.repository.getProjectById(targetId);

    if (!current) {
      throw new ProjectBusinessError(
        '项目不存在',
        {
          nodePath: 'project',
          field: 'id',
          reason: '未找到对应项目',
          value: id,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const payload = validateUpdateInput(input as Record<string, unknown>);

    if (payload.projectCode && payload.projectCode !== current.projectCode) {
      const existed = await this.repository.getProjectByCode(payload.projectCode);
      if (existed && existed.id !== targetId) {
        throw new ProjectBusinessError(
          '项目编码已存在',
          {
            nodePath: 'project',
            field: 'projectCode',
            reason: '项目编码不能重复',
            value: payload.projectCode,
          },
          HttpStatus.CONFLICT,
        );
      }
    }

    const updated = await this.repository.updateProject(targetId, payload);

    if (!updated) {
      throw new ProjectBusinessError(
        '更新项目失败',
        {
          nodePath: 'project',
          field: 'update',
          reason: '项目更新失败',
          value: id,
        },
        HttpStatus.ERROR,
      );
    }

    return toResponseDto(updated);
  }

  async deleteProject(id: number): Promise<ProjectResponseDto> {
    const targetId = ensurePositiveInteger(id, 'id');
    const deleted = await this.repository.deleteProject(targetId);

    if (!deleted) {
      throw new ProjectBusinessError(
        '项目不存在',
        {
          nodePath: 'project',
          field: 'id',
          reason: '未找到对应项目',
          value: id,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    return toResponseDto(deleted);
  }
}

export const projectService = new ProjectService();
