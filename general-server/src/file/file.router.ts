import express, { type Router } from 'express'
import multer from 'multer'
import {
  completeChunkUploadBatch,
  completeChunkUpload,
  createFolder,
  deleteFile,
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

fileRouter.get('/tree', getFileTree)
fileRouter.get('/preview', previewFile)
fileRouter.post('/folder', createFolder)
fileRouter.post('/move', moveFile)
fileRouter.post(
  '/upload',
  uploadFileBatch.fields([
    { name: 'file', maxCount: 1 },
    { name: 'files' },
  ]),
  uploadFile,
)
fileRouter.post('/upload/chunk', uploadChunkPayload.single('chunk'), uploadFileChunk)
fileRouter.post('/upload/chunk/complete', completeChunkUpload)
fileRouter.post('/upload/chunk/complete-batch', completeChunkUploadBatch)
fileRouter.delete('/', deleteFile)

export default fileRouter
