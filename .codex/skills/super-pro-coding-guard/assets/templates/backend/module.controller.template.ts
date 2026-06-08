import type { Request, Response } from 'express'
import { HttpStatus } from '@super-pro/shared-constants'
import type {
  Create__Resource__RequestDto,
  Update__Resource__RequestDto,
} from './__resource__.dto.ts'
import { __Resource__BusinessError, __resource__Service } from './__resource__.service.ts'

function sendBusinessError(
  res: Response,
  error: unknown,
  fallbackMessage: string,
) {
  if (error instanceof __Resource__BusinessError) {
    return res.status(error.statusCode).sendFail(error.message, error.statusCode)
  }

  return res.status(HttpStatus.ERROR).sendFail(fallbackMessage, HttpStatus.ERROR)
}

export const get__Resource__List = async (req: Request, res: Response) => {
  try {
    const result = await __resource__Service.get__Resource__List(req.query as Record<string, unknown>)
    res.sendSuccess(result, '获取__RESOURCE_LABEL__列表成功')
  } catch (error) {
    return sendBusinessError(res, error, '获取__RESOURCE_LABEL__列表失败')
  }
}

export const get__Resource__Detail = async (req: Request, res: Response) => {
  try {
    const result = await __resource__Service.get__Resource__Detail(Number(req.params.id))
    res.sendSuccess(result, '获取__RESOURCE_LABEL__详情成功')
  } catch (error) {
    return sendBusinessError(res, error, '获取__RESOURCE_LABEL__详情失败')
  }
}

export const create__Resource__ = async (req: Request, res: Response) => {
  try {
    const result = await __resource__Service.create__Resource__(req.body as Create__Resource__RequestDto)
    res.sendSuccess(result, '新增__RESOURCE_LABEL__成功')
  } catch (error) {
    return sendBusinessError(res, error, '新增__RESOURCE_LABEL__失败')
  }
}

export const update__Resource__ = async (req: Request, res: Response) => {
  try {
    const result = await __resource__Service.update__Resource__(
      Number(req.params.id),
      req.body as Update__Resource__RequestDto,
    )
    res.sendSuccess(result, '更新__RESOURCE_LABEL__成功')
  } catch (error) {
    return sendBusinessError(res, error, '更新__RESOURCE_LABEL__失败')
  }
}

export const delete__Resource__ = async (req: Request, res: Response) => {
  try {
    const result = await __resource__Service.delete__Resource__(Number(req.params.id))
    res.sendSuccess(result, '删除__RESOURCE_LABEL__成功')
  } catch (error) {
    return sendBusinessError(res, error, '删除__RESOURCE_LABEL__失败')
  }
}
