import type { Request, Response } from 'express';
import { HttpStatus } from '@super-pro/shared-constants';
import type { CreateTodoRequestDto, UpdateTodoRequestDto } from '@super-pro/shared-types';
import { TodoBusinessError, todoService } from './todo.service.ts';

const getTodo = async (req: Request, res: Response) => {
  try {
    const todos = await todoService.getTodoList(req.query as Record<string, unknown>);
    res.sendSuccess(todos, '获取待办列表成功');
  } catch (error) {
    if (error instanceof TodoBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }

    return res.status(HttpStatus.ERROR).sendFail('获取待办列表失败', HttpStatus.ERROR);
  }
};

const getTodoDetail = async (req: Request, res: Response) => {
  try {
    const todo = await todoService.getTodoDetail(Number(req.params.id));
    res.sendSuccess(todo, '获取待办详情成功');
  } catch (error) {
    if (error instanceof TodoBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }

    return res.status(HttpStatus.ERROR).sendFail('获取待办详情失败', HttpStatus.ERROR);
  }
};

const createTodo = async (req: Request, res: Response) => {
  try {
    const created = await todoService.createTodo(req.body as CreateTodoRequestDto);
    res.sendSuccess(created, '新增待办成功');
  } catch (error) {
    if (error instanceof TodoBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }

    return res.status(HttpStatus.ERROR).sendFail('新增待办失败', HttpStatus.ERROR);
  }
};

const updateTodo = async (req: Request, res: Response) => {
  try {
    const updated = await todoService.updateTodo(
      Number(req.params.id),
      req.body as UpdateTodoRequestDto,
    );
    res.sendSuccess(updated, '更新待办成功');
  } catch (error) {
    if (error instanceof TodoBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }

    return res.status(HttpStatus.ERROR).sendFail('更新待办失败', HttpStatus.ERROR);
  }
};

const deleteTodo = async (req: Request, res: Response) => {
  try {
    const deleted = await todoService.deleteTodo(Number(req.params.id));
    res.sendSuccess(deleted, '删除待办成功');
  } catch (error) {
    if (error instanceof TodoBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }

    return res.status(HttpStatus.ERROR).sendFail('删除待办失败', HttpStatus.ERROR);
  }
};

export {
  createTodo,
  deleteTodo,
  getTodo,
  getTodoDetail,
  updateTodo,
};
