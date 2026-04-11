import type { NextFunction, Request, Response } from 'express';
import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import { HttpStatus } from '../../utils/constant/HttpStatus.ts';
import {
  generateToken,
  jwtMiddleware,
  type JwtPayload,
} from '../../utils/middleware/jwtMiddleware.ts';

const SECRET = 'test_secret';

type MockResponse = Response & {
  sendFail: jest.Mock
  status: jest.Mock
};

function createMockResponse(): MockResponse {
  const res = {
    sendFail: jest.fn(),
    status: jest.fn(),
  } as unknown as MockResponse;

  res.status.mockReturnValue(res);
  return res;
}

function createRequest(overrides: Partial<Request> = {}): Request {
  return {
    method: 'GET',
    headers: {},
    originalUrl: '/api/site-menu/getMenu',
    ...overrides,
  } as Request;
}

describe('jwtMiddleware', () => {
  const originalJwtEnabled = process.env.JWT_ENABLED;

  afterEach(() => {
    process.env.JWT_ENABLED = originalJwtEnabled;
    jest.restoreAllMocks();
  });

  it('passes through when JWT is disabled', () => {
    process.env.JWT_ENABLED = 'false';
    const req = createRequest();
    const res = createMockResponse();
    const next = jest.fn() as NextFunction;

    jwtMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.sendFail).not.toHaveBeenCalled();
  });

  it('rejects missing bearer token when JWT is enabled', () => {
    process.env.JWT_ENABLED = 'true';
    const req = createRequest();
    const res = createMockResponse();
    const next = jest.fn() as NextFunction;

    jwtMiddleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(res.sendFail).toHaveBeenCalledWith('缺少授权信息或授权格式错误', HttpStatus.UNAUTHORIZED);
  });

  it('attaches decoded payload for a valid bearer token', () => {
    process.env.JWT_ENABLED = 'true';
    const payload: JwtPayload = { userId: 1, role: 'admin' };
    const token = generateToken(payload);
    const req = createRequest({
      headers: {
        authorization: `Bearer ${token}`,
      },
    });
    const res = createMockResponse();
    const next = jest.fn() as NextFunction;

    jwtMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.jwtPayload).toEqual(expect.objectContaining(payload));
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects invalid bearer token', () => {
    process.env.JWT_ENABLED = 'true';
    const req = createRequest({
      headers: {
        authorization: 'Bearer invalid-token',
      },
    });
    const res = createMockResponse();
    const next = jest.fn() as NextFunction;

    jwtMiddleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(res.sendFail).toHaveBeenCalledWith('令牌无效或已过期', HttpStatus.UNAUTHORIZED);
  });
});

describe('generateToken', () => {
  it('returns a JWT token string that can be verified', () => {
    const payload = { userId: 42, name: 'test-user' };
    const token = generateToken(payload);
    const decoded = jwt.verify(token, SECRET) as Record<string, unknown>;

    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
    expect(decoded['userId']).toBe(42);
    expect(decoded['name']).toBe('test-user');
  });

  it('expires when a short ttl is used', async () => {
    const token = generateToken({ userId: 1 }, 1);

    await new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(() => jwt.verify(token, SECRET)).toThrow();
        resolve();
      }, 1100);
    });
  });
});
