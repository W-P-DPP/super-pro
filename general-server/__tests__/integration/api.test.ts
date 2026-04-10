import { readFile, writeFile } from 'fs/promises';
import type { Express } from 'express';
import request from 'supertest';
import { createApp } from '../../app.ts';
import { initSiteMenuModule } from '../../src/siteMenu/siteMenu.repository.ts';
import { saveSiteMenuSource, siteMenuFilePath } from '../../src/siteMenu.ts';
import initDataBase, { getDataSource } from '../../utils/mysql.ts';

type SiteMenuRow = {
  id: number
  parent_id: number | null
  name: string
  path: string
  icon: string
  is_top: number
  sort: number
  create_by: string | null
  create_time: Date | string | null
  update_by: string | null
  update_time: Date | string | null
  remark: string | null
}

type UserRow = {
  id: number
  username: string
  nickname: string
  email: string
  phone: string
  status: number
  create_by: string | null
  create_time: Date | string | null
  update_by: string | null
  update_time: Date | string | null
  remark: string | null
}

const SITE_MENU_TABLE_NAME = 'sys_site_menu';
const SITE_MENU_TABLE_COLUMNS = [
  'id',
  'parent_id',
  'name',
  'path',
  'icon',
  'is_top',
  'sort',
  'create_by',
  'create_time',
  'update_by',
  'update_time',
  'remark',
].join(', ');

const USER_TABLE_NAME = 'sys_user';
const USER_TABLE_COLUMNS = [
  'id',
  'username',
  'nickname',
  'email',
  'phone',
  'status',
  'create_by',
  'create_time',
  'update_by',
  'update_time',
  'remark',
].join(', ');

const USER_SEED_ROWS: UserRow[] = [
  {
    id: 1,
    username: 'zhangsan',
    nickname: '张三',
    email: 'zhangsan@example.com',
    phone: '13800000001',
    status: 1,
    create_by: 'system',
    create_time: '2026-04-09 10:00:00',
    update_by: 'system',
    update_time: '2026-04-09 10:00:00',
    remark: '种子用户1',
  },
  {
    id: 2,
    username: 'lisi',
    nickname: '李四',
    email: 'lisi@example.com',
    phone: '13800000002',
    status: 1,
    create_by: 'system',
    create_time: '2026-04-09 10:00:00',
    update_by: 'system',
    update_time: '2026-04-09 10:00:00',
    remark: '种子用户2',
  },
];

let app: Express;
let originalSiteMenuRows: SiteMenuRow[] = [];
let originalUserRows: UserRow[] = [];
let originalSiteMenuFileContent = '';

async function getSiteMenuRows(): Promise<SiteMenuRow[]> {
  const dataSource = getDataSource();
  if (!dataSource?.isInitialized) {
    throw new Error('测试数据库尚未初始化');
  }

  return dataSource.query(
    `SELECT ${SITE_MENU_TABLE_COLUMNS} FROM ${SITE_MENU_TABLE_NAME} ORDER BY id ASC`,
  ) as Promise<SiteMenuRow[]>;
}

async function clearSiteMenuTable(): Promise<void> {
  const dataSource = getDataSource();
  if (!dataSource?.isInitialized) {
    throw new Error('测试数据库尚未初始化');
  }

  await dataSource.query(`DELETE FROM ${SITE_MENU_TABLE_NAME}`);
}

async function insertSiteMenuRows(rows: SiteMenuRow[]): Promise<void> {
  const dataSource = getDataSource();
  if (!dataSource?.isInitialized) {
    throw new Error('测试数据库尚未初始化');
  }

  for (const row of rows) {
    await dataSource.query(
      `
        REPLACE INTO ${SITE_MENU_TABLE_NAME}
          (${SITE_MENU_TABLE_COLUMNS})
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        row.id,
        row.parent_id,
        row.name,
        row.path,
        row.icon,
        row.is_top,
        row.sort,
        row.create_by,
        row.create_time,
        row.update_by,
        row.update_time,
        row.remark,
      ],
    );
  }
}

async function restoreOriginalSiteMenuRows(): Promise<void> {
  await clearSiteMenuTable();
  await insertSiteMenuRows(originalSiteMenuRows);
}

async function resetSiteMenuSeed(): Promise<void> {
  await clearSiteMenuTable();
  await initSiteMenuModule();
}

async function getUserRows(): Promise<UserRow[]> {
  const dataSource = getDataSource();
  if (!dataSource?.isInitialized) {
    throw new Error('测试数据库尚未初始化');
  }

  return dataSource.query(
    `SELECT ${USER_TABLE_COLUMNS} FROM ${USER_TABLE_NAME} ORDER BY id ASC`,
  ) as Promise<UserRow[]>;
}

async function clearUserTable(): Promise<void> {
  const dataSource = getDataSource();
  if (!dataSource?.isInitialized) {
    throw new Error('测试数据库尚未初始化');
  }

  await dataSource.query(`DELETE FROM ${USER_TABLE_NAME}`);
}

async function insertUserRows(rows: UserRow[]): Promise<void> {
  const dataSource = getDataSource();
  if (!dataSource?.isInitialized) {
    throw new Error('测试数据库尚未初始化');
  }

  for (const row of rows) {
    await dataSource.query(
      `
        REPLACE INTO ${USER_TABLE_NAME}
          (${USER_TABLE_COLUMNS})
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        row.id,
        row.username,
        row.nickname,
        row.email,
        row.phone,
        row.status,
        row.create_by,
        row.create_time,
        row.update_by,
        row.update_time,
        row.remark,
      ],
    );
  }
}

async function restoreOriginalUserRows(): Promise<void> {
  await clearUserTable();
  await insertUserRows(originalUserRows);
}

async function resetUserSeed(): Promise<void> {
  await clearUserTable();
  await insertUserRows(USER_SEED_ROWS);
}

beforeAll(async () => {
  await initDataBase();
  app = createApp();
  originalSiteMenuFileContent = await readFile(siteMenuFilePath, 'utf8');
  originalSiteMenuRows = await getSiteMenuRows();
  originalUserRows = await getUserRows();
});

beforeEach(async () => {
  await saveSiteMenuSource(JSON.parse(originalSiteMenuFileContent));
  await resetSiteMenuSeed();
  await resetUserSeed();
  process.env.JWT_ENABLED = 'false';
});

afterAll(async () => {
  await saveSiteMenuSource(JSON.parse(originalSiteMenuFileContent));
  await restoreOriginalSiteMenuRows();
  await restoreOriginalUserRows();
  process.env.JWT_ENABLED = 'false';
  const dataSource = getDataSource();
  if (dataSource?.isInitialized) {
    await dataSource.destroy();
  }
});

describe('siteMenu 查询接口', () => {
  it('GET /api/site-menu/getMenuConfig 应返回左上角应用图标配置', async () => {
    const res = await request(app).get('/api/site-menu/getMenuConfig');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      code: 200,
      msg: '获取菜单配置成功',
      data: {
        appIcon: '/public/icons/tools.png',
      },
    });
  });

  it('GET /api/site-menu/getMenu 应在表为空时自动导入并返回中文成功消息', async () => {
    await clearSiteMenuTable();

    const res = await request(app).get('/api/site-menu/getMenu');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      code: 200,
      msg: '获取菜单成功',
    });
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data[0]).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        name: expect.any(String),
        path: expect.any(String),
        icon: expect.any(String),
        isTop: expect.any(Boolean),
        sort: expect.any(Number),
        remark: '',
        children: expect.any(Array),
      }),
    );

    const rows = await getSiteMenuRows();
    expect(rows.length).toBeGreaterThan(0);
  });

  it('GET /api/site-menu/getMenu 与 GET /api/site-menu/getMenu/:id 应同时保持可用', async () => {
    const compatibleRes = await request(app).get('/api/site-menu/getMenu');
    const detailRes = await request(app).get('/api/site-menu/getMenu/3');

    expect(compatibleRes.status).toBe(200);
    expect(detailRes.status).toBe(200);
    expect(Array.isArray(compatibleRes.body.data)).toBe(true);
    expect(detailRes.body.data).toEqual(
      expect.objectContaining({
        id: 3,
        name: '工具',
      }),
    );
  });

  it('GET /api/site-menu/getMenu/:id 应返回指定菜单详情', async () => {
    const res = await request(app).get('/api/site-menu/getMenu/3');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      code: 200,
      msg: '获取菜单详情成功',
    });
    expect(res.body.data).toEqual(
      expect.objectContaining({
        id: 3,
        name: '工具',
        remark: '',
      }),
    );
  });

  it('GET /api/site-menu/getMenu 与 GET /api/site-menu/getMenu/:id 应返回菜单备注', async () => {
    const updateRes = await request(app).put('/api/site-menu/updateMenu/31').send({
      remark: '用于在线解析 JSON 文本',
    });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data).toEqual(
      expect.objectContaining({
        id: 31,
        remark: '用于在线解析 JSON 文本',
      }),
    );

    const listRes = await request(app).get('/api/site-menu/getMenu');
    const section = listRes.body.data.find((item: { id: number }) => item.id === 3);
    const menuItem = section.children.find((item: { id: number }) => item.id === 31);

    expect(menuItem).toEqual(
      expect.objectContaining({
        id: 31,
        remark: '用于在线解析 JSON 文本',
      }),
    );

    const detailRes = await request(app).get('/api/site-menu/getMenu/31');
    expect(detailRes.status).toBe(200);
    expect(detailRes.body.data).toEqual(
      expect.objectContaining({
        id: 31,
        remark: '用于在线解析 JSON 文本',
      }),
    );
  });
});

describe('siteMenu CRUD 接口', () => {
  it('POST /api/site-menu/createMenu 应新增顶级菜单', async () => {
    const res = await request(app).post('/api/site-menu/createMenu').send({
      parentId: null,
      name: '测试菜单',
      path: '/test-menu',
      icon: '/icons/test.svg',
    });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      code: 200,
      msg: '新增菜单成功',
    });
    expect(res.body.data).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        parentId: null,
        name: '测试菜单',
      }),
    );
  });

  it('POST /api/site-menu/createMenu 父级菜单不存在时应返回中文错误', async () => {
    const res = await request(app).post('/api/site-menu/createMenu').send({
      parentId: 99999,
      name: '测试子菜单',
      path: '/test-child',
      icon: '/icons/test.svg',
    });

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({
      code: 404,
      msg: '父级菜单不存在',
    });
  });

  it('PUT /api/site-menu/updateMenu/:id 应更新菜单', async () => {
    const res = await request(app).put('/api/site-menu/updateMenu/2').send({
      name: 'Git工具',
      path: '/git-tools',
    });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      code: 200,
      msg: '更新菜单成功',
    });
    expect(res.body.data).toEqual(
      expect.objectContaining({
        id: 2,
        name: 'Git工具',
        path: '/git-tools',
      }),
    );
  });

  it('DELETE /api/site-menu/deleteMenu/:id 应删除菜单及其子树', async () => {
    const res = await request(app).delete('/api/site-menu/deleteMenu/3');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      code: 200,
      msg: '删除菜单成功',
    });

    const listRes = await request(app).get('/api/site-menu/getMenu');
    const ids = listRes.body.data.flatMap((node: any) => [
      node.id,
      ...node.children.map((child: any) => child.id),
    ]);

    expect(ids).not.toContain(3);
    expect(ids).not.toContain(31);
    expect(ids).not.toContain(32);
  });
});

describe('siteMenu 文件上传导入接口', () => {
  it('POST /api/site-menu/uploadMenuFile 应导入菜单并同步更新数据源文件', async () => {
    const importedMenu = [
      {
        id: 100,
        name: '导入根菜单',
        path: '/import-root',
        icon: '/icons/import-root.svg',
        isTop: true,
        children: [
          {
            id: 101,
            name: '导入子菜单',
            path: '/import-child',
            icon: '/icons/import-child.svg',
          },
        ],
      },
    ];

    const res = await request(app)
      .post('/api/site-menu/uploadMenuFile')
      .attach('file', Buffer.from(JSON.stringify(importedMenu, null, 2), 'utf8'), {
        filename: 'siteMenu.json',
        contentType: 'application/json',
      });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      code: 200,
      msg: '上传菜单文件成功',
      data: [
        expect.objectContaining({
          id: 100,
          name: '导入根菜单',
          children: [
            expect.objectContaining({
              id: 101,
              name: '导入子菜单',
            }),
          ],
        }),
      ],
    });

    const listRes = await request(app).get('/api/site-menu/getMenu');
    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toEqual([
      expect.objectContaining({
        id: 100,
        name: '导入根菜单',
        children: [
          expect.objectContaining({
            id: 101,
            name: '导入子菜单',
          }),
        ],
      }),
    ]);

    const rows = await getSiteMenuRows();
    expect(rows.map((row) => row.id)).toEqual([100, 101]);

    const currentSiteMenuFileContent = await readFile(siteMenuFilePath, 'utf8');
    expect(JSON.parse(currentSiteMenuFileContent)).toEqual(importedMenu);
  });

  it('POST /api/site-menu/uploadMenuFile 未上传文件时应返回中文错误', async () => {
    const res = await request(app).post('/api/site-menu/uploadMenuFile');

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      code: 400,
      msg: '请上传菜单 JSON 文件',
    });
  });

  it('POST /api/site-menu/uploadMenuFile 上传非法 JSON 时应返回中文错误', async () => {
    const res = await request(app)
      .post('/api/site-menu/uploadMenuFile')
      .attach('file', Buffer.from('{', 'utf8'), {
        filename: 'siteMenu.json',
        contentType: 'application/json',
      });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      code: 400,
      msg: '菜单文件不是有效的 JSON 格式',
    });
  });

  it('POST /api/site-menu/uploadMenuFile 上传非法节点结构时应返回中文错误', async () => {
    const res = await request(app)
      .post('/api/site-menu/uploadMenuFile')
      .attach(
        'file',
        Buffer.from(
          JSON.stringify([
            {
              id: 100,
              path: '/broken',
              icon: '/icons/broken.svg',
            },
          ]),
          'utf8',
        ),
        {
          filename: 'siteMenu.json',
          contentType: 'application/json',
        },
      );

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      code: 400,
      msg: '菜单文件字段 name 必须是字符串',
    });
  });
});

describe('user CRUD 接口', () => {
  it('GET /api/user/getUser 应返回用户列表', async () => {
    const res = await request(app).get('/api/user/getUser');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      code: 200,
      msg: '获取用户列表成功',
    });
    expect(res.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 1,
          username: 'zhangsan',
        }),
      ]),
    );
  });

  it('GET /api/user/getUser/:id 应返回用户详情', async () => {
    const res = await request(app).get('/api/user/getUser/1');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      code: 200,
      msg: '获取用户详情成功',
    });
    expect(res.body.data).toEqual(
      expect.objectContaining({
        id: 1,
        username: 'zhangsan',
        nickname: '张三',
      }),
    );
  });

  it('POST /api/user/createUser 应新增用户', async () => {
    const res = await request(app).post('/api/user/createUser').send({
      username: 'wangwu',
      nickname: '王五',
      email: 'wangwu@example.com',
      phone: '13800000003',
      status: 1,
    });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      code: 200,
      msg: '新增用户成功',
    });
    expect(res.body.data).toEqual(
      expect.objectContaining({
        username: 'wangwu',
        nickname: '王五',
      }),
    );
  });

  it('PUT /api/user/updateUser/:id 应更新用户', async () => {
    const res = await request(app).put('/api/user/updateUser/1').send({
      nickname: '张三丰',
      phone: '13900000001',
      status: 0,
    });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      code: 200,
      msg: '更新用户成功',
    });
    expect(res.body.data).toEqual(
      expect.objectContaining({
        id: 1,
        nickname: '张三丰',
        phone: '13900000001',
        status: 0,
      }),
    );
  });

  it('DELETE /api/user/deleteUser/:id 应删除用户', async () => {
    const res = await request(app).delete('/api/user/deleteUser/1');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      code: 200,
      msg: '删除用户成功',
    });

    const listRes = await request(app).get('/api/user/getUser');
    const ids = (listRes.body.data as Array<{ id: number }>).map((item) => item.id);
    expect(ids).not.toContain(1);
  });

  it('GET /api/user/getUser/:id 查询不存在用户时应返回中文错误', async () => {
    const res = await request(app).get('/api/user/getUser/99999');

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({
      code: 404,
      msg: '用户不存在',
    });
  });

  it('PUT /api/user/updateUser/:id 更新不存在用户时应返回中文错误', async () => {
    const res = await request(app).put('/api/user/updateUser/99999').send({
      nickname: '不存在',
    });

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({
      code: 404,
      msg: '用户不存在',
    });
  });

  it('DELETE /api/user/deleteUser/:id 删除不存在用户时应返回中文错误', async () => {
    const res = await request(app).delete('/api/user/deleteUser/99999');

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({
      code: 404,
      msg: '用户不存在',
    });
  });
});

describe('JWT 中间件（中文返回）', () => {
  beforeEach(() => {
    process.env.JWT_ENABLED = 'true';
  });

  afterEach(() => {
    process.env.JWT_ENABLED = 'false';
  });

  it('无 token 应返回中文错误', async () => {
    const res = await request(app).get('/api/site-menu/getMenu');

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({
      code: 401,
      msg: '缺少授权信息或授权格式错误',
    });
  });

  it('token 格式错误应返回中文错误', async () => {
    const res = await request(app)
      .get('/api/site-menu/getMenu')
      .set('Authorization', 'InvalidToken');

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({
      code: 401,
      msg: '缺少授权信息或授权格式错误',
    });
  });

  it('有效 token 应保持查询成功', async () => {
    const { generateToken } = await import('../../utils/middleware/jwtMiddleware.ts');
    const token = generateToken({ userId: 1 });
    const res = await request(app)
      .get('/api/site-menu/getMenu')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      code: 200,
      msg: '获取菜单成功',
    });
  });
});
