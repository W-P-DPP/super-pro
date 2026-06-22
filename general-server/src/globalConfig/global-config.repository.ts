import type { EntityManager, Repository } from 'typeorm';
import type { GlobalConfigType } from '@super-pro/shared-types';
import initDataBase, { getDataSource } from '../../utils/mysql.ts';
import { ProjectEntity } from '../project/project.entity.ts';
import type { GlobalConfigListQueryDto } from './global-config.dto.ts';
import { GlobalConfigEntity } from './global-config.entity.ts';

export interface CreateGlobalConfigEntityInput {
  projectId: number;
  projectName?: string;
  projectCode?: string;
  configKey: string;
  configName: string;
  configType: GlobalConfigType;
  configValue: string;
  status: number;
  remark?: string;
}

export interface UpdateGlobalConfigEntityInput {
  projectId?: number;
  projectName?: string;
  projectCode?: string;
  configKey?: string;
  configName?: string;
  configType?: GlobalConfigType;
  configValue?: string;
  status?: number;
  remark?: string;
}

export interface GlobalConfigDetailRepositoryRecord {
  entity: GlobalConfigEntity;
  projectName: string;
  projectCode: string;
}

export type GlobalConfigListItemRepositoryRecord = GlobalConfigDetailRepositoryRecord;

export interface GlobalConfigListRepositoryResult {
  items: GlobalConfigListItemRepositoryRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export interface GlobalConfigRepositoryPort {
  getGlobalConfigList(query: GlobalConfigListQueryDto): Promise<GlobalConfigListRepositoryResult>;
  getGlobalConfigById(id: number): Promise<GlobalConfigDetailRepositoryRecord | null>;
  getGlobalConfigByProjectIdAndKey(projectId: number, configKey: string): Promise<GlobalConfigEntity | null>;
  getEnabledGlobalConfigsByProjectId(projectId: number): Promise<GlobalConfigDetailRepositoryRecord[]>;
  createGlobalConfig(input: CreateGlobalConfigEntityInput): Promise<GlobalConfigDetailRepositoryRecord | null>;
  updateGlobalConfig(id: number, input: UpdateGlobalConfigEntityInput): Promise<GlobalConfigDetailRepositoryRecord | null>;
  deleteGlobalConfig(id: number): Promise<GlobalConfigDetailRepositoryRecord | null>;
}

async function ensureDataSource() {
  const current = getDataSource();
  if (current?.isInitialized) {
    return current;
  }

  return initDataBase();
}

export class GlobalConfigRepository implements GlobalConfigRepositoryPort {
  private async getRepository(manager?: EntityManager): Promise<Repository<GlobalConfigEntity>> {
    const dataSource = await ensureDataSource();

    if (!manager) {
      return dataSource.getRepository(GlobalConfigEntity);
    }

    return manager.getRepository(GlobalConfigEntity);
  }

  private createDetailQueryBuilder(repository: Repository<GlobalConfigEntity>) {
    return repository
      .createQueryBuilder('globalConfig')
      .leftJoin(
        ProjectEntity,
        'project',
        'project.id = globalConfig.projectId AND project.deleteFlag = :projectDeleteFlag',
        { projectDeleteFlag: 0 },
      )
      .select([
        'globalConfig.id',
        'globalConfig.projectId',
        'globalConfig.configKey',
        'globalConfig.configName',
        'globalConfig.configType',
        'globalConfig.configValue',
        'globalConfig.status',
        'globalConfig.createBy',
        'globalConfig.createTime',
        'globalConfig.updateBy',
        'globalConfig.updateTime',
        'globalConfig.remark',
      ])
      .addSelect('project.projectName', 'projectName')
      .addSelect('project.projectCode', 'projectCode')
      .where('globalConfig.deleteFlag = :deleteFlag', { deleteFlag: 0 });
  }

  async getGlobalConfigList(query: GlobalConfigListQueryDto): Promise<GlobalConfigListRepositoryResult> {
    const repository = await this.getRepository();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const queryBuilder = this.createDetailQueryBuilder(repository);

    if (query.projectId !== undefined) {
      queryBuilder.andWhere('globalConfig.projectId = :projectId', {
        projectId: query.projectId,
      });
    }

    if (query.status !== undefined) {
      queryBuilder.andWhere('globalConfig.status = :status', {
        status: query.status,
      });
    }

    if (query.keyword) {
      queryBuilder.andWhere(
        '(globalConfig.configKey LIKE :keyword OR globalConfig.configName LIKE :keyword OR globalConfig.remark LIKE :keyword)',
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
            .orderBy('globalConfig.id', 'ASC')
            .skip((currentPage - 1) * pageSize)
            .take(pageSize)
            .getRawAndEntities()
            .then(({ raw, entities }) =>
              entities.map((entity, index) => ({
                entity,
                projectName: String(raw[index]?.projectName ?? ''),
                projectCode: String(raw[index]?.projectCode ?? ''),
              })),
            );

    return {
      items,
      total,
      page: currentPage,
      pageSize,
    };
  }

  async getGlobalConfigById(id: number): Promise<GlobalConfigDetailRepositoryRecord | null> {
    const repository = await this.getRepository();
    const result = await this.createDetailQueryBuilder(repository)
      .andWhere('globalConfig.id = :id', { id })
      .getRawAndEntities();

    const entity = result.entities[0];
    const raw = result.raw[0];

    if (!entity) {
      return null;
    }

    return {
      entity,
      projectName: String(raw?.projectName ?? ''),
      projectCode: String(raw?.projectCode ?? ''),
    };
  }

  async getGlobalConfigByProjectIdAndKey(projectId: number, configKey: string): Promise<GlobalConfigEntity | null> {
    const repository = await this.getRepository();
    return repository.findOne({
      where: {
        projectId,
        configKey,
        deleteFlag: 0,
      },
    });
  }

  async getEnabledGlobalConfigsByProjectId(projectId: number): Promise<GlobalConfigDetailRepositoryRecord[]> {
    const repository = await this.getRepository();
    const result = await this.createDetailQueryBuilder(repository)
      .andWhere('globalConfig.projectId = :projectId', { projectId })
      .andWhere('globalConfig.status = :status', { status: 1 })
      .orderBy('globalConfig.id', 'ASC')
      .getRawAndEntities();

    return result.entities.map((entity, index) => ({
      entity,
      projectName: String(result.raw[index]?.projectName ?? ''),
      projectCode: String(result.raw[index]?.projectCode ?? ''),
    }));
  }

  async createGlobalConfig(
    input: CreateGlobalConfigEntityInput,
  ): Promise<GlobalConfigDetailRepositoryRecord | null> {
    const repository = await this.getRepository();
    const entity = repository.create({
      projectId: input.projectId,
      configKey: input.configKey,
      configName: input.configName,
      configType: input.configType,
      configValue: input.configValue,
      status: input.status,
      createBy: 'system',
      updateBy: 'system',
      ...(input.remark !== undefined ? { remark: input.remark } : {}),
    });

    const saved = await repository.save(entity);
    return this.getGlobalConfigById(saved.id);
  }

  async updateGlobalConfig(
    id: number,
    input: UpdateGlobalConfigEntityInput,
  ): Promise<GlobalConfigDetailRepositoryRecord | null> {
    const repository = await this.getRepository();
    const current = await repository.findOne({
      where: { id, deleteFlag: 0 },
    });

    if (!current) {
      return null;
    }

    if (input.projectId !== undefined) {
      current.projectId = input.projectId;
    }
    if (input.configKey !== undefined) {
      current.configKey = input.configKey;
    }
    if (input.configName !== undefined) {
      current.configName = input.configName;
    }
    if (input.configType !== undefined) {
      current.configType = input.configType;
    }
    if (input.configValue !== undefined) {
      current.configValue = input.configValue;
    }
    if (input.status !== undefined) {
      current.status = input.status;
    }
    if (input.remark !== undefined) {
      current.remark = input.remark;
    }

    current.updateBy = 'system';
    await repository.save(current);

    return this.getGlobalConfigById(id);
  }

  async deleteGlobalConfig(id: number): Promise<GlobalConfigDetailRepositoryRecord | null> {
    const repository = await this.getRepository();
    const detail = await this.getGlobalConfigById(id);

    if (!detail) {
      return null;
    }

    const current = await repository.findOne({
      where: { id, deleteFlag: 0 },
    });

    if (!current) {
      return null;
    }

    current.deleteFlag = 1;
    current.updateBy = 'system';
    await repository.save(current);
    return detail;
  }
}

export const globalConfigRepository = new GlobalConfigRepository();
