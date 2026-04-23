export const AI_DEMAND_WORKSPACE_PLAN = {
  docsPath: 'docs/ai-demand-workflow',
  packages: {
    contracts: {
      packageName: '@super-pro/ai-demand-contracts',
      path: 'packages/ai-demand-contracts',
      status: 'active',
    },
    config: {
      packageName: '@super-pro/ai-demand-config',
      path: 'packages/ai-demand-config',
      status: 'active',
    },
  },
  futureApps: {
    server: {
      packageName: '@super-pro/ai-demand-server',
      path: 'ai-demand-server',
      status: 'scaffolded',
    },
    console: {
      packageName: '@super-pro/ai-demand-console',
      path: 'ai-demand-console',
      status: 'planned',
    },
  },
} as const;

export type AiDemandWorkspacePlan = typeof AI_DEMAND_WORKSPACE_PLAN;
