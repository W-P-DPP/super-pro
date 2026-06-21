import { HttpStatus } from '@super-pro/shared-constants';
import {
  ADMIN_MENU_ICON_KEYS,
  ADMIN_MENU_NODE_TYPES,
  type AdminMenuIconKey,
  type AdminMenuNodeType,
  type AdminMenuResponseDto,
  type AdminMenuValidationErrorContextDto,
  type CreateAdminMenuRequestDto,
  type UpdateAdminMenuRequestDto,
} from '@super-pro/shared-types';
import type {
  AdminMenuTableListDto,
  AdminMenuTableListItemDto,
  AdminMenuTableListQueryDto,
} from './adminMenu.dto.ts';
import type { AdminMenuEntity } from './adminMenu.entity.ts';
import {
  adminMenuRepository,
  type AdminMenuRepositoryPort,
} from './adminMenu.repository.ts';

const MAX_NAME_LENGTH = 64;
const MAX_SHORT_TITLE_LENGTH = 32;
const MAX_SLUG_LENGTH = 64;
const MAX_DESCRIPTION_LENGTH = 255;
const MAX_BADGE_LENGTH = 32;
const MAX_PERMISSION_CODE_LENGTH = 128;
const MAX_REMARK_LENGTH = 255;
const MENU_SLUG_REGEXP = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DEFAULT_ADMIN_MENU_LIST_PAGE = 1;
const DEFAULT_ADMIN_MENU_LIST_PAGE_SIZE = 10;
const MAX_ADMIN_MENU_LIST_PAGE_SIZE = 100;

export class AdminMenuBusinessError extends Error {
  constructor(
    message: string,
    public readonly context: AdminMenuValidationErrorContextDto,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'AdminMenuBusinessError';
  }
}

function ensurePositiveInteger(value: unknown, field: string, label: string): number {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim()
        ? Number(value.trim())
        : Number.NaN;

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AdminMenuBusinessError(
      `${label}不合法`,
      {
        nodePath: 'adminMenu',
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
  maxLength: number,
): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new AdminMenuBusinessError(
      `${label}不能为空`,
      {
        nodePath: 'adminMenu',
        field,
        reason: `${label}必须为非空字符串`,
        value,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  const normalizedValue = value.trim();
  if (normalizedValue.length > maxLength) {
    throw new AdminMenuBusinessError(
      `${label}长度不能超过 ${maxLength} 个字符`,
      {
        nodePath: 'adminMenu',
        field,
        reason: `${label}长度超出限制`,
        value: normalizedValue.length,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  return normalizedValue;
}

function normalizeOptionalString(
  value: unknown,
  field: string,
  label: string,
  maxLength: number,
): string {
  if (value === undefined || value === null) {
    return '';
  }

  if (typeof value !== 'string') {
    throw new AdminMenuBusinessError(
      `${label}必须为字符串`,
      {
        nodePath: 'adminMenu',
        field,
        reason: `${label}必须为字符串`,
        value,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  const normalizedValue = value.trim();
  if (normalizedValue.length > maxLength) {
    throw new AdminMenuBusinessError(
      `${label}长度不能超过 ${maxLength} 个字符`,
      {
        nodePath: 'adminMenu',
        field,
        reason: `${label}长度超出限制`,
        value: normalizedValue.length,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  return normalizedValue;
}

function ensureMenuType(value: unknown, field: string): AdminMenuNodeType {
  if (typeof value !== 'string' || !ADMIN_MENU_NODE_TYPES.includes(value as AdminMenuNodeType)) {
    throw new AdminMenuBusinessError(
      '菜单类型不合法',
      {
        nodePath: 'adminMenu',
        field,
        reason: `菜单类型仅支持 ${ADMIN_MENU_NODE_TYPES.join(' / ')}`,
        value,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  return value as AdminMenuNodeType;
}

function ensureIconKey(value: unknown, field: string): AdminMenuIconKey {
  if (typeof value !== 'string' || !ADMIN_MENU_ICON_KEYS.includes(value as AdminMenuIconKey)) {
    throw new AdminMenuBusinessError(
      '菜单图标不合法',
      {
        nodePath: 'adminMenu',
        field,
        reason: `菜单图标仅支持 ${ADMIN_MENU_ICON_KEYS.join(', ')}`,
        value,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  return value as AdminMenuIconKey;
}

function normalizeStatus(value: unknown, field: string, defaultValue: number): number {
  if (value === undefined) {
    return defaultValue;
  }

  const normalizedValue = typeof value === 'string' ? Number(value.trim()) : value;
  if (normalizedValue !== 0 && normalizedValue !== 1) {
    throw new AdminMenuBusinessError(
      '菜单状态不合法',
      {
        nodePath: 'adminMenu',
        field,
        reason: '菜单状态仅支持 0 或 1',
        value,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  return normalizedValue;
}

function normalizeOptionalStatus(value: unknown, field: string): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  return normalizeStatus(value, field, 1);
}

function normalizeSort(value: unknown, field: string): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const normalizedValue = typeof value === 'string' ? Number(value.trim()) : value;
  if (!Number.isInteger(normalizedValue) || normalizedValue < 0) {
    throw new AdminMenuBusinessError(
      '菜单排序不合法',
      {
        nodePath: 'adminMenu',
        field,
        reason: '菜单排序必须为大于等于 0 的整数',
        value,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  return normalizedValue;
}

function normalizeParentId(value: unknown, field: string): number | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const normalizedValue = typeof value === 'string' ? Number(value.trim()) : value;
  if (!Number.isInteger(normalizedValue) || normalizedValue <= 0) {
    throw new AdminMenuBusinessError(
      '父级菜单不合法',
      {
        nodePath: 'adminMenu',
        field,
        reason: '父级菜单必须为正整数或为空',
        value,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  return normalizedValue;
}

function ensureSlug(value: unknown, field: string, required: boolean): string | null {
  if (value === undefined || value === null || value === '') {
    if (required) {
      throw new AdminMenuBusinessError(
        '菜单路由标识不能为空',
        {
          nodePath: 'adminMenu',
          field,
          reason: '菜单项必须配置路由标识',
          value,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return null;
  }

  if (typeof value !== 'string') {
    throw new AdminMenuBusinessError(
      '菜单路由标识不合法',
      {
        nodePath: 'adminMenu',
        field,
        reason: '菜单路由标识必须为字符串',
        value,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  const normalizedValue = value.trim();
  if (!normalizedValue) {
    return required ? ensureSlug(undefined, field, true) : null;
  }

  if (normalizedValue.length > MAX_SLUG_LENGTH) {
    throw new AdminMenuBusinessError(
      `菜单路由标识长度不能超过 ${MAX_SLUG_LENGTH} 个字符`,
      {
        nodePath: 'adminMenu',
        field,
        reason: '菜单路由标识长度超出限制',
        value: normalizedValue.length,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  if (!MENU_SLUG_REGEXP.test(normalizedValue)) {
    throw new AdminMenuBusinessError(
      '菜单路由标识格式不合法',
      {
        nodePath: 'adminMenu',
        field,
        reason: '菜单路由标识仅支持小写字母、数字和中划线',
        value: normalizedValue,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  return normalizedValue;
}

function normalizeOptionalQueryString(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new AdminMenuBusinessError(
      '查询参数不合法',
      {
        nodePath: 'adminMenu',
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
    throw new AdminMenuBusinessError(
      `${field} 不合法`,
      {
        nodePath: 'adminMenu',
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
    throw new AdminMenuBusinessError(
      `${field} 不合法`,
      {
        nodePath: 'adminMenu',
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

function toResponseDto(entity: AdminMenuEntity): AdminMenuResponseDto {
  const createTime = normalizeDateTime(entity.createTime);
  const updateTime = normalizeDateTime(entity.updateTime);

  return {
    id: entity.id,
    parentId: entity.parentId,
    name: entity.name,
    shortTitle: entity.shortTitle,
    slug: entity.slug,
    iconKey: entity.iconKey,
    menuType: entity.menuType,
    status: entity.status,
    sort: entity.sort,
    description: entity.description ?? '',
    badge: entity.badge ?? '',
    permissionCode: entity.permissionCode ?? '',
    children: entity.children.map((child) => toResponseDto(child)),
    ...(entity.createBy ? { createBy: entity.createBy } : {}),
    ...(createTime ? { createTime } : {}),
    ...(entity.updateBy ? { updateBy: entity.updateBy } : {}),
    ...(updateTime ? { updateTime } : {}),
    remark: entity.remark ?? '',
  };
}

function hasChildren(node: AdminMenuEntity) {
  return node.children.length > 0;
}

async function ensureParentConstraints(
  repository: AdminMenuRepositoryPort,
  menuType: AdminMenuNodeType,
  parentId: number | null,
): Promise<void> {
  if (menuType === 'group') {
    if (parentId !== null) {
      throw new AdminMenuBusinessError(
        '分组菜单不能指定父级菜单',
        {
          nodePath: 'adminMenu',
          field: 'parentId',
          reason: '分组菜单必须作为一级菜单',
          value: parentId,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return;
  }

  if (parentId === null) {
    throw new AdminMenuBusinessError(
      '菜单项必须选择父级分组',
      {
        nodePath: 'adminMenu',
        field: 'parentId',
        reason: '菜单项必须归属某个分组',
        value: parentId,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  const parent = await repository.getNodeById(parentId);
  if (!parent) {
    throw new AdminMenuBusinessError(
      '父级菜单不存在',
      {
        nodePath: 'adminMenu',
        field: 'parentId',
        reason: '未找到对应父级菜单',
        value: parentId,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  if (parent.menuType !== 'group') {
    throw new AdminMenuBusinessError(
      '父级菜单类型不合法',
      {
        nodePath: 'adminMenu',
        field: 'parentId',
        reason: '菜单项只能挂在分组菜单下',
        value: parentId,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

function validateCreateInput(input: Record<string, unknown>): CreateAdminMenuRequestDto {
  const menuType = ensureMenuType(input.menuType, 'menuType');
  const name = ensureString(input.name, 'name', '菜单名称', MAX_NAME_LENGTH);

  return {
    parentId: normalizeParentId(input.parentId, 'parentId'),
    name,
    shortTitle:
      normalizeOptionalString(input.shortTitle, 'shortTitle', '菜单简称', MAX_SHORT_TITLE_LENGTH) ||
      name,
    slug: ensureSlug(input.slug, 'slug', menuType === 'item'),
    iconKey: ensureIconKey(input.iconKey, 'iconKey'),
    menuType,
    status: normalizeStatus(input.status, 'status', 1),
    sort: normalizeSort(input.sort, 'sort'),
    description: normalizeOptionalString(
      input.description,
      'description',
      '菜单描述',
      MAX_DESCRIPTION_LENGTH,
    ),
    badge: normalizeOptionalString(input.badge, 'badge', '角标文案', MAX_BADGE_LENGTH),
    permissionCode: normalizeOptionalString(
      input.permissionCode,
      'permissionCode',
      '权限编码',
      MAX_PERMISSION_CODE_LENGTH,
    ),
    remark: normalizeOptionalString(input.remark, 'remark', '备注', MAX_REMARK_LENGTH),
  };
}

function validateUpdateInput(input: Record<string, unknown>): UpdateAdminMenuRequestDto {
  const payload: UpdateAdminMenuRequestDto = {};

  if (Object.prototype.hasOwnProperty.call(input, 'parentId')) {
    payload.parentId = normalizeParentId(input.parentId, 'parentId');
  }
  if (Object.prototype.hasOwnProperty.call(input, 'name') && input.name !== undefined) {
    payload.name = ensureString(input.name, 'name', '菜单名称', MAX_NAME_LENGTH);
  }
  if (Object.prototype.hasOwnProperty.call(input, 'shortTitle')) {
    payload.shortTitle = normalizeOptionalString(
      input.shortTitle,
      'shortTitle',
      '菜单简称',
      MAX_SHORT_TITLE_LENGTH,
    );
  }
  if (Object.prototype.hasOwnProperty.call(input, 'slug')) {
    payload.slug = input.slug === undefined ? undefined : ensureSlug(input.slug, 'slug', false);
  }
  if (Object.prototype.hasOwnProperty.call(input, 'iconKey') && input.iconKey !== undefined) {
    payload.iconKey = ensureIconKey(input.iconKey, 'iconKey');
  }
  if (Object.prototype.hasOwnProperty.call(input, 'menuType') && input.menuType !== undefined) {
    payload.menuType = ensureMenuType(input.menuType, 'menuType');
  }
  if (Object.prototype.hasOwnProperty.call(input, 'status')) {
    payload.status = normalizeStatus(input.status, 'status', 1);
  }
  if (Object.prototype.hasOwnProperty.call(input, 'sort')) {
    payload.sort = normalizeSort(input.sort, 'sort');
  }
  if (Object.prototype.hasOwnProperty.call(input, 'description')) {
    payload.description = normalizeOptionalString(
      input.description,
      'description',
      '菜单描述',
      MAX_DESCRIPTION_LENGTH,
    );
  }
  if (Object.prototype.hasOwnProperty.call(input, 'badge')) {
    payload.badge = normalizeOptionalString(input.badge, 'badge', '角标文案', MAX_BADGE_LENGTH);
  }
  if (Object.prototype.hasOwnProperty.call(input, 'permissionCode')) {
    payload.permissionCode = normalizeOptionalString(
      input.permissionCode,
      'permissionCode',
      '权限编码',
      MAX_PERMISSION_CODE_LENGTH,
    );
  }
  if (Object.prototype.hasOwnProperty.call(input, 'remark')) {
    payload.remark = normalizeOptionalString(input.remark, 'remark', '备注', MAX_REMARK_LENGTH);
  }

  if (Object.keys(payload).length === 0) {
    throw new AdminMenuBusinessError(
      '更新参数不能为空',
      {
        nodePath: 'adminMenu',
        field: 'payload',
        reason: '至少需要提供一个可更新字段',
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  return payload;
}

function validateAdminMenuListQuery(
  input: AdminMenuTableListQueryDto | Record<string, unknown> = {},
): AdminMenuTableListQueryDto {
  const keyword = normalizeOptionalQueryString(input.keyword, 'keyword');
  const menuType = input.menuType === undefined ? undefined : ensureMenuType(input.menuType, 'menuType');
  const status = normalizeOptionalStatus(input.status, 'status');

  return {
    ...(keyword ? { keyword } : {}),
    ...(menuType ? { menuType } : {}),
    ...(status !== undefined ? { status } : {}),
    page: normalizePaginationInteger(input.page, 'page', DEFAULT_ADMIN_MENU_LIST_PAGE),
    pageSize: normalizePaginationInteger(
      input.pageSize,
      'pageSize',
      DEFAULT_ADMIN_MENU_LIST_PAGE_SIZE,
      {
        min: 1,
        max: MAX_ADMIN_MENU_LIST_PAGE_SIZE,
      },
    ),
  };
}

function filterAdminMenuTreeByQuery(
  node: AdminMenuResponseDto,
  query: AdminMenuTableListQueryDto,
  parentName = '',
): AdminMenuResponseDto | null {
  const keyword = query.keyword?.toLowerCase();
  const filteredChildren = node.children
    .map((child) => filterAdminMenuTreeByQuery(child, query, node.name))
    .filter((child): child is AdminMenuResponseDto => child !== null);

  const matchesKeyword =
    !keyword ||
    `${node.name} ${node.shortTitle} ${parentName} ${node.slug ?? ''} ${node.permissionCode} ${
      node.description
    } ${node.remark}`
      .toLowerCase()
      .includes(keyword);
  const matchesMenuType = query.menuType === undefined || node.menuType === query.menuType;
  const matchesStatus = query.status === undefined || node.status === query.status;
  const selfMatches = matchesKeyword && matchesMenuType && matchesStatus;

  if (!selfMatches && filteredChildren.length === 0) {
    return null;
  }

  return {
    ...node,
    children: filteredChildren,
  };
}

function flattenAdminMenuTree(
  nodes: AdminMenuResponseDto[],
  level = 0,
  parentName = '',
): AdminMenuTableListItemDto[] {
  return [...nodes]
    .sort((left, right) => left.sort - right.sort || left.id - right.id)
    .flatMap((node) => {
      const current: AdminMenuTableListItemDto = {
        id: node.id,
        parentId: node.parentId,
        parentName,
        level,
        name: node.name,
        shortTitle: node.shortTitle,
        slug: node.slug ?? '',
        iconKey: node.iconKey,
        menuType: node.menuType,
        status: node.status,
        sort: node.sort,
        description: node.description,
        badge: node.badge,
        permissionCode: node.permissionCode,
        remark: node.remark,
        updateTime: node.updateTime ?? node.createTime ?? '--',
      };

      return [current, ...flattenAdminMenuTree(node.children, level + 1, node.name)];
    });
}

export class AdminMenuService {
  constructor(private readonly repository: AdminMenuRepositoryPort = adminMenuRepository) {}

  async getAdminMenuTree(): Promise<AdminMenuResponseDto[]> {
    try {
      const tree = await this.repository.getTree();
      return tree.map((node) => toResponseDto(node));
    } catch {
      throw new AdminMenuBusinessError(
        '读取后台菜单失败',
        {
          nodePath: 'adminMenu',
          field: 'source',
          reason: '后台菜单数据源读取失败',
        },
        HttpStatus.ERROR,
      );
    }
  }

  async getAdminMenuList(
    input: AdminMenuTableListQueryDto | Record<string, unknown> = {},
  ): Promise<AdminMenuTableListDto> {
    const query = validateAdminMenuListQuery(input);
    const menuTree = await this.getAdminMenuTree();
    const filteredRoots = menuTree
      .map((node) => filterAdminMenuTreeByQuery(node, query))
      .filter((node): node is AdminMenuResponseDto => node !== null);

    const total = filteredRoots.length;
    const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
    const currentPage = Math.min(query.page ?? DEFAULT_ADMIN_MENU_LIST_PAGE, totalPages);
    const pagedRoots =
      total === 0
        ? []
        : filteredRoots.slice((currentPage - 1) * query.pageSize, currentPage * query.pageSize);

    return {
      items: flattenAdminMenuTree(pagedRoots),
      total,
      page: currentPage,
      pageSize: query.pageSize ?? DEFAULT_ADMIN_MENU_LIST_PAGE_SIZE,
    };
  }

  async getAdminMenuDetail(id: number): Promise<AdminMenuResponseDto> {
    const targetId = ensurePositiveInteger(id, 'id', '菜单标识');
    const node = await this.repository.getNodeById(targetId);

    if (!node) {
      throw new AdminMenuBusinessError(
        '后台菜单不存在',
        {
          nodePath: 'adminMenu',
          field: 'id',
          reason: '未找到对应后台菜单',
          value: id,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    return toResponseDto(node);
  }

  async createAdminMenu(
    input: CreateAdminMenuRequestDto | Record<string, unknown>,
  ): Promise<AdminMenuResponseDto> {
    const payload = validateCreateInput(input as Record<string, unknown>);
    await ensureParentConstraints(this.repository, payload.menuType, payload.parentId);

    if (payload.slug) {
      const existed = await this.repository.getNodeBySlug(payload.slug);
      if (existed) {
        throw new AdminMenuBusinessError(
          '菜单路由标识已存在',
          {
            nodePath: 'adminMenu',
            field: 'slug',
            reason: '菜单路由标识不能重复',
            value: payload.slug,
          },
          HttpStatus.CONFLICT,
        );
      }
    }

    const created = await this.repository.createNode({
      parentId: payload.parentId,
      name: payload.name,
      shortTitle: payload.shortTitle?.trim() || payload.name,
      slug: payload.menuType === 'item' ? payload.slug ?? null : null,
      iconKey: payload.iconKey,
      menuType: payload.menuType,
      status: payload.status ?? 1,
      sort: payload.sort,
      description: payload.description?.trim() || '',
      badge: payload.badge?.trim() || '',
      permissionCode: payload.menuType === 'item' ? payload.permissionCode?.trim() || '' : '',
      remark: payload.remark?.trim() || '',
    });

    if (!created) {
      throw new AdminMenuBusinessError(
        '新增后台菜单失败',
        {
          nodePath: 'adminMenu',
          field: 'create',
          reason: '后台菜单创建失败',
        },
        HttpStatus.ERROR,
      );
    }

    return this.getAdminMenuDetail(created.id);
  }

  async updateAdminMenu(
    id: number,
    input: UpdateAdminMenuRequestDto | Record<string, unknown>,
  ): Promise<AdminMenuResponseDto> {
    const targetId = ensurePositiveInteger(id, 'id', '菜单标识');
    const current = await this.repository.getNodeById(targetId);

    if (!current) {
      throw new AdminMenuBusinessError(
        '后台菜单不存在',
        {
          nodePath: 'adminMenu',
          field: 'id',
          reason: '未找到对应后台菜单',
          value: id,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const payload = validateUpdateInput(input as Record<string, unknown>);
    const nextMenuType = payload.menuType ?? current.menuType;
    const nextParentId = Object.prototype.hasOwnProperty.call(payload, 'parentId')
      ? (payload.parentId ?? null)
      : current.parentId;
    const nextSlug = Object.prototype.hasOwnProperty.call(payload, 'slug')
      ? payload.slug ?? null
      : current.slug;

    await ensureParentConstraints(this.repository, nextMenuType, nextParentId);

    if (nextMenuType === 'group' && nextSlug !== null) {
      throw new AdminMenuBusinessError(
        '分组菜单不能配置路由标识',
        {
          nodePath: 'adminMenu',
          field: 'slug',
          reason: '分组菜单不能配置路由标识',
          value: nextSlug,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (nextMenuType === 'item' && !nextSlug) {
      throw new AdminMenuBusinessError(
        '菜单项必须配置路由标识',
        {
          nodePath: 'adminMenu',
          field: 'slug',
          reason: '菜单项必须配置路由标识',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (nextMenuType === 'item' && hasChildren(current)) {
      throw new AdminMenuBusinessError(
        '存在子菜单的分组不能直接改为菜单项',
        {
          nodePath: 'adminMenu',
          field: 'menuType',
          reason: '请先处理当前分组下的子菜单',
          value: current.id,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (nextSlug) {
      const existed = await this.repository.getNodeBySlug(nextSlug);
      if (existed && existed.id !== targetId) {
        throw new AdminMenuBusinessError(
          '菜单路由标识已存在',
          {
            nodePath: 'adminMenu',
            field: 'slug',
            reason: '菜单路由标识不能重复',
            value: nextSlug,
          },
          HttpStatus.CONFLICT,
        );
      }
    }

    const updated = await this.repository.updateNode(targetId, {
      parentId: nextMenuType === 'group' ? null : nextParentId,
      name: payload.name,
      shortTitle:
        Object.prototype.hasOwnProperty.call(payload, 'shortTitle')
          ? payload.shortTitle?.trim() || payload.name?.trim() || current.name
          : undefined,
      slug: nextMenuType === 'item' ? nextSlug : null,
      iconKey: payload.iconKey,
      menuType: nextMenuType,
      status: payload.status,
      sort: payload.sort,
      description: payload.description,
      badge: payload.badge,
      permissionCode:
        nextMenuType === 'item'
          ? payload.permissionCode ?? current.permissionCode
          : '',
      remark: payload.remark,
    });

    if (!updated) {
      throw new AdminMenuBusinessError(
        '更新后台菜单失败',
        {
          nodePath: 'adminMenu',
          field: 'update',
          reason: '后台菜单更新失败',
          value: id,
        },
        HttpStatus.ERROR,
      );
    }

    return this.getAdminMenuDetail(updated.id);
  }

  async deleteAdminMenu(id: number): Promise<AdminMenuResponseDto> {
    const targetId = ensurePositiveInteger(id, 'id', '菜单标识');
    const deleted = await this.repository.deleteNode(targetId);

    if (!deleted) {
      throw new AdminMenuBusinessError(
        '后台菜单不存在',
        {
          nodePath: 'adminMenu',
          field: 'id',
          reason: '未找到对应后台菜单',
          value: id,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    return toResponseDto(deleted);
  }
}

export const adminMenuService = new AdminMenuService();
