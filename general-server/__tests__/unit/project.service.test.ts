import type {
  CreateProjectEntityInput,
  ProjectRepositoryPort,
  UpdateProjectEntityInput,
} from '../../src/project/project.repository.ts';
import { ProjectEntity } from '../../src/project/project.entity.ts';
import {
  ProjectBusinessError,
  ProjectService,
} from '../../src/project/project.service.ts';

function cloneProject(project: ProjectEntity): ProjectEntity {
  return Object.assign(new ProjectEntity(), project);
}

function createRepositoryMock(records: ProjectEntity[]): ProjectRepositoryPort {
  return {
    async getProjectList(query) {
      const keyword = typeof query.keyword === 'string' ? query.keyword.toLowerCase() : '';
      const filteredRecords = records.filter((record) => {
        const haystack = `${record.projectName} ${record.projectCode}`.toLowerCase();
        return !keyword || haystack.includes(keyword);
      });

      return {
        items: filteredRecords.map(cloneProject),
        total: filteredRecords.length,
        page: 1,
        pageSize: query.pageSize ?? 10,
      };
    },
    async getProjectById(id: number) {
      const target = records.find((record) => record.id === id);
      return target ? cloneProject(target) : null;
    },
    async getProjectByCode(projectCode: string) {
      const target = records.find((record) => record.projectCode === projectCode);
      return target ? cloneProject(target) : null;
    },
    async createProject(input: CreateProjectEntityInput) {
      return Object.assign(new ProjectEntity(), {
        id: 99,
        projectName: input.projectName,
        projectCode: input.projectCode,
        remark: input.remark,
      });
    },
    async updateProject(id: number, input: UpdateProjectEntityInput) {
      const current = records.find((record) => record.id === id);
      if (!current) {
        return null;
      }

      return Object.assign(new ProjectEntity(), current, input);
    },
    async deleteProject(id: number) {
      const current = records.find((record) => record.id === id);
      return current ? cloneProject(current) : null;
    },
  };
}

function createService(records: ProjectEntity[]) {
  return new ProjectService(createRepositoryMock(records));
}

describe('ProjectService', () => {
  const records = [
    Object.assign(new ProjectEntity(), {
      id: 1,
      projectName: '用户中台',
      projectCode: 'user-center',
    }),
    Object.assign(new ProjectEntity(), {
      id: 2,
      projectName: '结算系统',
      projectCode: 'finance-core',
    }),
  ];

  it('creates a project', async () => {
    const service = createService(records);

    const result = await service.createProject({
      projectName: '项目后台',
      projectCode: 'admin-console',
    });

    expect(result).toEqual(
      expect.objectContaining({
        id: 99,
        projectName: '项目后台',
        projectCode: 'admin-console',
      }),
    );
  });

  it('rejects duplicate project code on create', async () => {
    const service = createService(records);

    await expect(
      service.createProject({
        projectName: '重复编码项目',
        projectCode: 'user-center',
      }),
    ).rejects.toMatchObject<Partial<ProjectBusinessError>>({
      statusCode: 409,
      context: expect.objectContaining({
        field: 'projectCode',
      }),
    });
  });

  it('supports filtered project list queries', async () => {
    const service = createService(records);

    const result = await service.getProjectList({
      keyword: 'finance',
      page: '1',
      pageSize: '1',
    });

    expect(result).toEqual({
      items: [
        expect.objectContaining({
          id: 2,
          projectName: '结算系统',
          projectCode: 'finance-core',
        }),
      ],
      total: 1,
      page: 1,
      pageSize: 1,
    });
  });

  it('maps createTime and updateTime into response dto', async () => {
    const datedRecords = [
      Object.assign(new ProjectEntity(), {
        id: 3,
        projectName: '项目中台',
        projectCode: 'project-center',
        createTime: '2026-05-28 10:00:00',
        updateTime: '2026-05-28 12:30:00',
      }),
    ];
    const service = createService(datedRecords);

    const result = await service.getProjectDetail(3);

    expect(result).toEqual(
      expect.objectContaining({
        id: 3,
        createTime: '2026-05-28 10:00:00',
        updateTime: '2026-05-28 12:30:00',
      }),
    );
  });

  it('updates project name and code', async () => {
    const service = createService(records);

    const result = await service.updateProject(1, {
      projectName: '用户平台',
      projectCode: 'user-platform',
    });

    expect(result).toEqual(
      expect.objectContaining({
        id: 1,
        projectName: '用户平台',
        projectCode: 'user-platform',
      }),
    );
  });

  it('returns not found for missing projects', async () => {
    const service = createService(records);

    await expect(service.getProjectDetail(99999)).rejects.toMatchObject<Partial<ProjectBusinessError>>({
      statusCode: 404,
      context: expect.objectContaining({
        field: 'id',
      }),
    });
  });

  it('rejects invalid project code format', async () => {
    const service = createService(records);

    await expect(
      service.createProject({
        projectName: '错误编码项目',
        projectCode: 'bad code',
      }),
    ).rejects.toMatchObject<Partial<ProjectBusinessError>>({
      statusCode: 400,
      context: expect.objectContaining({
        field: 'projectCode',
      }),
    });
  });
});
