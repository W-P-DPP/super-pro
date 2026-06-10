import { MessageSquarePlusIcon, SendIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { SubmitSuggestionRequestDto, SuggestionSourceApp } from '@super-pro/shared-types'
import { useIsMobile } from '../hooks/use-mobile'
import {
  clampCollectorPosition,
  getDefaultCollectorPosition,
  snapCollectorPosition,
  type SuggestionCollectorPosition,
  type SuggestionCollectorViewport,
} from './suggestion-collector-position.ts'
import { Button } from './ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from './ui/drawer'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { toast } from './ui/toast'

type SuggestionCollectorProps = {
  sourceApp: SuggestionSourceApp
  onSubmit: (payload: SubmitSuggestionRequestDto) => Promise<unknown>
}

type SuggestionDraft = {
  title: string
  description: string
}

type DragState = {
  pointerId: number
  startX: number
  startY: number
  origin: SuggestionCollectorPosition
  moved: boolean
}

const INITIAL_DRAFT: SuggestionDraft = {
  title: '',
  description: '',
}

const DRAG_DISTANCE_THRESHOLD = 6
const FLOATING_BUTTON_CLASS_NAME =
  'fixed z-40 size-12 rounded-full shadow-xl touch-none select-none'

function resolvePageUrl() {
  if (typeof window === 'undefined') {
    return undefined
  }

  return window.location.href
}

function getViewportSize(): SuggestionCollectorViewport {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  }
}

function SuggestionForm({
  draft,
  submitting,
  onChange,
}: {
  draft: SuggestionDraft
  submitting: boolean
  onChange: (nextDraft: SuggestionDraft) => void
}) {
  const titleLength = draft.title.trim().length
  const descriptionLength = draft.description.trim().length

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="suggestion-title" className="text-sm font-medium">
            建议标题
          </label>
          <span className="text-xs text-muted-foreground">{titleLength}/128</span>
        </div>
        <Input
          id="suggestion-title"
          value={draft.title}
          maxLength={128}
          disabled={submitting}
          placeholder="例如：建议增加更明显的入口说明"
          onChange={(event) => onChange({ ...draft, title: event.target.value })}
        />
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="suggestion-description" className="text-sm font-medium">
            补充说明
          </label>
          <span className="text-xs text-muted-foreground">{descriptionLength}/1000</span>
        </div>
        <Textarea
          id="suggestion-description"
          value={draft.description}
          maxLength={1000}
          disabled={submitting}
          placeholder="可以补充你遇到的问题、想要的能力或建议场景。"
          className="min-h-28 resize-y"
          onChange={(event) => onChange({ ...draft, description: event.target.value })}
        />
      </div>
    </div>
  )
}

export function SuggestionCollector({ sourceApp, onSubmit }: SuggestionCollectorProps) {
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<SuggestionDraft>(INITIAL_DRAFT)
  const [submitting, setSubmitting] = useState(false)
  const [position, setPosition] = useState<SuggestionCollectorPosition | null>(() => {
    if (typeof window === 'undefined') {
      return null
    }

    return getDefaultCollectorPosition(getViewportSize())
  })
  const dragStateRef = useRef<DragState | null>(null)
  const suppressClickRef = useRef(false)

  const canSubmit = draft.title.trim().length > 0

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    function handleResize() {
      setPosition((currentPosition) => {
        const viewport = getViewportSize()

        if (!currentPosition) {
          return getDefaultCollectorPosition(viewport)
        }

        return clampCollectorPosition(currentPosition, viewport)
      })
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  async function handleSubmit() {
    if (!canSubmit || submitting) {
      return
    }

    setSubmitting(true)

    try {
      await onSubmit({
        sourceApp,
        title: draft.title.trim(),
        ...(draft.description.trim() ? { description: draft.description.trim() } : {}),
        ...(resolvePageUrl() ? { pageUrl: resolvePageUrl() } : {}),
      })
      toast.success('建议已提交，我们会进入待办继续跟进。')
      setDraft(INITIAL_DRAFT)
      setOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '建议提交失败，请稍后重试。')
    } finally {
      setSubmitting(false)
    }
  }

  function handleCollectorPointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0 || typeof window === 'undefined') {
      return
    }

    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: position ?? getDefaultCollectorPosition(getViewportSize()),
      moved: false,
    }

    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handleCollectorPointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    const dragState = dragStateRef.current

    if (!dragState || dragState.pointerId !== event.pointerId || typeof window === 'undefined') {
      return
    }

    const deltaX = event.clientX - dragState.startX
    const deltaY = event.clientY - dragState.startY

    if (!dragState.moved && Math.hypot(deltaX, deltaY) >= DRAG_DISTANCE_THRESHOLD) {
      dragState.moved = true
    }

    if (!dragState.moved) {
      return
    }

    setPosition(
      clampCollectorPosition(
        {
          x: dragState.origin.x + deltaX,
          y: dragState.origin.y + deltaY,
        },
        getViewportSize(),
      ),
    )
  }

  function finishCollectorDrag(event: React.PointerEvent<HTMLButtonElement>) {
    const dragState = dragStateRef.current

    if (!dragState || dragState.pointerId !== event.pointerId || typeof window === 'undefined') {
      return
    }

    dragStateRef.current = null

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    if (!dragState.moved) {
      return
    }

    suppressClickRef.current = true
    setPosition((currentPosition) =>
      snapCollectorPosition(currentPosition ?? dragState.origin, getViewportSize()),
    )
    window.setTimeout(() => {
      suppressClickRef.current = false
    }, 0)
  }

  function handleCollectorClick() {
    if (suppressClickRef.current) {
      return
    }

    setOpen(true)
  }

  const content = (
    <>
      <div className="px-4 pb-4 md:px-0 md:pb-0">
        <SuggestionForm draft={draft} submitting={submitting} onChange={setDraft} />
      </div>
      <DialogFooter className="md:-mx-0 md:-mb-0 md:rounded-none md:border-0 md:bg-transparent md:p-0">
        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
          取消
        </Button>
        <Button type="button" onClick={() => void handleSubmit()} disabled={!canSubmit || submitting}>
          <SendIcon data-icon="inline-start" />
          {submitting ? '提交中...' : '提交建议'}
        </Button>
      </DialogFooter>
    </>
  )

  return (
    <>
      <Button
        type="button"
        size="icon"
        aria-label="提交建议"
        title="提交建议"
        className={FLOATING_BUTTON_CLASS_NAME}
        style={
          position
            ? {
                left: position.x,
                top: position.y,
              }
            : undefined
        }
        onClick={handleCollectorClick}
        onDragStart={(event) => event.preventDefault()}
        onPointerCancel={finishCollectorDrag}
        onPointerDown={handleCollectorPointerDown}
        onPointerMove={handleCollectorPointerMove}
        onPointerUp={finishCollectorDrag}
      >
        <MessageSquarePlusIcon />
      </Button>

      {isMobile ? (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="max-h-[85vh]">
            <DrawerHeader>
              <DrawerTitle>提交建议</DrawerTitle>
              <DrawerDescription>建议会直接进入我们的待办列表，方便后续统一跟进。</DrawerDescription>
            </DrawerHeader>
            {content}
            <DrawerFooter />
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>提交建议</DialogTitle>
              <DialogDescription>建议会直接进入我们的待办列表，方便后续统一跟进。</DialogDescription>
            </DialogHeader>
            {content}
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
