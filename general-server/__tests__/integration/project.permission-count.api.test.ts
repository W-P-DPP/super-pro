import type { Express } from 'express';
import request from 'supertest';
import { createApp } from '../../app.ts';
import initDataBase, { getDataSource } from '../../utils/mysql.ts';

type ProjectRow = {
  id: number;
  project_name: string;
  project_code: string;
  create_by: string | null;
  create_time: Date | string | null;
  update_by: string | null;
  update_time: Date | string | null;
  delete_flag: number;
  remark: string | null;
};

type PermissionRow = {
  id: number;
  code: string;
  app_code: string;
  status: number;
  resource_type: string;
  resource_code: string;
  action: string;
  name: string;
  description: string;
  create_by: string | null;
  create_time: Date | string | null;
  update_by: string | null;
  update_time: Date | string | null;
  delete_flag: number;
  remark: string | null;
};

const PROJECT_TABLE_NAME = 'sys_project';
const PROJECT_TABLE_COLUMNS = [
  'id',
  'project_name',
  'project_code',
  'create_by',
  'create_time',
  'update_by',
  'update_time',
  'delete_flag',
  'remark',
].join(', ');

const PERMISSION_TABLE_NAME = 'sys_permission';
const PERMISSION_TABLE_COLUMNS = [
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
].join(', ');

const PROJECT_SEED_ROWS: ProjectRow[] = [
  {
    id: 1,
    project_name: '用户中台',
    project_code: 'user-center',
    create_by: 'system',
    create_time: '2026-04-09 10:00:00',
    update_by: 'system',
    update_time: '2026-04-09 10:00:00',
    delete_flag: 0,
    remark: '用户与权限主项目',
  },
  {
    id: 2,
    project_name: '结算系统',
    project_code: 'finance-core',
    create_by: 'system',
    create_time: '2026-04-09 10:00:00',
    update_by: 'system',
    update_time: '2026-04-09 10:00:00',
    delete_flag: 0,
    remark: '订单结算项目',
  },
];

const PERMISSION_SEED_ROWS: PermissionRow[] = [
  {
    id: 1,
    code: 'user-center.menu.dashboard.view',
    app_code: 'user-center',
    status: 1,
    resource_type: 'menu',
    resource_code: 'dashboard',
    action: 'view',
    name: '用户中台工作台',
    description: '启用权限',
    create_by: 'system',
    create_time: '2026-04-09 10:00:00',
    update_by: 'system',
    update_time: '2026-04-09 10:00:00',
    delete_flag: 0,
    remark: null,
  },
  {
    id: 2,
    code: 'user-center.menu.users.view',
    app_code: 'user-center',
    status: 0,
    resource_type: 'menu',
    resource_code: 'users',
    action: 'view',
    name: '用户中台用户管理',
    description: '禁用权限',
    create_by: 'system',
    create_time: '2026-04-09 10:00:00',
    update_by: 'system',
    update_time: '2026-04-09 10:00:00',
    delete_flag: 0,
    remark: null,
  },
  {
    id: 3,
    code: 'user-center.button.users.delete',
    app_code: 'user-center',
    status: 1,
    resource_type: 'button',
    resource_code: 'users',
    action: 'delete',
    name: '用户中台删除用户',
    description: '已删除权限',
    create_by: 'system',
    create_time: '2026-04-09 10:00:00',
    update_by: 'system',
    update_time: '2026-04-09 10:00:00',
    delete_flag: 1,
    remark: null,
  },
  {
    id: 4,
    code: 'finance-core.menu.orders.view',
    app_code: 'finance-core',
    status: 1,
    resource_type: 'menu',
    resource_code: 'orders',
    action: 'view',
    name: '结算系统订单页',
    description: '其他项目启用权限',
    create_by: 'system',
    create_time: '2026-04-09 10:00:00',
    update_by: 'system',
    update_time: '2026-04-09 10:00:00',
    delete_flag: 0,
    remark: null,
  },
];

let app: Express;
let originalProjectRows: ProjectRow[] = [];
let originalPermissionRows: PermissionRow[] = [];

function getInitializedDataSource() {
  const dataSource = getDataSource();
  if (!dataSource?.isInitialized) {
    throw new Error('测试数据库尚未初始化');
  }

  return dataSource;
}

async function getProjectRows(): Promise<ProjectRow[]> {
  return getInitializedDataSource().query(
    `SELECT ${PROJECT_TABLE_COLUMNS} FROM ${PROJECT_TABLE_NAME} ORDER BY id ASC`,
  ) as Promise<ProjectRow[]>;
}

async function getPermissionRows(): Promise<PermissionRow[]> {
  return getInitializedDataSource().query(
    `SELECT ${PERMISSION_TABLE_COLUMNS} FROM ${PERMISSION_TABLE_NAME} ORDER BY id ASC`,
  ) as Promise<PermissionRow[]>;
}

async function clearTable(tableName: string) {
  await getInitializedDataSource().query(`DELETE FROM ${tableName}`);
}

async function insertProjectRows(rows: ProjectRow[]) {
  const dataSource = getInitializedDataSource();

  for (const row of rows) {
    await dataSource.query(
      `
        REPLACE INTO ${PROJECT_TABLE_NAME}
          (${PROJECT_TABLE_COLUMNS})
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        row.id,
        row.project_name,
        row.project_code,
        row.create_by,
        row.create_time,
        row.update_by,
        row.update_time,
        row.delete_flag,
        row.remark,
      ],
    );
  }
}

async function insertPermissionRows(rows: PermissionRow[]) {
  const dataSource = getInitializedDataSource();

  for (const row of rows) {
    await dataSource.query(
      `
        REPLACE INTO ${PERMISSION_TABLE_NAME}
          (${PERMISSION_TABLE_COLUMNS})
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        row.id,
        row.code,
        row.app_code,
        row.status,
        row.resource_type,
        row.resource_code,
        row.action,
        row.name,
        row.description,
        row.create_by,
        row.create_time,
        row.update_by,
        row.update_time,
        row.delete_flag,
        row.remark,
      ],
    );
  }
}

async function resetProjectAndPermissionSeeds() {
  await clearTable(PERMISSION_TABLE_NAME);
  await clearTable(PROJECT_TABLE_NAME);
  await insertProjectRows(PROJECT_SEED_ROWS);
  await insertPermissionRows(PERMISSION_SEED_ROWS);
}

beforeAll(async () => {
  await initDataBase();
  app = createApp();
  originalProjectRows = await getProjectRows();
  originalPermissionRows = await getPermissionRows();
});

beforeEach(async () => {
  process.env.JWT_ENABLED = 'false';
  await resetProjectAndPermissionSeeds();
});

afterAll(async () => {
  const dataSource = getDataSource();
  if (dataSource?.isInitialized) {
    await clearTable(PERMISSION_TABLE_NAME);
    await clearTable(PROJECT_TABLE_NAME);
    await insertProjectRows(originalProjectRows);
    await insertPermissionRows(originalPermissionRows);
    await dataSource.destroy();
  }

  process.env.JWT_ENABLED = 'false';
});

describe('project permission count integration', () => {
  it('GET /api/project/getProject excludes disabled and deleted permissions from permissionCount', async () => {
    const res = await request(app).get('/api/project/getProject');

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data).toEqual(
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({
            projectCode: 'user-center',
            permissionCount: 1,
          }),
          expect.objectContaining({
            projectCode: 'finance-core',
            permissionCount: 1,
          }),
        ]),
      }),
    );
  });
});
