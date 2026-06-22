import { describe, expect, it, jest } from '@jest/globals';
import { GlobalConfigService } from '../../src/globalConfig/global-config.service.ts';
import type {
  GlobalConfigDetailRepositoryRecord,
  GlobalConfigRepositoryPort,
} from '../../src/globalConfig/global-config.repository.ts';
import type { ProjectRepositoryPort } from '../../src/project/project.repository.ts';
import { GlobalConfigEntity } from '../../src/globalConfig/global-config.entity.ts';
import { ProjectEntity } from '../../src/project/project.entity.ts';

function createGlobalConfigRecord(
  overrides: Partial<GlobalConfigEntity> = {},
): GlobalConfigDetailRepositoryRecord {
  const entity = Object.assign(new GlobalConfigEntity(), {
    id: 1,
    projectId: 9,
    configKey: 'site.title',
    configName: '站点标题',
    configType: 'text',
    configValue: '工具站',
    status: 1,
    deleteFlag: 0,
    remark: '',
    ...overrides,
  });

  return {
    entity,
    projectName: '工具站',
    projectCode: 'site',
  };
}

function createService(overrides?: {
  records?: GlobalConfigDetailRepositoryRecord[];
  project?: ProjectEntity | null;
}) {
  const repository = {
    getEnabledGlobalConfigsByProjectId: jest.fn<GlobalConfigRepositoryPort['getEnabledGlobalConfigsByProjectId']>(),
  } as unknown as GlobalConfigRepositoryPort;
  const projectLookup = {
    getProjectByCode: jest.fn<ProjectRepositoryPort['getProjectByCode']>(),
  } as unknown as Pick<ProjectRepositoryPort, 'getProjectByCode'>;

  projectLookup.getProjectByCode.mockResolvedValue(overrides?.project ?? Object.assign(new ProjectEntity(), {
    id: 9,
    projectName: '工具站',
    projectCode: 'site',
  }));
  repository.getEnabledGlobalConfigsByProjectId.mockResolvedValue(
    overrides?.records ?? [
      createGlobalConfigRecord(),
      createGlobalConfigRecord({
        id: 2,
        configKey: 'feature.enabled',
        configName: '功能开关',
        configType: 'boolean',
        configValue: 'true',
      }),
    ],
  );

  return {
    service: new GlobalConfigService(repository, projectLookup),
    repository,
    projectLookup,
  };
}

describe('GlobalConfigService public project config', () => {
  it('returns enabled global config as a project keyed map', async () => {
    const { service, repository, projectLookup } = createService();

    const result = await service.getPublicGlobalConfigByProjectCode(' site ');

    expect(projectLookup.getProjectByCode).toHaveBeenCalledWith('site');
    expect(repository.getEnabledGlobalConfigsByProjectId).toHaveBeenCalledWith(9);
    expect(result).toEqual({
      'site.title': '工具站',
      'feature.enabled': true,
    });
  });
});
