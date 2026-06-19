import type { EntityManager, Repository } from 'typeorm';
import initDataBase, { getDataSource } from '../../utils/mysql.ts';
import type { AdminMenuIconKey, AdminMenuNodeType } from '@super-pro/shared-types';
import { ADMIN_MENU_SEED_NODES, type AdminMenuSeedNode } from './adminMenu.seed.ts';
import {
  AdminMenuEntity,
  buildAdminMenuEntityTree,
  cloneAdminMenuNode,
  findAdminMenuNode,
  flattenAdminMenuEntityTree,
  flattenAdminMenuSeedNodes,
} from './adminMenu.entity.ts';

export interface CreateAdminMenuEntityInput {
  parentId: number | null;
  name: string;
  shortTitle: string;
  slug: string | null;
  iconKey: AdminMenuIconKey;
  menuType: AdminMenuNodeType;
  status: number;
  sort?: number;
  description: string;
  badge: string;
  permissionCode: string;
  remark?: string;
}

export interface UpdateAdminMenuEntityInput {
  parentId?: number | null;
  name?: string;
  shortTitle?: string;
  slug?: string | null;
  iconKey?: AdminMenuIconKey;
  menuType?: AdminMenuNodeType;
  status?: number;
  sort?: number;
  description?: string;
  badge?: string;
  permissionCode?: string;
  remark?: string;
}

export interface AdminMenuRepositoryPort {
  getTree(): Promise<AdminMenuEntity[]>;
  getNodeById(id: number): Promise<AdminMenuEntity | null>;
  getNodeBySlug(slug: string): Promise<AdminMenuEntity | null>;
  createNode(input: CreateAdminMenuEntityInput): Promise<AdminMenuEntity | null>;
  updateNode(id: number, input: UpdateAdminMenuEntityInput): Promise<AdminMenuEntity | null>;
  deleteNode(id: number): Promise<AdminMenuEntity | null>;
}

function normalizeSort(sort: number | undefined, size: number): number {
  if (sort === undefined) {
    return size;
  }

  if (sort < 0) {
    return 0;
  }

  if (sort > size) {
    return size;
  }

  return sort;
}

function sameParent(left: number | null | undefined, right: number | null | undefined): boolean {
  return (left ?? null) === (right ?? null);
}

function isDescendant(node: AdminMenuEntity, targetId: number): boolean {
  return node.children.some((child) => child.id === targetId || isDescendant(child, targetId));
}

function assignSequentialSort(nodes: AdminMenuEntity[]): AdminMenuEntity[] {
  nodes.forEach((node, index) => {
    node.sort = index;
  });

  return nodes;
}

async function ensureDataSource() {
  const current = getDataSource();
  if (current?.isInitialized) {
    return current;
  }

  return initDataBase();
}

const TODOS_MENU_SLUG = 'todos';
const GLOBAL_CONFIG_MENU_SLUG = 'global-config';
const REQUIRED_ADMIN_MENU_SLUGS = [TODOS_MENU_SLUG, GLOBAL_CONFIG_MENU_SLUG] as const;

interface SeededAdminMenuItem {
  group: AdminMenuSeedNode;
  item: AdminMenuSeedNode & {
    slug: string;
    permissionCode: string;
  };
}

function sortMenuRecords(left: AdminMenuEntity, right: AdminMenuEntity): number {
  return left.sort - right.sort || left.id - right.id;
}

function getNextSiblingSort(records: readonly AdminMenuEntity[], parentId: number | null): number {
  return records
    .filter((record) => record.deleteFlag === 0 && sameParent(record.parentId, parentId))
    .sort(sortMenuRecords).length;
}

function findSeededAdminMenuItem(slug: string): SeededAdminMenuItem {
  for (const group of ADMIN_MENU_SEED_NODES) {
    const item = group.children?.find((child) => child.slug === slug);
    if (item?.slug && item.permissionCode) {
      return {
        group,
        item: item as SeededAdminMenuItem['item'],
      };
    }
  }

  throw new Error(`missing admin menu seed for slug: ${slug}`);
}

export class AdminMenuRepository implements AdminMenuRepositoryPort {
  private initializationPromise: Promise<void> | null = null;

  async ensureInitialized(): Promise<void> {
    if (!this.initializationPromise) {
      this.initializationPromise = this.initializeInternal()
        .then(() => {
          this.initializationPromise = null;
        })
        .catch((error) => {
          this.initializationPromise = null;
          throw error;
        });
    }

    return this.initializationPromise;
  }

  private async initializeInternal(): Promise<void> {
    const dataSource = await ensureDataSource();
    await dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(AdminMenuEntity);
      const count = await repository.count();

      if (count === 0) {
        const seedEntities = flattenAdminMenuSeedNodes(ADMIN_MENU_SEED_NODES);
        if (seedEntities.length > 0) {
          await repository.upsert(seedEntities, ['id']);
        }
      }

      await this.syncRequiredAdminMenuSeeds(manager);
    });
  }

  private async syncRequiredAdminMenuSeeds(manager: EntityManager): Promise<void> {
    for (const slug of REQUIRED_ADMIN_MENU_SLUGS) {
      await this.syncSeededAdminMenuItem(manager, slug);
    }
  }

  private async syncSeededAdminMenuItem(manager: EntityManager, slug: string): Promise<void> {
    const seed = findSeededAdminMenuItem(slug);
    const repository = manager.getRepository(AdminMenuEntity);
    const records = await repository.find({
      order: {
        sort: 'ASC',
        id: 'ASC',
      },
    });

    const groupName = seed.group.name.trim();
    let parentGroup =
      records.find(
        (record) =>
          record.deleteFlag === 0 &&
          record.menuType === 'group' &&
          record.parentId == null &&
          record.name.trim() === groupName,
      ) ?? null;

    if (!parentGroup) {
      const reactivatableGroup =
        records.find(
          (record) =>
            record.menuType === 'group' &&
            record.parentId == null &&
            record.name.trim() === groupName,
        ) ?? null;

      if (reactivatableGroup) {
        reactivatableGroup.deleteFlag = 0;
        reactivatableGroup.status = 1;
        reactivatableGroup.updateBy = 'system';
        parentGroup = await repository.save(reactivatableGroup);
      } else {
        parentGroup = await repository.save(
          repository.create({
            parentId: null,
            name: groupName,
            shortTitle: seed.group.shortTitle?.trim() || groupName,
            slug: null,
            iconKey: seed.group.iconKey,
            menuType: 'group',
            status: 1,
            sort: getNextSiblingSort(records, null),
            description: '',
            badge: '',
            permissionCode: '',
            createBy: 'system',
            updateBy: 'system',
            remark: '',
          }),
        );
      }

      records.push(parentGroup);
    }

    const seededMenu =
      records.find((record) => record.deleteFlag === 0 && record.slug === seed.item.slug) ?? null;

    if (!seededMenu) {
      const reactivatableMenu =
        records.find((record) => record.slug === seed.item.slug) ?? null;

      if (reactivatableMenu) {
        reactivatableMenu.parentId = parentGroup.id;
        reactivatableMenu.deleteFlag = 0;
        reactivatableMenu.status = 1;
        reactivatableMenu.sort = getNextSiblingSort(records, parentGroup.id);
        reactivatableMenu.permissionCode = seed.item.permissionCode;
        reactivatableMenu.updateBy = 'system';
        await repository.save(reactivatableMenu);
        return;
      }

      await repository.save(
        repository.create({
          parentId: parentGroup.id,
          name: seed.item.name.trim(),
          shortTitle: seed.item.shortTitle?.trim() || seed.item.name.trim(),
          slug: seed.item.slug,
          iconKey: seed.item.iconKey,
          menuType: 'item',
          status: 1,
          sort: getNextSiblingSort(records, parentGroup.id),
          description: seed.item.description?.trim() ?? '',
          badge: seed.item.badge?.trim() ?? '',
          permissionCode: seed.item.permissionCode,
          createBy: 'system',
          updateBy: 'system',
          remark: seed.item.remark?.trim() ?? '',
        }),
      );
      return;
    }

    if (seededMenu.permissionCode.trim() !== seed.item.permissionCode) {
      seededMenu.permissionCode = seed.item.permissionCode;
      seededMenu.updateBy = 'system';
      await repository.save(seededMenu);
    }
  }

  private async getRepository(manager?: EntityManager): Promise<Repository<AdminMenuEntity>> {
    const dataSource = await ensureDataSource();

    if (!manager) {
      await this.ensureInitialized();
      return dataSource.getRepository(AdminMenuEntity);
    }

    return manager.getRepository(AdminMenuEntity);
  }

  private async getAllRecords(manager?: EntityManager): Promise<AdminMenuEntity[]> {
    const repository = await this.getRepository(manager);
    return repository
      .createQueryBuilder('adminMenu')
      .select([
        'adminMenu.id',
        'adminMenu.parentId',
        'adminMenu.name',
        'adminMenu.shortTitle',
        'adminMenu.slug',
        'adminMenu.iconKey',
        'adminMenu.menuType',
        'adminMenu.status',
        'adminMenu.sort',
        'adminMenu.description',
        'adminMenu.badge',
        'adminMenu.permissionCode',
        'adminMenu.createBy',
        'adminMenu.createTime',
        'adminMenu.updateBy',
        'adminMenu.updateTime',
        'adminMenu.remark',
      ])
      .where('adminMenu.deleteFlag = :deleteFlag', { deleteFlag: 0 })
      .orderBy('adminMenu.sort', 'ASC')
      .addOrderBy('adminMenu.id', 'ASC')
      .getMany();
  }

  async getTree(): Promise<AdminMenuEntity[]> {
    const records = await this.getAllRecords();
    return buildAdminMenuEntityTree(records);
  }

  async getNodeById(id: number): Promise<AdminMenuEntity | null> {
    const tree = await this.getTree();
    const node = findAdminMenuNode(tree, id);
    return node ? cloneAdminMenuNode(node) : null;
  }

  async getNodeBySlug(slug: string): Promise<AdminMenuEntity | null> {
    const records = await this.getAllRecords();
    const target = records.find((record) => record.slug === slug) ?? null;
    return target ? Object.assign(new AdminMenuEntity(), target, { children: [] }) : null;
  }

  async createNode(input: CreateAdminMenuEntityInput): Promise<AdminMenuEntity | null> {
    const dataSource = await ensureDataSource();
    await this.ensureInitialized();

    return dataSource.transaction(async (manager) => {
      const repository = await this.getRepository(manager);
      const records = await this.getAllRecords(manager);
      const siblings = records
        .filter((record) => sameParent(record.parentId, input.parentId))
        .sort((left, right) => left.sort - right.sort || left.id - right.id);

      const insertSort = normalizeSort(input.sort, siblings.length);
      const shiftedSiblings = assignSequentialSort([
        ...siblings.slice(0, insertSort),
        Object.assign(new AdminMenuEntity(), {
          id: 0,
          parentId: input.parentId,
          name: '',
          shortTitle: '',
          slug: null,
          iconKey: 'layout-grid',
          menuType: input.menuType,
          status: 1,
          sort: insertSort,
          description: '',
          badge: '',
          permissionCode: '',
        }),
        ...siblings.slice(insertSort),
      ]).filter((node) => node.id !== 0);

      if (shiftedSiblings.length > 0) {
        await repository.save(shiftedSiblings);
      }

      const entity = repository.create({
        parentId: input.parentId,
        name: input.name,
        shortTitle: input.shortTitle,
        slug: input.slug,
        iconKey: input.iconKey,
        menuType: input.menuType,
        status: input.status,
        sort: insertSort,
        description: input.description,
        badge: input.badge,
        permissionCode: input.permissionCode,
        createBy: 'system',
        updateBy: 'system',
        remark: input.remark,
      });

      const saved = await repository.save(entity);
      return Object.assign(new AdminMenuEntity(), saved, { children: [] });
    });
  }

  async updateNode(id: number, input: UpdateAdminMenuEntityInput): Promise<AdminMenuEntity | null> {
    const dataSource = await ensureDataSource();
    await this.ensureInitialized();

    return dataSource.transaction(async (manager) => {
      const repository = await this.getRepository(manager);
      const records = await this.getAllRecords(manager);
      const current = records.find((record) => record.id === id);

      if (!current) {
        return null;
      }

      const tree = buildAdminMenuEntityTree(records);
      const currentTreeNode = findAdminMenuNode(tree, id);
      if (!currentTreeNode) {
        return null;
      }

      const nextParentId = Object.prototype.hasOwnProperty.call(input, 'parentId')
        ? (input.parentId ?? null)
        : current.parentId;

      if (nextParentId === id) {
        return null;
      }

      if (nextParentId != null && isDescendant(currentTreeNode, nextParentId)) {
        return null;
      }

      current.parentId = nextParentId;
      current.name = input.name ?? current.name;
      current.shortTitle = input.shortTitle ?? current.shortTitle;
      current.slug = Object.prototype.hasOwnProperty.call(input, 'slug')
        ? (input.slug ?? null)
        : current.slug;
      current.iconKey = input.iconKey ?? current.iconKey;
      current.menuType = input.menuType ?? current.menuType;
      current.status = input.status ?? current.status;
      current.description = input.description ?? current.description;
      current.badge = input.badge ?? current.badge;
      current.permissionCode = input.permissionCode ?? current.permissionCode;
      current.remark = input.remark ?? current.remark;
      current.updateBy = 'system';

      const recordsToSave: AdminMenuEntity[] = [current];
      if (!sameParent(currentTreeNode.parentId, nextParentId)) {
        const oldSiblings = assignSequentialSort(
          records
            .filter((record) => record.id !== id && sameParent(record.parentId, currentTreeNode.parentId))
            .sort((left, right) => left.sort - right.sort || left.id - right.id),
        );
        const newSiblings = records
          .filter((record) => record.id !== id && sameParent(record.parentId, nextParentId))
          .sort((left, right) => left.sort - right.sort || left.id - right.id);
        const insertSort = normalizeSort(input.sort, newSiblings.length);

        current.sort = insertSort;
        const nextGroup = assignSequentialSort([
          ...newSiblings.slice(0, insertSort),
          current,
          ...newSiblings.slice(insertSort),
        ]);

        recordsToSave.push(...oldSiblings, ...nextGroup);
      } else {
        const siblings = records
          .filter((record) => sameParent(record.parentId, nextParentId))
          .sort((left, right) => left.sort - right.sort || left.id - right.id)
          .filter((record) => record.id !== id);
        const insertSort = normalizeSort(input.sort ?? current.sort, siblings.length);
        const nextGroup = assignSequentialSort([
          ...siblings.slice(0, insertSort),
          current,
          ...siblings.slice(insertSort),
        ]);

        current.sort = insertSort;
        recordsToSave.push(...nextGroup);
      }

      await repository.save(
        recordsToSave.filter(
          (record, index, array) => array.findIndex((item) => item.id === record.id) === index,
        ),
      );

      const refreshedRecords = await this.getAllRecords(manager);
      const refreshedTree = buildAdminMenuEntityTree(refreshedRecords);
      const updated = findAdminMenuNode(refreshedTree, id);
      return updated ? cloneAdminMenuNode(updated) : null;
    });
  }

  async deleteNode(id: number): Promise<AdminMenuEntity | null> {
    const dataSource = await ensureDataSource();
    await this.ensureInitialized();

    return dataSource.transaction(async (manager) => {
      const repository = await this.getRepository(manager);
      const records = await this.getAllRecords(manager);
      const tree = buildAdminMenuEntityTree(records);
      const target = findAdminMenuNode(tree, id);

      if (!target) {
        return null;
      }

      const deletedNodes = flattenAdminMenuEntityTree([target]);
      const deletedIds = deletedNodes.map((node) => node.id);
      const siblings = assignSequentialSort(
        records
          .filter((record) => !deletedIds.includes(record.id) && sameParent(record.parentId, target.parentId))
          .sort((left, right) => left.sort - right.sort || left.id - right.id),
      );

      for (const deletedNode of deletedNodes) {
        deletedNode.deleteFlag = 1;
        deletedNode.updateBy = 'system';
      }

      await repository.save(deletedNodes);
      if (siblings.length > 0) {
        await repository.save(siblings);
      }

      return cloneAdminMenuNode(target);
    });
  }
}

export const adminMenuRepository = new AdminMenuRepository();

export async function initAdminMenuModule(): Promise<void> {
  await adminMenuRepository.ensureInitialized();
}
