import type { Request, Response } from 'express';
import { HttpStatus } from '@super-pro/shared-constants';
import type {
  CreateAdminMenuRequestDto,
  UpdateAdminMenuRequestDto,
} from './adminMenu.dto.ts';
import { AdminMenuBusinessError, adminMenuService } from './adminMenu.service.ts';

function handleAdminMenuError(error: unknown, res: Response, fallbackMessage: string) {
  if (error instanceof AdminMenuBusinessError) {
    return res.status(error.statusCode).sendFail(error.message, error.statusCode);
  }

  return res.status(HttpStatus.ERROR).sendFail(fallbackMessage, HttpStatus.ERROR);
}

const getMenu = async (req: Request, res: Response) => {
  try {
    const menus = await adminMenuService.getAdminMenuTree();
    res.sendSuccess(menus, '获取后台菜单成功');
  } catch (error) {
    return handleAdminMenuError(error, res, '获取后台菜单失败');
  }
};

const getMenuList = async (req: Request, res: Response) => {
  try {
    const menus = await adminMenuService.getAdminMenuList(req.query as Record<string, unknown>);
    res.sendSuccess(menus, '获取后台菜单列表成功');
  } catch (error) {
    return handleAdminMenuError(error, res, '获取后台菜单列表失败');
  }
};

const getMenuDetail = async (req: Request, res: Response) => {
  try {
    const menu = await adminMenuService.getAdminMenuDetail(Number(req.params.id));
    res.sendSuccess(menu, '获取后台菜单详情成功');
  } catch (error) {
    return handleAdminMenuError(error, res, '获取后台菜单详情失败');
  }
};

const createMenu = async (req: Request, res: Response) => {
  try {
    const created = await adminMenuService.createAdminMenu(req.body as CreateAdminMenuRequestDto);
    res.sendSuccess(created, '新增后台菜单成功');
  } catch (error) {
    return handleAdminMenuError(error, res, '新增后台菜单失败');
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
    return handleAdminMenuError(error, res, '更新后台菜单失败');
  }
};

const deleteMenu = async (req: Request, res: Response) => {
  try {
    const deleted = await adminMenuService.deleteAdminMenu(Number(req.params.id));
    res.sendSuccess(deleted, '删除后台菜单成功');
  } catch (error) {
    return handleAdminMenuError(error, res, '删除后台菜单失败');
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
