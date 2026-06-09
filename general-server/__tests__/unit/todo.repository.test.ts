import { jest } from '@jest/globals'

const getDataSourceMock = jest.fn()
const initDataBaseMock = jest.fn()

jest.unstable_mockModule('../../utils/mysql.ts', () => ({
  default: initDataBaseMock,
  getDataSource: getDataSourceMock,
}))

const { TodoRepository } = await import('../../src/todo/todo.repository.ts')

function createChainableMock() {
  return jest.fn(function chainable(this: unknown) {
    return this
  })
}

describe('TodoRepository', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('adds project filter conditions and maps project summaries', async () => {
    const dataSource = {
      isInitialized: true,
      options: {
        database: 'super_pro',
      },
      query: jest
        .fn()
        .mockResolvedValueOnce([{ count: '0' }])
        .mockResolvedValueOnce(undefined),
      getRepository: jest.fn(),
    }
    const detailQueryBuilder = {
      select: createChainableMock(),
      leftJoin: createChainableMock(),
      where: createChainableMock(),
      andWhere: createChainableMock(),
      clone: jest.fn(),
      orderBy: createChainableMock(),
      addOrderBy: createChainableMock(),
      skip: createChainableMock(),
      take: createChainableMock(),
      getCount: jest.fn(),
      getRawAndEntities: jest.fn(),
    }

    detailQueryBuilder.clone.mockReturnValue(detailQueryBuilder)
    detailQueryBuilder.getCount.mockResolvedValue(1)
    detailQueryBuilder.getRawAndEntities.mockResolvedValue({
      raw: [
        {
          project_id: 22,
          project_projectName: 'Client Portal',
          project_projectCode: 'client-portal',
        },
      ],
      entities: [
        {
          id: 1,
          title: '联调待办接口',
          status: 'in_progress',
          priority: 'medium',
          projectId: 22,
        },
      ],
    })

    const repository = {
      createQueryBuilder: jest.fn(() => detailQueryBuilder),
    }

    dataSource.getRepository.mockReturnValue(repository)
    getDataSourceMock.mockReturnValue(dataSource)

    const todoRepository = new TodoRepository()
    const result = await todoRepository.getTodoList({
      projectId: 22,
      page: 1,
      pageSize: 10,
    })

    expect(detailQueryBuilder.andWhere).toHaveBeenCalledWith('todo.projectId = :projectId', {
      projectId: 22,
    })
    expect(dataSource.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('FROM information_schema.COLUMNS'),
      ['super_pro'],
    )
    expect(dataSource.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('ALTER TABLE sys_todo'),
    )
    expect(result.items).toEqual([
      expect.objectContaining({
        project: {
          id: 22,
          projectName: 'Client Portal',
          projectCode: 'client-portal',
        },
      }),
    ])
  })

  it('skips schema patch when description column already exists', async () => {
    const dataSource = {
      isInitialized: true,
      options: {
        database: 'super_pro',
      },
      query: jest.fn().mockResolvedValue([{ count: '1' }]),
      getRepository: jest.fn(),
    }
    const detailQueryBuilder = {
      select: createChainableMock(),
      leftJoin: createChainableMock(),
      where: createChainableMock(),
      andWhere: createChainableMock(),
      clone: jest.fn(),
      orderBy: createChainableMock(),
      addOrderBy: createChainableMock(),
      skip: createChainableMock(),
      take: createChainableMock(),
      getCount: jest.fn().mockResolvedValue(0),
      getRawAndEntities: jest.fn(),
    }

    detailQueryBuilder.clone.mockReturnValue(detailQueryBuilder)

    const repository = {
      createQueryBuilder: jest.fn(() => detailQueryBuilder),
    }

    dataSource.getRepository.mockReturnValue(repository)
    getDataSourceMock.mockReturnValue(dataSource)

    const todoRepository = new TodoRepository()
    const result = await todoRepository.getTodoList({
      page: 1,
      pageSize: 10,
    })

    expect(result.items).toEqual([])
    expect(dataSource.query).toHaveBeenCalledTimes(1)
    expect(dataSource.query).toHaveBeenCalledWith(expect.stringContaining('FROM information_schema.COLUMNS'), ['super_pro'])
  })

  it('maps project summaries when raw joined columns use snake_case aliases', async () => {
    const dataSource = {
      isInitialized: true,
      options: {
        database: 'super_pro',
      },
      query: jest.fn().mockResolvedValue([{ count: '1' }]),
      getRepository: jest.fn(),
    }
    const detailQueryBuilder = {
      select: createChainableMock(),
      leftJoin: createChainableMock(),
      where: createChainableMock(),
      andWhere: createChainableMock(),
      clone: jest.fn(),
      orderBy: createChainableMock(),
      addOrderBy: createChainableMock(),
      skip: createChainableMock(),
      take: createChainableMock(),
      getCount: jest.fn().mockResolvedValue(1),
      getRawAndEntities: jest.fn().mockResolvedValue({
        raw: [
          {
            project_id: 35,
            project_project_name: '后台系统',
            project_project_code: 'admin-console',
          },
        ],
        entities: [
          {
            id: 8,
            title: '补齐项目展示',
            status: 'todo',
            priority: 'medium',
            projectId: 35,
          },
        ],
      }),
    }

    detailQueryBuilder.clone.mockReturnValue(detailQueryBuilder)

    const repository = {
      createQueryBuilder: jest.fn(() => detailQueryBuilder),
    }

    dataSource.getRepository.mockReturnValue(repository)
    getDataSourceMock.mockReturnValue(dataSource)

    const todoRepository = new TodoRepository()
    const result = await todoRepository.getTodoList({
      page: 1,
      pageSize: 10,
    })

    expect(result.items).toEqual([
      expect.objectContaining({
        project: {
          id: 35,
          projectName: '后台系统',
          projectCode: 'admin-console',
        },
      }),
    ])
  })
})
