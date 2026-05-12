import { constants, publicEncrypt } from 'crypto';
import type {
  CreateUserEntityInput,
  UpdateUserEntityInput,
  UserRepositoryPort,
} from '../../src/user/user.repository.ts';
import { UserRoleEnum } from '../../src/user/user.dto.ts';
import { UserEntity } from '../../src/user/user.entity.ts';
import {
  clearCachedLoginEncryptionKeyPair,
  hashPassword,
  UserBusinessError,
  UserService,
  verifyPassword,
} from '../../src/user/user.service.ts';

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
        const matchesRole = !query.role || record.role === query.role;
        const matchesStatus = query.status === undefined || record.status === query.status;

        return matchesKeyword && matchesRole && matchesStatus;
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
        role: input.role,
        passwordHash: input.passwordHash,
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

function createAuthorizationServiceMock() {
  return {
    async getAssignedRolesByUserIds(userIds: number[]) {
      return new Map(
        userIds.map((userId) => [
          userId,
          [] as Array<{ id: number; code: string; name: string; appCode: string }>,
        ]),
      );
    },
    async ensureRoleIdsExist() {},
    async replaceUserRoleAssignments() {},
    async clearUserRoleAssignments() {},
  };
}

function createService(records: UserEntity[]) {
  return new UserService(
    createRepositoryMock(records),
    createAuthorizationServiceMock(),
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
      nickname: '张三',
      email: 'zhangsan@example.com',
      phone: '13800000001',
      status: 1,
      role: UserRoleEnum.Admin,
      passwordHash: hashPassword(TEST_PASSWORD),
    }),
    Object.assign(new UserEntity(), {
      id: 2,
      username: 'lisi',
      nickname: '李四',
      email: 'lisi@example.com',
      phone: '13800000002',
      status: 0,
      role: UserRoleEnum.Guest,
      passwordHash: hashPassword(DISABLED_USER_PASSWORD),
    }),
  ];

  afterEach(() => {
    delete process.env.LOGIN_PASSWORD_PUBLIC_KEY;
    delete process.env.LOGIN_PASSWORD_PRIVATE_KEY;
    delete process.env.NODE_ENV;
    clearCachedLoginEncryptionKeyPair();
  });

  it('creates a user with the provided compatibility role', async () => {
    const service = createService(records);

    const result = await service.createUser({
      username: 'wangwu',
      nickname: '王五',
      email: 'wangwu@example.com',
      phone: '13800000003',
      status: 1,
      role: UserRoleEnum.Admin,
    });

    expect(result).toEqual(
      expect.objectContaining({
        id: 99,
        username: 'wangwu',
        role: UserRoleEnum.Admin,
        assignedRoles: [],
      }),
    );
  });

  it('defaults compatibility role to employee', async () => {
    const service = createService(records);

    const result = await service.createUser({
      username: 'zhaoliu',
      nickname: '赵六',
      email: 'zhaoliu@example.com',
      phone: '13800000004',
      status: 1,
    });

    expect(result).toEqual(
      expect.objectContaining({
        username: 'zhaoliu',
        role: UserRoleEnum.Employee,
      }),
    );
  });

  it('rejects duplicate username on create', async () => {
    const service = createService(records);

    await expect(
      service.createUser({
        username: 'zhangsan',
        nickname: '重复用户',
        status: 1,
      }),
    ).rejects.toMatchObject<Partial<UserBusinessError>>({
      statusCode: 409,
      context: expect.objectContaining({
        field: 'username',
      }),
    });
  });

  it('rejects invalid compatibility role values', async () => {
    const service = createService(records);

    await expect(
      service.createUser({
        username: 'guest-user',
        nickname: '访客',
        role: 'invalid-role' as UserRoleEnum,
      }),
    ).rejects.toMatchObject<Partial<UserBusinessError>>({
      statusCode: 400,
      context: expect.objectContaining({
        field: 'role',
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

  it('updates user role and phone', async () => {
    const service = createService(records);

    const result = await service.updateUser(1, {
      role: UserRoleEnum.Guest,
      phone: '13900000001',
    });

    expect(result).toEqual(
      expect.objectContaining({
        id: 1,
        role: UserRoleEnum.Guest,
        phone: '13900000001',
      }),
    );
  });

  it('supports filtered user list queries', async () => {
    const service = createService(records);

    const result = await service.getUserList({
      keyword: 'zhang',
      role: UserRoleEnum.Admin,
      status: '1',
      page: '1',
      pageSize: '1',
    });

    expect(result).toEqual({
      items: [
        expect.objectContaining({
          id: 1,
          username: 'zhangsan',
          role: UserRoleEnum.Admin,
        }),
      ],
      total: 1,
      page: 1,
      pageSize: 1,
    });
  });

  it('returns token metadata only on successful login', async () => {
    const service = createService(records);
    const publicKey = service.getLoginPublicKey().publicKey;

    const result = await service.loginUser({
      username: 'zhangsan',
      passwordCiphertext: encryptPassword(publicKey, TEST_PASSWORD),
    });

    expect(result).toEqual(
      expect.objectContaining({
        token: expect.any(String),
        tokenType: 'Bearer',
        expiresIn: 7200,
      }),
    );
    expect(result).not.toHaveProperty('user');
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
        nickname: '重复手机号用户',
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
