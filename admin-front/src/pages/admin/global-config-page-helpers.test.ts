import { describe, expect, it } from 'vitest'
import {
  normalizeConfigValueByType,
  resolveSelectedProjectId,
  type GlobalConfigProjectOption,
} from './global-config-page-helpers'

const projectOptions: GlobalConfigProjectOption[] = [
  {
    id: 1,
    projectName: 'BMS',
    projectCode: 'admin-console',
  },
  {
    id: 2,
    projectName: '站点',
    projectCode: 'zwpsite',
  },
]

describe('global-config-page-helpers', () => {
  it('keeps current selection when visible project list still contains the active project', () => {
    expect(resolveSelectedProjectId(2, projectOptions)).toBe(2)
  })

  it('falls back to the first visible project when current selection is missing', () => {
    expect(resolveSelectedProjectId(99, projectOptions)).toBe(1)
    expect(resolveSelectedProjectId(null, projectOptions)).toBe(1)
    expect(resolveSelectedProjectId(1, [])).toBeNull()
  })

  it('normalizes string form values by config type', () => {
    expect(normalizeConfigValueByType('text', '  Superpowers BMS  ')).toBe('Superpowers BMS')
    expect(normalizeConfigValueByType('number', '30')).toBe(30)
    expect(normalizeConfigValueByType('boolean', 'false')).toBe(false)
  })
})
