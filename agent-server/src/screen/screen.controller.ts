import type { Request, Response } from 'express';
import { HttpStatus } from '../../utils/constant/HttpStatus.ts';
import type { ScreenWindow } from './screen.dto.ts';
import { ScreenBusinessError, screenService } from './screen.service.ts';

function resolveRange(req: Request) {
  return typeof req.query.range === 'string' ? req.query.range.trim() : undefined;
}

function resolveWindow(req: Request): ScreenWindow {
  const value = typeof req.query.window === 'string' ? req.query.window.trim() : '15m';
  if (value === '5m' || value === '1h') {
    return value;
  }

  return '15m';
}

async function handleRequest<T>(
  res: Response,
  fn: () => Promise<T>,
  successMessage: string,
  failMessage: string,
) {
  try {
    const result = await fn();
    res.sendSuccess(result, successMessage);
  } catch (error) {
    if (error instanceof ScreenBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }

    return res.status(HttpStatus.ERROR).sendFail(failMessage, HttpStatus.ERROR);
  }
}

export function getScreenOverview(req: Request, res: Response) {
  return handleRequest(
    res,
    () => screenService.getOverview(resolveRange(req)),
    '获取大屏概览成功',
    '获取大屏概览失败',
  );
}

export function getScreenTrends(req: Request, res: Response) {
  return handleRequest(
    res,
    () => screenService.getTrends(resolveRange(req)),
    '获取大屏趋势成功',
    '获取大屏趋势失败',
  );
}

export function getScreenAgent(req: Request, res: Response) {
  return handleRequest(
    res,
    () => screenService.getAgent(resolveRange(req)),
    '获取智能体运营数据成功',
    '获取智能体运营数据失败',
  );
}

export function getScreenKnowledge(req: Request, res: Response) {
  return handleRequest(
    res,
    () => screenService.getKnowledge(resolveRange(req)),
    '获取知识库运营数据成功',
    '获取知识库运营数据失败',
  );
}

export function getScreenActivity(req: Request, res: Response) {
  return handleRequest(
    res,
    () => screenService.getActivity(resolveRange(req)),
    '获取大屏动态流成功',
    '获取大屏动态流失败',
  );
}

export function getScreenDevice(req: Request, res: Response) {
  return handleRequest(
    res,
    () => screenService.getDevice(resolveWindow(req)),
    '获取设备资源数据成功',
    '获取设备资源数据失败',
  );
}
