import type { EntityManager, Repository } from 'typeorm';
import initDataBase, { getDataSource } from '../../utils/mysql.ts';
import { UserEntity } from './user.entity.ts';
import type { UserListQueryDto, UserRoleEnum } from './user.dto.ts';

export interface CreateUserEntityInput {
  username: string
  nickname: string
  email: string
  phone: string
  status: number
  role: UserRoleEnum
  passwordHash: string
  remark?: string
}

export interface UpdateUserEntityInput {
  username?: string
  nickname?: string
  email?: string
  phone?: string
  status?: number
  role?: UserRoleEnum
  remark?: string
  passwordHash?: string
}

export interface UserListRepositoryResult {
  items: UserEntity[]
  total: number
  page: number
  pageSize: number
}

export interface UserRepositoryPort {
  getUserList(query: UserListQueryDto): Promise<UserListRepositoryResult>
  getUserById(id: number): Promise<UserEntity | null>
  getUserByUsername(username: string): Promise<UserEntity | null>
  getUserByPhone(phone: string): Promise<UserEntity | null>
  getUserAuthByUsername(username: string): Promise<UserEntity | null>
  createUser(input: CreateUserEntityInput): Promise<UserEntity | null>
  updateUser(id: number, input: UpdateUserEntityInput): Promise<UserEntity | null>
  deleteUser(id: number): Promise<UserEntity | null>
}

async function ensureDataSource() {
  const current = getDataSource();
  if (current?.isInitialized) {
    return current;
  }

  return initDataBase();
}

export class UserRepository implements UserRepositoryPort {
  private async getRepository(manager?: EntityManager): Promise<Repository<UserEntity>> {
    const dataSource = await ensureDataSource();

    if (!manager) {
      return dataSource.getRepository(UserEntity);
    }

    return manager.getRepository(UserEntity);
  }

  async getUserList(query: UserListQueryDto): Promise<UserListRepositoryResult> {
    const repository = await this.getRepository();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const queryBuilder = repository.createQueryBuilder('user');

    if (query.keyword) {
      queryBuilder.andWhere(
        '(user.username LIKE :keyword OR user.nickname LIKE :keyword OR user.phone LIKE :keyword)',
        {
          keyword: `%${query.keyword}%`,
        },
      );
    }

    if (query.role) {
      queryBuilder.andWhere('user.role = :role', {
        role: query.role,
      });
    }

    if (query.status !== undefined) {
      queryBuilder.andWhere('user.status = :status', {
        status: query.status,
      });
    }

    const total = await queryBuilder.getCount();
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const currentPage = Math.min(page, totalPages);
    const items =
      total === 0
        ? []
        : await queryBuilder
            .clone()
            .orderBy('user.id', 'ASC')
            .skip((currentPage - 1) * pageSize)
            .take(pageSize)
            .getMany();

    return {
      items,
      total,
      page: currentPage,
      pageSize,
    };
  }

  async getUserById(id: number): Promise<UserEntity | null> {
    const repository = await this.getRepository();
    return repository.findOne({
      where: { id },
    });
  }

  async getUserByUsername(username: string): Promise<UserEntity | null> {
    const repository = await this.getRepository();
    return repository.findOne({
      where: { username },
    });
  }

  async getUserByPhone(phone: string): Promise<UserEntity | null> {
    const repository = await this.getRepository();
    return repository.findOne({
      where: { phone },
    });
  }

  async getUserAuthByUsername(username: string): Promise<UserEntity | null> {
    const repository = await this.getRepository();
    return repository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.username = :username', { username })
      .getOne();
  }

  async createUser(input: CreateUserEntityInput): Promise<UserEntity | null> {
    const repository = await this.getRepository();
    const entity = repository.create({
      username: input.username,
      nickname: input.nickname,
      email: input.email,
      phone: input.phone,
      status: input.status,
      role: input.role,
      passwordHash: input.passwordHash,
      createBy: 'system',
      updateBy: 'system',
      ...(input.remark ? { remark: input.remark } : {}),
    });

    const saved = await repository.save(entity);
    return repository.findOne({
      where: { id: saved.id },
    });
  }

  async updateUser(id: number, input: UpdateUserEntityInput): Promise<UserEntity | null> {
    const repository = await this.getRepository();
    const current = await repository.findOne({
      where: { id },
    });

    if (!current) {
      return null;
    }

    if (input.username !== undefined) {
      current.username = input.username;
    }
    if (input.nickname !== undefined) {
      current.nickname = input.nickname;
    }
    if (input.email !== undefined) {
      current.email = input.email;
    }
    if (input.phone !== undefined) {
      current.phone = input.phone;
    }
    if (input.status !== undefined) {
      current.status = input.status;
    }
    if (input.role !== undefined) {
      current.role = input.role;
    }
    if (input.remark !== undefined) {
      current.remark = input.remark;
    }
    if (input.passwordHash !== undefined) {
      current.passwordHash = input.passwordHash;
    }

    current.updateBy = 'system';
    await repository.save(current);

    return repository.findOne({
      where: { id },
    });
  }

  async deleteUser(id: number): Promise<UserEntity | null> {
    const repository = await this.getRepository();
    const current = await repository.findOne({
      where: { id },
    });

    if (!current) {
      return null;
    }

    await repository.remove(current);
    return current;
  }
}

export const userRepository = new UserRepository();
