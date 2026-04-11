import { UserRoleEnum } from '../../src/user/user.dto.ts'
import { UserEntity } from '../../src/user/user.entity.ts'
import {
  hashPassword,
  UserBusinessError,
  UserService,
} from '../../src/user/user.service.ts'
import type { UserRepositoryPort } from '../../src/user/user.repository.ts'

function createRepositoryMock(): UserRepositoryPort {
  const user = Object.assign(new UserEntity(), {
    id: 1,
    username: 'zhangsan',
    nickname: '张三',
    email: 'zhangsan@example.com',
    phone: '13800000001',
    status: 1,
    role: UserRoleEnum.Admin,
    passwordHash: hashPassword('123456'),
  })

  return {
    async getUserList() {
      return [user]
    },
    async getUserById(id: number) {
      return id === user.id ? user : null
    },
    async getUserByUsername(username: string) {
      return username === user.username ? user : null
    },
    async getUserAuthByUsername(username: string) {
      return username === user.username ? user : null
    },
    async createUser() {
      return user
    },
    async updateUser() {
      return user
    },
    async deleteUser() {
      return user
    },
  }
}

describe('UserService login encryption', () => {
  it('returns controlled error for invalid ciphertext', async () => {
    const service = new UserService(createRepositoryMock())

    await expect(
      service.loginUser({
        username: 'zhangsan',
        passwordCiphertext: 'invalid-ciphertext',
      }),
    ).rejects.toMatchObject<Partial<UserBusinessError>>({
      statusCode: 400,
      context: expect.objectContaining({
        field: 'passwordCiphertext',
      }),
    })
  })
})
