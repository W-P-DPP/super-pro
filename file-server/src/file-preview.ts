import type { FileNode } from './file-tree'

export type PreviewKind =
  | 'markdown'
  | 'text'
  | 'image'
  | 'audio'
  | 'video'
  | 'pdf'
  | 'docx'
  | 'spreadsheet'
  | 'unsupported'

const markdownExtensions = new Set(['.md', '.markdown'])
const textExtensions = new Set([
  '.txt',
  '.json',
  '.xml',
  '.csv',
  '.log',
  '.yml',
  '.yaml',
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.css',
  '.html',
  '.htm',
])
const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg'])
const audioExtensions = new Set(['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'])
const videoExtensions = new Set(['.mp4', '.webm', '.mov', '.avi', '.mkv'])
const spreadsheetExtensions = new Set(['.xlsx', '.xls'])

const previewSizeLimitMap: Record<Exclude<PreviewKind, 'unsupported'>, number> = {
  markdown: 2 * 1024 * 1024,
  text: 2 * 1024 * 1024,
  image: 32 * 1024 * 1024,
  audio: 64 * 1024 * 1024,
  video: 96 * 1024 * 1024,
  pdf: 64 * 1024 * 1024,
  docx: 12 * 1024 * 1024,
  spreadsheet: 12 * 1024 * 1024,
}

export function getFileExtension(filename: string): string {
  const dotIndex = filename.lastIndexOf('.')
  return dotIndex >= 0 ? filename.slice(dotIndex).toLowerCase() : ''
}

export function getPreviewKind(node: FileNode): PreviewKind {
  const extension = getFileExtension(node.name)
  if (markdownExtensions.has(extension)) {
    return 'markdown'
  }

  if (textExtensions.has(extension)) {
    return 'text'
  }

  if (imageExtensions.has(extension)) {
    return 'image'
  }

  if (audioExtensions.has(extension)) {
    return 'audio'
  }

  if (videoExtensions.has(extension)) {
    return 'video'
  }

  if (extension === '.pdf') {
    return 'pdf'
  }

  if (extension === '.docx') {
    return 'docx'
  }

  if (spreadsheetExtensions.has(extension)) {
    return 'spreadsheet'
  }

  return 'unsupported'
}

export function getPreviewTooLargeMessage(node: FileNode, kind: PreviewKind): string | null {
  if (kind === 'unsupported') {
    return null
  }

  const size = node.size ?? 0
  const limit = previewSizeLimitMap[kind]
  if (size <= limit) {
    return null
  }

  return '当前文件体积较大，已关闭在线预览，请下载后查看。'
}

export function createMovedPath(sourcePath: string, destinationPath: string): string {
  const name = sourcePath.split('/').filter(Boolean).at(-1) ?? ''
  if (!name) {
    return destinationPath
  }

  return destinationPath === '/' ? `/${name}` : `${destinationPath}/${name}`
}
