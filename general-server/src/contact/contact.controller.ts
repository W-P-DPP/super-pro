import type { Request, Response } from 'express';
import { HttpStatus } from '../../utils/constant/HttpStatus.ts';
import type { SubmitContactMessageRequestDto } from './contact.dto.ts';
import { ContactBusinessError, contactService } from './contact.service.ts';

export const submitContactMessage = async (req: Request, res: Response) => {
  try {
    const submitted = await contactService.submitMessage({
      ...(req.body as SubmitContactMessageRequestDto),
      ip: req.ip,
      userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : '',
    });

    res.sendSuccess(submitted, '提交联系方式成功');
  } catch (error) {
    if (error instanceof ContactBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }

    return res.status(HttpStatus.ERROR).sendFail('提交联系方式失败', HttpStatus.ERROR);
  }
};
