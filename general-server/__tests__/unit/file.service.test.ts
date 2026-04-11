import { mkdtemp, mkdir, readdir, rm, stat, writeFile } from 'fs/promises';
import os from 'node:os';
import path from 'node:path';
import { FileService, FileBusinessError } from '../../src/file/file.service.ts';
import { FileRepository } from '../../src/file/file.repository.ts';

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

  return {
    sandboxRoot,
    fileRoot,
    rubbishRoot,
  };
}

describe('FileService', () => {
  let context: TestContext | null = null;

  afterEach(async () => {
    delete process.env.FILE_ROOT_PATH;
    delete process.env.RUBBISH_ROOT_PATH;

    if (context) {
      await rm(context.sandboxRoot, { recursive: true, force: true });
      context = null;
    }
  });

  it('路径越界时应返回中文错误', async () => {
    context = await createTestContext('file-service-unit-');
    const service = new FileService(new FileRepository());

    await expect(
      service.createFolder({
        parentPath: '/../outside',
        folderName: 'docs',
      }),
    ).rejects.toMatchObject<Partial<FileBusinessError>>({
      message: '目标路径超出 file 根目录范围',
    });
  });

  it('创建已存在同名文件夹时应拒绝覆盖', async () => {
    context = await createTestContext('file-service-unit-');
    const service = new FileService(new FileRepository());

    await mkdir(path.join(context.fileRoot, 'docs'));

    await expect(
      service.createFolder({
        parentPath: '/',
        folderName: 'docs',
      }),
    ).rejects.toMatchObject<Partial<FileBusinessError>>({
      message: '同级目录下已存在同名文件或文件夹',
    });
  });

  it('上传到不存在目录时应返回中文错误', async () => {
    context = await createTestContext('file-service-unit-');
    const service = new FileService(new FileRepository());

    await expect(
      service.uploadFile(
        {
          targetPath: '/missing',
        },
        {
          originalname: 'readme.txt',
          buffer: Buffer.from('hello', 'utf8'),
          size: 5,
        },
      ),
    ).rejects.toMatchObject<Partial<FileBusinessError>>({
      message: '上传目标目录不存在',
    });
  });

  it('上传同名文件时应拒绝覆盖', async () => {
    context = await createTestContext('file-service-unit-');
    const service = new FileService(new FileRepository());

    await mkdir(path.join(context.fileRoot, 'docs'));
    await writeFile(path.join(context.fileRoot, 'docs', 'readme.txt'), 'old');

    await expect(
      service.uploadFile(
        {
          targetPath: '/docs',
        },
        {
          originalname: 'readme.txt',
          buffer: Buffer.from('new', 'utf8'),
          size: 3,
        },
      ),
    ).rejects.toMatchObject<Partial<FileBusinessError>>({
      message: '目标目录下已存在同名文件或文件夹',
    });
  });

  it('删除根目录时应被拒绝', async () => {
    context = await createTestContext('file-service-unit-');
    const service = new FileService(new FileRepository());

    await expect(
      service.deleteTarget({
        targetPath: '/',
      }),
    ).rejects.toMatchObject<Partial<FileBusinessError>>({
      message: '不允许删除 file 根目录',
    });
  });

  it('删除文件时应移动到 rubbish 并保留原路径', async () => {
    context = await createTestContext('file-service-unit-');
    const service = new FileService(new FileRepository());
    const docsPath = path.join(context.fileRoot, 'docs');
    const filePath = path.join(docsPath, 'report.txt');

    await mkdir(docsPath);
    await writeFile(filePath, 'report');

    const deleted = await service.deleteTarget({
      targetPath: '/docs/report.txt',
    });

    expect(deleted).toEqual(
      expect.objectContaining({
        name: 'report.txt',
        relativePath: '/docs/report.txt',
        type: 'file',
      }),
    );

    const rubbishBuckets = await readdir(context.rubbishRoot);
    expect(rubbishBuckets).toHaveLength(1);

    const rubbishFilePath = path.join(context.rubbishRoot, rubbishBuckets[0], 'docs', 'report.txt');
    const movedFileStats = await stat(rubbishFilePath);
    expect(movedFileStats.isFile()).toBe(true);
  });
});
