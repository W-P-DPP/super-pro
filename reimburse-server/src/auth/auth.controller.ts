import type { Request, Response } from 'express';
import { HttpStatus } from '../../utils/constant/HttpStatus.ts';
import { AuthBusinessError, resolveCurrentUser } from './current-user.ts';
import { authService } from './auth.service.ts';

export async function getCurrentUser(req: Request, res: Response) {
  try {
    const currentUser = resolveCurrentUser(req);
    const result = authService.getCurrentUser(currentUser);
    return res.sendSuccess(result, '获取当前用户信息成功');
  } catch (error) {
    if (error instanceof AuthBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }

    return res
      .status(HttpStatus.ERROR)
      .sendFail('获取当前用户信息失败', HttpStatus.ERROR);
  }
}
