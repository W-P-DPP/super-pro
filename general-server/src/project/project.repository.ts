import type { EntityManager, Repository } from 'typeorm';
import initDataBase, { getDataSource } from '../../utils/mysql.ts';
import { PermissionEntity } from '../authorization/authorization.entity.ts';
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
  items: ProjectListItemRepositoryRecord[]
  total: number
  page: number
  pageSize: number
}

export interface ProjectListItemRepositoryRecord {
  entity: ProjectEntity
  permissionCount: number
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

  private createDetailQueryBuilder(repository: Repository<ProjectEntity>) {
    return repository.createQueryBuilder('project').select([
      'project.id',
      'project.projectName',
      'project.projectCode',
      'project.createBy',
      'project.createTime',
      'project.updateBy',
      'project.updateTime',
      'project.remark',
    ])
      .where('project.deleteFlag = :deleteFlag', { deleteFlag: 0 });
  }

  async getProjectList(query: ProjectListQueryDto): Promise<ProjectListRepositoryResult> {
    const repository = await this.getRepository();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const queryBuilder = this.createDetailQueryBuilder(repository);

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
            .addSelect(
              (subQuery) =>
                subQuery
                  .select('COUNT(permission.id)', 'permissionCount')
                  .from(PermissionEntity, 'permission')
                  .where('permission.appCode = project.projectCode')
                  .andWhere('permission.deleteFlag = :deleteFlag', { deleteFlag: 0 })
                  .andWhere('permission.status = :permissionStatus', {
                    permissionStatus: 1,
                  }),
              'permissionCount',
            )
            .orderBy('project.id', 'ASC')
            .skip((currentPage - 1) * pageSize)
            .take(pageSize)
            .getRawAndEntities()
            .then(({ raw, entities }) =>
              entities.map((entity, index) => ({
                entity,
                permissionCount: Number(raw[index]?.permissionCount ?? 0),
              })),
            );

    return {
      items,
      total,
      page: currentPage,
      pageSize,
    };
  }

  async getProjectById(id: number): Promise<ProjectEntity | null> {
    const repository = await this.getRepository();
    return this.createDetailQueryBuilder(repository)
      .andWhere('project.id = :id', { id })
      .getOne();
  }

  async getProjectByCode(projectCode: string): Promise<ProjectEntity | null> {
    const repository = await this.getRepository();
    return this.createDetailQueryBuilder(repository)
      .andWhere('project.projectCode = :projectCode', { projectCode })
      .getOne();
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
    return this.createDetailQueryBuilder(repository)
      .andWhere('project.id = :id', { id: saved.id })
      .getOne();
  }

  async updateProject(id: number, input: UpdateProjectEntityInput): Promise<ProjectEntity | null> {
    const repository = await this.getRepository();
    const current = await repository.findOne({
      where: { id, deleteFlag: 0 },
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

    return this.createDetailQueryBuilder(repository)
      .andWhere('project.id = :id', { id })
      .getOne();
  }

  async deleteProject(id: number): Promise<ProjectEntity | null> {
    const repository = await this.getRepository();
    const current = await this.createDetailQueryBuilder(repository)
      .andWhere('project.id = :id', { id })
      .getOne();

    if (!current) {
      return null;
    }

    current.deleteFlag = 1;
    current.updateBy = 'system';
    await repository.save(current);
    return current;
  }
}

export const projectRepository = new ProjectRepository();
