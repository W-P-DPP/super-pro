import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  FILE_SERVER_APP_CODE,
  FILE_SERVER_PERMISSION_CODES,
  type AppAuthorizationSnapshot,
} from '@super-pro/shared-types'

const { redirectToLoginPageMock } = vi.hoisted(() => ({
  redirectToLoginPageMock: vi.fn(),
}))

vi.mock('./lib/auth-session', async () => {
  const actual = await vi.importActual<typeof import('./lib/auth-session')>('./lib/auth-session')

  return {
    ...actual,
    redirectToLoginPage: redirectToLoginPageMock,
  }
})

import App from './App'
import { ThemeProvider } from './components/theme-provider'

function renderApp() {
  return render(
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <App />
    </ThemeProvider>,
  )
}

function jsonResponse(data: unknown, msg = 'ok', status = 200) {
  return new Response(
    JSON.stringify({
      code: status,
      msg,
      data,
      timestamp: Date.now(),
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    },
  )
}

function textResponse(text: string, contentType = 'text/plain; charset=utf-8') {
  return new Response(text, {
    status: 200,
    headers: {
      'Content-Type': contentType,
    },
  })
}

function createSnapshot(permissionCodes: string[]): AppAuthorizationSnapshot {
  return {
    appCode: FILE_SERVER_APP_CODE,
    principal: {
      userId: 1,
      username: 'zhangsan',
      compatibilityRole: 'admin',
      roles: [
        {
          id: 1,
          code: 'platform.admin',
          name: '平台管理员',
          appCode: 'platform',
        },
      ],
      permissionCodes,
    },
    permissions: permissionCodes.map((code, index) => ({
      id: index + 1,
      code,
      appCode: FILE_SERVER_APP_CODE,
      resourceType: 'api',
      resourceCode: code.split('.').slice(1, -1).join('.'),
      action: code.split('.').at(-1) ?? 'read',
      name: code,
    })),
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function getNodeNameMatcher(name: string) {
  return new RegExp(escapeRegExp(name))
}

function getNodeButton(name: string) {
  return screen.findByRole('button', { name: getNodeNameMatcher(name) })
}

async function expandFolder(name: string) {
  const button = await getNodeButton(name)
  const container = button.closest('.group')
  const expandButton = container?.querySelector('button[aria-label]')

  if (!(expandButton instanceof HTMLButtonElement)) {
    throw new Error(`expand button not found for folder ${name}`)
  }

  await userEvent.click(expandButton)
}

async function getRowButtonCount(name: string) {
  const button = await getNodeButton(name)
  const container = button.closest('.group')

  if (!(container instanceof HTMLElement)) {
    throw new Error(`row not found for ${name}`)
  }

  return container.querySelectorAll('button').length
}

const fullPermissions = Object.values(FILE_SERVER_PERMISSION_CODES)

describe('App', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    redirectToLoginPageMock.mockReset()
    localStorage.clear()
    document.cookie = 'file_preview_token=; Max-Age=0; Path=/'
  })

  it('loads authorization snapshot before tree and previews files', async () => {
    const fetchMock = vi.fn()
    fetchMock.mockResolvedValueOnce(jsonResponse(createSnapshot(fullPermissions)))
    fetchMock.mockResolvedValueOnce(
      jsonResponse([
        {
          name: 'docs',
          relativePath: '/docs',
          type: 'folder',
          children: [
            {
              name: 'guide.md',
              relativePath: '/docs/guide.md',
              type: 'file',
              size: 8,
              children: [],
            },
          ],
        },
      ]),
    )
    fetchMock.mockResolvedValueOnce(textResponse('# guide', 'text/markdown; charset=utf-8'))
    vi.stubGlobal('fetch', fetchMock)

    renderApp()

    await getNodeButton('docs')
    await expandFolder('docs')
    await userEvent.click(await getNodeButton('guide.md'))

    expect(await screen.findByText('guide')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/authorization/snapshot?appCode=file-server',
      expect.objectContaining({
        headers: expect.any(Headers),
      }),
    )
  })

  it('hides workspace and download actions when snapshot lacks permissions', async () => {
    const fetchMock = vi.fn()
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        createSnapshot([
          FILE_SERVER_PERMISSION_CODES.treeRead,
          FILE_SERVER_PERMISSION_CODES.previewRead,
        ]),
      ),
    )
    fetchMock.mockResolvedValueOnce(
      jsonResponse([
        {
          name: 'docs',
          relativePath: '/docs',
          type: 'folder',
          children: [
            {
              name: 'guide.md',
              relativePath: '/docs/guide.md',
              type: 'file',
              size: 8,
              children: [],
            },
          ],
        },
      ]),
    )
    fetchMock.mockResolvedValueOnce(textResponse('# guide', 'text/markdown; charset=utf-8'))
    vi.stubGlobal('fetch', fetchMock)

    renderApp()

    expect(await getRowButtonCount('docs')).toBe(2)

    await expandFolder('docs')
    await userEvent.click(await getNodeButton('guide.md'))

    expect(await screen.findByText('guide')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /下载/ })).not.toBeInTheDocument()
  })

  it('redirects to login when snapshot request returns 401', async () => {
    const fetchMock = vi.fn()
    fetchMock.mockResolvedValueOnce(jsonResponse(null, 'unauthorized', 401))
    vi.stubGlobal('fetch', fetchMock)

    renderApp()

    await waitFor(() => {
      expect(redirectToLoginPageMock).toHaveBeenCalledTimes(1)
    })
    expect(await screen.findByText(/登录状态已失效/)).toBeInTheDocument()
  })

  it('shows controlled feedback instead of redirecting on initial tree 403', async () => {
    const fetchMock = vi.fn()
    fetchMock.mockResolvedValueOnce(jsonResponse(createSnapshot(fullPermissions)))
    fetchMock.mockResolvedValueOnce(jsonResponse(null, 'tree denied', 403))
    vi.stubGlobal('fetch', fetchMock)

    renderApp()

    expect(await screen.findByText('tree denied')).toBeInTheDocument()
    expect(redirectToLoginPageMock).not.toHaveBeenCalled()
  })

  it('does not request preview content when preview permission is missing', async () => {
    const fetchMock = vi.fn()
    fetchMock.mockResolvedValueOnce(
      jsonResponse(createSnapshot([FILE_SERVER_PERMISSION_CODES.treeRead])),
    )
    fetchMock.mockResolvedValueOnce(
      jsonResponse([
        {
          name: 'docs',
          relativePath: '/docs',
          type: 'folder',
          children: [
            {
              name: 'guide.md',
              relativePath: '/docs/guide.md',
              type: 'file',
              size: 8,
              children: [],
            },
          ],
        },
      ]),
    )
    vi.stubGlobal('fetch', fetchMock)

    renderApp()

    await getNodeButton('docs')
    await expandFolder('docs')
    await userEvent.click(await getNodeButton('guide.md'))

    expect(await screen.findByText(/预览权限/)).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('keeps the user on page when preview returns 403', async () => {
    const fetchMock = vi.fn()
    fetchMock.mockResolvedValueOnce(jsonResponse(createSnapshot(fullPermissions)))
    fetchMock.mockResolvedValueOnce(
      jsonResponse([
        {
          name: 'docs',
          relativePath: '/docs',
          type: 'folder',
          children: [
            {
              name: 'guide.md',
              relativePath: '/docs/guide.md',
              type: 'file',
              size: 8,
              children: [],
            },
          ],
        },
      ]),
    )
    fetchMock.mockResolvedValueOnce(jsonResponse(null, 'preview denied', 403))
    vi.stubGlobal('fetch', fetchMock)

    renderApp()

    await getNodeButton('docs')
    await expandFolder('docs')
    await userEvent.click(await getNodeButton('guide.md'))

    expect(await screen.findByText('preview denied')).toBeInTheDocument()
    expect(redirectToLoginPageMock).not.toHaveBeenCalled()
  })

  it('provides download action only when permission is granted', async () => {
    localStorage.setItem('token', 'download-token')

    const fetchMock = vi.fn()
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        createSnapshot([
          FILE_SERVER_PERMISSION_CODES.treeRead,
          FILE_SERVER_PERMISSION_CODES.previewRead,
          FILE_SERVER_PERMISSION_CODES.downloadRead,
        ]),
      ),
    )
    fetchMock.mockResolvedValueOnce(
      jsonResponse([
        {
          name: 'docs',
          relativePath: '/docs',
          type: 'folder',
          children: [
            {
              name: 'guide.md',
              relativePath: '/docs/guide.md',
              type: 'file',
              size: 8,
              children: [],
            },
          ],
        },
      ]),
    )
    fetchMock.mockResolvedValueOnce(textResponse('# guide', 'text/markdown; charset=utf-8'))
    fetchMock.mockResolvedValueOnce(textResponse('', 'text/markdown; charset=utf-8'))
    vi.stubGlobal('fetch', fetchMock)

    const originalCreateElement = document.createElement.bind(document)
    const anchorClick = vi.fn()
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string, options?: ElementCreationOptions) => {
      const element = originalCreateElement(tagName, options)
      if (tagName.toLowerCase() === 'a') {
        element.click = anchorClick as typeof element.click
      }
      return element
    })

    renderApp()

    await getNodeButton('docs')
    await expandFolder('docs')
    await userEvent.click(await getNodeButton('guide.md'))

    const downloadButton = await screen.findByRole('button', { name: /下载/ })
    await userEvent.click(downloadButton)

    await waitFor(() => {
      expect(anchorClick).toHaveBeenCalledTimes(1)
    })
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/file/download?targetPath=%2Fdocs%2Fguide.md',
      expect.objectContaining({
        headers: expect.any(Headers),
        signal: expect.any(AbortSignal),
      }),
    )
    expect(document.cookie).toContain('file_preview_token=download-token')
  })

  it('moves files by drag and drop when move permission is granted', async () => {
    const initialTree = [
      {
        name: 'docs',
        relativePath: '/docs',
        type: 'folder',
        children: [
          {
            name: 'report.md',
            relativePath: '/docs/report.md',
            type: 'file',
            size: 8,
            children: [],
          },
        ],
      },
      {
        name: 'archive',
        relativePath: '/archive',
        type: 'folder',
        children: [],
      },
    ]

    const movedTree = [
      {
        name: 'docs',
        relativePath: '/docs',
        type: 'folder',
        children: [],
      },
      {
        name: 'archive',
        relativePath: '/archive',
        type: 'folder',
        children: [
          {
            name: 'report.md',
            relativePath: '/archive/report.md',
            type: 'file',
            size: 8,
            children: [],
          },
        ],
      },
    ]

    const fetchMock = vi.fn()
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        createSnapshot([
          FILE_SERVER_PERMISSION_CODES.treeRead,
          FILE_SERVER_PERMISSION_CODES.fileMove,
          FILE_SERVER_PERMISSION_CODES.previewRead,
        ]),
      ),
    )
    fetchMock.mockResolvedValueOnce(jsonResponse(initialTree))
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          name: 'report.md',
          relativePath: '/archive/report.md',
          type: 'file',
          size: 8,
          children: [],
        },
        'move ok',
      ),
    )
    fetchMock.mockResolvedValueOnce(jsonResponse(movedTree))
    vi.stubGlobal('fetch', fetchMock)

    renderApp()

    await expandFolder('docs')

    const docsNode = (await getNodeButton('docs')).closest('[draggable="true"]')
    const sourceNode = (await getNodeButton('report.md')).closest('[draggable="true"]')
    const targetNode = (await getNodeButton('archive')).closest('[draggable="true"]')

    if (!(docsNode instanceof HTMLElement) || !(sourceNode instanceof HTMLElement) || !(targetNode instanceof HTMLElement)) {
      throw new Error('move nodes were not rendered')
    }

    fireEvent.dragStart(sourceNode)
    fireEvent.dragOver(targetNode)
    fireEvent.drop(targetNode)

    expect(await screen.findByText('move ok')).toBeInTheDocument()
  })
})
