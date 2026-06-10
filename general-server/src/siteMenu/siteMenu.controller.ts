import type { Request, Response } from 'express';
import { HttpStatus } from '@super-pro/shared-constants';
import type {
  CreateSiteMenuRequestDto,
  UpdateSiteMenuRequestDto,
  UploadedSiteMenuFileDto,
} from './siteMenu.dto.ts';
import { SiteMenuBusinessError, siteMenuService } from './siteMenu.service.ts';

function handleSiteMenuError(error: unknown, res: Response, fallbackMessage: string) {
  if (error instanceof SiteMenuBusinessError) {
    return res.status(error.statusCode).sendFail(error.message, error.statusCode);
  }

  return res.status(HttpStatus.ERROR).sendFail(fallbackMessage, HttpStatus.ERROR);
}

const getMenu = async (req: Request, res: Response) => {
  try {
    const menu = await siteMenuService.getSiteMenu();
    res.sendSuccess(menu, '获取菜单成功');
  } catch (error) {
    return handleSiteMenuError(error, res, '获取菜单失败');
  }
};

const getMenuList = async (req: Request, res: Response) => {
  try {
    const menu = await siteMenuService.getSiteMenuList(req.query as Record<string, unknown>);
    res.sendSuccess(menu, '获取站点菜单列表成功');
  } catch (error) {
    return handleSiteMenuError(error, res, '获取站点菜单列表失败');
  }
};

const getMenuConfig = async (req: Request, res: Response) => {
  try {
    const menuConfig = await siteMenuService.getSiteMenuConfig();
    res.sendSuccess(menuConfig, '获取菜单配置成功');
  } catch (error) {
    return handleSiteMenuError(error, res, '获取菜单配置失败');
  }
};

const getMenuDetail = async (req: Request, res: Response) => {
  try {
    const menu = await siteMenuService.getSiteMenuDetail(Number(req.params.id));
    res.sendSuccess(menu, '获取菜单详情成功');
  } catch (error) {
    return handleSiteMenuError(error, res, '获取菜单详情失败');
  }
};

const createMenu = async (req: Request, res: Response) => {
  try {
    const created = await siteMenuService.createSiteMenu(req.body as CreateSiteMenuRequestDto);
    res.sendSuccess(created, '新增菜单成功');
  } catch (error) {
    return handleSiteMenuError(error, res, '新增菜单失败');
  }
};

const updateMenu = async (req: Request, res: Response) => {
  try {
    const updated = await siteMenuService.updateSiteMenu(
      Number(req.params.id),
      req.body as UpdateSiteMenuRequestDto,
    );
    res.sendSuccess(updated, '更新菜单成功');
  } catch (error) {
    return handleSiteMenuError(error, res, '更新菜单失败');
  }
};

const deleteMenu = async (req: Request, res: Response) => {
  try {
    const deleted = await siteMenuService.deleteSiteMenu(Number(req.params.id));
    res.sendSuccess(deleted, '删除菜单成功');
  } catch (error) {
    return handleSiteMenuError(error, res, '删除菜单失败');
  }
};

const uploadMenuFile = async (req: Request, res: Response) => {
  try {
    const uploadedFile: UploadedSiteMenuFileDto | undefined = req.file
      ? {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          buffer: req.file.buffer,
          size: req.file.size,
        }
      : undefined;
    const imported = await siteMenuService.importSiteMenuFile(uploadedFile);
    res.sendSuccess(imported, '上传菜单文件成功');
  } catch (error) {
    return handleSiteMenuError(error, res, '上传菜单文件失败');
  }
};

export {
  createMenu,
  deleteMenu,
  getMenu,
  getMenuList,
  getMenuConfig,
  getMenuDetail,
  updateMenu,
  uploadMenuFile,
};
