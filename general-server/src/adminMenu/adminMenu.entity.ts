import { BaseEntity, BaseSchemaColumns } from '@super-pro/shared-server';
import type { AdminMenuIconKey, AdminMenuNodeType } from '@super-pro/shared-types';
import { EntitySchema } from 'typeorm';
import type { AdminMenuSeedNode } from './adminMenu.seed.ts';

export class AdminMenuEntity extends BaseEntity {
  id!: number;
  parentId!: number | null;
  name!: string;
  shortTitle!: string;
  slug!: string | null;
  iconKey!: AdminMenuIconKey;
  menuType!: AdminMenuNodeType;
  status!: number;
  sort!: number;
  description!: string;
  badge!: string;
  permissionCode!: string;
  children: AdminMenuEntity[] = [];
}

export const AdminMenuEntitySchema = new EntitySchema<AdminMenuEntity>({
  name: 'AdminMenu',
  target: AdminMenuEntity,
  tableName: 'sys_admin_menu',
  columns: {
    id: {
      name: 'id',
      type: Number,
      primary: true,
      generated: 'increment',
      comment: '主键',
    },
    parentId: {
      name: 'parent_id',
      type: Number,
      nullable: true,
      comment: '父级菜单 ID',
    },
    name: {
      name: 'name',
      type: String,
      length: 64,
      nullable: false,
      default: '',
      comment: '菜单名称',
    },
    shortTitle: {
      name: 'short_title',
      type: String,
      length: 32,
      nullable: false,
      default: '',
      comment: '菜单简称',
    },
    slug: {
      name: 'slug',
      type: String,
      length: 64,
      nullable: true,
      comment: '菜单路由标识',
    },
    iconKey: {
      name: 'icon_key',
      type: String,
      length: 32,
      nullable: false,
      default: 'layout-grid',
      comment: '图标标识',
    },
    menuType: {
      name: 'menu_type',
      type: String,
      length: 16,
      nullable: false,
      default: 'item',
      comment: '菜单类型',
    },
    status: {
      name: 'status',
      type: Number,
      nullable: false,
      default: 1,
      comment: '状态 0-禁用 1-启用',
    },
    sort: {
      name: 'sort',
      type: Number,
      nullable: false,
      default: 0,
      comment: '同级排序',
    },
    description: {
      name: 'description',
      type: String,
      length: 255,
      nullable: false,
      default: '',
      comment: '菜单说明',
    },
    badge: {
      name: 'badge',
      type: String,
      length: 32,
      nullable: false,
      default: '',
      comment: '角标文案',
    },
    permissionCode: {
      name: 'permission_code',
      type: String,
      length: 128,
      nullable: false,
      default: '',
      comment: '关联权限编码',
    },
    ...BaseSchemaColumns,
  },
  indices: [
    {
      name: 'idx_sys_admin_menu_parent_id',
      columns: ['parentId'],
    },
    {
      name: 'idx_sys_admin_menu_sort',
      columns: ['sort'],
    },
    {
      name: 'idx_sys_admin_menu_status',
      columns: ['status'],
    },
  ],
  uniques: [
    {
      name: 'uk_sys_admin_menu_slug',
      columns: ['slug'],
    },
  ],
});

export function cloneAdminMenuNode(node: AdminMenuEntity): AdminMenuEntity {
  const cloned = Object.assign(new AdminMenuEntity(), node);
  cloned.children = node.children.map((child) => cloneAdminMenuNode(child));
  return cloned;
}

export function buildAdminMenuEntityTree(records: readonly AdminMenuEntity[]): AdminMenuEntity[] {
  const nodeMap = new Map<number, AdminMenuEntity>();

  for (const record of records) {
    const node = Object.assign(new AdminMenuEntity(), record);
    node.children = [];
    nodeMap.set(node.id, node);
  }

  const roots: AdminMenuEntity[] = [];
  for (const node of nodeMap.values()) {
    if (node.parentId == null) {
      roots.push(node);
      continue;
    }

    const parent = nodeMap.get(node.parentId);
    if (!parent) {
      roots.push(node);
      continue;
    }

    parent.children.push(node);
  }

  const sortNodes = (nodes: AdminMenuEntity[]) => {
    nodes.sort((left, right) => left.sort - right.sort || left.id - right.id);
    for (const node of nodes) {
      sortNodes(node.children);
    }
  };

  sortNodes(roots);
  return roots;
}

export function findAdminMenuNode(
  nodes: readonly AdminMenuEntity[],
  id: number,
): AdminMenuEntity | null {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }

    const child = findAdminMenuNode(node.children, id);
    if (child) {
      return child;
    }
  }

  return null;
}

export function flattenAdminMenuEntityTree(nodes: readonly AdminMenuEntity[]): AdminMenuEntity[] {
  return nodes.flatMap((node) => [node, ...flattenAdminMenuEntityTree(node.children)]);
}

export function flattenAdminMenuSeedNodes(
  source: readonly AdminMenuSeedNode[],
  parentId: number | null = null,
  nextIdRef: { value: number } = { value: 1 },
): AdminMenuEntity[] {
  return source.flatMap((node, index) => {
    const id = nextIdRef.value;
    nextIdRef.value += 1;

    const entity = Object.assign(new AdminMenuEntity(), {
      id,
      parentId,
      name: node.name.trim(),
      shortTitle: node.shortTitle?.trim() || node.name.trim(),
      slug: node.menuType === 'item' ? node.slug?.trim() || null : null,
      iconKey: node.iconKey,
      menuType: node.menuType,
      status: node.status ?? 1,
      sort: index,
      description: node.description?.trim() || '',
      badge: node.badge?.trim() || '',
      permissionCode: node.permissionCode?.trim() || '',
      createBy: 'system',
      updateBy: 'system',
      createTime: new Date(),
      updateTime: new Date(),
      remark: node.remark?.trim() || '',
      children: [],
    } satisfies AdminMenuEntity);

    return [
      entity,
      ...flattenAdminMenuSeedNodes(node.children ?? [], id, nextIdRef),
    ];
  });
}
