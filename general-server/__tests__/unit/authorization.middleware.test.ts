import type { NextFunction, Request, Response } from 'express'
import { jest } from '@jest/globals'
import {
  FILE_SERVER_PERMISSION_CODES,
  type AuthenticatedIdentity,
  type AuthenticatedPrincipal,
} from '@super-pro/shared-types'
import { HttpStatus } from '../../utils/constant/HttpStatus.ts'
import {
  loadAuthenticatedPrincipal,
  requirePermission as createRequirePermissionMiddleware,
} from '../../src/authorization/authorization.middleware.ts'
import {
  AuthorizationBusinessError,
  authorizationService,
} from '../../src/authorization/authorization.service.ts'

type MockResponse = Response & {
  sendFail: jest.Mock
  status: jest.Mock
}

function createMockResponse(): MockResponse {
  const res = {
    sendFail: jest.fn(),
    status: jest.fn(),
  } as unknown as MockResponse

  res.status.mockReturnValue(res)
  return res
}

function createRequest(overrides: Partial<Request> = {}): Request {
  return {
    method: 'GET',
    headers: {},
    originalUrl: '/api/file/tree',
    ...overrides,
  } as Request
}

function createIdentity(): AuthenticatedIdentity {
  return {
    userId: 1,
    username: 'zhangsan',
    compatibilityRole: 'guest',
  }
}

function createPrincipal(): AuthenticatedPrincipal {
  return {
    ...createIdentity(),
    roles: [
      {
        id: 1,
        code: 'file-server.viewer',
        name: 'viewer',
        appCode: 'file-server',
      },
    ],
    permissionCodes: [FILE_SERVER_PERMISSION_CODES.treeRead],
  }
}

describe('authorization middleware', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('loads and attaches the authenticated principal before continuing', async () => {
    const identity = createIdentity()
    const principal = createPrincipal()
    const req = createRequest({ jwtPayload: { userId: 1, username: 'zhangsan', role: 'guest' } })
    const res = createMockResponse()
    const next = jest.fn() as NextFunction

    jest
      .spyOn(authorizationService, 'resolveAuthenticatedIdentityFromJwtPayload')
      .mockReturnValue(identity)
    jest
      .spyOn(authorizationService, 'getAuthenticatedPrincipal')
      .mockResolvedValue(principal)

    await loadAuthenticatedPrincipal(req, res, next)

    expect(req.authPrincipal).toEqual(principal)
    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalled()
  })

  it('keeps missing or invalid identities as controlled 401 responses', async () => {
    const req = createRequest()
    const res = createMockResponse()
    const next = jest.fn() as NextFunction

    jest
      .spyOn(authorizationService, 'resolveAuthenticatedIdentityFromJwtPayload')
      .mockImplementation(() => {
        throw new AuthorizationBusinessError(
          'not logged in',
          {
            nodePath: 'authorization',
            field: 'jwtPayload',
            reason: 'missing identity',
          },
          HttpStatus.UNAUTHORIZED,
        )
      })

    await loadAuthenticatedPrincipal(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED)
    expect(res.sendFail).toHaveBeenCalledWith('not logged in', HttpStatus.UNAUTHORIZED)
  })

  it('returns controlled 403 responses for forbidden permission checks', async () => {
    const req = createRequest({
      authPrincipal: createPrincipal(),
    })
    const res = createMockResponse()
    const next = jest.fn() as NextFunction

    jest
      .spyOn(authorizationService, 'requirePermission')
      .mockRejectedValue(
        new AuthorizationBusinessError(
          'forbidden',
          {
            nodePath: 'authorization',
            field: 'permissionCode',
            reason: 'missing permission',
          },
          HttpStatus.FORBIDDEN,
        ),
      )

    const middleware = createRequirePermissionMiddleware(
      FILE_SERVER_PERMISSION_CODES.fileMove,
      'forbidden',
    )

    await middleware(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN)
    expect(res.sendFail).toHaveBeenCalledWith('forbidden', HttpStatus.FORBIDDEN)
  })

  it('allows the request through when the permission check succeeds', async () => {
    const req = createRequest({
      authPrincipal: createPrincipal(),
    })
    const res = createMockResponse()
    const next = jest.fn() as NextFunction

    jest.spyOn(authorizationService, 'requirePermission').mockResolvedValue()

    const middleware = createRequirePermissionMiddleware(
      FILE_SERVER_PERMISSION_CODES.treeRead,
      'allowed',
    )

    await middleware(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalled()
    expect(res.sendFail).not.toHaveBeenCalled()
  })
})
