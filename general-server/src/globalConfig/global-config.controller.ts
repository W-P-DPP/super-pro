import type { Request, Response } from 'express';
import { HttpStatus } from '@super-pro/shared-constants';
import type {
  CreateGlobalConfigRequestDto,
  UpdateGlobalConfigRequestDto,
} from './global-config.dto.ts';
import {
  GlobalConfigBusinessError,
  globalConfigService,
} from './global-config.service.ts';

const getGlobalConfig = async (req: Request, res: Response) => {
  try {
    const result = await globalConfigService.getGlobalConfigList(req.query as Record<string, unknown>);
    res.sendSuccess(result, '获取全局配置列表成功');
  } catch (error) {
    if (error instanceof GlobalConfigBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }

    return res.status(HttpStatus.ERROR).sendFail('获取全局配置列表失败', HttpStatus.ERROR);
  }
};

const getGlobalConfigDetail = async (req: Request, res: Response) => {
  try {
    const result = await globalConfigService.getGlobalConfigDetail(Number(req.params.id));
    res.sendSuccess(result, '获取全局配置详情成功');
  } catch (error) {
    if (error instanceof GlobalConfigBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }

    return res.status(HttpStatus.ERROR).sendFail('获取全局配置详情失败', HttpStatus.ERROR);
  }
};

const createGlobalConfig = async (req: Request, res: Response) => {
  try {
    const result = await globalConfigService.createGlobalConfig(req.body as CreateGlobalConfigRequestDto);
    res.sendSuccess(result, '新增全局配置成功');
  } catch (error) {
    if (error instanceof GlobalConfigBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }

    return res.status(HttpStatus.ERROR).sendFail('新增全局配置失败', HttpStatus.ERROR);
  }
};

const updateGlobalConfig = async (req: Request, res: Response) => {
  try {
    const result = await globalConfigService.updateGlobalConfig(
      Number(req.params.id),
      req.body as UpdateGlobalConfigRequestDto,
    );
    res.sendSuccess(result, '更新全局配置成功');
  } catch (error) {
    if (error instanceof GlobalConfigBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }

    return res.status(HttpStatus.ERROR).sendFail('更新全局配置失败', HttpStatus.ERROR);
  }
};

const deleteGlobalConfig = async (req: Request, res: Response) => {
  try {
    const result = await globalConfigService.deleteGlobalConfig(Number(req.params.id));
    res.sendSuccess(result, '删除全局配置成功');
  } catch (error) {
    if (error instanceof GlobalConfigBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }

    return res.status(HttpStatus.ERROR).sendFail('删除全局配置失败', HttpStatus.ERROR);
  }
};

export {
  createGlobalConfig,
  deleteGlobalConfig,
  getGlobalConfig,
  getGlobalConfigDetail,
  updateGlobalConfig,
};
