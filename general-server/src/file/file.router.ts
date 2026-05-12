import express, { type Router } from 'express'
import multer from 'multer'
import { FILE_SERVER_PERMISSION_CODES } from '@super-pro/shared-types'
import {
  loadAuthenticatedPrincipal,
  requirePermission,
} from '../authorization/authorization.middleware.ts'
import {
  completeChunkUploadBatch,
  completeChunkUpload,
  createFolder,
  deleteFile,
  downloadFile,
  getFileTree,
  moveFile,
  previewFile,
  uploadFile,
  uploadFileChunk,
} from './file.controller.ts'

const fileRouter: Router = express.Router()
const uploadFileBatch = multer({
  storage: multer.memoryStorage(),
})
const uploadChunkPayload = multer({
  storage: multer.memoryStorage(),
})

fileRouter.use(loadAuthenticatedPrincipal)

fileRouter.get(
  '/tree',
  requirePermission(FILE_SERVER_PERMISSION_CODES.treeRead, '当前用户没有文件树查看权限'),
  getFileTree,
)
fileRouter.get(
  '/download',
  requirePermission(FILE_SERVER_PERMISSION_CODES.downloadRead, '当前用户没有文件下载权限'),
  downloadFile,
)
fileRouter.get(
  '/preview',
  requirePermission(FILE_SERVER_PERMISSION_CODES.previewRead, '当前用户没有文件预览权限'),
  previewFile,
)
fileRouter.post(
  '/folder',
  requirePermission(FILE_SERVER_PERMISSION_CODES.folderCreate, '当前用户没有创建文件夹权限'),
  createFolder,
)
fileRouter.post(
  '/move',
  requirePermission(FILE_SERVER_PERMISSION_CODES.fileMove, '当前用户没有移动文件权限'),
  moveFile,
)
fileRouter.post(
  '/upload',
  requirePermission(FILE_SERVER_PERMISSION_CODES.fileUpload, '当前用户没有上传文件权限'),
  uploadFileBatch.fields([
    { name: 'file', maxCount: 1 },
    { name: 'files' },
  ]),
  uploadFile,
)
fileRouter.post(
  '/upload/chunk',
  requirePermission(FILE_SERVER_PERMISSION_CODES.fileUpload, '当前用户没有上传文件权限'),
  uploadChunkPayload.single('chunk'),
  uploadFileChunk,
)
fileRouter.post(
  '/upload/chunk/complete',
  requirePermission(FILE_SERVER_PERMISSION_CODES.fileUpload, '当前用户没有上传文件权限'),
  completeChunkUpload,
)
fileRouter.post(
  '/upload/chunk/complete-batch',
  requirePermission(FILE_SERVER_PERMISSION_CODES.fileUpload, '当前用户没有上传文件权限'),
  completeChunkUploadBatch,
)
fileRouter.delete(
  '/',
  requirePermission(FILE_SERVER_PERMISSION_CODES.fileDelete, '当前用户没有删除文件权限'),
  deleteFile,
)

export default fileRouter
