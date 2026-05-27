import type { Request, Response } from 'express';
import { HttpStatus } from '../../utils/constant/HttpStatus.ts';
import type {
  CreateProjectRequestDto,
  UpdateProjectRequestDto,
} from './project.dto.ts';
import { ProjectBusinessError, projectService } from './project.service.ts';

const getProject = async (req: Request, res: Response) => {
  try {
    const projects = await projectService.getProjectList(req.query as Record<string, unknown>);
    res.sendSuccess(projects, '获取项目列表成功');
  } catch (error) {
    if (error instanceof ProjectBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }

    return res.status(HttpStatus.ERROR).sendFail('获取项目列表失败', HttpStatus.ERROR);
  }
};

const getProjectDetail = async (req: Request, res: Response) => {
  try {
    const project = await projectService.getProjectDetail(Number(req.params.id));
    res.sendSuccess(project, '获取项目详情成功');
  } catch (error) {
    if (error instanceof ProjectBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }

    return res.status(HttpStatus.ERROR).sendFail('获取项目详情失败', HttpStatus.ERROR);
  }
};

const createProject = async (req: Request, res: Response) => {
  try {
    const created = await projectService.createProject(req.body as CreateProjectRequestDto);
    res.sendSuccess(created, '新增项目成功');
  } catch (error) {
    if (error instanceof ProjectBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }

    return res.status(HttpStatus.ERROR).sendFail('新增项目失败', HttpStatus.ERROR);
  }
};

const updateProject = async (req: Request, res: Response) => {
  try {
    const updated = await projectService.updateProject(
      Number(req.params.id),
      req.body as UpdateProjectRequestDto,
    );
    res.sendSuccess(updated, '更新项目成功');
  } catch (error) {
    if (error instanceof ProjectBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }

    return res.status(HttpStatus.ERROR).sendFail('更新项目失败', HttpStatus.ERROR);
  }
};

const deleteProject = async (req: Request, res: Response) => {
  try {
    const deleted = await projectService.deleteProject(Number(req.params.id));
    res.sendSuccess(deleted, '删除项目成功');
  } catch (error) {
    if (error instanceof ProjectBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }

    return res.status(HttpStatus.ERROR).sendFail('删除项目失败', HttpStatus.ERROR);
  }
};

export {
  createProject,
  deleteProject,
  getProject,
  getProjectDetail,
  updateProject,
};
