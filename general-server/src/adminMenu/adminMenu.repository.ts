import type { EntityManager, Repository } from 'typeorm';
import initDataBase, { getDataSource } from '../../utils/mysql.ts';
import {
  ADMIN_CONSOLE_PERMISSION_CODES,
  type AdminMenuIconKey,
  type AdminMenuNodeType,
} from '@super-pro/shared-types';
import { ADMIN_MENU_SEED_NODES } from './adminMenu.seed.ts';
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

const APPLICATION_GROUP_NAME = '应用';
const APPLICATION_GROUP_SHORT_TITLE = '应用';
const APPLICATION_GROUP_ICON_KEY: AdminMenuIconKey = 'sparkles';
const TODOS_MENU_NAME = '待办管理';
const TODOS_MENU_SHORT_TITLE = '待办';
const TODOS_MENU_SLUG = 'todos';
const TODOS_MENU_ICON_KEY: AdminMenuIconKey = 'file-text';
const TODOS_MENU_PERMISSION_CODE = ADMIN_CONSOLE_PERMISSION_CODES.todosMenuView;

function sortMenuRecords(left: AdminMenuEntity, right: AdminMenuEntity): number {
  return left.sort - right.sort || left.id - right.id;
}

function getNextSiblingSort(records: readonly AdminMenuEntity[], parentId: number | null): number {
  return records
    .filter((record) => record.deleteFlag === 0 && sameParent(record.parentId, parentId))
    .sort(sortMenuRecords).length;
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

      await this.syncTodoAdminMenuSeed(manager);
    });
  }

  private async syncTodoAdminMenuSeed(manager: EntityManager): Promise<void> {
    const repository = manager.getRepository(AdminMenuEntity);
    const records = await repository.find({
      order: {
        sort: 'ASC',
        id: 'ASC',
      },
    });

    let applicationGroup =
      records.find(
        (record) =>
          record.deleteFlag === 0 &&
          record.menuType === 'group' &&
          record.parentId == null &&
          record.name.trim() === APPLICATION_GROUP_NAME,
      ) ?? null;

    if (!applicationGroup) {
      const reactivatableGroup =
        records.find(
          (record) =>
            record.menuType === 'group' &&
            record.parentId == null &&
            record.name.trim() === APPLICATION_GROUP_NAME,
        ) ?? null;

      if (reactivatableGroup) {
        reactivatableGroup.deleteFlag = 0;
        reactivatableGroup.updateBy = 'system';
        applicationGroup = await repository.save(reactivatableGroup);
      } else {
        applicationGroup = await repository.save(
          repository.create({
            parentId: null,
            name: APPLICATION_GROUP_NAME,
            shortTitle: APPLICATION_GROUP_SHORT_TITLE,
            slug: null,
            iconKey: APPLICATION_GROUP_ICON_KEY,
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

      records.push(applicationGroup);
    }

    const todosMenu =
      records.find((record) => record.deleteFlag === 0 && record.slug === TODOS_MENU_SLUG) ?? null;

    if (!todosMenu) {
      const reactivatableTodos = records.find((record) => record.slug === TODOS_MENU_SLUG) ?? null;

      if (reactivatableTodos) {
        reactivatableTodos.parentId = applicationGroup.id;
        reactivatableTodos.deleteFlag = 0;
        reactivatableTodos.status = 1;
        reactivatableTodos.sort = getNextSiblingSort(records, applicationGroup.id);
        reactivatableTodos.permissionCode = TODOS_MENU_PERMISSION_CODE;
        reactivatableTodos.updateBy = 'system';
        await repository.save(reactivatableTodos);
        return;
      }

      await repository.save(
        repository.create({
          parentId: applicationGroup.id,
          name: TODOS_MENU_NAME,
          shortTitle: TODOS_MENU_SHORT_TITLE,
          slug: TODOS_MENU_SLUG,
          iconKey: TODOS_MENU_ICON_KEY,
          menuType: 'item',
          status: 1,
          sort: getNextSiblingSort(records, applicationGroup.id),
          description: '',
          badge: '',
          permissionCode: TODOS_MENU_PERMISSION_CODE,
          createBy: 'system',
          updateBy: 'system',
          remark: '',
        }),
      );
      return;
    }

    if (todosMenu.permissionCode.trim() !== TODOS_MENU_PERMISSION_CODE) {
      todosMenu.permissionCode = TODOS_MENU_PERMISSION_CODE;
      todosMenu.updateBy = 'system';
      await repository.save(todosMenu);
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
