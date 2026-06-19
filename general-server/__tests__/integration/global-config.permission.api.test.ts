import type { Express } from 'express';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import { generateJwtToken } from '@super-pro/shared-server';
import { loadProfileEnv } from '@super-pro/shared-server';
import { ADMIN_CONSOLE_PERMISSION_CODES } from '@super-pro/shared-types';
import { createApp } from '../../app.ts';
import { AuthorizationRepository } from '../../src/authorization/authorization.repository.ts';
import initDataBase, { getDataSource } from '../../utils/mysql.ts';

type TableRow = Record<string, unknown>;

const serviceRoot = fileURLToPath(new URL('../..', import.meta.url));

const TABLE_CONFIGS = [
  {
    name: 'sys_user_role',
    columns: [
      'id',
      'user_id',
      'role_id',
      'create_by',
      'create_time',
      'update_by',
      'update_time',
      'delete_flag',
      'remark',
    ],
  },
  {
    name: 'sys_role_project',
    columns: [
      'id',
      'role_id',
      'project_id',
      'create_by',
      'create_time',
      'update_by',
      'update_time',
      'delete_flag',
      'remark',
    ],
  },
  {
    name: 'sys_role_permission',
    columns: [
      'id',
      'role_id',
      'permission_id',
      'create_by',
      'create_time',
      'update_by',
      'update_time',
      'delete_flag',
      'remark',
    ],
  },
  {
    name: 'sys_permission',
    columns: [
      'id',
      'code',
      'app_code',
      'status',
      'resource_type',
      'resource_code',
      'action',
      'name',
      'description',
      'create_by',
      'create_time',
      'update_by',
      'update_time',
      'delete_flag',
      'remark',
    ],
  },
  {
    name: 'sys_role',
    columns: [
      'id',
      'code',
      'name',
      'status',
      'description',
      'create_by',
      'create_time',
      'update_by',
      'update_time',
      'delete_flag',
      'remark',
    ],
  },
  {
    name: 'sys_project',
    columns: [
      'id',
      'project_name',
      'project_code',
      'create_by',
      'create_time',
      'update_by',
      'update_time',
      'delete_flag',
      'remark',
    ],
  },
  {
    name: 'sys_global_config',
    columns: [
      'id',
      'project_id',
      'config_key',
      'config_name',
      'config_type',
      'config_value',
      'status',
      'create_by',
      'create_time',
      'update_by',
      'update_time',
      'delete_flag',
      'remark',
    ],
  },
] as const;

const ROLE_TABLE = TABLE_CONFIGS[4];
const PROJECT_TABLE = TABLE_CONFIGS[5];
const GLOBAL_CONFIG_TABLE = TABLE_CONFIGS[6];

const NO_PERMISSION_ROLE_ROW = {
  id: 901,
  code: 'custom.no-permission',
  name: '无权限角色',
  status: 1,
  description: 'no permission role',
  create_by: 'tester',
  create_time: '2026-06-10 00:00:00',
  update_by: 'tester',
  update_time: '2026-06-10 00:00:00',
  delete_flag: 0,
  remark: 'integration seed',
} as const;

const originalRows = new Map<string, TableRow[]>();
let app: Express;
let seededProjectId = 0;

function getInitializedDataSource() {
  const dataSource = getDataSource();
  if (!dataSource?.isInitialized) {
    throw new Error('test database not initialized');
  }

  return dataSource;
}

async function getTableRows(tableName: string, columns: readonly string[]) {
  return getInitializedDataSource().query(
    `SELECT ${columns.join(', ')} FROM ${tableName} ORDER BY id ASC`,
  ) as Promise<TableRow[]>;
}

async function clearTable(tableName: string) {
  await getInitializedDataSource().query(`DELETE FROM ${tableName}`);
}

async function replaceRows(
  tableName: string,
  columns: readonly string[],
  rows: readonly TableRow[],
) {
  if (rows.length === 0) {
    return;
  }

  const placeholders = columns.map(() => '?').join(', ');
  for (const row of rows) {
    await getInitializedDataSource().query(
      `
        REPLACE INTO ${tableName}
          (${columns.join(', ')})
        VALUES (${placeholders})
      `,
      columns.map((column) => row[column]),
    );
  }
}

async function restoreOriginalTables() {
  for (const config of TABLE_CONFIGS) {
    await clearTable(config.name);
  }

  for (const config of [...TABLE_CONFIGS].reverse()) {
    await replaceRows(config.name, config.columns, originalRows.get(config.name) ?? []);
  }
}

async function seedPermissionScenario() {
  const authorizationRepository = new AuthorizationRepository();

  for (const config of TABLE_CONFIGS) {
    await clearTable(config.name);
  }

  await authorizationRepository.ensureSeedData();
  await replaceRows(ROLE_TABLE.name, ROLE_TABLE.columns, [NO_PERMISSION_ROLE_ROW]);

  const [adminConsoleProject] = (await getTableRows(PROJECT_TABLE.name, PROJECT_TABLE.columns)).filter(
    (row) => row.project_code === 'admin-console' && row.delete_flag === 0,
  );

  if (!adminConsoleProject) {
    throw new Error('missing admin-console project seed');
  }

  await replaceRows(GLOBAL_CONFIG_TABLE.name, GLOBAL_CONFIG_TABLE.columns, [
    {
      id: 1,
      project_id: adminConsoleProject.id,
      config_key: 'site.title',
      config_name: '站点标题',
      config_type: 'text',
      config_value: 'Superpowers BMS',
      status: 1,
      create_by: 'system',
      create_time: '2026-06-10 00:00:00',
      update_by: 'system',
      update_time: '2026-06-10 00:00:00',
      delete_flag: 0,
      remark: 'permission api seed',
    },
  ]);

  const viewerRole = (await authorizationRepository.getRolesByCodes(['admin-console.viewer']))[0];
  if (!viewerRole) {
    throw new Error('missing admin-console.viewer role');
  }

  await authorizationRepository.replaceUserRoleAssignments(101, [viewerRole.id]);
  await authorizationRepository.replaceUserRoleAssignments(202, [NO_PERMISSION_ROLE_ROW.id]);

  return {
    projectId: Number(adminConsoleProject.id),
  };
}

beforeAll(async () => {
  loadProfileEnv({ cwd: serviceRoot });
  await initDataBase();
  app = createApp();

  for (const config of TABLE_CONFIGS) {
    originalRows.set(config.name, await getTableRows(config.name, config.columns));
  }
});

beforeEach(async () => {
  process.env.JWT_ENABLED = 'true';
  const seedResult = await seedPermissionScenario();
  seededProjectId = seedResult.projectId;
});

afterAll(async () => {
  process.env.JWT_ENABLED = 'false';

  const dataSource = getDataSource();
  if (!dataSource?.isInitialized) {
    return;
  }

  await restoreOriginalTables();
  await dataSource.destroy();
});

describe('global config permission api', () => {
  it('returns 401 when token is missing', async () => {
    const response = await request(app).get(
      `/api/global-config/getGlobalConfig?projectId=${seededProjectId}`,
    );

    expect(response.status).toBe(401);
  });

  it('returns 403 when authenticated user misses global config read permission', async () => {
    const viewerToken = generateJwtToken({
      userId: 202,
      username: 'blocked-user',
      role: 'guest',
    });

    const response = await request(app)
      .get(`/api/global-config/getGlobalConfig?projectId=${seededProjectId}`)
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(response.status).toBe(403);
  });

  it('returns 200 when authenticated user has global config read permission', async () => {
    const viewerToken = generateJwtToken({
      userId: 101,
      username: 'viewer-user',
      role: 'guest',
    });

    const response = await request(app)
      .get(`/api/global-config/getGlobalConfig?projectId=${seededProjectId}`)
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.code).toBe(200);
    expect(response.body.data).toEqual(
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({
            projectId: seededProjectId,
            configKey: 'site.title',
            configType: 'text',
            configValue: 'Superpowers BMS',
          }),
        ]),
      }),
    );
  });
});
