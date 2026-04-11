import { mkdtemp, mkdir, readdir, readFile, rm, stat, writeFile } from 'fs/promises'
import os from 'node:os'
import path from 'node:path'
import { FileBusinessError, FileService } from '../../src/file/file.service.ts'
import { FileRepository } from '../../src/file/file.repository.ts'

type TestContext = {
  sandboxRoot: string
  fileRoot: string
  rubbishRoot: string
  chunkRoot: string
}

const macosChineseFilename = '\u6d4b\u8bd5.txt'

function createMojibakeFilename(value: string): string {
  return Buffer.from(value, 'utf8').toString('latin1')
}

async function createTestContext(prefix: string): Promise<TestContext> {
  const sandboxRoot = await mkdtemp(path.join(os.tmpdir(), prefix))
  const fileRoot = path.join(sandboxRoot, 'file')
  const rubbishRoot = path.join(sandboxRoot, 'rubbish')
  const chunkRoot = path.join(sandboxRoot, 'chunk')

  await mkdir(fileRoot, { recursive: true })
  await mkdir(rubbishRoot, { recursive: true })
  await mkdir(chunkRoot, { recursive: true })

  process.env.FILE_ROOT_PATH = fileRoot
  process.env.RUBBISH_ROOT_PATH = rubbishRoot
  process.env.FILE_UPLOAD_CHUNK_ROOT_PATH = chunkRoot

  return {
    sandboxRoot,
    fileRoot,
    rubbishRoot,
    chunkRoot,
  }
}

describe('FileService', () => {
  let context: TestContext | null = null

  afterEach(async () => {
    delete process.env.FILE_ROOT_PATH
    delete process.env.RUBBISH_ROOT_PATH
    delete process.env.FILE_UPLOAD_CHUNK_ROOT_PATH

    if (context) {
      await rm(context.sandboxRoot, { recursive: true, force: true })
      context = null
    }
  })

  it('路径越界时应返回中文错误', async () => {
    context = await createTestContext('file-service-unit-')
    const service = new FileService(new FileRepository())

    await expect(
      service.createFolder({
        parentPath: '/../outside',
        folderName: 'docs',
      }),
    ).rejects.toMatchObject<Partial<FileBusinessError>>({
      message: '目标路径超出 file 根目录范围',
    })
  })

  it('创建已存在同名文件夹时应拒绝覆盖', async () => {
    context = await createTestContext('file-service-unit-')
    const service = new FileService(new FileRepository())

    await mkdir(path.join(context.fileRoot, 'docs'))

    await expect(
      service.createFolder({
        parentPath: '/',
        folderName: 'docs',
      }),
    ).rejects.toMatchObject<Partial<FileBusinessError>>({
      message: '同级目录下已存在同名文件或文件夹',
    })
  })

  it('上传到不存在目录时应返回中文错误', async () => {
    context = await createTestContext('file-service-unit-')
    const service = new FileService(new FileRepository())

    await expect(
      service.uploadFiles(
        {
          targetPath: '/missing',
        },
        [
          {
            originalname: 'readme.txt',
            buffer: Buffer.from('hello', 'utf8'),
            size: 5,
          },
        ],
      ),
    ).rejects.toMatchObject<Partial<FileBusinessError>>({
      message: '上传目标目录不存在',
    })
  })

  it('应保留已正确解码的中文文件名', async () => {
    context = await createTestContext('file-service-unit-')
    const service = new FileService(new FileRepository())

    await mkdir(path.join(context.fileRoot, 'docs'))

    const saved = await service.uploadFiles(
      {
        targetPath: '/docs',
      },
      [
        {
          originalname: macosChineseFilename,
          buffer: Buffer.from('hello', 'utf8'),
          size: 5,
        },
      ],
    )

    expect(saved).toMatchObject({
      targetPath: '/docs',
      uploadedCount: 1,
      uploaded: [
        expect.objectContaining({
          name: macosChineseFilename,
          relativePath: `/docs/${macosChineseFilename}`,
          type: 'file',
        }),
      ],
    })

    const uploadedStats = await stat(path.join(context.fileRoot, 'docs', macosChineseFilename))
    expect(uploadedStats.isFile()).toBe(true)
  })

  it('应在保存前恢复 macOS 中文乱码文件名', async () => {
    context = await createTestContext('file-service-unit-')
    const service = new FileService(new FileRepository())

    await mkdir(path.join(context.fileRoot, 'docs'))

    const saved = await service.uploadFiles(
      {
        targetPath: '/docs',
      },
      [
        {
          originalname: createMojibakeFilename(macosChineseFilename),
          buffer: Buffer.from('hello', 'utf8'),
          size: 5,
        },
      ],
    )

    expect(saved.uploaded).toEqual([
      expect.objectContaining({
        name: macosChineseFilename,
        relativePath: `/docs/${macosChineseFilename}`,
        type: 'file',
      }),
    ])

    const uploadedStats = await stat(path.join(context.fileRoot, 'docs', macosChineseFilename))
    expect(uploadedStats.isFile()).toBe(true)
  })

  it('应支持批量文件上传', async () => {
    context = await createTestContext('file-service-unit-')
    const service = new FileService(new FileRepository())

    await mkdir(path.join(context.fileRoot, 'docs'))

    const saved = await service.uploadFiles(
      {
        targetPath: '/docs',
        relativePaths: ['alpha.txt', 'beta.txt'],
      },
      [
        {
          originalname: 'alpha.txt',
          buffer: Buffer.from('alpha', 'utf8'),
          size: 5,
        },
        {
          originalname: 'beta.txt',
          buffer: Buffer.from('beta', 'utf8'),
          size: 4,
        },
      ],
    )

    expect(saved.uploadedCount).toBe(2)
    expect(saved.uploaded).toEqual([
      expect.objectContaining({
        name: 'alpha.txt',
        relativePath: '/docs/alpha.txt',
      }),
      expect.objectContaining({
        name: 'beta.txt',
        relativePath: '/docs/beta.txt',
      }),
    ])

    expect(await readFile(path.join(context.fileRoot, 'docs', 'alpha.txt'), 'utf8')).toBe('alpha')
    expect(await readFile(path.join(context.fileRoot, 'docs', 'beta.txt'), 'utf8')).toBe('beta')
  })

  it('应支持按相对路径上传文件夹结构', async () => {
    context = await createTestContext('file-service-unit-')
    const service = new FileService(new FileRepository())

    await mkdir(path.join(context.fileRoot, 'docs'))

    const saved = await service.uploadFiles(
      {
        targetPath: '/docs',
        relativePaths: ['assets/readme.txt', 'assets/images/logo.svg'],
      },
      [
        {
          originalname: 'readme.txt',
          buffer: Buffer.from('doc', 'utf8'),
          size: 3,
        },
        {
          originalname: 'logo.svg',
          buffer: Buffer.from('<svg />', 'utf8'),
          size: 7,
        },
      ],
    )

    expect(saved.uploadedCount).toBe(2)
    expect(await readFile(path.join(context.fileRoot, 'docs', 'assets', 'readme.txt'), 'utf8')).toBe('doc')
    expect(await readFile(path.join(context.fileRoot, 'docs', 'assets', 'images', 'logo.svg'), 'utf8')).toBe('<svg />')
  })

  it('批量上传遇到冲突时应整批拒绝且不写入任何文件', async () => {
    context = await createTestContext('file-service-unit-')
    const service = new FileService(new FileRepository())

    await mkdir(path.join(context.fileRoot, 'docs'))
    await writeFile(path.join(context.fileRoot, 'docs', 'alpha.txt'), 'old')

    await expect(
      service.uploadFiles(
        {
          targetPath: '/docs',
          relativePaths: ['alpha.txt', 'beta.txt'],
        },
        [
          {
            originalname: 'alpha.txt',
            buffer: Buffer.from('new-alpha', 'utf8'),
            size: 9,
          },
          {
            originalname: 'beta.txt',
            buffer: Buffer.from('beta', 'utf8'),
            size: 4,
          },
        ],
      ),
    ).rejects.toMatchObject<Partial<FileBusinessError>>({
      message: '目标目录下已存在同名文件或文件夹',
    })

    expect(await readFile(path.join(context.fileRoot, 'docs', 'alpha.txt'), 'utf8')).toBe('old')
    await expect(stat(path.join(context.fileRoot, 'docs', 'beta.txt'))).rejects.toBeTruthy()
  })

  it('上传相对路径越界时应整批拒绝', async () => {
    context = await createTestContext('file-service-unit-')
    const service = new FileService(new FileRepository())

    await mkdir(path.join(context.fileRoot, 'docs'))

    await expect(
      service.uploadFiles(
        {
          targetPath: '/docs',
          relativePaths: ['../escape.txt'],
        },
        [
          {
            originalname: 'escape.txt',
            buffer: Buffer.from('escape', 'utf8'),
            size: 6,
          },
        ],
      ),
    ).rejects.toMatchObject<Partial<FileBusinessError>>({
      message: '上传相对路径不合法',
    })
  })

  it('应支持将文件移动到其他文件夹', async () => {
    context = await createTestContext('file-service-unit-')
    const service = new FileService(new FileRepository())

    await mkdir(path.join(context.fileRoot, 'docs'))
    await mkdir(path.join(context.fileRoot, 'archive'))
    await writeFile(path.join(context.fileRoot, 'docs', 'report.md'), '# report')

    const moved = await service.moveTarget({
      sourcePath: '/docs/report.md',
      destinationPath: '/archive',
    })

    expect(moved).toEqual(
      expect.objectContaining({
        name: 'report.md',
        relativePath: '/archive/report.md',
        type: 'file',
      }),
    )
    expect(await readFile(path.join(context.fileRoot, 'archive', 'report.md'), 'utf8')).toBe('# report')
    await expect(stat(path.join(context.fileRoot, 'docs', 'report.md'))).rejects.toBeTruthy()
  })

  it('移动根目录时应被拒绝', async () => {
    context = await createTestContext('file-service-unit-')
    const service = new FileService(new FileRepository())

    await mkdir(path.join(context.fileRoot, 'archive'))

    await expect(
      service.moveTarget({
        sourcePath: '/',
        destinationPath: '/archive',
      }),
    ).rejects.toMatchObject<Partial<FileBusinessError>>({
      message: '不允许移动 file 根目录',
    })
  })

  it('应拒绝将文件夹移动到自身子目录中', async () => {
    context = await createTestContext('file-service-unit-')
    const service = new FileService(new FileRepository())

    await mkdir(path.join(context.fileRoot, 'docs', 'nested'), { recursive: true })

    await expect(
      service.moveTarget({
        sourcePath: '/docs',
        destinationPath: '/docs/nested',
      }),
    ).rejects.toMatchObject<Partial<FileBusinessError>>({
      message: '不允许将文件夹移动到自身或其子目录中',
    })
  })

  it('移动到存在同名文件的目录时应拒绝', async () => {
    context = await createTestContext('file-service-unit-')
    const service = new FileService(new FileRepository())

    await mkdir(path.join(context.fileRoot, 'docs'))
    await mkdir(path.join(context.fileRoot, 'archive'))
    await writeFile(path.join(context.fileRoot, 'docs', 'report.md'), '# old')
    await writeFile(path.join(context.fileRoot, 'archive', 'report.md'), '# exists')

    await expect(
      service.moveTarget({
        sourcePath: '/docs/report.md',
        destinationPath: '/archive',
      }),
    ).rejects.toMatchObject<Partial<FileBusinessError>>({
      message: '目标文件夹下已存在同名文件或文件夹',
    })
  })

  it('应支持受控读取预览文件', async () => {
    context = await createTestContext('file-service-unit-')
    const service = new FileService(new FileRepository())

    await mkdir(path.join(context.fileRoot, 'docs'))
    await writeFile(path.join(context.fileRoot, 'docs', 'guide.md'), '# guide')

    const preview = await service.getPreviewFile({
      targetPath: '/docs/guide.md',
    })

    expect(preview).toMatchObject({
      name: 'guide.md',
      relativePath: '/docs/guide.md',
      mimeType: 'text/markdown; charset=utf-8',
    })
    expect(preview.absolutePath).toBe(path.join(context.fileRoot, 'docs', 'guide.md'))
  })

  it('预览路径越界时应被拒绝', async () => {
    context = await createTestContext('file-service-unit-')
    const service = new FileService(new FileRepository())

    await expect(
      service.getPreviewFile({
        targetPath: '/../outside.txt',
      }),
    ).rejects.toMatchObject<Partial<FileBusinessError>>({
      message: '目标路径超出 file 根目录范围',
    })
  })

  it('删除根目录时应被拒绝', async () => {
    context = await createTestContext('file-service-unit-')
    const service = new FileService(new FileRepository())

    await expect(
      service.deleteTarget({
        targetPath: '/',
      }),
    ).rejects.toMatchObject<Partial<FileBusinessError>>({
      message: '不允许删除 file 根目录',
    })
  })

  it('删除文件时应移动到 rubbish 并保留原路径', async () => {
    context = await createTestContext('file-service-unit-')
    const service = new FileService(new FileRepository())
    const docsPath = path.join(context.fileRoot, 'docs')
    const filePath = path.join(docsPath, 'report.txt')

    await mkdir(docsPath)
    await writeFile(filePath, 'report')

    const deleted = await service.deleteTarget({
      targetPath: '/docs/report.txt',
    })

    expect(deleted).toEqual(
      expect.objectContaining({
        name: 'report.txt',
        relativePath: '/docs/report.txt',
        type: 'file',
      }),
    )

    const rubbishBuckets = await readdir(context.rubbishRoot)
    expect(rubbishBuckets).toHaveLength(1)

    const rubbishFilePath = path.join(context.rubbishRoot, rubbishBuckets[0], 'docs', 'report.txt')
    const movedFileStats = await stat(rubbishFilePath)
    expect(movedFileStats.isFile()).toBe(true)
  })

  it('should support chunk upload and merge into one file', async () => {
    context = await createTestContext('file-service-unit-')
    const service = new FileService(new FileRepository())

    await mkdir(path.join(context.fileRoot, 'docs'))

    const uploadId = 'chunk-service-success'

    const firstProgress = await service.uploadFileChunk(
      {
        targetPath: '/docs',
        relativePath: 'movie.bin',
        uploadId,
        chunkIndex: 0,
        totalChunks: 2,
      },
      {
        originalname: 'movie.bin.part0',
        buffer: Buffer.from('hello ', 'utf8'),
        size: 6,
      },
    )

    expect(firstProgress).toEqual({
      uploadId,
      chunkIndex: 0,
      receivedChunks: 1,
      totalChunks: 2,
    })

    await service.uploadFileChunk(
      {
        targetPath: '/docs',
        relativePath: 'movie.bin',
        uploadId,
        chunkIndex: 1,
        totalChunks: 2,
      },
      {
        originalname: 'movie.bin.part1',
        buffer: Buffer.from('world', 'utf8'),
        size: 5,
      },
    )

    const saved = await service.completeChunkUpload({
      targetPath: '/docs',
      relativePath: 'movie.bin',
      uploadId,
      totalChunks: 2,
    })

    expect(saved).toMatchObject({
      targetPath: '/docs',
      uploadedCount: 1,
      uploaded: [
        expect.objectContaining({
          name: 'movie.bin',
          relativePath: '/docs/movie.bin',
        }),
      ],
    })
    expect(await readFile(path.join(context.fileRoot, 'docs', 'movie.bin'), 'utf8')).toBe('hello world')
  })

  it('should reject out-of-order chunk upload', async () => {
    context = await createTestContext('file-service-unit-')
    const service = new FileService(new FileRepository())

    await mkdir(path.join(context.fileRoot, 'docs'))

    await expect(
      service.uploadFileChunk(
        {
          targetPath: '/docs',
          relativePath: 'movie.bin',
          uploadId: 'chunk-service-invalid-order',
          chunkIndex: 1,
          totalChunks: 2,
        },
        {
          originalname: 'movie.bin.part1',
          buffer: Buffer.from('world', 'utf8'),
          size: 5,
        },
      ),
    ).rejects.toMatchObject<Partial<FileBusinessError>>({
      statusCode: 400,
    })
  })
})
