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

    getDataSourceMock.mockReturnValue({
      isInitialized: true,
      getRepository: jest.fn(() => repository),
    })

    const todoRepository = new TodoRepository()
    const result = await todoRepository.getTodoList({
      projectId: 22,
      page: 1,
      pageSize: 10,
    })

    expect(detailQueryBuilder.andWhere).toHaveBeenCalledWith('todo.projectId = :projectId', {
      projectId: 22,
    })
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
})
