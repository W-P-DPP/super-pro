import type { SiteMenuImportSourceDto } from '../../src/siteMenu/siteMenu.dto.ts';
import {
  buildSiteMenuEntityTree,
  findSiteMenuNode,
  flattenSiteMenuSeedNodes,
  SiteMenuEntity,
} from '../../src/siteMenu/siteMenu.entity.ts';
import type {
  CreateSiteMenuEntityInput,
  SiteMenuRepositoryPort,
  UpdateSiteMenuEntityInput,
} from '../../src/siteMenu/siteMenu.repository.ts';
import { SiteMenuBusinessError, SiteMenuService } from '../../src/siteMenu/siteMenu.service.ts';

function cloneTree(nodes: SiteMenuEntity[]): SiteMenuEntity[] {
  return buildSiteMenuEntityTree(
    nodes.flatMap((node) => {
      const current = Object.assign(new SiteMenuEntity(), node, {
        children: [],
      });

      return [current, ...cloneTree(node.children)];
    }),
  );
}

function createRepositoryMock(records: SiteMenuEntity[]): SiteMenuRepositoryPort {
  return {
    async getTree() {
      return cloneTree(buildSiteMenuEntityTree(records));
    },
    async getNodeById(id: number) {
      const tree = cloneTree(buildSiteMenuEntityTree(records));
      return findSiteMenuNode(tree, id);
    },
    async createNode(input: CreateSiteMenuEntityInput) {
      return Object.assign(new SiteMenuEntity(), {
        id: 99,
        parentId: input.parentId,
        name: input.name,
        path: input.path,
        icon: input.icon,
        isTop: input.parentId == null,
        strict: input.strict,
        hide: input.hide,
        sort: input.sort ?? 0,
        children: [],
      });
    },
    async updateNode(id: number, input: UpdateSiteMenuEntityInput) {
      const current = records.find((record) => record.id === id);
      if (!current) {
        return null;
      }

      return Object.assign(new SiteMenuEntity(), current, input, {
        parentId: Object.prototype.hasOwnProperty.call(input, 'parentId')
          ? (input.parentId ?? null)
          : current.parentId,
        strict: Object.prototype.hasOwnProperty.call(input, 'strict')
          ? input.strict
          : current.strict,
        hide: Object.prototype.hasOwnProperty.call(input, 'hide')
          ? input.hide
          : current.hide,
        children: [],
      });
    },
    async deleteNode(id: number) {
      const tree = cloneTree(buildSiteMenuEntityTree(records));
      return findSiteMenuNode(tree, id);
    },
    async importTreeFromSource(source: SiteMenuImportSourceDto) {
      return cloneTree(buildSiteMenuEntityTree(flattenSiteMenuSeedNodes(source)));
    },
  };
}

describe('SiteMenuService parent level guard', () => {
  const records = flattenSiteMenuSeedNodes([
    {
      id: 1,
      name: 'root-one',
      path: '/root-one',
      isTop: true,
      strict: false,
      hide: false,
      icon: '/icons/root-one.svg',
      children: [
        {
          id: 11,
          name: 'child-one',
          path: '/child-one',
          icon: '/icons/child-one.svg',
        },
      ],
    },
    {
      id: 2,
      name: 'root-two',
      path: '/root-two',
      isTop: true,
      strict: false,
      hide: false,
      icon: '/icons/root-two.svg',
      children: [
        {
          id: 21,
          name: 'child-two',
          path: '/child-two',
          icon: '/icons/child-two.svg',
        },
      ],
    },
  ]);

  it('rejects create when parent menu is not top level', async () => {
    const service = new SiteMenuService(createRepositoryMock(records));

    await expect(
      service.createSiteMenu({
        parentId: 11,
        name: 'invalid child',
        path: '/invalid-child',
        icon: '/icons/test.svg',
      }),
    ).rejects.toMatchObject<Partial<SiteMenuBusinessError>>({
      message: '父级菜单只能选择一级菜单',
    });
  });

  it('rejects update when parent menu is not top level', async () => {
    const service = new SiteMenuService(createRepositoryMock(records));

    await expect(
      service.updateSiteMenu(1, {
        parentId: 21,
      }),
    ).rejects.toMatchObject<Partial<SiteMenuBusinessError>>({
      message: '父级菜单只能选择一级菜单',
    });
  });
});
