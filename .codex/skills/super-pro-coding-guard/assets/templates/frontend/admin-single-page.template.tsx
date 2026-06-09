import { useEffect, useState } from 'react'
import { PlusIcon, RotateCcwIcon, SearchIcon } from 'lucide-react'
import {
  Button,
  Input,
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
  ADMIN_PAGE_FILL_LAYOUT_CLASS,
  ADMIN_PAGE_TOOLBAR_CLASS,
  DEFAULT_PAGE_SIZE,
  ListPagination,
  ModuleSelect,
  type LoadState,
} from '@/pages/admin/module-page-shared'

type __Page__Filters = {
  keyword: string
  status: string
}

type __Page__Row = {
  id: number
  name: string
  status: number
  updateTime: string
}

const TABLE_COLUMN_COUNT = 4

export function __Page__Page() {
  const [rows, setRows] = useState<__Page__Row[]>([])
  const [total, setTotal] = useState(0)
  const [loadState, setLoadState] = useState<LoadState>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [appliedFilters, setAppliedFilters] = useState<__Page__Filters>({
    keyword: '',
    status: 'all',
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [reloadKey, setReloadKey] = useState(0)

  async function load__Page__List() {
    setLoadState('loading')
    setErrorMessage('')

    try {
      // TODO: replace with real API request
      setRows([])
      setTotal(0)
      setLoadState('success')
    } catch (error) {
      setRows([])
      setTotal(0)
      setLoadState('error')
      setErrorMessage(error instanceof Error ? error.message : 'Load list failed. Please retry later.')
    }
  }

  useEffect(() => {
    void load__Page__List()
  }, [appliedFilters, currentPage, pageSize, reloadKey])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <section className={ADMIN_PAGE_FILL_LAYOUT_CLASS}>
      <section className={ADMIN_PAGE_TOOLBAR_CLASS}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.7fr)_minmax(11rem,0.8fr)_auto_auto_auto]">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Search by name, code, or keyword"
              className="h-9 pl-9"
            />
          </div>

          <ModuleSelect
            value={statusFilter}
            onValueChange={setStatusFilter}
            options={[
              { value: 'all', label: 'All status' },
              { value: '1', label: 'Enabled' },
              { value: '0', label: 'Disabled' },
            ]}
          />

          <Button
            type="button"
            className="h-9"
            onClick={() => {
              setCurrentPage(1)
              setAppliedFilters({
                keyword,
                status: statusFilter,
              })
              setReloadKey((currentValue) => currentValue + 1)
            }}
          >
            <SearchIcon data-icon="inline-start" />
            Search
          </Button>

          <Button
            type="button"
            variant="outline"
            className="h-9"
            onClick={() => {
              setKeyword('')
              setStatusFilter('all')
              setCurrentPage(1)
              setAppliedFilters({
                keyword: '',
                status: 'all',
              })
              setReloadKey((currentValue) => currentValue + 1)
            }}
          >
            <RotateCcwIcon data-icon="inline-start" />
            Reset
          </Button>

          <Button type="button" className="h-9" onClick={() => void 0}>
            <PlusIcon data-icon="inline-start" />
            Create __Page__
          </Button>
        </div>
      </section>

      <section className={ADMIN_PAGE_FILL_CARD_CLASS}>
        <div className="flex h-full min-h-0 flex-col gap-4 px-4 py-4 md:px-5 md:py-5">
          <div className="min-h-0 flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated At</TableHead>
                  <TableHead className="w-[12rem]">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loadState === 'loading' ? (
                  <TableRow>
                    <TableCell colSpan={TABLE_COLUMN_COUNT} className="h-24 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Spinner className="size-4" />
                        <span>Loading list...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : loadState === 'error' ? (
                  <TableRow>
                    <TableCell colSpan={TABLE_COLUMN_COUNT} className="h-24 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <span>{errorMessage || 'Load list failed. Please retry later.'}</span>
                        <Button type="button" variant="outline" size="sm" onClick={() => void load__Page__List()}>
                          Retry
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : rows.length > 0 ? (
                  rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{row.status}</TableCell>
                      <TableCell>{row.updateTime}</TableCell>
                      <TableCell>
                        <div className="flex flex-nowrap items-center gap-2 whitespace-nowrap">
                          <Button type="button" variant="ghost" size="sm">
                            View
                          </Button>
                          <Button type="button" variant="ghost" size="sm">
                            Edit
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={TABLE_COLUMN_COUNT} className="h-24 text-center text-muted-foreground">
                      No matching data.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <ListPagination
            currentPage={currentPage}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(nextPageSize) => {
              setPageSize(nextPageSize)
              setCurrentPage(1)
              setReloadKey((currentValue) => currentValue + 1)
            }}
          />
        </div>
      </section>
    </section>
  )
}
