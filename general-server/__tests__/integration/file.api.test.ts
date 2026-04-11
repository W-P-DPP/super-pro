import { mkdtemp, mkdir, readdir, readFile, rm, stat, writeFile } from 'fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { Express } from 'express';
import request from 'supertest';
import { createApp } from '../../app.ts';

type TestContext = {
  sandboxRoot: string
  fileRoot: string
  rubbishRoot: string
}

async function createTestContext(prefix: string): Promise<TestContext> {
  const sandboxRoot = await mkdtemp(path.join(os.tmpdir(), prefix));
  const fileRoot = path.join(sandboxRoot, 'file');
  const rubbishRoot = path.join(sandboxRoot, 'rubbish');

  await mkdir(fileRoot, { recursive: true });
  await mkdir(rubbishRoot, { recursive: true });

  process.env.FILE_ROOT_PATH = fileRoot;
  process.env.RUBBISH_ROOT_PATH = rubbishRoot;
  process.env.JWT_ENABLED = 'false';

  return {
    sandboxRoot,
    fileRoot,
    rubbishRoot,
  };
}

describe('file 文件服务接口', () => {
  let context: TestContext;
  let app: Express;

  beforeEach(async () => {
    context = await createTestContext('file-service-api-');
    app = createApp();
  });

  afterEach(async () => {
    delete process.env.FILE_ROOT_PATH;
    delete process.env.RUBBISH_ROOT_PATH;
    process.env.JWT_ENABLED = 'false';
    await rm(context.sandboxRoot, { recursive: true, force: true });
  });

  it('GET /api/file/tree 应返回 file 目录树', async () => {
    await mkdir(path.join(context.fileRoot, 'docs'));
    await writeFile(path.join(context.fileRoot, 'docs', 'guide.md'), '# guide');
    await writeFile(path.join(context.fileRoot, 'readme.txt'), 'hello');

    const res = await request(app).get('/api/file/tree');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      code: 200,
      msg: '获取文件树成功',
      data: [
        expect.objectContaining({
          name: 'docs',
          relativePath: '/docs',
          type: 'folder',
          children: [
            expect.objectContaining({
              name: 'guide.md',
              relativePath: '/docs/guide.md',
              type: 'file',
            }),
          ],
        }),
        expect.objectContaining({
          name: 'readme.txt',
          relativePath: '/readme.txt',
          type: 'file',
        }),
      ],
    });
  });

  it('POST /api/file/folder 应创建文件夹', async () => {
    const res = await request(app).post('/api/file/folder').send({
      parentPath: '/',
      folderName: 'assets',
    });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      code: 200,
      msg: '创建文件夹成功',
      data: expect.objectContaining({
        name: 'assets',
        relativePath: '/assets',
        type: 'folder',
      }),
    });

    const createdStats = await stat(path.join(context.fileRoot, 'assets'));
    expect(createdStats.isDirectory()).toBe(true);
  });

  it('POST /api/file/upload 应上传文件到指定目录', async () => {
    await mkdir(path.join(context.fileRoot, 'docs'));

    const res = await request(app)
      .post('/api/file/upload')
      .field('targetPath', '/docs')
      .attach('file', Buffer.from('hello file', 'utf8'), {
        filename: 'hello.txt',
        contentType: 'text/plain',
      });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      code: 200,
      msg: '上传文件成功',
      data: expect.objectContaining({
        name: 'hello.txt',
        relativePath: '/docs/hello.txt',
        type: 'file',
      }),
    });

    const fileContent = await readFile(path.join(context.fileRoot, 'docs', 'hello.txt'), 'utf8');
    expect(fileContent).toBe('hello file');
  });

  it('DELETE /api/file 应将文件移动到 rubbish', async () => {
    await mkdir(path.join(context.fileRoot, 'docs'));
    await writeFile(path.join(context.fileRoot, 'docs', 'old.txt'), 'old');

    const res = await request(app).delete('/api/file').send({
      targetPath: '/docs/old.txt',
    });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      code: 200,
      msg: '删除文件成功',
      data: expect.objectContaining({
        name: 'old.txt',
        relativePath: '/docs/old.txt',
        type: 'file',
      }),
    });

    const buckets = await readdir(context.rubbishRoot);
    expect(buckets).toHaveLength(1);

    const rubbishFilePath = path.join(context.rubbishRoot, buckets[0], 'docs', 'old.txt');
    const movedStats = await stat(rubbishFilePath);
    expect(movedStats.isFile()).toBe(true);
  });
});
