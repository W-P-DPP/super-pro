import type {
  CreateUserEntityInput,
  UpdateUserEntityInput,
  UserRepositoryPort,
} from '../../src/user/user.repository.ts';
import { UserRoleEnum } from '../../src/user/user.dto.ts';
import { UserEntity } from '../../src/user/user.entity.ts';
import {
  hashPassword,
  UserBusinessError,
  UserService,
  verifyPassword,
} from '../../src/user/user.service.ts';

function cloneUser(user: UserEntity): UserEntity {
  return Object.assign(new UserEntity(), user);
}

function createRepositoryMock(records: UserEntity[]): UserRepositoryPort {
  return {
    async getUserList() {
      return records.map(cloneUser);
    },
    async getUserById(id: number) {
      const target = records.find((record) => record.id === id);
      return target ? cloneUser(target) : null;
    },
    async getUserByUsername(username: string) {
      const target = records.find((record) => record.username === username);
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
        role: input.role,
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

describe('UserService registerUser', () => {
  const records = [
    Object.assign(new UserEntity(), {
      id: 1,
      username: 'zhangsan',
      nickname: '张三',
      email: 'zhangsan@example.com',
      phone: '13800000001',
      status: 1,
      role: UserRoleEnum.Admin,
      passwordHash: hashPassword('123456'),
    }),
  ];

  it('creates guest user with username as nickname', async () => {
    const service = new UserService(createRepositoryMock(records));

    const result = await service.registerUser({
      username: 'new-user',
      password: '123456',
    });

    expect(result).toEqual(
      expect.objectContaining({
        id: 100,
        username: 'new-user',
        nickname: 'new-user',
        role: UserRoleEnum.Guest,
        status: 1,
      }),
    );
  });

  it('rejects duplicate username', async () => {
    const service = new UserService(createRepositoryMock(records));

    await expect(
      service.registerUser({
        username: 'zhangsan',
        password: '123456',
      }),
    ).rejects.toMatchObject<Partial<UserBusinessError>>({
      statusCode: 409,
      message: '用户名已存在',
    });
  });

  it('rejects short password', async () => {
    const service = new UserService(createRepositoryMock(records));

    await expect(
      service.registerUser({
        username: 'short-pass-user',
        password: '123',
      }),
    ).rejects.toMatchObject<Partial<UserBusinessError>>({
      statusCode: 400,
      message: '密码至少需要 6 位',
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

    const service = new UserService(repository);
    await service.registerUser({
      username: 'hash-user',
      password: '123456',
    });

    expect(createdInput).not.toBeNull();
    expect(createdInput?.passwordHash).not.toBe('123456');
    expect(verifyPassword('123456', createdInput!.passwordHash)).toBe(true);
  });
});
