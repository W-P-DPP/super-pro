import * as React from 'react'
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from './table'
import { cn } from '../../lib/utils'

type TreeRowKey = string

export type TreeDataTableCellContext = {
  depth: number
  canExpand: boolean
  isExpanded: boolean
  toggle: () => void
}

export type TreeDataTableColumn<TData> = {
  key: string
  header: React.ReactNode
  cell: (row: TData, context: TreeDataTableCellContext) => React.ReactNode
  headerClassName?: string
  cellClassName?: string
}

type VisibleTreeRow<TData> = {
  id: TreeRowKey
  row: TData
  depth: number
  canExpand: boolean
  isExpanded: boolean
}

type TreeDataTableProps<TData> = {
  columns: TreeDataTableColumn<TData>[]
  data: TData[]
  getRowId: (row: TData) => string | number
  getParentId: (row: TData) => string | number | null | undefined
  caption?: string
  emptyMessage?: string
  className?: string
  rowClassName?: string | ((row: TData, context: TreeDataTableCellContext) => string | undefined)
  defaultExpanded?: boolean
}

function normalizeRowKey(value: string | number) {
  return String(value)
}

function buildTreeIndex<TData>(
  data: TData[],
  getRowId: (row: TData) => string | number,
  getParentId: (row: TData) => string | number | null | undefined,
) {
  const rowsById = new Map<TreeRowKey, TData>()
  const parentIdsById = new Map<TreeRowKey, TreeRowKey | null>()
  const childrenByParentId = new Map<TreeRowKey, TreeRowKey[]>()

  for (const row of data) {
    const rowId = normalizeRowKey(getRowId(row))
    rowsById.set(rowId, row)
    parentIdsById.set(rowId, null)
  }

  for (const row of data) {
    const rowId = normalizeRowKey(getRowId(row))
    const rawParentId = getParentId(row)
    const parentId = rawParentId == null ? null : normalizeRowKey(rawParentId)

    if (!parentId || !rowsById.has(parentId)) {
      parentIdsById.set(rowId, null)
      continue
    }

    parentIdsById.set(rowId, parentId)

    const currentChildren = childrenByParentId.get(parentId) ?? []
    currentChildren.push(rowId)
    childrenByParentId.set(parentId, currentChildren)
  }

  const rootRowIds: TreeRowKey[] = []
  for (const row of data) {
    const rowId = normalizeRowKey(getRowId(row))
    if (parentIdsById.get(rowId) === null) {
      rootRowIds.push(rowId)
    }
  }

  return {
    rowsById,
    childrenByParentId,
    rootRowIds,
  }
}

function buildVisibleTreeRows<TData>(
  rootRowIds: TreeRowKey[],
  rowsById: Map<TreeRowKey, TData>,
  childrenByParentId: Map<TreeRowKey, TreeRowKey[]>,
  expandedRowIds: Set<TreeRowKey>,
) {
  const visibleRows: VisibleTreeRow<TData>[] = []

  function visit(rowId: TreeRowKey, depth: number) {
    const row = rowsById.get(rowId)
    if (!row) {
      return
    }

    const childRowIds = childrenByParentId.get(rowId) ?? []
    const canExpand = childRowIds.length > 0
    const isExpanded = canExpand && expandedRowIds.has(rowId)

    visibleRows.push({
      id: rowId,
      row,
      depth,
      canExpand,
      isExpanded,
    })

    if (!isExpanded) {
      return
    }

    for (const childRowId of childRowIds) {
      visit(childRowId, depth + 1)
    }
  }

  for (const rootRowId of rootRowIds) {
    visit(rootRowId, 0)
  }

  return visibleRows
}

function TreeDataTable<TData>({
  columns,
  data,
  getRowId,
  getParentId,
  caption,
  emptyMessage = 'No data available.',
  className,
  rowClassName,
  defaultExpanded = true,
}: TreeDataTableProps<TData>) {
  const { rowsById, childrenByParentId, rootRowIds } = React.useMemo(
    () => buildTreeIndex(data, getRowId, getParentId),
    [data, getParentId, getRowId],
  )

  const expandableRowIds = React.useMemo(
    () => Array.from(childrenByParentId.keys()),
    [childrenByParentId],
  )

  const [expandedRowIds, setExpandedRowIds] = React.useState<Set<TreeRowKey>>(
    () => new Set(defaultExpanded ? expandableRowIds : []),
  )

  React.useEffect(() => {
    setExpandedRowIds((currentExpandedRowIds) => {
      if (defaultExpanded) {
        return new Set(expandableRowIds)
      }

      const expandableRowIdSet = new Set(expandableRowIds)
      return new Set(
        Array.from(currentExpandedRowIds).filter((rowId) => expandableRowIdSet.has(rowId)),
      )
    })
  }, [defaultExpanded, expandableRowIds])

  const visibleRows = React.useMemo(
    () =>
      buildVisibleTreeRows(rootRowIds, rowsById, childrenByParentId, expandedRowIds),
    [childrenByParentId, expandedRowIds, rootRowIds, rowsById],
  )

  function toggleRow(rowId: TreeRowKey) {
    setExpandedRowIds((currentExpandedRowIds) => {
      const nextExpandedRowIds = new Set(currentExpandedRowIds)

      if (nextExpandedRowIds.has(rowId)) {
        nextExpandedRowIds.delete(rowId)
      } else {
        nextExpandedRowIds.add(rowId)
      }

      return nextExpandedRowIds
    })
  }

  return (
    <Table className={className}>
      {caption ? <TableCaption>{caption}</TableCaption> : null}
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead key={column.key} className={column.headerClassName}>
              {column.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {visibleRows.length > 0 ? (
          visibleRows.map((visibleRow) => {
            const context: TreeDataTableCellContext = {
              depth: visibleRow.depth,
              canExpand: visibleRow.canExpand,
              isExpanded: visibleRow.isExpanded,
              toggle: () => toggleRow(visibleRow.id),
            }

            const resolvedRowClassName =
              typeof rowClassName === 'function'
                ? rowClassName(visibleRow.row, context)
                : rowClassName

            return (
              <TableRow
                key={visibleRow.id}
                aria-expanded={visibleRow.canExpand ? visibleRow.isExpanded : undefined}
                className={resolvedRowClassName}
              >
                {columns.map((column) => (
                  <TableCell
                    key={`${visibleRow.id}-${column.key}`}
                    className={cn(column.cellClassName)}
                  >
                    {column.cell(visibleRow.row, context)}
                  </TableCell>
                ))}
              </TableRow>
            )
          })
        ) : (
          <TableRow>
            <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
              {emptyMessage}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}

export { TreeDataTable }
