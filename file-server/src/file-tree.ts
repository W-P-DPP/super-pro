export type FileNodeType = 'file' | 'folder'

export type FileNode = {
  name: string
  relativePath: string
  type: FileNodeType
  size?: number
  modifiedTime?: string
  children?: FileNode[]
}

export function getChildren(node: FileNode): FileNode[] {
  return node.children ?? []
}

export function findNode(nodes: FileNode[], relativePath: string): FileNode | null {
  for (const node of nodes) {
    if (node.relativePath === relativePath) {
      return node
    }

    const target = findNode(getChildren(node), relativePath)
    if (target) {
      return target
    }
  }

  return null
}

export function getParentPath(relativePath: string): string {
  if (relativePath === '/') {
    return '/'
  }

  const segments = relativePath.split('/').filter(Boolean)
  if (segments.length <= 1) {
    return '/'
  }

  return `/${segments.slice(0, -1).join('/')}`
}

export function getPathChain(relativePath: string): string[] {
  if (relativePath === '/') {
    return ['/']
  }

  const chain = ['/']
  const segments = relativePath.split('/').filter(Boolean)
  let currentPath = ''

  for (const segment of segments) {
    currentPath += `/${segment}`
    chain.push(currentPath)
  }

  return chain
}

export function getFolderPathSet(nodes: FileNode[]): Set<string> {
  const paths = new Set<string>(['/'])

  const walk = (items: FileNode[]) => {
    for (const item of items) {
      if (item.type === 'folder') {
        paths.add(item.relativePath)
        walk(getChildren(item))
      }
    }
  }

  walk(nodes)
  return paths
}

export function reconcileExpandedPaths(
  nodes: FileNode[],
  currentExpandedPaths: string[],
  focusPath: string,
): string[] {
  const validFolderPaths = getFolderPathSet(nodes)
  const nextExpandedPaths = currentExpandedPaths.filter((pathName) =>
    validFolderPaths.has(pathName),
  )

  for (const pathName of getPathChain(focusPath)) {
    if (validFolderPaths.has(pathName) && !nextExpandedPaths.includes(pathName)) {
      nextExpandedPaths.push(pathName)
    }
  }

  if (!nextExpandedPaths.includes('/')) {
    nextExpandedPaths.unshift('/')
  }

  return nextExpandedPaths
}

export function sortNodes(nodes: FileNode[]): FileNode[] {
  return [...nodes]
    .map((node) => ({
      ...node,
      children: sortNodes(getChildren(node)),
    }))
    .sort((left, right) => {
      if (left.type !== right.type) {
        return left.type === 'folder' ? -1 : 1
      }

      return left.name.localeCompare(right.name, 'zh-CN')
    })
}

export function filterTree(nodes: FileNode[], keyword: string): FileNode[] {
  const normalizedKeyword = keyword.trim().toLocaleLowerCase('zh-CN')
  if (!normalizedKeyword) {
    return nodes
  }

  return nodes.flatMap((node) => {
    const children = getChildren(node)
    const ownMatch =
      node.name.toLocaleLowerCase('zh-CN').includes(normalizedKeyword)
      || node.relativePath.toLocaleLowerCase('zh-CN').includes(normalizedKeyword)

    if (node.type === 'file') {
      return ownMatch ? [{ ...node, children: [] }] : []
    }

    const matchedChildren = filterTree(children, normalizedKeyword)

    if (ownMatch) {
      return [{ ...node, children }]
    }

    if (matchedChildren.length > 0) {
      return [{ ...node, children: matchedChildren }]
    }

    return []
  })
}

export function countTreeNodes(nodes: FileNode[]): { files: number; folders: number } {
  return nodes.reduce(
    (result, node) => {
      if (node.type === 'folder') {
        result.folders += 1
        const childCount = countTreeNodes(getChildren(node))
        result.files += childCount.files
        result.folders += childCount.folders
      } else {
        result.files += 1
      }

      return result
    },
    { files: 0, folders: 0 },
  )
}

export function countVisibleNodes(nodes: FileNode[]): number {
  return nodes.reduce((count, node) => count + 1 + countVisibleNodes(getChildren(node)), 0)
}
