import type { EntityManager, Repository } from 'typeorm';
import initDataBase, { getDataSource } from '../../utils/mysql.ts';
import { ProjectEntity } from './project.entity.ts';
import type { ProjectListQueryDto } from './project.dto.ts';

export interface CreateProjectEntityInput {
  projectName: string
  projectCode: string
  remark?: string
}

export interface UpdateProjectEntityInput {
  projectName?: string
  projectCode?: string
  remark?: string
}

export interface ProjectListRepositoryResult {
  items: ProjectEntity[]
  total: number
  page: number
  pageSize: number
}

export interface ProjectRepositoryPort {
  getProjectList(query: ProjectListQueryDto): Promise<ProjectListRepositoryResult>
  getProjectById(id: number): Promise<ProjectEntity | null>
  getProjectByCode(projectCode: string): Promise<ProjectEntity | null>
  createProject(input: CreateProjectEntityInput): Promise<ProjectEntity | null>
  updateProject(id: number, input: UpdateProjectEntityInput): Promise<ProjectEntity | null>
  deleteProject(id: number): Promise<ProjectEntity | null>
}

async function ensureDataSource() {
  const current = getDataSource();
  if (current?.isInitialized) {
    return current;
  }

  return initDataBase();
}

export class ProjectRepository implements ProjectRepositoryPort {
  private async getRepository(manager?: EntityManager): Promise<Repository<ProjectEntity>> {
    const dataSource = await ensureDataSource();

    if (!manager) {
      return dataSource.getRepository(ProjectEntity);
    }

    return manager.getRepository(ProjectEntity);
  }

  async getProjectList(query: ProjectListQueryDto): Promise<ProjectListRepositoryResult> {
    const repository = await this.getRepository();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const queryBuilder = repository.createQueryBuilder('project');

    if (query.keyword) {
      queryBuilder.andWhere(
        '(project.projectName LIKE :keyword OR project.projectCode LIKE :keyword)',
        {
          keyword: `%${query.keyword}%`,
        },
      );
    }

    const total = await queryBuilder.getCount();
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const currentPage = Math.min(page, totalPages);
    const items =
      total === 0
        ? []
        : await queryBuilder
            .clone()
            .orderBy('project.id', 'ASC')
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

  async getProjectById(id: number): Promise<ProjectEntity | null> {
    const repository = await this.getRepository();
    return repository.findOne({
      where: { id },
    });
  }

  async getProjectByCode(projectCode: string): Promise<ProjectEntity | null> {
    const repository = await this.getRepository();
    return repository.findOne({
      where: { projectCode },
    });
  }

  async createProject(input: CreateProjectEntityInput): Promise<ProjectEntity | null> {
    const repository = await this.getRepository();
    const entity = repository.create({
      projectName: input.projectName,
      projectCode: input.projectCode,
      createBy: 'system',
      updateBy: 'system',
      ...(input.remark ? { remark: input.remark } : {}),
    });

    const saved = await repository.save(entity);
    return repository.findOne({
      where: { id: saved.id },
    });
  }

  async updateProject(id: number, input: UpdateProjectEntityInput): Promise<ProjectEntity | null> {
    const repository = await this.getRepository();
    const current = await repository.findOne({
      where: { id },
    });

    if (!current) {
      return null;
    }

    if (input.projectName !== undefined) {
      current.projectName = input.projectName;
    }
    if (input.projectCode !== undefined) {
      current.projectCode = input.projectCode;
    }
    if (input.remark !== undefined) {
      current.remark = input.remark;
    }

    current.updateBy = 'system';
    await repository.save(current);

    return repository.findOne({
      where: { id },
    });
  }

  async deleteProject(id: number): Promise<ProjectEntity | null> {
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

export const projectRepository = new ProjectRepository();
