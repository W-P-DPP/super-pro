import type { Repository } from 'typeorm';
import initDataBase, { getDataSource } from '../../utils/mysql.ts';
import { TodoEntity } from './todo.entity.ts';

export interface CreateTodoEntityInput {
  title: string
  description?: string
  createBy: string
  updateBy: string
}

export interface UpdateTodoEntityInput {
  title?: string
  description?: string
  updateBy: string
}

export interface TodoRepositoryPort {
  findAll(): Promise<TodoEntity[]>
  findByStatus(status: number): Promise<TodoEntity[]>
  findByCreateBy(createBy: string): Promise<TodoEntity[]>
  findByCreateByAndStatus(createBy: string, status: number): Promise<TodoEntity[]>
  findById(id: number): Promise<TodoEntity | null>
  create(input: CreateTodoEntityInput): Promise<TodoEntity | null>
  update(id: number, input: UpdateTodoEntityInput): Promise<TodoEntity | null>
  updateStatus(id: number, status: number, updateBy: string): Promise<TodoEntity | null>
  delete(id: number): Promise<TodoEntity | null>
}

async function ensureDataSource() {
  const current = getDataSource();
  if (current?.isInitialized) {
    return current;
  }

  return initDataBase();
}

export class TodoRepository implements TodoRepositoryPort {
  private async getRepository(): Promise<Repository<TodoEntity>> {
    const dataSource = await ensureDataSource();
    return dataSource.getRepository(TodoEntity);
  }

  async findAll(): Promise<TodoEntity[]> {
    const repository = await this.getRepository();
    return repository
      .createQueryBuilder('todo')
      .addSelect('todo.create_time')
      .addSelect('todo.update_time')
      .orderBy('todo.create_time', 'DESC')
      .getMany();
  }

  async findByStatus(status: number): Promise<TodoEntity[]> {
    const repository = await this.getRepository();
    return repository
      .createQueryBuilder('todo')
      .addSelect('todo.create_time')
      .addSelect('todo.update_time')
      .where('todo.status = :status', { status })
      .orderBy('todo.create_time', 'DESC')
      .getMany();
  }

  async findByCreateBy(createBy: string): Promise<TodoEntity[]> {
    const repository = await this.getRepository();
    return repository
      .createQueryBuilder('todo')
      .addSelect('todo.create_time')
      .addSelect('todo.update_time')
      .where('todo.create_by = :createBy', { createBy })
      .orderBy('todo.create_time', 'DESC')
      .getMany();
  }

  async findByCreateByAndStatus(createBy: string, status: number): Promise<TodoEntity[]> {
    const repository = await this.getRepository();
    return repository
      .createQueryBuilder('todo')
      .addSelect('todo.create_time')
      .addSelect('todo.update_time')
      .where('todo.create_by = :createBy', { createBy })
      .andWhere('todo.status = :status', { status })
      .orderBy('todo.create_time', 'DESC')
      .getMany();
  }

  async findById(id: number): Promise<TodoEntity | null> {
    const repository = await this.getRepository();
    return repository
      .createQueryBuilder('todo')
      .addSelect('todo.create_by')
      .addSelect('todo.create_time')
      .addSelect('todo.update_time')
      .where('todo.id = :id', { id })
      .getOne();
  }

  async create(input: CreateTodoEntityInput): Promise<TodoEntity | null> {
    const repository = await this.getRepository();
    const entity = repository.create({
      title: input.title,
      description: input.description ?? '',
      status: 0,
      createBy: input.createBy,
      updateBy: input.updateBy,
    });
    const saved = await repository.save(entity);
    return this.findById(saved.id);
  }

  async update(id: number, input: UpdateTodoEntityInput): Promise<TodoEntity | null> {
    const repository = await this.getRepository();
    const current = await this.findById(id);
    if (!current) {
      return null;
    }

    if (input.title !== undefined) {
      current.title = input.title;
    }
    if (input.description !== undefined) {
      current.description = input.description;
    }
    current.updateBy = input.updateBy;

    await repository.save(current);
    return this.findById(id);
  }

  async updateStatus(id: number, status: number, updateBy: string): Promise<TodoEntity | null> {
    const repository = await this.getRepository();
    const current = await this.findById(id);
    if (!current) {
      return null;
    }

    current.status = status;
    current.updateBy = updateBy;
    await repository.save(current);
    return this.findById(id);
  }

  async delete(id: number): Promise<TodoEntity | null> {
    const repository = await this.getRepository();
    const current = await this.findById(id);
    if (!current) {
      return null;
    }

    await repository.remove(current);
    return current;
  }
}

export const todoRepository = new TodoRepository();
