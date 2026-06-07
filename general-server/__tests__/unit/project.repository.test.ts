import { jest } from '@jest/globals';

const getDataSourceMock = jest.fn();
const initDataBaseMock = jest.fn();

jest.unstable_mockModule('../../utils/mysql.ts', () => ({
  default: initDataBaseMock,
  getDataSource: getDataSourceMock,
}));

const { ProjectRepository } = await import('../../src/project/project.repository.ts');

function createChainableMock() {
  return jest.fn(function chainable(this: unknown) {
    return this;
  });
}

describe('ProjectRepository', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('counts only enabled and undeleted permissions in project permissionCount', async () => {
    const subQueryBuilder = {
      select: createChainableMock(),
      from: createChainableMock(),
      where: createChainableMock(),
      andWhere: createChainableMock(),
    };

    const detailQueryBuilder = {
      select: createChainableMock(),
      where: createChainableMock(),
      andWhere: createChainableMock(),
      clone: jest.fn(),
      addSelect: jest.fn(),
      orderBy: createChainableMock(),
      skip: createChainableMock(),
      take: createChainableMock(),
      getCount: jest.fn(),
      getRawAndEntities: jest.fn(),
    };

    detailQueryBuilder.clone.mockReturnValue(detailQueryBuilder);
    detailQueryBuilder.getCount.mockResolvedValue(1);
    detailQueryBuilder.getRawAndEntities.mockResolvedValue({
      raw: [{ permissionCount: '1' }],
      entities: [
        {
          id: 1,
          projectName: '用户中台',
          projectCode: 'user-center',
        },
      ],
    });
    detailQueryBuilder.addSelect.mockImplementation((callback: (builder: typeof subQueryBuilder) => unknown) => {
      callback(subQueryBuilder);
      return detailQueryBuilder;
    });

    const repository = {
      createQueryBuilder: jest.fn(() => detailQueryBuilder),
    };

    getDataSourceMock.mockReturnValue({
      isInitialized: true,
      getRepository: jest.fn(() => repository),
    });

    const projectRepository = new ProjectRepository();
    await projectRepository.getProjectList({
      page: 1,
      pageSize: 10,
    });

    expect(subQueryBuilder.where).toHaveBeenCalledWith(
      'permission.appCode = project.projectCode',
    );
    expect(subQueryBuilder.andWhere).toHaveBeenNthCalledWith(
      1,
      'permission.deleteFlag = :deleteFlag',
      { deleteFlag: 0 },
    );
    expect(subQueryBuilder.andWhere).toHaveBeenNthCalledWith(
      2,
      'permission.status = :permissionStatus',
      { permissionStatus: 1 },
    );
  });
});
