import {
  constants,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  privateDecrypt,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'crypto';
import { generateJwtToken } from '@super-pro/shared-server';
import type { AuthorizationRoleSummary, CompatibilityUserRole } from '@super-pro/shared-types';
import { HttpStatus } from '@super-pro/shared-constants';
import { authorizationService } from '../authorization/authorization.service.ts';
import type {
  CreateUserRequestDto,
  GetLoginPublicKeyResponseDto,
  LoginUserRequestDto,
  LoginUserResponseDto,
  RegisterUserRequestDto,
  UpdateUserRequestDto,
  UserListQueryDto,
  UserListDto,
  UserResponseDto,
  UserValidationErrorContextDto,
} from './user.dto.ts';
import { UserRoleEnum } from './user.dto.ts';
import type { UserEntity } from './user.entity.ts';
import {
  userRepository,
  type UserRepositoryPort,
} from './user.repository.ts';

const DEFAULT_LOGIN_PASSWORD = '123456';
const PASSWORD_SALT_BYTES = 16;
const PASSWORD_KEY_LENGTH = 64;
const LOGIN_TOKEN_EXPIRES_IN = 7200;
const LOGIN_PASSWORD_KEY_FIELD = 'passwordCiphertext';
const DEFAULT_USER_LIST_PAGE = 1;
const DEFAULT_USER_LIST_PAGE_SIZE = 10;
const MAX_USER_LIST_PAGE_SIZE = 100;
const SUPER_ADMIN_ROLE_CODES = new Set(['platform.admin', 'super-admin']);

type LoginEncryptionKeyPair = {
  publicKey: string
  privateKey: string
}

let cachedLoginEncryptionKeyPair: LoginEncryptionKeyPair | null = null;

export class UserBusinessError extends Error {
  constructor(
    message: string,
    public readonly context: UserValidationErrorContextDto,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'UserBusinessError';
  }
}

function createEphemeralLoginEncryptionKeyPair(): LoginEncryptionKeyPair {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  return {
    publicKey,
    privateKey,
  };
}

function normalizePem(value?: string): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().replace(/\\n/g, '\n');
  return normalized ? normalized : null;
}

function isPlaceholderPem(value: string | null): boolean {
  return Boolean(value && /replace_with_/i.test(value));
}

function buildLoginKeyConfigError(): UserBusinessError {
  return new UserBusinessError(
    '登录加密密钥配置无效',
    {
      nodePath: 'user',
      field: 'loginEncryptionKey',
      reason: '登录加密密钥不可用',
    },
    HttpStatus.ERROR,
  );
}

function buildValidLoginEncryptionKeyPair(
  publicKey: string | null,
  privateKey: string | null,
): LoginEncryptionKeyPair | null {
  if (!publicKey || !privateKey) {
    return null;
  }

  if (isPlaceholderPem(publicKey) || isPlaceholderPem(privateKey)) {
    return null;
  }

  try {
    createPublicKey(publicKey);
    createPrivateKey(privateKey);
    return {
      publicKey,
      privateKey,
    };
  } catch {
    return null;
  }
}

function getLoginEncryptionKeyPair(): LoginEncryptionKeyPair {
  if (cachedLoginEncryptionKeyPair) {
    return cachedLoginEncryptionKeyPair;
  }

  const publicKey = normalizePem(process.env.LOGIN_PASSWORD_PUBLIC_KEY);
  const privateKey = normalizePem(process.env.LOGIN_PASSWORD_PRIVATE_KEY);
  const configuredKeyPair = buildValidLoginEncryptionKeyPair(publicKey, privateKey);

  if (configuredKeyPair) {
    cachedLoginEncryptionKeyPair = configuredKeyPair;
    return cachedLoginEncryptionKeyPair;
  }

  if ((publicKey || privateKey) && process.env.NODE_ENV !== 'production') {
    throw buildLoginKeyConfigError();
  }

  cachedLoginEncryptionKeyPair = createEphemeralLoginEncryptionKeyPair();
  return cachedLoginEncryptionKeyPair;
}

export function getLoginPublicKeyPem(): string {
  return getLoginEncryptionKeyPair().publicKey;
}

export function clearCachedLoginEncryptionKeyPair(): void {
  cachedLoginEncryptionKeyPair = null;
}

function decryptLoginPassword(passwordCiphertext: string): string {
  try {
    const decrypted = privateDecrypt(
      {
        key: getLoginEncryptionKeyPair().privateKey,
        padding: constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      Buffer.from(passwordCiphertext, 'base64'),
    ).toString('utf8');

    if (!decrypted.trim()) {
      throw new Error('empty-password');
    }

    return decrypted;
  } catch (error) {
    if (error instanceof UserBusinessError) {
      throw error;
    }

    throw new UserBusinessError(
      '登录密码密文无效',
      {
        nodePath: 'user',
        field: LOGIN_PASSWORD_KEY_FIELD,
        reason: '登录密码无法解密',
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

function ensurePositiveInteger(value: number, field: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new UserBusinessError(
      '用户标识不合法',
      {
        nodePath: 'user',
        field,
        reason: '用户标识必须为正整数',
        value,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  return value;
}

function ensureString(value: unknown, field: string, label: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new UserBusinessError(
      `${label}不能为空`,
      {
        nodePath: 'user',
        field,
        reason: `${label}必须是非空字符串`,
        value,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  return value.trim();
}

function normalizeOptionalString(value: unknown, field: string, label: string): string {
  if (value === undefined || value === null) {
    return '';
  }

  if (typeof value !== 'string') {
    throw new UserBusinessError(
      `${label}必须是字符串`,
      {
        nodePath: 'user',
        field,
        reason: `${label}必须是字符串`,
        value,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  return value.trim();
}

function normalizeStatus(value: unknown): number {
  if (value === undefined) {
    return 1;
  }

  if (value !== 0 && value !== 1) {
    throw new UserBusinessError(
      '用户状态不合法',
      {
        nodePath: 'user',
        field: 'status',
        reason: '用户状态只允许为 0 或 1',
        value,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  return value;
}

function normalizeOptionalStatus(value: unknown): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === 'string') {
    const trimmedValue = value.trim();
    if (!trimmedValue) {
      return undefined;
    }

    return normalizeStatus(Number(trimmedValue));
  }

  return normalizeStatus(value);
}

function normalizeRole(value: unknown): UserRoleEnum {
  if (value === undefined) {
    return UserRoleEnum.Employee;
  }

  if (
    value === UserRoleEnum.Admin ||
    value === UserRoleEnum.Employee ||
    value === UserRoleEnum.Approver ||
    value === UserRoleEnum.Guest
  ) {
    return value as UserRoleEnum;
  }

  throw new UserBusinessError(
    '用户角色不合法',
    {
      nodePath: 'user',
      field: 'role',
      reason: '用户角色只允许为 admin、employee、approver 或 guest',
      value,
    },
    HttpStatus.BAD_REQUEST,
  );
}

function normalizeOptionalRole(value: unknown): UserRoleEnum | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === 'string' && !value.trim()) {
    return undefined;
  }

  return normalizeRole(value);
}

function normalizeOptionalKeyword(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new UserBusinessError(
      '搜索关键字必须是字符串',
      {
        nodePath: 'user',
        field: 'keyword',
        reason: '搜索关键字必须是字符串',
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
    throw new UserBusinessError(
      `${field === 'page' ? '页码' : '分页大小'}不合法`,
      {
        nodePath: 'user',
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
    throw new UserBusinessError(
      `${field === 'page' ? '页码' : '分页大小'}不合法`,
      {
        nodePath: 'user',
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

function normalizeIdList(value: unknown, field: string, label: string): number[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new UserBusinessError(
      `${label}不合法`,
      {
        nodePath: 'user',
        field,
        reason: `${label}必须是数组`,
        value,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  return Array.from(
    new Set(
      value.map((item, index) => ensurePositiveInteger(Number(item), `${field}.${index}`)),
    ),
  );
}

function ensurePassword(value: unknown, field: string, label: string): string {
  const password = ensureString(value, field, label);

  if (password.length < 6) {
    throw new UserBusinessError(
      `${label}至少需要 6 位`,
      {
        nodePath: 'user',
        field,
        reason: `${label}长度至少需要 6 位`,
        value: password.length,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  return password;
}

function toResponseDto(entity: UserEntity): UserResponseDto {
  const createTime = normalizeDateTime(entity.createTime);
  const updateTime = normalizeDateTime(entity.updateTime);

  return {
    id: entity.id,
    username: entity.username,
    nickname: entity.nickname,
    email: entity.email,
    phone: entity.phone,
    status: entity.status,
    assignedRoles: [],
    ...(entity.createBy ? { createBy: entity.createBy } : {}),
    ...(createTime ? { createTime } : {}),
    ...(entity.updateBy ? { updateBy: entity.updateBy } : {}),
    ...(updateTime ? { updateTime } : {}),
    ...(entity.remark ? { remark: entity.remark } : {}),
  };
}

function validateCreateInput(input: Record<string, unknown>): CreateUserRequestDto {
  const payload: CreateUserRequestDto = {
    username: ensureString(input.username, 'username', '用户名'),
    nickname: ensureString(input.nickname, 'nickname', '用户昵称'),
    email: normalizeOptionalString(input.email, 'email', '用户邮箱'),
    phone: normalizeOptionalString(input.phone, 'phone', '用户手机号'),
    status: normalizeStatus(input.status),
    assignedRoleIds: normalizeIdList(input.assignedRoleIds, 'assignedRoleIds', '角色标识'),
  };

  if (typeof input.remark === 'string') {
    payload.remark = input.remark.trim();
  } else if (input.remark !== undefined && input.remark !== null) {
    throw new UserBusinessError(
      '用户备注必须是字符串',
      {
        nodePath: 'user',
        field: 'remark',
        reason: '用户备注必须是字符串',
        value: input.remark,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  if (Object.prototype.hasOwnProperty.call(input, 'password')) {
    payload.password = ensureString(input.password, 'password', '用户密码');
  }

  return payload;
}

function validateUpdateInput(input: Record<string, unknown>): UpdateUserRequestDto {
  const payload: UpdateUserRequestDto = {};

  if (Object.prototype.hasOwnProperty.call(input, 'username') && input.username !== undefined) {
    payload.username = ensureString(input.username, 'username', '用户名');
  }

  if (Object.prototype.hasOwnProperty.call(input, 'nickname') && input.nickname !== undefined) {
    payload.nickname = ensureString(input.nickname, 'nickname', '用户昵称');
  }

  if (Object.prototype.hasOwnProperty.call(input, 'email') && input.email !== undefined) {
    payload.email = normalizeOptionalString(input.email, 'email', '用户邮箱');
  }

  if (Object.prototype.hasOwnProperty.call(input, 'phone') && input.phone !== undefined) {
    payload.phone = normalizeOptionalString(input.phone, 'phone', '用户手机号');
  }

  if (Object.prototype.hasOwnProperty.call(input, 'status')) {
    const status = normalizeOptionalStatus(input.status);
    if (status !== undefined) {
      payload.status = status;
    }
  }

  if (Object.prototype.hasOwnProperty.call(input, 'assignedRoleIds')) {
    payload.assignedRoleIds = normalizeIdList(
      input.assignedRoleIds,
      'assignedRoleIds',
      '角色标识',
    );
  }

  if (Object.prototype.hasOwnProperty.call(input, 'remark')) {
    if (input.remark === undefined || input.remark === null) {
      payload.remark = '';
    } else if (typeof input.remark === 'string') {
      payload.remark = input.remark.trim();
    } else {
      throw new UserBusinessError(
        '用户备注必须是字符串',
        {
          nodePath: 'user',
          field: 'remark',
          reason: '用户备注必须是字符串',
          value: input.remark,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  if (Object.prototype.hasOwnProperty.call(input, 'password') && input.password !== undefined) {
    payload.password = ensurePassword(input.password, 'password', '用户密码');
  }

  if (Object.keys(payload).length === 0) {
    throw new UserBusinessError(
      '更新用户参数不能为空',
      {
        nodePath: 'user',
        field: 'payload',
        reason: '至少需要提供一个可更新字段',
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  return payload;
}

function validateLoginInput(input: Record<string, unknown>): LoginUserRequestDto {
  return {
    username: ensureString(input.username, 'username', '用户名'),
    passwordCiphertext: ensureString(
      input.passwordCiphertext,
      LOGIN_PASSWORD_KEY_FIELD,
      '登录密码密文',
    ),
  };
}

function validateRegisterInput(input: Record<string, unknown>): RegisterUserRequestDto {
  const username = ensureString(input.username, 'username', '用户名');
  const password = ensureString(input.password, 'password', '密码');

  if (password.length < 6) {
    throw new UserBusinessError(
      '密码至少需要 6 位',
      {
        nodePath: 'user',
        field: 'password',
        reason: '密码长度至少需要 6 位',
        value: password.length,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  return {
    username,
    password,
  };
}

function withAssignedRoles(
  user: UserResponseDto,
  assignedRoles: AuthorizationRoleSummary[] | undefined,
): UserResponseDto {
  return {
    ...user,
    assignedRoles: assignedRoles ? [...assignedRoles].sort((left, right) => left.id - right.id) : [],
  };
}

function deriveCompatibilityRole(
  assignedRoles: AuthorizationRoleSummary[] | undefined,
): CompatibilityUserRole {
  if (!assignedRoles || assignedRoles.length === 0) {
    return 'guest';
  }

  const roleCodes = assignedRoles
    .map((role) => role.code.trim().toLowerCase())
    .filter(Boolean);

  if (roleCodes.some((roleCode) => SUPER_ADMIN_ROLE_CODES.has(roleCode))) {
    return 'admin';
  }

  if (roleCodes.every((code) => code.endsWith('.viewer'))) {
    return 'guest';
  }

  return 'employee';
}

function validateUserListQuery(input: Record<string, unknown>): UserListQueryDto {
  const keyword = normalizeOptionalKeyword(input.keyword);
  const roleId =
    input.roleId === undefined || input.roleId === null || input.roleId === ''
      ? undefined
      : ensurePositiveInteger(Number(input.roleId), 'roleId');
  const status = normalizeOptionalStatus(input.status);

  return {
    ...(keyword ? { keyword } : {}),
    ...(roleId !== undefined ? { roleId } : {}),
    ...(status !== undefined ? { status } : {}),
    page: normalizePaginationInteger(input.page, 'page', DEFAULT_USER_LIST_PAGE),
    pageSize: normalizePaginationInteger(
      input.pageSize,
      'pageSize',
      DEFAULT_USER_LIST_PAGE_SIZE,
      {
        min: 1,
        max: MAX_USER_LIST_PAGE_SIZE,
      },
    ),
  };
}

export function hashPassword(password: string): string {
  const salt = randomBytes(PASSWORD_SALT_BYTES).toString('hex');
  const derivedKey = scryptSync(password, salt, PASSWORD_KEY_LENGTH).toString('hex');
  return `${salt}:${derivedKey}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, expectedHash] = storedHash.split(':');
  if (!salt || !expectedHash) {
    return false;
  }

  const actualHash = scryptSync(password, salt, PASSWORD_KEY_LENGTH);
  const expectedBuffer = Buffer.from(expectedHash, 'hex');

  if (expectedBuffer.length !== actualHash.length) {
    return false;
  }

  return timingSafeEqual(actualHash, expectedBuffer);
}

export class UserService {
  constructor(
    private readonly repository: UserRepositoryPort = userRepository,
    private readonly authzService: Pick<
      typeof authorizationService,
      | 'getAssignedRolesByUserIds'
      | 'ensureRoleIdsExist'
      | 'replaceUserRoleAssignments'
      | 'clearUserRoleAssignments'
    > = authorizationService,
  ) {}

  getLoginPublicKey(): GetLoginPublicKeyResponseDto {
    return {
      publicKey: getLoginPublicKeyPem(),
    };
  }

  async getUserList(input: UserListQueryDto | Record<string, unknown> = {}): Promise<UserListDto> {
    const query = validateUserListQuery(input as Record<string, unknown>);

    try {
      const result = await this.repository.getUserList(query);
      const assignedRoleMap = await this.authzService.getAssignedRolesByUserIds(
        result.items.map((item) => item.id),
      );
      return {
        items: result.items.map((item) =>
          withAssignedRoles(toResponseDto(item), assignedRoleMap.get(item.id)),
        ),
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
      };
    } catch {
      throw new UserBusinessError(
        '读取用户列表失败',
        {
          nodePath: 'user',
          field: 'source',
          reason: '用户数据源读取失败',
        },
        HttpStatus.ERROR,
      );
    }
  }

  async getUserDetail(id: number): Promise<UserResponseDto> {
    const targetId = ensurePositiveInteger(id, 'id');
    const entity = await this.repository.getUserById(targetId);

    if (!entity) {
      throw new UserBusinessError(
        '用户不存在',
        {
          nodePath: 'user',
          field: 'id',
          reason: '未找到对应用户',
          value: id,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const assignedRoleMap = await this.authzService.getAssignedRolesByUserIds([targetId]);
    return withAssignedRoles(toResponseDto(entity), assignedRoleMap.get(targetId));
  }

  async createUser(input: CreateUserRequestDto | Record<string, unknown>): Promise<UserResponseDto> {
    const payload = validateCreateInput(input as Record<string, unknown>);
    await this.authzService.ensureRoleIdsExist(payload.assignedRoleIds ?? []);
    const existed = await this.repository.getUserByUsername(payload.username);

    if (existed) {
      throw new UserBusinessError(
        '用户名已存在',
        {
          nodePath: 'user',
          field: 'username',
          reason: '用户名不能重复',
          value: payload.username,
        },
        HttpStatus.CONFLICT,
      );
    }

    if (payload.phone) {
      const existedByPhone = await this.repository.getUserByPhone(payload.phone);

      if (existedByPhone) {
        throw new UserBusinessError(
          '手机号已存在',
          {
            nodePath: 'user',
            field: 'phone',
            reason: '手机号不能重复',
            value: payload.phone,
          },
          HttpStatus.CONFLICT,
        );
      }
    }

    const created = await this.repository.createUser({
      username: payload.username,
      nickname: payload.nickname,
      email: payload.email ?? '',
      phone: payload.phone ?? '',
      status: payload.status ?? 1,
      passwordHash: hashPassword(payload.password ?? DEFAULT_LOGIN_PASSWORD),
      ...(payload.remark !== undefined ? { remark: payload.remark } : {}),
    });

    if (!created) {
      throw new UserBusinessError(
        '新增用户失败',
        {
          nodePath: 'user',
          field: 'create',
          reason: '用户创建失败',
        },
        HttpStatus.ERROR,
      );
    }

    await this.authzService.replaceUserRoleAssignments(
      created.id,
      payload.assignedRoleIds ?? [],
    );
    const assignedRoleMap = await this.authzService.getAssignedRolesByUserIds([created.id]);
    return withAssignedRoles(toResponseDto(created), assignedRoleMap.get(created.id));
  }

  async updateUser(
    id: number,
    input: UpdateUserRequestDto | Record<string, unknown>,
  ): Promise<UserResponseDto> {
    const targetId = ensurePositiveInteger(id, 'id');
    const current = await this.repository.getUserById(targetId);

    if (!current) {
      throw new UserBusinessError(
        '用户不存在',
        {
          nodePath: 'user',
          field: 'id',
          reason: '未找到对应用户',
          value: id,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const payload = validateUpdateInput(input as Record<string, unknown>);
    if (payload.assignedRoleIds) {
      await this.authzService.ensureRoleIdsExist(payload.assignedRoleIds);
    }
    if (payload.username && payload.username !== current.username) {
      const existed = await this.repository.getUserByUsername(payload.username);
      if (existed && existed.id !== targetId) {
        throw new UserBusinessError(
          '用户名已存在',
          {
            nodePath: 'user',
            field: 'username',
            reason: '用户名不能重复',
            value: payload.username,
          },
          HttpStatus.CONFLICT,
        );
      }
    }

    if (payload.phone && payload.phone !== current.phone) {
      const existedByPhone = await this.repository.getUserByPhone(payload.phone);
      if (existedByPhone && existedByPhone.id !== targetId) {
        throw new UserBusinessError(
          '手机号已存在',
          {
            nodePath: 'user',
            field: 'phone',
            reason: '手机号不能重复',
            value: payload.phone,
          },
          HttpStatus.CONFLICT,
        );
      }
    }

    const updated = await this.repository.updateUser(targetId, {
      ...payload,
      ...(payload.password ? { passwordHash: hashPassword(payload.password) } : {}),
    });
    if (!updated) {
      throw new UserBusinessError(
        '更新用户失败',
        {
          nodePath: 'user',
          field: 'update',
          reason: '用户更新失败',
          value: id,
        },
        HttpStatus.ERROR,
      );
    }

    if (payload.assignedRoleIds) {
      await this.authzService.replaceUserRoleAssignments(
        targetId,
        payload.assignedRoleIds,
      );
    }
    const assignedRoleMap = await this.authzService.getAssignedRolesByUserIds([targetId]);
    return withAssignedRoles(toResponseDto(updated), assignedRoleMap.get(targetId));
  }

  async deleteUser(id: number): Promise<UserResponseDto> {
    const targetId = ensurePositiveInteger(id, 'id');
    const deleted = await this.repository.deleteUser(targetId);

    if (!deleted) {
      throw new UserBusinessError(
        '用户不存在',
        {
          nodePath: 'user',
          field: 'id',
          reason: '未找到对应用户',
          value: id,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    await this.authzService.clearUserRoleAssignments(targetId);
    return withAssignedRoles(toResponseDto(deleted), []);
  }

  async loginUser(input: LoginUserRequestDto | Record<string, unknown>): Promise<LoginUserResponseDto> {
    const payload = validateLoginInput(input as Record<string, unknown>);
    const password = decryptLoginPassword(payload.passwordCiphertext);
    const entity = await this.repository.getUserAuthByUsername(payload.username);

    if (!entity || !entity.passwordHash || !verifyPassword(password, entity.passwordHash)) {
      throw new UserBusinessError(
        '用户名或密码错误',
        {
          nodePath: 'user',
          field: 'credentials',
          reason: '登录凭证校验失败',
          value: payload.username,
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (entity.status !== 1) {
      throw new UserBusinessError(
        '用户已停用，无法登录',
        {
          nodePath: 'user',
          field: 'status',
          reason: '用户状态不允许登录',
          value: entity.status,
        },
        HttpStatus.FORBIDDEN,
      );
    }

    const assignedRoleMap = await this.authzService.getAssignedRolesByUserIds([entity.id]);

    return {
      token: generateJwtToken(
        {
          userId: entity.id,
          username: entity.username,
          role: deriveCompatibilityRole(assignedRoleMap.get(entity.id)),
        },
        LOGIN_TOKEN_EXPIRES_IN,
      ),
      tokenType: 'Bearer',
      expiresIn: LOGIN_TOKEN_EXPIRES_IN,
    };
  }

  async registerUser(
    input: RegisterUserRequestDto | Record<string, unknown>,
  ): Promise<UserResponseDto> {
    const payload = validateRegisterInput(input as Record<string, unknown>);

    return this.createUser({
      username: payload.username,
      nickname: payload.username,
      status: 1,
      password: payload.password,
    });
  }
}

export const userService = new UserService();
