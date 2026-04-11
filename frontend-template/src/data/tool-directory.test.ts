import { describe, expect, it } from 'vitest'
import {
  getSiteMenuDescription,
  normalizeSiteMenuTree,
  resolveSiteMenuIcon,
} from './tool-directory'

describe('tool-directory', () => {
  it('优先使用菜单备注作为描述文案', () => {
    expect(getSiteMenuDescription('  用于在线解析 JSON 文本  ')).toBe('用于在线解析 JSON 文本')
  })

  it('菜单未配置备注时返回中文占位说明', () => {
    expect(getSiteMenuDescription('')).toBe('暂无菜单说明')
    expect(getSiteMenuDescription(undefined)).toBe('暂无菜单说明')
  })

  it('标准化菜单树时保留 strict 并裁剪 remark', () => {
    const normalizedTree = normalizeSiteMenuTree([
      {
        id: 1,
        parentId: null,
        name: '工具',
        path: '/tool',
        icon: '/icons/tool.svg',
        strict: false,
        isTop: false,
        sort: 0,
        remark: '  工具分组  ',
        children: [
          {
            id: 11,
            parentId: 1,
            name: 'JSON解析',
            path: 'https://www.json.cn/',
            icon: '/icons/json.ico',
            strict: true,
            isTop: false,
            sort: 0,
            remark: '  用于在线解析 JSON 文本  ',
            children: [],
          },
        ],
      },
    ])

    expect(normalizedTree).toEqual([
      expect.objectContaining({
        id: 1,
        strict: false,
        remark: '工具分组',
        children: [
          expect.objectContaining({
            id: 11,
            strict: true,
            remark: '用于在线解析 JSON 文本',
          }),
        ],
      }),
    ])
  })

  it('直接使用后端返回的根路径图标地址', () => {
    expect(resolveSiteMenuIcon('/icons/tool.svg')).toBe('/icons/tool.svg')
  })

  it('把相对路径图标规范化为根路径', () => {
    expect(resolveSiteMenuIcon('icons/pin.svg')).toBe('/icons/pin.svg')
  })

  it('直接使用后端或 CDN 返回的完整地址', () => {
    expect(resolveSiteMenuIcon('https://cdn.example.com/icons/json.ico')).toBe(
      'https://cdn.example.com/icons/json.ico',
    )
  })

  it('空图标或占位值使用统一兜底图标', () => {
    expect(resolveSiteMenuIcon('')).toBe('/icons/tool.svg')
    expect(resolveSiteMenuIcon('   ')).toBe('/icons/tool.svg')
    expect(resolveSiteMenuIcon('icon-path')).toBe('/icons/tool.svg')
    expect(resolveSiteMenuIcon(undefined)).toBe('/icons/tool.svg')
  })
})
