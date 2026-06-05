import type { Request, Response } from 'express';
import { HttpStatus } from '@super-pro/shared-constants';
import type {
  CreateAdminMenuRequestDto,
  UpdateAdminMenuRequestDto,
} from './adminMenu.dto.ts';
import { AdminMenuBusinessError, adminMenuService } from './adminMenu.service.ts';

const getMenu = async (req: Request, res: Response) => {
  try {
    const menus = await adminMenuService.getAdminMenuTree();
    res.sendSuccess(menus, '获取后台菜单成功');
  } catch (error) {
    if (error instanceof AdminMenuBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }

    return res.status(HttpStatus.ERROR).sendFail('获取后台菜单失败', HttpStatus.ERROR);
  }
};

const getMenuList = async (req: Request, res: Response) => {
  try {
    const menus = await adminMenuService.getAdminMenuList(req.query as Record<string, unknown>);
    res.sendSuccess(menus, '鑾峰彇鍚庡彴鑿滃崟鍒楄〃鎴愬姛');
  } catch (error) {
    if (error instanceof AdminMenuBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }

    return res.status(HttpStatus.ERROR).sendFail('鑾峰彇鍚庡彴鑿滃崟鍒楄〃澶辫触', HttpStatus.ERROR);
  }
};

const getMenuDetail = async (req: Request, res: Response) => {
  try {
    const menu = await adminMenuService.getAdminMenuDetail(Number(req.params.id));
    res.sendSuccess(menu, '获取后台菜单详情成功');
  } catch (error) {
    if (error instanceof AdminMenuBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }

    return res.status(HttpStatus.ERROR).sendFail('获取后台菜单详情失败', HttpStatus.ERROR);
  }
};

const createMenu = async (req: Request, res: Response) => {
  try {
    const created = await adminMenuService.createAdminMenu(req.body as CreateAdminMenuRequestDto);
    res.sendSuccess(created, '新增后台菜单成功');
  } catch (error) {
    if (error instanceof AdminMenuBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }

    return res.status(HttpStatus.ERROR).sendFail('新增后台菜单失败', HttpStatus.ERROR);
  }
};

const updateMenu = async (req: Request, res: Response) => {
  try {
    const updated = await adminMenuService.updateAdminMenu(
      Number(req.params.id),
      req.body as UpdateAdminMenuRequestDto,
    );
    res.sendSuccess(updated, '更新后台菜单成功');
  } catch (error) {
    if (error instanceof AdminMenuBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }

    return res.status(HttpStatus.ERROR).sendFail('更新后台菜单失败', HttpStatus.ERROR);
  }
};

const deleteMenu = async (req: Request, res: Response) => {
  try {
    const deleted = await adminMenuService.deleteAdminMenu(Number(req.params.id));
    res.sendSuccess(deleted, '删除后台菜单成功');
  } catch (error) {
    if (error instanceof AdminMenuBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }

    return res.status(HttpStatus.ERROR).sendFail('删除后台菜单失败', HttpStatus.ERROR);
  }
};

export {
  createMenu,
  deleteMenu,
  getMenu,
  getMenuList,
  getMenuDetail,
  updateMenu,
};
