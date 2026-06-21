import initDataBase, { getDataSource } from '../../utils/mysql.ts';
import { ADMIN_CONSOLE_PERMISSION_CODES } from '@super-pro/shared-types';
import { AdminMenuRepository } from '../../src/adminMenu/adminMenu.repository.ts';
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
  {
    name: 'sys_admin_menu',
    columns: [
      'id',
      'parent_id',
      'name',
      'short_title',
      'slug',
      'icon_key',
      'menu_type',
      'status',
      'sort',
      'description',
      'badge',
      'permission_code',
      'create_by',
      'create_time',
      'update_by',
      'update_time',
      'delete_flag',
      'remark',
    ],
  },
] as const;

const ROLE_PROJECT_TABLE = TABLE_CONFIGS[0];
const ROLE_PERMISSION_TABLE = TABLE_CONFIGS[1];
const ROLE_TABLE = TABLE_CONFIGS[3];
const PROJECT_TABLE = TABLE_CONFIGS[4];
const ADMIN_MENU_TABLE = TABLE_CONFIGS[5];

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

const EXISTING_ADMIN_GROUP_ROW = {
  id: 301,
  parent_id: null,
  name: '历史分组',
  short_title: '历史',
  slug: null,
  icon_key: 'layout-grid',
  menu_type: 'group',
  status: 1,
  sort: 7,
  description: 'keep existing group description',
  badge: 'Legacy',
  permission_code: '',
  create_by: 'tester',
  create_time: '2026-04-09 10:00:00',
  update_by: 'tester',
  update_time: '2026-04-09 10:00:00',
  delete_flag: 0,
  remark: 'keep existing group remark',
} as const;

const EXISTING_ADMIN_ITEM_ROW = {
  id: 302,
  parent_id: EXISTING_ADMIN_GROUP_ROW.id,
  name: '历史页面',
  short_title: '历史页',
  slug: 'legacy-page',
  icon_key: 'home',
  menu_type: 'item',
  status: 1,
  sort: 2,
  description: 'keep existing item description',
  badge: 'Custom',
  permission_code: 'legacy.page.view',
  create_by: 'tester',
  create_time: '2026-04-09 10:00:00',
  update_by: 'tester',
  update_time: '2026-04-09 10:00:00',
  delete_flag: 0,
  remark: 'keep existing item remark',
} as const;

const EXISTING_TODOS_ROW = {
  id: 303,
  parent_id: EXISTING_ADMIN_GROUP_ROW.id,
  name: '历史待办',
  short_title: '历史待办',
  slug: 'todos',
  icon_key: 'file-text',
  menu_type: 'item',
  status: 1,
  sort: 5,
  description: 'legacy todo description',
  badge: 'LegacyTodo',
  permission_code: 'legacy.todos.permission',
  create_by: 'tester',
  create_time: '2026-04-09 10:00:00',
  update_by: 'tester',
  update_time: '2026-04-09 10:00:00',
  delete_flag: 0,
  remark: 'keep todo structure',
} as const;

const EDITOR_LIKE_ROLE_ROW = {
  id: 201,
  code: 'ops.editor',
  name: '运维编辑',
  status: 1,
  description: 'editor-like role',
  create_by: 'tester',
  create_time: '2026-04-09 10:00:00',
  update_by: 'tester',
  update_time: '2026-04-09 10:00:00',
  delete_flag: 0,
  remark: 'custom editor role',
} as const;

const ADMIN_LIKE_ROLE_ROW = {
  id: 202,
  code: 'platform-admin-lite',
  name: '平台轻管',
  status: 1,
  description: 'admin-like role',
  create_by: 'tester',
  create_time: '2026-04-09 10:00:00',
  update_by: 'tester',
  update_time: '2026-04-09 10:00:00',
  delete_flag: 0,
  remark: 'custom admin role',
} as const;

const NAMED_ADMIN_ROLE_ROW = {
  id: 203,
  code: 'ops.viewer',
  name: '内容管理员',
  status: 1,
  description: 'role matched by name',
  create_by: 'tester',
  create_time: '2026-04-09 10:00:00',
  update_by: 'tester',
  update_time: '2026-04-09 10:00:00',
  delete_flag: 0,
  remark: 'custom manager role',
} as const;

const VIEWER_ROLE_ROW = {
  id: 204,
  code: 'ops.viewer.basic',
  name: '普通访客',
  status: 1,
  description: 'viewer role',
  create_by: 'tester',
  create_time: '2026-04-09 10:00:00',
  update_by: 'tester',
  update_time: '2026-04-09 10:00:00',
  delete_flag: 0,
  remark: 'custom viewer role',
} as const;

const TODO_PERMISSION_CODES = [
  ADMIN_CONSOLE_PERMISSION_CODES.todosMenuView,
  ADMIN_CONSOLE_PERMISSION_CODES.todoCreate,
  ADMIN_CONSOLE_PERMISSION_CODES.todoUpdate,
  ADMIN_CONSOLE_PERMISSION_CODES.todoDelete,
  ADMIN_CONSOLE_PERMISSION_CODES.todosApiRead,
  ADMIN_CONSOLE_PERMISSION_CODES.todosApiCreate,
  ADMIN_CONSOLE_PERMISSION_CODES.todosApiUpdate,
  ADMIN_CONSOLE_PERMISSION_CODES.todosApiDelete,
] as const;

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

  await replaceRows(PROJECT_TABLE.name, PROJECT_TABLE.columns, [
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

    const rows = await getTableRows(PROJECT_TABLE.name, PROJECT_TABLE.columns);
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

  it('auto-grants todo permissions to editor-like and admin-like custom roles only, and remains idempotent', async () => {
    await replaceRows(ROLE_TABLE.name, ROLE_TABLE.columns, [
      EDITOR_LIKE_ROLE_ROW,
      ADMIN_LIKE_ROLE_ROW,
      NAMED_ADMIN_ROLE_ROW,
      VIEWER_ROLE_ROW,
    ]);

    const repository = new AuthorizationRepository();

    await expect(repository.ensureSeedData()).resolves.toBeUndefined();

    const roles = await repository.listRoles();
    const roleIds = new Map(roles.map((role) => [role.code, role.id]));
    const permissionMap = await repository.getPermissionSummariesByRoleIdsMap([
      roleIds.get(EDITOR_LIKE_ROLE_ROW.code)!,
      roleIds.get(ADMIN_LIKE_ROLE_ROW.code)!,
      roleIds.get(NAMED_ADMIN_ROLE_ROW.code)!,
      roleIds.get(VIEWER_ROLE_ROW.code)!,
    ]);

    const editorPermissions = new Set(
      (permissionMap.get(roleIds.get(EDITOR_LIKE_ROLE_ROW.code)!) ?? []).map(
        (permission) => permission.code,
      ),
    );
    const adminPermissions = new Set(
      (permissionMap.get(roleIds.get(ADMIN_LIKE_ROLE_ROW.code)!) ?? []).map(
        (permission) => permission.code,
      ),
    );
    const namedAdminPermissions = new Set(
      (permissionMap.get(roleIds.get(NAMED_ADMIN_ROLE_ROW.code)!) ?? []).map(
        (permission) => permission.code,
      ),
    );
    const viewerPermissions = new Set(
      (permissionMap.get(roleIds.get(VIEWER_ROLE_ROW.code)!) ?? []).map(
        (permission) => permission.code,
      ),
    );

    TODO_PERMISSION_CODES.forEach((permissionCode) => {
      expect(editorPermissions.has(permissionCode)).toBe(true);
      expect(adminPermissions.has(permissionCode)).toBe(true);
      expect(namedAdminPermissions.has(permissionCode)).toBe(true);
      expect(viewerPermissions.has(permissionCode)).toBe(false);
    });

    const rolePermissionRowsBefore = await getTableRows(
      ROLE_PERMISSION_TABLE.name,
      ROLE_PERMISSION_TABLE.columns,
    );
    const editorRoleId = roleIds.get(EDITOR_LIKE_ROLE_ROW.code)!;
    const editorTodoAssignmentsBefore = rolePermissionRowsBefore.filter(
      (row) => row.role_id === editorRoleId,
    ).length;

    await expect(repository.ensureSeedData()).resolves.toBeUndefined();

    const rolePermissionRowsAfter = await getTableRows(
      ROLE_PERMISSION_TABLE.name,
      ROLE_PERMISSION_TABLE.columns,
    );
    const editorTodoAssignmentsAfter = rolePermissionRowsAfter.filter(
      (row) => row.role_id === editorRoleId,
    ).length;

    expect(editorTodoAssignmentsAfter).toBe(editorTodoAssignmentsBefore);
  });
});

describe('admin menu seed bootstrap', () => {
  it('backfills 应用 / 待办管理 for non-empty tables without overwriting existing menu fields', async () => {
    await replaceRows(ADMIN_MENU_TABLE.name, ADMIN_MENU_TABLE.columns, [
      EXISTING_ADMIN_GROUP_ROW,
      EXISTING_ADMIN_ITEM_ROW,
    ]);

    const repository = new AdminMenuRepository();

    await expect(repository.ensureInitialized()).resolves.toBeUndefined();

    const rows = await getTableRows(ADMIN_MENU_TABLE.name, ADMIN_MENU_TABLE.columns);
    const existingGroupRow = rows.find((row) => row.id === EXISTING_ADMIN_GROUP_ROW.id);
    const appGroupRow = rows.find((row) => row.name === '应用');
    const todosRow = rows.find((row) => row.slug === 'todos');

    expect(existingGroupRow).toEqual(
      expect.objectContaining({
        name: EXISTING_ADMIN_GROUP_ROW.name,
        sort: EXISTING_ADMIN_GROUP_ROW.sort,
        description: EXISTING_ADMIN_GROUP_ROW.description,
        badge: EXISTING_ADMIN_GROUP_ROW.badge,
        remark: EXISTING_ADMIN_GROUP_ROW.remark,
      }),
    );
    expect(appGroupRow).toEqual(
      expect.objectContaining({
        icon_key: 'sparkles',
        menu_type: 'group',
        delete_flag: 0,
      }),
    );
    expect(todosRow).toEqual(
      expect.objectContaining({
        parent_id: appGroupRow?.id,
        name: '待办管理',
        short_title: '待办',
        icon_key: 'file-text',
        permission_code: ADMIN_CONSOLE_PERMISSION_CODES.todosMenuView,
        delete_flag: 0,
      }),
    );
  });

  it('repairs existing todos permission code without moving the node, and remains idempotent', async () => {
    await replaceRows(ADMIN_MENU_TABLE.name, ADMIN_MENU_TABLE.columns, [
      EXISTING_ADMIN_GROUP_ROW,
      EXISTING_TODOS_ROW,
    ]);

    const repository = new AdminMenuRepository();

    await expect(repository.ensureInitialized()).resolves.toBeUndefined();

    const firstRows = await getTableRows(ADMIN_MENU_TABLE.name, ADMIN_MENU_TABLE.columns);
    const firstTodosRow = firstRows.find((row) => row.id === EXISTING_TODOS_ROW.id);

    expect(firstTodosRow).toEqual(
      expect.objectContaining({
        parent_id: EXISTING_TODOS_ROW.parent_id,
        sort: EXISTING_TODOS_ROW.sort,
        name: EXISTING_TODOS_ROW.name,
        description: EXISTING_TODOS_ROW.description,
        badge: EXISTING_TODOS_ROW.badge,
        remark: EXISTING_TODOS_ROW.remark,
        permission_code: ADMIN_CONSOLE_PERMISSION_CODES.todosMenuView,
      }),
    );

    await expect(repository.ensureInitialized()).resolves.toBeUndefined();

    const secondRows = await getTableRows(ADMIN_MENU_TABLE.name, ADMIN_MENU_TABLE.columns);

    expect(secondRows).toEqual(firstRows);
  });
});
