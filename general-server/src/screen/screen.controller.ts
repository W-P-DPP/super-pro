import type { Request, Response } from 'express';
import { HttpStatus } from '../../utils/constant/HttpStatus.ts';
import type { ScreenWindow } from './screen.dto.ts';
import { screenService } from './screen.service.ts';

function resolveWindow(req: Request): ScreenWindow {
  const value = typeof req.query.window === 'string' ? req.query.window.trim() : '15m';
  if (value === '5m' || value === '1h') {
    return value;
  }

  return '15m';
}

export async function getScreenDevice(req: Request, res: Response) {
  try {
    const result = await screenService.getDevice(resolveWindow(req));
    res.sendSuccess(result, '获取设备资源数据成功');
  } catch {
    return res.status(HttpStatus.ERROR).sendFail('获取设备资源数据失败', HttpStatus.ERROR);
  }
}
