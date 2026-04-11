import type { Request, Response } from 'express';
import { HttpStatus } from '../../utils/constant/HttpStatus.ts';
import type {
  CreateFolderRequestDto,
  DeleteFileRequestDto,
  UploadedFileDto,
  UploadFileRequestDto,
} from './file.dto.ts';
import { FileBusinessError, fileService } from './file.service.ts';

const getFileTree = async (req: Request, res: Response) => {
  try {
    const tree = await fileService.getFileTree();
    res.sendSuccess(tree, '获取文件树成功');
  } catch (error) {
    if (error instanceof FileBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }

    return res.status(HttpStatus.ERROR).sendFail('获取文件树失败', HttpStatus.ERROR);
  }
};

const createFolder = async (req: Request, res: Response) => {
  try {
    const created = await fileService.createFolder(req.body as CreateFolderRequestDto);
    res.sendSuccess(created, '创建文件夹成功');
  } catch (error) {
    if (error instanceof FileBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }

    return res.status(HttpStatus.ERROR).sendFail('创建文件夹失败', HttpStatus.ERROR);
  }
};

const uploadFile = async (req: Request, res: Response) => {
  try {
    const uploadedFile: UploadedFileDto | undefined = req.file
      ? {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          buffer: req.file.buffer,
          size: req.file.size,
        }
      : undefined;
    const saved = await fileService.uploadFile(req.body as UploadFileRequestDto, uploadedFile);
    res.sendSuccess(saved, '上传文件成功');
  } catch (error) {
    if (error instanceof FileBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }

    return res.status(HttpStatus.ERROR).sendFail('上传文件失败', HttpStatus.ERROR);
  }
};

const deleteFile = async (req: Request, res: Response) => {
  try {
    const deleted = await fileService.deleteTarget(req.body as DeleteFileRequestDto);
    res.sendSuccess(deleted, '删除文件成功');
  } catch (error) {
    if (error instanceof FileBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }

    return res.status(HttpStatus.ERROR).sendFail('删除文件失败', HttpStatus.ERROR);
  }
};

export {
  createFolder,
  deleteFile,
  getFileTree,
  uploadFile,
};
