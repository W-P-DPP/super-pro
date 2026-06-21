import type { AuthorizationRoleSummary } from '@super-pro/shared-types';
import {
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

function cloneUser(user: UserEntity): UserEntity {
  return Object.assign(new UserEntity(), user);
}

function createRepositoryMock(records: UserEntity[]): UserRepositoryPort {
  return {
    async getUserList() {
      return {
        items: records.map(cloneUser),
        total: records.length,
        page: 1,
        pageSize: records.length || 10,
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
        id: 100,
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

function createAuthorizationServiceMock() {
  const assignments = new Map<number, AuthorizationRoleSummary[]>();

  return {
    async getAssignedRolesByUserIds(userIds: number[]) {
      return new Map(
        userIds.map((userId) => [userId, assignments.get(userId) ?? []]),
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

describe('UserService registerUser', () => {
  const records = [
    Object.assign(new UserEntity(), {
      id: 1,
      username: 'zhangsan',
      nickname: 'zhangsan',
      email: 'zhangsan@example.com',
      phone: '13800000001',
      status: 1,
      passwordHash: hashPassword('123456'),
    }),
  ];

  it('creates a default enabled user with username as nickname', async () => {
    const service = new UserService(
      createRepositoryMock(records),
      createAuthorizationServiceMock(),
    );

    const result = await service.registerUser({
      username: 'new-user',
      password: '123456',
    });

    expect(result).toEqual(
      expect.objectContaining({
        id: 100,
        username: 'new-user',
        nickname: 'new-user',
        status: 1,
        assignedRoles: [],
      }),
    );
    expect(result).not.toHaveProperty('role');
  });

  /*
  it('rejects duplicate username', async () => {
    const service = new UserService(
      createRepositoryMock(records),
      createAuthorizationServiceMock(),
    );

    await expect(
      service.registerUser({
        username: 'zhangsan',
        password: '123456',
      }),
    ).rejects.toMatchObject<Partial<UserBusinessError>>({
      statusCode: 409,
      message: '鐢ㄦ埛鍚嶅凡瀛樺湪',
    });
  });

  it('rejects short password', async () => {
    const service = new UserService(
      createRepositoryMock(records),
      createAuthorizationServiceMock(),
    );

    await expect(
      service.registerUser({
        username: 'short-pass-user',
        password: '123',
      }),
    ).rejects.toMatchObject<Partial<UserBusinessError>>({
      statusCode: 400,
      message: '瀵嗙爜鑷冲皯闇€瑕?6 浣?,
    });
  });

  */
  it('rejects duplicate username', async () => {
    const service = new UserService(
      createRepositoryMock(records),
      createAuthorizationServiceMock(),
    );

    await expect(
      service.registerUser({
        username: 'zhangsan',
        password: '123456',
      }),
    ).rejects.toMatchObject<Partial<UserBusinessError>>({
      statusCode: 409,
      context: expect.objectContaining({
        field: 'username',
      }),
    });
  });

  it('rejects short password', async () => {
    const service = new UserService(
      createRepositoryMock(records),
      createAuthorizationServiceMock(),
    );

    await expect(
      service.registerUser({
        username: 'short-pass-user',
        password: '123',
      }),
    ).rejects.toMatchObject<Partial<UserBusinessError>>({
      statusCode: 400,
      context: expect.objectContaining({
        field: 'password',
      }),
    });
  });

  it('stores password as hash instead of plain text', async () => {
    let createdInput: CreateUserEntityInput | null = null;
    const repository = createRepositoryMock(records);
    const originalCreateUser = repository.createUser.bind(repository);
    repository.createUser = async (input: CreateUserEntityInput) => {
      createdInput = input;
      return originalCreateUser(input);
    };

    const service = new UserService(repository, createAuthorizationServiceMock());
    await service.registerUser({
      username: 'hash-user',
      password: '123456',
    });

    expect(createdInput).not.toBeNull();
    expect(createdInput?.passwordHash).not.toBe('123456');
    expect(verifyPassword('123456', createdInput!.passwordHash)).toBe(true);
  });
});
