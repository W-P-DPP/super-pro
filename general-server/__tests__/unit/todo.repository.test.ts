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

  it('adds assignee fuzzy search conditions and maps assignee summaries', async () => {
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
          assignee_id: 2,
          assignee_username: 'lisi',
          assignee_nickname: '李四',
          assignee_status: 1,
        },
      ],
      entities: [
        {
          id: 1,
          title: '联调待办接口',
          status: 'in_progress',
          priority: 'medium',
          assigneeUserId: 2,
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
      assigneeKeyword: '李四',
      page: 1,
      pageSize: 10,
    })

    expect(detailQueryBuilder.andWhere).toHaveBeenCalledWith(
      '(assignee.username LIKE :assigneeKeyword OR assignee.nickname LIKE :assigneeKeyword)',
      { assigneeKeyword: '%李四%' },
    )
    expect(result.items).toEqual([
      expect.objectContaining({
        assignee: {
          id: 2,
          username: 'lisi',
          nickname: '李四',
          status: 1,
        },
      }),
    ])
  })
})
