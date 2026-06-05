import { HttpStatus } from '@super-pro/shared-constants';
import type {
  CreateSiteMenuRequestDto,
  SiteMenuConfigDto,
  SiteMenuImportSourceDto,
  SiteMenuListDto,
  SiteMenuResponseDto,
  SiteMenuTableListDto,
  SiteMenuTableListItemDto,
  SiteMenuTableListQueryDto,
  SiteMenuValidationErrorContextDto,
  UpdateSiteMenuRequestDto,
  UploadedSiteMenuFileDto,
} from './siteMenu.dto.ts';
import {
  normalizeImportedSiteMenuSource,
  type SiteMenuEntity,
} from './siteMenu.entity.ts';
import {
  siteMenuRepository,
  type SiteMenuRepositoryPort,
} from './siteMenu.repository.ts';

const SITE_MENU_APP_ICON = '/public/icons/tools.png';
const DEFAULT_SITE_MENU_LIST_PAGE = 1;
const DEFAULT_SITE_MENU_LIST_PAGE_SIZE = 10;
const MAX_SITE_MENU_LIST_PAGE_SIZE = 100;

export class SiteMenuBusinessError extends Error {
  constructor(
    message: string,
    public readonly context: SiteMenuValidationErrorContextDto,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'SiteMenuBusinessError';
  }
}

const ALLOWED_MENU_FILE_MIME_TYPES = new Set([
  'application/json',
  'text/json',
  'application/octet-stream',
]);

function ensurePositiveInteger(value: unknown, field: string, label: string): number {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim()
        ? Number(value.trim())
        : Number.NaN;

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new SiteMenuBusinessError(
      `${label}不合法`,
      {
        nodePath: 'siteMenu',
        field,
        reason: `${label}必须为正整数`,
        value,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  return parsed;
}

function ensureString(
  value: unknown,
  field: string,
  label: string,
  allowEmpty = false,
): string {
  if (typeof value !== 'string' || (!allowEmpty && !value.trim())) {
    throw new SiteMenuBusinessError(
      allowEmpty ? `${label}必须为字符串` : `${label}不能为空`,
      {
        nodePath: 'siteMenu',
        field,
        reason: allowEmpty ? `${label}必须为字符串` : `${label}必须为非空字符串`,
        value,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  return allowEmpty ? value : value.trim();
}

function normalizeOptionalParentId(value: unknown): number | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = typeof value === 'string' ? Number(value.trim()) : value;
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new SiteMenuBusinessError(
      '父级菜单标识不合法',
      {
        nodePath: 'siteMenu',
        field: 'parentId',
        reason: '父级菜单标识必须为正整数或为空',
        value,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  return parsed;
}

function normalizeOptionalBoolean(
  value: unknown,
  field: string,
  label: string,
): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'boolean') {
    throw new SiteMenuBusinessError(
      `${label}必须为布尔值`,
      {
        nodePath: 'siteMenu',
        field,
        reason: `${label}必须为布尔值`,
        value,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  return value;
}

function normalizeRequiredBoolean(
  value: unknown,
  field: string,
  label: string,
  defaultValue: boolean,
): boolean {
  const normalized = normalizeOptionalBoolean(value, field, label);
  return normalized === undefined ? defaultValue : normalized;
}

function normalizeOptionalQueryBoolean(value: unknown, field: string): boolean | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalizedValue = value.trim().toLowerCase();
    if (normalizedValue === 'true') {
      return true;
    }
    if (normalizedValue === 'false') {
      return false;
    }
  }

  throw new SiteMenuBusinessError(
    '查询参数不合法',
    {
      nodePath: 'siteMenu',
      field,
      reason: '布尔查询参数仅支持 true 或 false',
      value,
    },
    HttpStatus.BAD_REQUEST,
  );
}

function normalizeOptionalNonNegativeInteger(
  value: unknown,
  field: string,
  label: string,
): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const parsed = typeof value === 'string' ? Number(value.trim()) : value;
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new SiteMenuBusinessError(
      `${label}不合法`,
      {
        nodePath: 'siteMenu',
        field,
        reason: `${label}必须为大于等于 0 的整数`,
        value,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  return parsed;
}

function normalizeOptionalQueryString(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new SiteMenuBusinessError(
      '查询参数不合法',
      {
        nodePath: 'siteMenu',
        field,
        reason: '查询参数必须为字符串',
        value,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  const normalizedValue = value.trim();
  return normalizedValue ? normalizedValue : undefined;
}

function normalizePaginationInteger(
  value: unknown,
  field: 'page' | 'pageSize',
  defaultValue: number,
  options?: {
    min?: number;
    max?: number;
  },
): number {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  const normalizedValue = typeof value === 'string' ? Number(value.trim()) : value;
  if (!Number.isInteger(normalizedValue)) {
    throw new SiteMenuBusinessError(
      `${field} 不合法`,
      {
        nodePath: 'siteMenu',
        field,
        reason: `${field} 必须为整数`,
        value,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  const minValue = options?.min ?? 1;
  const maxValue = options?.max;
  if (normalizedValue < minValue || (maxValue !== undefined && normalizedValue > maxValue)) {
    throw new SiteMenuBusinessError(
      `${field} 不合法`,
      {
        nodePath: 'siteMenu',
        field,
        reason:
          field === 'page'
            ? 'page 必须大于等于 1'
            : `pageSize 必须在 ${minValue} 到 ${maxValue ?? Number.MAX_SAFE_INTEGER} 之间`,
        value,
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

function containsNode(node: SiteMenuResponseDto, targetId: number): boolean {
  return node.children.some((child) => child.id === targetId || containsNode(child, targetId));
}

function ensureParentMenuIsTopLevel(parent: SiteMenuEntity, parentId: number): void {
  if (parent.parentId == null && parent.isTop) {
    return;
  }

  throw new SiteMenuBusinessError(
    '\u7236\u7ea7\u83dc\u5355\u53ea\u80fd\u9009\u62e9\u4e00\u7ea7\u83dc\u5355',
    {
      nodePath: 'siteMenu',
      field: 'parentId',
      reason: '\u7236\u7ea7\u83dc\u5355\u53ea\u80fd\u9009\u62e9\u4e00\u7ea7\u83dc\u5355',
      value: parentId,
    },
    HttpStatus.BAD_REQUEST,
  );
}

function normalizeImportValidationMessage(message: string): string {
  return message.replaceAll('菜单种子', '菜单文件');
}

function validateUploadFile(file: UploadedSiteMenuFileDto | null | undefined): UploadedSiteMenuFileDto {
  if (!file || !(file.buffer instanceof Buffer) || file.size <= 0) {
    throw new SiteMenuBusinessError(
      '请上传菜单 JSON 文件',
      {
        nodePath: 'siteMenu',
        field: 'file',
        reason: '上传文件不能为空',
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  if (!file.originalname.trim().toLowerCase().endsWith('.json')) {
    throw new SiteMenuBusinessError(
      '上传的菜单文件必须是 JSON 格式',
      {
        nodePath: 'siteMenu',
        field: 'originalname',
        reason: '上传文件扩展名必须为 .json',
        value: file.originalname,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  const mimeType = file.mimetype?.trim().toLowerCase();
  if (mimeType && !ALLOWED_MENU_FILE_MIME_TYPES.has(mimeType)) {
    throw new SiteMenuBusinessError(
      '上传的菜单文件必须是 JSON 格式',
      {
        nodePath: 'siteMenu',
        field: 'mimetype',
        reason: '上传文件 MIME 类型必须是 JSON',
        value: file.mimetype,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  return file;
}

function parseSiteMenuFile(file: UploadedSiteMenuFileDto): SiteMenuImportSourceDto {
  let parsedSource: unknown;

  try {
    parsedSource = JSON.parse(file.buffer.toString('utf8')) as unknown;
  } catch {
    throw new SiteMenuBusinessError(
      '菜单文件不是有效的 JSON 格式',
      {
        nodePath: 'siteMenu',
        field: 'file',
        reason: '上传文件必须是合法的 JSON 内容',
        value: file.originalname,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  if (!Array.isArray(parsedSource)) {
    throw new SiteMenuBusinessError(
      '菜单文件根节点必须是数组',
      {
        nodePath: 'siteMenu',
        field: 'root',
        reason: '菜单文件根节点必须是数组',
        value: parsedSource,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  try {
    return normalizeImportedSiteMenuSource(parsedSource) as SiteMenuImportSourceDto;
  } catch (error) {
    if (error instanceof SiteMenuBusinessError) {
      throw error;
    }

    throw new SiteMenuBusinessError(
      normalizeImportValidationMessage(
        error instanceof Error ? error.message : '菜单文件内容不合法',
      ),
      {
        nodePath: 'siteMenu',
        field: 'file',
        reason: '菜单文件节点结构不合法',
        value: file.originalname,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

function toResponseDto(entity: SiteMenuEntity): SiteMenuResponseDto {
  return {
    id: entity.id,
    parentId: entity.parentId,
    name: entity.name,
    path: entity.path,
    icon: entity.icon,
    isTop: entity.isTop,
    strict: entity.strict,
    hide: entity.hide,
    sort: entity.sort,
    children: entity.children.map(toResponseDto),
    createBy: entity.createBy,
    createTime: normalizeDateTime(entity.createTime),
    updateBy: entity.updateBy,
    updateTime: normalizeDateTime(entity.updateTime),
    remark: entity.remark ?? '',
  };
}

function validateCreateInput(input: Record<string, unknown>): CreateSiteMenuRequestDto {
  const parentId = normalizeOptionalParentId(input.parentId);

  return {
    parentId,
    name: ensureString(input.name, 'name', '菜单名称'),
    path: ensureString(input.path, 'path', '菜单路径', true),
    icon: ensureString(input.icon, 'icon', '菜单图标', true),
    isTop: parentId == null,
    strict: normalizeRequiredBoolean(input.strict, 'strict', 'strict', false),
    hide: normalizeRequiredBoolean(input.hide, 'hide', 'hide', false),
    sort: normalizeOptionalNonNegativeInteger(input.sort, 'sort', '排序值'),
    remark: typeof input.remark === 'string' ? input.remark.trim() : undefined,
  };
}

function validateUpdateInput(input: Record<string, unknown>): UpdateSiteMenuRequestDto {
  const payload: UpdateSiteMenuRequestDto = {};

  if (Object.prototype.hasOwnProperty.call(input, 'parentId')) {
    payload.parentId = normalizeOptionalParentId(input.parentId);
  }
  if (Object.prototype.hasOwnProperty.call(input, 'name') && input.name !== undefined) {
    payload.name = ensureString(input.name, 'name', '菜单名称');
  }
  if (Object.prototype.hasOwnProperty.call(input, 'path') && input.path !== undefined) {
    payload.path = ensureString(input.path, 'path', '菜单路径', true);
  }
  if (Object.prototype.hasOwnProperty.call(input, 'icon') && input.icon !== undefined) {
    payload.icon = ensureString(input.icon, 'icon', '菜单图标', true);
  }
  if (Object.prototype.hasOwnProperty.call(input, 'strict')) {
    payload.strict = normalizeRequiredBoolean(input.strict, 'strict', 'strict', false);
  }
  if (Object.prototype.hasOwnProperty.call(input, 'hide')) {
    payload.hide = normalizeRequiredBoolean(input.hide, 'hide', 'hide', false);
  }
  if (Object.prototype.hasOwnProperty.call(input, 'sort')) {
    payload.sort = normalizeOptionalNonNegativeInteger(input.sort, 'sort', '排序值');
  }
  if (Object.prototype.hasOwnProperty.call(input, 'remark')) {
    if (typeof input.remark !== 'string') {
      throw new SiteMenuBusinessError(
        '备注必须为字符串',
        {
          nodePath: 'siteMenu',
          field: 'remark',
          reason: '备注必须为字符串',
          value: input.remark,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    payload.remark = input.remark.trim();
  }

  return payload;
}

function validateSiteMenuListQuery(
  input: SiteMenuTableListQueryDto | Record<string, unknown> = {},
): SiteMenuTableListQueryDto {
  const keyword = normalizeOptionalQueryString(input.keyword, 'keyword');
  const hide = normalizeOptionalQueryBoolean(input.hide, 'hide');
  const strict = normalizeOptionalQueryBoolean(input.strict, 'strict');

  return {
    ...(keyword ? { keyword } : {}),
    ...(hide !== undefined ? { hide } : {}),
    ...(strict !== undefined ? { strict } : {}),
    page: normalizePaginationInteger(input.page, 'page', DEFAULT_SITE_MENU_LIST_PAGE, {
      min: 1,
    }),
    pageSize: normalizePaginationInteger(
      input.pageSize,
      'pageSize',
      DEFAULT_SITE_MENU_LIST_PAGE_SIZE,
      {
        min: 1,
        max: MAX_SITE_MENU_LIST_PAGE_SIZE,
      },
    ),
  };
}

function filterSiteMenuTreeByQuery(
  node: SiteMenuResponseDto,
  query: SiteMenuTableListQueryDto,
  parentName = '',
): SiteMenuResponseDto | null {
  const keyword = query.keyword?.toLowerCase();
  const filteredChildren = node.children
    .map((child) => filterSiteMenuTreeByQuery(child, query, node.name))
    .filter((child): child is SiteMenuResponseDto => child !== null);

  const matchesKeyword =
    !keyword ||
    `${node.name} ${parentName} ${node.path} ${node.icon} ${node.remark}`
      .toLowerCase()
      .includes(keyword);
  const matchesHide = query.hide === undefined || node.hide === query.hide;
  const matchesStrict = query.strict === undefined || node.strict === query.strict;
  const selfMatches = matchesKeyword && matchesHide && matchesStrict;

  if (!selfMatches && filteredChildren.length === 0) {
    return null;
  }

  return {
    ...node,
    children: filteredChildren,
  };
}

function flattenSiteMenuTableRows(
  nodes: SiteMenuResponseDto[],
  level = 0,
  parentName = '',
): SiteMenuTableListItemDto[] {
  return [...nodes]
    .sort((left, right) => left.sort - right.sort || left.id - right.id)
    .flatMap((node) => {
      const current: SiteMenuTableListItemDto = {
        id: node.id,
        parentId: node.parentId,
        parentName,
        level,
        name: node.name,
        path: node.path,
        icon: node.icon,
        strict: Boolean(node.strict),
        hide: Boolean(node.hide),
        sort: node.sort,
        remark: node.remark?.trim() ?? '',
        updateTime: node.updateTime || node.createTime || '--',
      };

      return [current, ...flattenSiteMenuTableRows(node.children, level + 1, node.name)];
    });
}

export class SiteMenuService {
  constructor(private readonly repository: SiteMenuRepositoryPort = siteMenuRepository) {}

  async getSiteMenuConfig(): Promise<SiteMenuConfigDto> {
    return {
      appIcon: SITE_MENU_APP_ICON,
    };
  }

  async getSiteMenu(): Promise<SiteMenuListDto> {
    try {
      const entities = await this.repository.getTree();
      return entities.map(toResponseDto);
    } catch (error) {
      if (error instanceof SiteMenuBusinessError) {
        throw error;
      }

      throw new SiteMenuBusinessError(
        '读取菜单失败',
        {
          nodePath: 'siteMenu',
          field: 'source',
          reason: '菜单数据源读取失败',
        },
        HttpStatus.ERROR,
      );
    }
  }

  async getSiteMenuList(
    input: SiteMenuTableListQueryDto | Record<string, unknown> = {},
  ): Promise<SiteMenuTableListDto> {
    const query = validateSiteMenuListQuery(input);
    const menuTree = await this.getSiteMenu();
    const filteredRoots = menuTree
      .map((node) => filterSiteMenuTreeByQuery(node, query))
      .filter((node): node is SiteMenuResponseDto => node !== null);

    const total = filteredRoots.length;
    const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
    const currentPage = Math.min(query.page ?? DEFAULT_SITE_MENU_LIST_PAGE, totalPages);
    const pagedRoots =
      total === 0
        ? []
        : filteredRoots.slice((currentPage - 1) * query.pageSize, currentPage * query.pageSize);

    return {
      items: flattenSiteMenuTableRows(pagedRoots),
      total,
      page: currentPage,
      pageSize: query.pageSize ?? DEFAULT_SITE_MENU_LIST_PAGE_SIZE,
    };
  }

  async getSiteMenuDetail(id: number): Promise<SiteMenuResponseDto> {
    const targetId = ensurePositiveInteger(id, 'id', '菜单标识');
    const entity = await this.repository.getNodeById(targetId);

    if (!entity) {
      throw new SiteMenuBusinessError(
        '菜单不存在',
        {
          nodePath: 'siteMenu',
          field: 'id',
          reason: '菜单节点不存在',
          value: id,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    return toResponseDto(entity);
  }

  async createSiteMenu(
    input: CreateSiteMenuRequestDto | Record<string, unknown>,
  ): Promise<SiteMenuResponseDto> {
    const payload = validateCreateInput(input as Record<string, unknown>);

    if (payload.parentId != null) {
      const parent = await this.repository.getNodeById(payload.parentId);
      if (!parent) {
        throw new SiteMenuBusinessError(
          '父级菜单不存在',
          {
            nodePath: 'siteMenu',
            field: 'parentId',
            reason: '父级菜单不存在',
            value: payload.parentId,
          },
          HttpStatus.NOT_FOUND,
        );
      }
    }

    if (payload.parentId != null) {
      const parent = await this.repository.getNodeById(payload.parentId);
      if (parent) {
        ensureParentMenuIsTopLevel(parent, payload.parentId);
      }
    }

    const created = await this.repository.createNode({
      ...payload,
      isTop: payload.parentId == null,
      strict: payload.strict ?? false,
      hide: payload.hide ?? false,
    });

    if (!created) {
      throw new SiteMenuBusinessError(
        '新增菜单失败',
        {
          nodePath: 'siteMenu',
          field: 'create',
          reason: '菜单节点创建失败',
        },
        HttpStatus.ERROR,
      );
    }

    return toResponseDto(created);
  }

  async updateSiteMenu(
    id: number,
    input: UpdateSiteMenuRequestDto | Record<string, unknown>,
  ): Promise<SiteMenuResponseDto> {
    const targetId = ensurePositiveInteger(id, 'id', '菜单标识');
    const current = await this.repository.getNodeById(targetId);

    if (!current) {
      throw new SiteMenuBusinessError(
        '菜单不存在',
        {
          nodePath: 'siteMenu',
          field: 'id',
          reason: '菜单节点不存在',
          value: id,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const currentDto = toResponseDto(current);
    const payload = validateUpdateInput(input as Record<string, unknown>);
    const nextParentId =
      Object.prototype.hasOwnProperty.call(payload, 'parentId')
        ? (payload.parentId ?? null)
        : current.parentId;

    if (nextParentId != null) {
      if (nextParentId === targetId) {
        throw new SiteMenuBusinessError(
          '父级菜单不能是当前菜单自身',
          {
            nodePath: 'siteMenu',
            field: 'parentId',
            reason: '父级菜单不能等于自身',
            value: nextParentId,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      if (containsNode(currentDto, nextParentId)) {
        throw new SiteMenuBusinessError(
          '父级菜单不能是当前菜单的子节点',
          {
            nodePath: 'siteMenu',
            field: 'parentId',
            reason: '父级菜单不能挂到子节点下',
            value: nextParentId,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const parent = await this.repository.getNodeById(nextParentId);
      if (!parent) {
        throw new SiteMenuBusinessError(
          '父级菜单不存在',
          {
            nodePath: 'siteMenu',
            field: 'parentId',
            reason: '父级菜单不存在',
            value: nextParentId,
          },
          HttpStatus.NOT_FOUND,
        );
      }
    }

    if (nextParentId != null) {
      const parent = await this.repository.getNodeById(nextParentId);
      if (parent) {
        ensureParentMenuIsTopLevel(parent, nextParentId);
      }
    }

    const updated = await this.repository.updateNode(targetId, payload);
    if (!updated) {
      throw new SiteMenuBusinessError(
        '更新菜单失败',
        {
          nodePath: 'siteMenu',
          field: 'update',
          reason: '菜单节点更新失败',
          value: id,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return toResponseDto(updated);
  }

  async deleteSiteMenu(id: number): Promise<SiteMenuResponseDto> {
    const targetId = ensurePositiveInteger(id, 'id', '菜单标识');
    const deleted = await this.repository.deleteNode(targetId);

    if (!deleted) {
      throw new SiteMenuBusinessError(
        '菜单不存在',
        {
          nodePath: 'siteMenu',
          field: 'id',
          reason: '菜单节点不存在',
          value: id,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    return toResponseDto(deleted);
  }

  async importSiteMenuFile(
    file: UploadedSiteMenuFileDto | null | undefined,
  ): Promise<SiteMenuListDto> {
    const uploadedFile = validateUploadFile(file);
    const source = parseSiteMenuFile(uploadedFile);

    try {
      const entities = await this.repository.importTreeFromSource(source);
      return entities.map(toResponseDto);
    } catch (error) {
      if (error instanceof SiteMenuBusinessError) {
        throw error;
      }

      throw new SiteMenuBusinessError(
        '导入菜单失败',
        {
          nodePath: 'siteMenu',
          field: 'file',
          reason: '菜单文件导入失败',
          value: uploadedFile.originalname,
        },
        HttpStatus.ERROR,
      );
    }
  }
}

export const siteMenuService = new SiteMenuService();
