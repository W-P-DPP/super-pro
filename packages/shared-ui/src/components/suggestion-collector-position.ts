export type SuggestionCollectorViewport = {
  width: number
  height: number
}

export type SuggestionCollectorPosition = {
  x: number
  y: number
}

export const SUGGESTION_COLLECTOR_BUTTON_SIZE = 48

export function resolveCollectorInset(viewportWidth: number) {
  return viewportWidth >= 768 ? 24 : 16
}

export function getDefaultCollectorPosition(
  viewport: SuggestionCollectorViewport,
  buttonSize = SUGGESTION_COLLECTOR_BUTTON_SIZE,
): SuggestionCollectorPosition {
  const inset = resolveCollectorInset(viewport.width)

  return {
    x: Math.max(inset, viewport.width - buttonSize - inset),
    y: Math.max(inset, viewport.height - buttonSize - inset),
  }
}

export function clampCollectorPosition(
  position: SuggestionCollectorPosition,
  viewport: SuggestionCollectorViewport,
  buttonSize = SUGGESTION_COLLECTOR_BUTTON_SIZE,
): SuggestionCollectorPosition {
  const inset = resolveCollectorInset(viewport.width)
  const maxX = Math.max(inset, viewport.width - buttonSize - inset)
  const maxY = Math.max(inset, viewport.height - buttonSize - inset)

  return {
    x: Math.min(Math.max(position.x, inset), maxX),
    y: Math.min(Math.max(position.y, inset), maxY),
  }
}

export function snapCollectorPosition(
  position: SuggestionCollectorPosition,
  viewport: SuggestionCollectorViewport,
  buttonSize = SUGGESTION_COLLECTOR_BUTTON_SIZE,
): SuggestionCollectorPosition {
  const inset = resolveCollectorInset(viewport.width)
  const clampedPosition = clampCollectorPosition(position, viewport, buttonSize)
  const isLeftSide = clampedPosition.x + buttonSize / 2 <= viewport.width / 2

  return {
    x: isLeftSide ? inset : Math.max(inset, viewport.width - buttonSize - inset),
    y: clampedPosition.y,
  }
}
