import { jest } from '@jest/globals';

const getDataSourceMock = jest.fn();
const initDataBaseMock = jest.fn();

jest.unstable_mockModule('../../utils/mysql.ts', () => ({
  default: initDataBaseMock,
  getDataSource: getDataSourceMock,
}));

const { GlobalConfigRepository } = await import('../../src/globalConfig/global-config.repository.ts');

function createChainableMock() {
  return jest.fn(function chainable(this: unknown) {
    return this;
  });
}

describe('GlobalConfigRepository', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('joins project info and applies project/status/keyword filters in list query', async () => {
    const detailQueryBuilder = {
      leftJoin: createChainableMock(),
      select: createChainableMock(),
      addSelect: createChainableMock(),
      where: createChainableMock(),
      andWhere: createChainableMock(),
      clone: jest.fn(),
      orderBy: createChainableMock(),
      skip: createChainableMock(),
      take: createChainableMock(),
      getCount: jest.fn(),
      getRawAndEntities: jest.fn(),
    };

    detailQueryBuilder.clone.mockReturnValue(detailQueryBuilder);
    detailQueryBuilder.getCount.mockResolvedValue(1);
    detailQueryBuilder.getRawAndEntities.mockResolvedValue({
      raw: [
        {
          projectName: '管理后台',
          projectCode: 'admin-console',
        },
      ],
      entities: [
        {
          id: 1,
          projectId: 1,
          configKey: 'site.title',
          configName: '站点标题',
          configType: 'text',
          configValue: 'Superpowers BMS',
          status: 1,
        },
      ],
    });

    const repository = {
      createQueryBuilder: jest.fn(() => detailQueryBuilder),
    };

    getDataSourceMock.mockReturnValue({
      isInitialized: true,
      getRepository: jest.fn(() => repository),
    });

    const globalConfigRepository = new GlobalConfigRepository();
    const result = await globalConfigRepository.getGlobalConfigList({
      keyword: 'title',
      projectId: 1,
      status: 1,
      page: 1,
      pageSize: 10,
    });

    expect(detailQueryBuilder.leftJoin).toHaveBeenCalled();
    expect(detailQueryBuilder.andWhere).toHaveBeenCalledWith(
      'globalConfig.projectId = :projectId',
      { projectId: 1 },
    );
    expect(detailQueryBuilder.andWhere).toHaveBeenCalledWith(
      'globalConfig.status = :status',
      { status: 1 },
    );
    expect(detailQueryBuilder.andWhere).toHaveBeenCalledWith(
      '(globalConfig.configKey LIKE :keyword OR globalConfig.configName LIKE :keyword OR globalConfig.remark LIKE :keyword)',
      { keyword: '%title%' },
    );
    expect(result).toEqual({
      items: [
        expect.objectContaining({
          projectName: '管理后台',
          projectCode: 'admin-console',
          entity: expect.objectContaining({
            configKey: 'site.title',
          }),
        }),
      ],
      total: 1,
      page: 1,
      pageSize: 10,
    });
  });
});
