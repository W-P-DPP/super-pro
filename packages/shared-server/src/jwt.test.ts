import type { NextFunction, Request, Response } from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpStatus } from '@super-pro/shared-constants';
import { createJwtMiddleware, generateJwtToken, type JwtPayload } from './jwt.ts';

type MockResponse = Response & {
  sendFail: ReturnType<typeof vi.fn>;
  status: ReturnType<typeof vi.fn>;
};

function createMockResponse(): MockResponse {
  const res = {
    sendFail: vi.fn(),
    status: vi.fn(),
  } as unknown as MockResponse;

  res.status.mockReturnValue(res);
  return res;
}

function createRequest(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    ...overrides,
  } as Request;
}

describe('createJwtMiddleware', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('passes through when JWT is disabled', () => {
    const middleware = createJwtMiddleware({ enabled: false });
    const req = createRequest();
    const res = createMockResponse();
    const next = vi.fn() as unknown as NextFunction;

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('accepts bearer token', () => {
    const payload: JwtPayload = { userId: 1, role: 'admin' };
    const token = generateJwtToken(payload);
    const middleware = createJwtMiddleware({ enabled: true });
    const req = createRequest({
      headers: {
        authorization: `Bearer ${token}`,
      },
    });
    const res = createMockResponse();
    const next = vi.fn() as unknown as NextFunction;

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.jwtPayload).toEqual(expect.objectContaining(payload));
  });

  it('accepts configured cookie token', () => {
    const payload: JwtPayload = { userId: 2 };
    const token = generateJwtToken(payload);
    const middleware = createJwtMiddleware({
      enabled: true,
      cookieNames: ['preview_token'],
    });
    const req = createRequest({
      headers: {
        cookie: `preview_token=${encodeURIComponent(token)}`,
      },
    });
    const res = createMockResponse();
    const next = vi.fn() as unknown as NextFunction;

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.jwtPayload).toEqual(expect.objectContaining(payload));
  });

  it('rejects missing token', () => {
    const middleware = createJwtMiddleware({ enabled: true });
    const req = createRequest();
    const res = createMockResponse();
    const next = vi.fn() as unknown as NextFunction;

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
  });
});
