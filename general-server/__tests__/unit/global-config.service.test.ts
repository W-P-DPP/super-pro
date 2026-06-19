import type { ProjectRepositoryPort } from '../../src/project/project.repository.ts';
import { ProjectEntity } from '../../src/project/project.entity.ts';
import type {
  CreateGlobalConfigEntityInput,
  GlobalConfigDetailRepositoryRecord,
  GlobalConfigListItemRepositoryRecord,
  GlobalConfigRepositoryPort,
  UpdateGlobalConfigEntityInput,
} from '../../src/globalConfig/global-config.repository.ts';
import { GlobalConfigEntity } from '../../src/globalConfig/global-config.entity.ts';
import {
  GlobalConfigBusinessError,
  GlobalConfigService,
} from '../../src/globalConfig/global-config.service.ts';

function createProjectEntity(id: number, projectName: string, projectCode: string) {
  return Object.assign(new ProjectEntity(), {
    id,
    projectName,
    projectCode,
  });
}

function createGlobalConfigEntity(
  input: Partial<GlobalConfigEntity> & Pick<GlobalConfigEntity, 'id' | 'projectId' | 'configKey' | 'configName' | 'configType' | 'configValue' | 'status'>,
) {
  return Object.assign(new GlobalConfigEntity(), input);
}

function toDetailRecord(
  entity: GlobalConfigEntity,
  projectName: string,
  projectCode: string,
): GlobalConfigDetailRepositoryRecord {
  return {
    entity: Object.assign(new GlobalConfigEntity(), entity),
    projectName,
    projectCode,
  };
}

function cloneRecord(record: GlobalConfigDetailRepositoryRecord): GlobalConfigDetailRepositoryRecord {
  return {
    entity: Object.assign(new GlobalConfigEntity(), record.entity),
    projectName: record.projectName,
    projectCode: record.projectCode,
  };
}

function createRepositoryMock(
  records: GlobalConfigDetailRepositoryRecord[],
): GlobalConfigRepositoryPort {
  return {
    async getGlobalConfigList(query) {
      const keyword = typeof query.keyword === 'string' ? query.keyword.toLowerCase() : '';
      const projectId = typeof query.projectId === 'number' ? query.projectId : null;
      const status = typeof query.status === 'number' ? query.status : null;
      const filtered = records.filter((record) => {
        const matchesKeyword =
          !keyword ||
          `${record.entity.configKey} ${record.entity.configName} ${record.entity.remark ?? ''}`
            .toLowerCase()
            .includes(keyword);
        const matchesProject = projectId === null || record.entity.projectId === projectId;
        const matchesStatus = status === null || record.entity.status === status;
        return matchesKeyword && matchesProject && matchesStatus;
      });

      const items: GlobalConfigListItemRepositoryRecord[] = filtered.map((record) => cloneRecord(record));
      return {
        items,
        total: filtered.length,
        page: query.page ?? 1,
        pageSize: query.pageSize ?? 10,
      };
    },
    async getGlobalConfigById(id: number) {
      const target = records.find((record) => record.entity.id === id);
      return target ? cloneRecord(target) : null;
    },
    async getGlobalConfigByProjectIdAndKey(projectId: number, configKey: string) {
      const target = records.find(
        (record) =>
          record.entity.projectId === projectId && record.entity.configKey === configKey,
      );
      return target ? Object.assign(new GlobalConfigEntity(), target.entity) : null;
    },
    async createGlobalConfig(input: CreateGlobalConfigEntityInput) {
      return toDetailRecord(
        createGlobalConfigEntity({
          id: 99,
          projectId: input.projectId,
          configKey: input.configKey,
          configName: input.configName,
          configType: input.configType,
          configValue: input.configValue,
          status: input.status,
          remark: input.remark,
        }),
        input.projectName,
        input.projectCode,
      );
    },
    async updateGlobalConfig(id: number, input: UpdateGlobalConfigEntityInput) {
      const current = records.find((record) => record.entity.id === id);
      if (!current) {
        return null;
      }

      return toDetailRecord(
        Object.assign(new GlobalConfigEntity(), current.entity, input),
        input.projectName ?? current.projectName,
        input.projectCode ?? current.projectCode,
      );
    },
    async deleteGlobalConfig(id: number) {
      const current = records.find((record) => record.entity.id === id);
      return current ? cloneRecord(current) : null;
    },
  };
}

function createProjectLookupMock(projects: ProjectEntity[]): Pick<ProjectRepositoryPort, 'getProjectById'> {
  return {
    async getProjectById(id: number) {
      const target = projects.find((project) => project.id === id);
      return target ? Object.assign(new ProjectEntity(), target) : null;
    },
  };
}

function createService(
  records: GlobalConfigDetailRepositoryRecord[],
  projects: ProjectEntity[],
) {
  return new GlobalConfigService(
    createRepositoryMock(records),
    createProjectLookupMock(projects),
  );
}

describe('GlobalConfigService', () => {
  const projects = [
    createProjectEntity(1, '管理后台', 'admin-console'),
    createProjectEntity(2, '结算系统', 'finance-core'),
  ];

  const records = [
    toDetailRecord(
      createGlobalConfigEntity({
        id: 1,
        projectId: 1,
        configKey: 'site.title',
        configName: '站点标题',
        configType: 'text',
        configValue: 'Superpowers BMS',
        status: 1,
        remark: '首页标题',
      }),
      '管理后台',
      'admin-console',
    ),
    toDetailRecord(
      createGlobalConfigEntity({
        id: 2,
        projectId: 2,
        configKey: 'invoice.autoApprove',
        configName: '自动审批发票',
        configType: 'boolean',
        configValue: 'false',
        status: 1,
      }),
      '结算系统',
      'finance-core',
    ),
  ];

  it('creates a project scoped global config', async () => {
    const service = createService(records, projects);

    const result = await service.createGlobalConfig({
      projectId: 1,
      configKey: 'dashboard.refreshInterval',
      configName: '刷新间隔',
      configType: 'number',
      configValue: '30',
      status: 1,
    });

    expect(result).toEqual(
      expect.objectContaining({
        id: 99,
        projectId: 1,
        projectName: '管理后台',
        projectCode: 'admin-console',
        configKey: 'dashboard.refreshInterval',
        configType: 'number',
        configValue: 30,
      }),
    );
  });

  it('rejects duplicate configKey within the same project', async () => {
    const service = createService(records, projects);

    await expect(
      service.createGlobalConfig({
        projectId: 1,
        configKey: 'site.title',
        configName: '站点标题副本',
        configType: 'text',
        configValue: '重复值',
        status: 1,
      }),
    ).rejects.toMatchObject<Partial<GlobalConfigBusinessError>>({
      statusCode: 409,
      context: expect.objectContaining({
        field: 'configKey',
      }),
    });
  });

  it('rejects invalid boolean config values', async () => {
    const service = createService(records, projects);

    await expect(
      service.createGlobalConfig({
        projectId: 1,
        configKey: 'feature.enabled',
        configName: '功能开关',
        configType: 'boolean',
        configValue: 'yes',
        status: 1,
      }),
    ).rejects.toMatchObject<Partial<GlobalConfigBusinessError>>({
      statusCode: 400,
      context: expect.objectContaining({
        field: 'configValue',
      }),
    });
  });

  it('rejects create when project does not exist', async () => {
    const service = createService(records, projects);

    await expect(
      service.createGlobalConfig({
        projectId: 999,
        configKey: 'missing.project',
        configName: '不存在项目',
        configType: 'text',
        configValue: 'invalid',
        status: 1,
      }),
    ).rejects.toMatchObject<Partial<GlobalConfigBusinessError>>({
      statusCode: 404,
      context: expect.objectContaining({
        field: 'projectId',
      }),
    });
  });

  it('supports filtered global config list queries', async () => {
    const service = createService(records, projects);

    const result = await service.getGlobalConfigList({
      projectId: 2,
      keyword: 'invoice',
      status: '1',
      page: '1',
      pageSize: '10',
    });

    expect(result).toEqual({
      items: [
        expect.objectContaining({
          id: 2,
          projectId: 2,
          projectName: '结算系统',
          projectCode: 'finance-core',
          configKey: 'invoice.autoApprove',
          configType: 'boolean',
          configValue: false,
        }),
      ],
      total: 1,
      page: 1,
      pageSize: 10,
    });
  });

  it('re-validates configValue when update changes config type', async () => {
    const service = createService(records, projects);

    await expect(
      service.updateGlobalConfig(1, {
        configType: 'boolean',
        configValue: 'not-bool',
      }),
    ).rejects.toMatchObject<Partial<GlobalConfigBusinessError>>({
      statusCode: 400,
      context: expect.objectContaining({
        field: 'configValue',
      }),
    });
  });
});
