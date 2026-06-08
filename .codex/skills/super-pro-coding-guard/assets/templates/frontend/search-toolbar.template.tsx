import { PlusIcon, RotateCcwIcon, SearchIcon } from 'lucide-react'
import { Button, Card, CardContent, Input } from '@/components/ui'
import { ModuleSelect, type SelectOption } from '@/pages/admin/module-page-shared'

export type __Resource__Filters = {
  keyword: string
  status: string
}

type __Resource__SearchToolbarProps = {
  keyword: string
  statusFilter: string
  statusOptions?: SelectOption[]
  canCreate?: boolean
  createLabel?: string
  keywordPlaceholder?: string
  onKeywordChange: (value: string) => void
  onStatusChange: (value: string) => void
  onSearch: () => void
  onReset: () => void
  onCreate?: () => void
}

const DEFAULT_STATUS_OPTIONS: SelectOption[] = [
  { value: 'all', label: '全部状态' },
  { value: '1', label: '正常' },
  { value: '0', label: '冻结' },
]

export function __Resource__SearchToolbar({
  keyword,
  statusFilter,
  statusOptions = DEFAULT_STATUS_OPTIONS,
  canCreate = false,
  createLabel = '新增',
  keywordPlaceholder = '搜索名称、编码或关键字',
  onKeywordChange,
  onStatusChange,
  onSearch,
  onReset,
  onCreate,
}: __Resource__SearchToolbarProps) {
  return (
    <Card className="shrink-0 border border-border/70 bg-card/95 shadow-sm">
      <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.7fr)_minmax(11rem,0.8fr)_auto_auto_auto]">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={keyword}
            onChange={(event) => onKeywordChange(event.target.value)}
            placeholder={keywordPlaceholder}
            className="h-9 pl-9"
          />
        </div>

        <ModuleSelect value={statusFilter} onValueChange={onStatusChange} options={statusOptions} />

        <Button type="button" className="h-9" onClick={onSearch}>
          <SearchIcon data-icon="inline-start" />
          搜索
        </Button>

        <Button type="button" variant="outline" className="h-9" onClick={onReset}>
          <RotateCcwIcon data-icon="inline-start" />
          重置
        </Button>

        {canCreate && onCreate ? (
          <Button type="button" className="h-9" onClick={onCreate}>
            <PlusIcon data-icon="inline-start" />
            {createLabel}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}
