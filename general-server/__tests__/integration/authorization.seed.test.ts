import initDataBase, { getDataSource } from '../../utils/mysql.ts';
import {
  AuthorizationRepository,
} from '../../src/authorization/authorization.repository.ts';
import { SEEDED_PROJECTS } from '../../src/authorization/authorization.permissions.ts';
import { loadProfileEnv } from '@super-pro/shared-server';
import { fileURLToPath } from 'node:url';

type TableRow = Record<string, unknown>;

const PROJECT_SEED = SEEDED_PROJECTS.find((item) => item.projectCode === 'project');

if (!PROJECT_SEED) {
  throw new Error('missing project seed');
}

const TABLE_CONFIGS = [
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
] as const;

const SOFT_DELETED_PROJECT_ROW = {
  id: 91,
  project_name: 'legacy project',
  project_code: 'project',
  create_by: 'system',
  create_time: '2026-04-09 10:00:00',
  update_by: 'system',
  update_time: '2026-04-09 10:00:00',
  delete_flag: 1,
  remark: 'legacy project row',
} as const;

const originalRows = new Map<string, TableRow[]>();
const serviceRoot = fileURLToPath(new URL('../..', import.meta.url));

function getInitializedDataSource() {
  const dataSource = getDataSource();
  if (!dataSource?.isInitialized) {
    throw new Error('test database not initialized');
  }

  return dataSource;
}

async function getTableRows(tableName: string, columns: readonly string[]) {
  const dataSource = getInitializedDataSource();
  return dataSource.query(
    `SELECT ${columns.join(', ')} FROM ${tableName} ORDER BY id ASC`,
  ) as Promise<TableRow[]>;
}

async function clearTable(tableName: string) {
  const dataSource = getInitializedDataSource();
  await dataSource.query(`DELETE FROM ${tableName}`);
}

async function replaceRows(
  tableName: string,
  columns: readonly string[],
  rows: readonly TableRow[],
) {
  if (rows.length === 0) {
    return;
  }

  const dataSource = getInitializedDataSource();
  const placeholders = columns.map(() => '?').join(', ');

  for (const row of rows) {
    await dataSource.query(
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

beforeAll(async () => {
  loadProfileEnv({ cwd: serviceRoot });
  await initDataBase();

  for (const config of TABLE_CONFIGS) {
    originalRows.set(config.name, await getTableRows(config.name, config.columns));
  }
});

beforeEach(async () => {
  for (const config of TABLE_CONFIGS) {
    await clearTable(config.name);
  }

  await replaceRows('sys_project', TABLE_CONFIGS[TABLE_CONFIGS.length - 1].columns, [
    SOFT_DELETED_PROJECT_ROW,
  ]);
});

afterAll(async () => {
  const dataSource = getDataSource();
  if (!dataSource?.isInitialized) {
    return;
  }

  await restoreOriginalTables();
  await dataSource.destroy();
});

describe('authorization seed bootstrap', () => {
  it('reactivates soft-deleted seeded projects instead of inserting duplicates', async () => {
    const repository = new AuthorizationRepository();

    await expect(repository.ensureSeedData()).resolves.toBeUndefined();

    const rows = await getTableRows('sys_project', TABLE_CONFIGS[TABLE_CONFIGS.length - 1].columns);
    const projectRows = rows.filter((row) => row.project_code === PROJECT_SEED.projectCode);

    expect(projectRows).toEqual([
      expect.objectContaining({
        id: SOFT_DELETED_PROJECT_ROW.id,
        project_name: PROJECT_SEED.projectName,
        project_code: PROJECT_SEED.projectCode,
        delete_flag: 0,
        remark: PROJECT_SEED.remark,
      }),
    ]);
  });
});
