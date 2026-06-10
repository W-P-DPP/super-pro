import { constants, publicEncrypt } from 'crypto';
import type {
  AuthorizationRoleSummary,
  CompatibilityUserRole,
} from '@super-pro/shared-types';
import {
  clearCachedLoginEncryptionKeyPair,
  hashPassword,
  UserBusinessError,
  UserService,
  verifyPassword,
} from '../../src/user/user.service.ts';
import type {
  CreateUserEntityInput,
  UpdateUserEntityInput,
  UserRepositoryPort,
} from '../../src/user/user.repository.ts';
import { UserEntity } from '../../src/user/user.entity.ts';

const TEST_PASSWORD = '123456';
const DISABLED_USER_PASSWORD = '654321';

function cloneUser(user: UserEntity): UserEntity {
  return Object.assign(new UserEntity(), user);
}

function createRepositoryMock(records: UserEntity[]): UserRepositoryPort {
  return {
    async getUserList(query) {
      const keyword = typeof query.keyword === 'string' ? query.keyword.toLowerCase() : '';
      const filteredRecords = records.filter((record) => {
        const matchesKeyword =
          !keyword ||
          `${record.username} ${record.nickname} ${record.phone}`.toLowerCase().includes(keyword);
        const matchesStatus = query.status === undefined || record.status === query.status;
        return matchesKeyword && matchesStatus;
      });

      return {
        items: filteredRecords.map(cloneUser),
        total: filteredRecords.length,
        page: 1,
        pageSize: query.pageSize ?? 10,
      };
    },
    async getUserById(id: number) {
      const target = records.find((record) => record.id === id);
      return target ? cloneUser(target) : null;
    },
    async getUserByUsername(username: string) {
      const target = records.find((record) => record.username === username);
      return target ? cloneUser(target) : null;
    },
    async getUserByPhone(phone: string) {
      const target = records.find((record) => record.phone === phone);
      return target ? cloneUser(target) : null;
    },
    async getUserAuthByUsername(username: string) {
      const target = records.find((record) => record.username === username);
      return target ? cloneUser(target) : null;
    },
    async createUser(input: CreateUserEntityInput) {
      return Object.assign(new UserEntity(), {
        id: 99,
        username: input.username,
        nickname: input.nickname,
        email: input.email,
        phone: input.phone,
        status: input.status,
        passwordHash: input.passwordHash,
        ...(input.remark !== undefined ? { remark: input.remark } : {}),
      });
    },
    async updateUser(id: number, input: UpdateUserEntityInput) {
      const current = records.find((record) => record.id === id);
      if (!current) {
        return null;
      }

      return Object.assign(new UserEntity(), current, input);
    },
    async deleteUser(id: number) {
      const current = records.find((record) => record.id === id);
      return current ? cloneUser(current) : null;
    },
  };
}

function createAuthorizationServiceMock(initialAssignments?: Map<number, AuthorizationRoleSummary[]>) {
  const assignments = new Map<number, AuthorizationRoleSummary[]>();

  for (const [userId, roles] of initialAssignments ?? new Map()) {
    assignments.set(
      userId,
      roles.map((role) => ({ ...role })),
    );
  }

  return {
    async getAssignedRolesByUserIds(userIds: number[]) {
      return new Map(
        userIds.map((userId) => [
          userId,
          (assignments.get(userId) ?? []).map((role) => ({ ...role })),
        ]),
      );
    },
    async ensureRoleIdsExist() {},
    async replaceUserRoleAssignments(userId: number, roleIds: number[]) {
      assignments.set(
        userId,
        roleIds.map((roleId) => ({
          id: roleId,
          code: `role.${roleId}`,
          name: `Role ${roleId}`,
        })),
      );
    },
    async clearUserRoleAssignments(userId: number) {
      assignments.set(userId, []);
    },
  };
}

function createService(records: UserEntity[], assignments?: Map<number, AuthorizationRoleSummary[]>) {
  return new UserService(
    createRepositoryMock(records),
    createAuthorizationServiceMock(assignments),
  );
}

function encryptPassword(publicKey: string, password: string): string {
  return publicEncrypt(
    {
      key: publicKey,
      padding: constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    Buffer.from(password, 'utf8'),
  ).toString('base64');
}

describe('UserService', () => {
  const records = [
    Object.assign(new UserEntity(), {
      id: 1,
      username: 'zhangsan',
      nickname: 'zhangsan',
      email: 'zhangsan@example.com',
      phone: '13800000001',
      status: 1,
      passwordHash: hashPassword(TEST_PASSWORD),
    }),
    Object.assign(new UserEntity(), {
      id: 2,
      username: 'lisi',
      nickname: 'lisi',
      email: 'lisi@example.com',
      phone: '13800000002',
      status: 0,
      passwordHash: hashPassword(DISABLED_USER_PASSWORD),
    }),
  ];

  afterEach(() => {
    delete process.env.LOGIN_PASSWORD_PUBLIC_KEY;
    delete process.env.LOGIN_PASSWORD_PRIVATE_KEY;
    delete process.env.NODE_ENV;
    clearCachedLoginEncryptionKeyPair();
  });

  it('creates a user and returns assigned roles from the relation table', async () => {
    const service = createService(records);

    const result = await service.createUser({
      username: 'wangwu',
      nickname: 'wangwu',
      email: 'wangwu@example.com',
      phone: '13800000003',
      status: 1,
      assignedRoleIds: [10, 20],
    });

    expect(result).toEqual(
      expect.objectContaining({
        id: 99,
        username: 'wangwu',
        assignedRoles: [
          { id: 10, code: 'role.10', name: 'Role 10' },
          { id: 20, code: 'role.20', name: 'Role 20' },
        ],
      }),
    );
    expect(result).not.toHaveProperty('role');
  });

  it('returns empty assigned roles when no role relation exists', async () => {
    const service = createService(records);

    const result = await service.createUser({
      username: 'zhaoliu',
      nickname: 'zhaoliu',
      email: 'zhaoliu@example.com',
      phone: '13800000004',
      status: 1,
    });

    expect(result).toEqual(
      expect.objectContaining({
        username: 'zhaoliu',
        assignedRoles: [],
      }),
    );
  });

  it('rejects duplicate username on create', async () => {
    const service = createService(records);

    await expect(
      service.createUser({
        username: 'zhangsan',
        nickname: 'duplicate-user',
        status: 1,
      }),
    ).rejects.toMatchObject<Partial<UserBusinessError>>({
      statusCode: 409,
      context: expect.objectContaining({
        field: 'username',
      }),
    });
  });

  it('returns not found for missing users', async () => {
    const service = createService(records);

    await expect(service.getUserDetail(99999)).rejects.toMatchObject<Partial<UserBusinessError>>({
      statusCode: 404,
      context: expect.objectContaining({
        field: 'id',
      }),
    });
  });

  it('updates user phone and role assignments', async () => {
    const assignments = new Map<number, AuthorizationRoleSummary[]>([
      [
        1,
        [{ id: 1, code: 'platform.admin', name: 'Platform Admin' }],
      ],
    ]);
    const service = createService(records, assignments);

    const result = await service.updateUser(1, {
      phone: '13900000001',
      assignedRoleIds: [30],
    });

    expect(result).toEqual(
      expect.objectContaining({
        id: 1,
        phone: '13900000001',
        assignedRoles: [{ id: 30, code: 'role.30', name: 'Role 30' }],
      }),
    );
    expect(result).not.toHaveProperty('role');
  });

  it('supports filtered user list queries with roleId and status', async () => {
    const assignments = new Map<number, AuthorizationRoleSummary[]>([
      [
        1,
        [{ id: 101, code: 'platform.admin', name: 'Platform Admin' }],
      ],
      [
        2,
        [{ id: 202, code: 'project.viewer', name: 'Project Viewer' }],
      ],
    ]);
    const service = createService(records, assignments);

    const result = await service.getUserList({
      keyword: 'zhang',
      roleId: '101',
      status: '1',
      page: '1',
      pageSize: '1',
    });

    expect(result).toEqual({
      items: [
        expect.objectContaining({
          id: 1,
          username: 'zhangsan',
          assignedRoles: [{ id: 101, code: 'platform.admin', name: 'Platform Admin' }],
        }),
      ],
      total: 1,
      page: 1,
      pageSize: 1,
    });
  });

  it.each<[string, AuthorizationRoleSummary[], CompatibilityUserRole]>([
    [
      'admin compatibility role',
      [{ id: 1, code: 'platform.admin', name: 'Platform Admin' }],
      'admin',
    ],
    [
      'super-admin compatibility role',
      [{ id: 8, code: 'super-admin', name: 'Super Admin' }],
      'admin',
    ],
    [
      'guest compatibility role',
      [{ id: 2, code: 'project.viewer', name: 'Project Viewer' }],
      'guest',
    ],
    [
      'employee compatibility role',
      [{ id: 3, code: 'project.editor', name: 'Project Editor' }],
      'employee',
    ],
  ])('emits %s in jwt payload', async (_label, assignedRoles, expectedRole) => {
    const service = createService(
      records,
      new Map<number, AuthorizationRoleSummary[]>([[1, assignedRoles]]),
    );
    const publicKey = service.getLoginPublicKey().publicKey;

    const result = await service.loginUser({
      username: 'zhangsan',
      passwordCiphertext: encryptPassword(publicKey, TEST_PASSWORD),
    });

    const tokenPayload = JSON.parse(
      Buffer.from(result.token.split('.')[1] ?? '', 'base64url').toString('utf8'),
    ) as { role?: CompatibilityUserRole };

    expect(tokenPayload.role).toBe(expectedRole);
    expect(result).toEqual(
      expect.objectContaining({
        token: expect.any(String),
        tokenType: 'Bearer',
        expiresIn: 7200,
      }),
    );
  });

  it('rejects wrong password and disabled user login', async () => {
    const service = createService(records);
    const publicKey = service.getLoginPublicKey().publicKey;

    await expect(
      service.loginUser({
        username: 'zhangsan',
        passwordCiphertext: encryptPassword(publicKey, 'wrong-password'),
      }),
    ).rejects.toMatchObject<Partial<UserBusinessError>>({
      statusCode: 401,
      context: expect.objectContaining({
        field: 'credentials',
      }),
    });

    await expect(
      service.loginUser({
        username: 'lisi',
        passwordCiphertext: encryptPassword(publicKey, DISABLED_USER_PASSWORD),
      }),
    ).rejects.toMatchObject<Partial<UserBusinessError>>({
      statusCode: 403,
      context: expect.objectContaining({
        field: 'status',
      }),
    });
  });

  it('rejects duplicate phone on create and update', async () => {
    const service = createService(records);

    await expect(
      service.createUser({
        username: 'wangwu',
        nickname: 'duplicate-phone-user',
        email: 'dup-phone@example.com',
        phone: '13800000001',
        status: 1,
      }),
    ).rejects.toMatchObject<Partial<UserBusinessError>>({
      statusCode: 409,
      context: expect.objectContaining({
        field: 'phone',
      }),
    });

    await expect(
      service.updateUser(1, {
        phone: '13800000002',
      }),
    ).rejects.toMatchObject<Partial<UserBusinessError>>({
      statusCode: 409,
      context: expect.objectContaining({
        field: 'phone',
      }),
    });
  });

  it('falls back to an ephemeral key pair when production keys are placeholders', async () => {
    process.env.NODE_ENV = 'production';
    process.env.LOGIN_PASSWORD_PUBLIC_KEY =
      '-----BEGIN PUBLIC KEY-----\\nreplace_with_public_key\\n-----END PUBLIC KEY-----';
    process.env.LOGIN_PASSWORD_PRIVATE_KEY =
      '-----BEGIN PRIVATE KEY-----\\nreplace_with_private_key\\n-----END PRIVATE KEY-----';
    clearCachedLoginEncryptionKeyPair();

    const service = createService(records);
    const publicKey = service.getLoginPublicKey().publicKey;
    const result = await service.loginUser({
      username: 'zhangsan',
      passwordCiphertext: encryptPassword(publicKey, TEST_PASSWORD),
    });

    expect(publicKey).toContain('BEGIN PUBLIC KEY');
    expect(result).toEqual(
      expect.objectContaining({
        token: expect.any(String),
        tokenType: 'Bearer',
        expiresIn: 7200,
      }),
    );
  });

  it('hashes password changes before persisting', async () => {
    let updatedInput: UpdateUserEntityInput | null = null;
    const repository = createRepositoryMock(records);
    const originalUpdateUser = repository.updateUser;

    repository.updateUser = async (id, input) => {
      updatedInput = input;
      return originalUpdateUser.call(repository, id, input);
    };

    const service = new UserService(repository, createAuthorizationServiceMock());
    const result = await service.updateUser(1, {
      password: '654321',
    });

    expect(updatedInput?.passwordHash).toEqual(expect.any(String));
    expect(updatedInput?.passwordHash).not.toBe('654321');
    expect(verifyPassword('654321', updatedInput!.passwordHash!)).toBe(true);
    expect(result).not.toHaveProperty('passwordHash');
  });
});
