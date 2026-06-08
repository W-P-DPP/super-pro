import type { ReactNode } from 'react'
import {
  Button,
  Card,
  CardContent,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui'
import {
  ADMIN_PAGE_FILL_CARD_CLASS,
  ListPagination,
  type LoadState,
} from '@/pages/admin/module-page-shared'

type __Resource__TableSectionProps<T> = {
  rows: T[]
  columns: string[]
  columnCount: number
  loadState: LoadState
  errorMessage?: string
  emptyText?: string
  loadingText?: string
  onRetry: () => void
  renderRow: (row: T) => ReactNode
  pagination?: {
    currentPage: number
    totalPages: number
    total: number
    pageSize: number
    onPageChange: (page: number) => void
    onPageSizeChange: (pageSize: number) => void
  }
}

export function __Resource__TableSection<T>({
  rows,
  columns,
  columnCount,
  loadState,
  errorMessage = '',
  emptyText = '没有匹配的数据。',
  loadingText = '正在加载列表...',
  onRetry,
  renderRow,
  pagination,
}: __Resource__TableSectionProps<T>) {
  return (
    <Card className={ADMIN_PAGE_FILL_CARD_CLASS}>
      <CardContent className="flex h-full min-h-0 flex-col gap-4">
        <div className="min-h-0 flex-1 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column}>{column}</TableHead>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody>
              {loadState === 'loading' ? (
                <TableRow>
                  <TableCell colSpan={columnCount} className="h-24 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Spinner className="size-4" />
                      <span>{loadingText}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : loadState === 'error' ? (
                <TableRow>
                  <TableCell colSpan={columnCount} className="h-24 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <span>{errorMessage || '加载列表失败，请稍后重试。'}</span>
                      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                        重试
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : rows.length > 0 ? (
                rows.map(renderRow)
              ) : (
                <TableRow>
                  <TableCell colSpan={columnCount} className="h-24 text-center text-muted-foreground">
                    {emptyText}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {pagination ? (
          <ListPagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            total={pagination.total}
            pageSize={pagination.pageSize}
            onPageChange={pagination.onPageChange}
            onPageSizeChange={pagination.onPageSizeChange}
          />
        ) : null}
      </CardContent>
    </Card>
  )
}
