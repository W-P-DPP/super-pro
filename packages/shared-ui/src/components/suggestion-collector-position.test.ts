import { describe, expect, it } from 'vitest'
import {
  SUGGESTION_COLLECTOR_BUTTON_SIZE,
  clampCollectorPosition,
  getDefaultCollectorPosition,
  resolveCollectorInset,
  snapCollectorPosition,
} from './suggestion-collector-position.ts'

describe('suggestion collector position', () => {
  it('uses a tighter inset on mobile widths', () => {
    expect(resolveCollectorInset(375)).toBe(16)
  })

  it('uses a larger inset on desktop widths', () => {
    expect(resolveCollectorInset(1280)).toBe(24)
  })

  it('places the default button position at the bottom right corner', () => {
    expect(getDefaultCollectorPosition({ width: 1280, height: 720 })).toEqual({
      x: 1280 - SUGGESTION_COLLECTOR_BUTTON_SIZE - 24,
      y: 720 - SUGGESTION_COLLECTOR_BUTTON_SIZE - 24,
    })
  })

  it('clamps dragging within the visible viewport', () => {
    expect(
      clampCollectorPosition(
        { x: -100, y: 9999 },
        { width: 390, height: 844 },
      ),
    ).toEqual({
      x: 16,
      y: 844 - SUGGESTION_COLLECTOR_BUTTON_SIZE - 16,
    })
  })

  it('snaps to the left edge when released on the left half', () => {
    expect(
      snapCollectorPosition(
        { x: 40, y: 220 },
        { width: 390, height: 844 },
      ),
    ).toEqual({
      x: 16,
      y: 220,
    })
  })

  it('snaps to the right edge when released on the right half', () => {
    expect(
      snapCollectorPosition(
        { x: 260, y: 220 },
        { width: 390, height: 844 },
      ),
    ).toEqual({
      x: 390 - SUGGESTION_COLLECTOR_BUTTON_SIZE - 16,
      y: 220,
    })
  })
})
