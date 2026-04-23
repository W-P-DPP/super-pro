import type { AiDemandScoringProfile } from '@super-pro/ai-demand-contracts';

export const AI_DEMAND_DEFAULT_SCORING_PROFILE: AiDemandScoringProfile = {
  id: 'scoring_profile.default_mvp',
  name: '默认机会评分策略',
  strategy_key: 'default_opportunity_scoring',
  version: 'v1',
  dimensions: [
    {
      key: 'demand_strength',
      label: '需求强度',
      description: '判断用户痛点是否持续、具体且具有足够强度。',
      enabled: true,
      required: true,
      default_weight: 0.22,
      score_scale: { min: 0, max: 5, step: 1 },
      scoring_guidance: [
        '优先识别高频、强烈且重复出现的问题表述。',
        '如果证据只来自个别样本，应降低高分倾向。',
      ],
      evidence_requirements: [
        '至少引用 2 条相关 signal。',
        '问题陈述应能回溯到原始证据。',
      ],
    },
    {
      key: 'strategic_fit',
      label: '战略匹配度',
      description: '判断机会是否贴合当前产品方向、能力边界和目标人群。',
      enabled: true,
      required: true,
      default_weight: 0.18,
      score_scale: { min: 0, max: 5, step: 1 },
      scoring_guidance: [
        '优先给与现有业务方向一致且目标用户清晰的机会更高分。',
        '与当前战略偏离较大时应明确扣分理由。',
      ],
    },
    {
      key: 'implementation_feasibility',
      label: '实现可行性',
      description: '评估方案在一期约束下的技术与交付可行性。',
      enabled: true,
      required: true,
      default_weight: 0.16,
      score_scale: { min: 0, max: 5, step: 1 },
      scoring_guidance: [
        '越接近现有能力、依赖越少、上线链路越短，分数越高。',
        '涉及重依赖、复杂集成或长期不确定项时应降分。',
      ],
    },
    {
      key: 'distribution_potential',
      label: '分发潜力',
      description: '判断机会是否具备自然流量、传播或触达优势。',
      enabled: true,
      required: true,
      default_weight: 0.18,
      score_scale: { min: 0, max: 5, step: 1 },
      scoring_guidance: [
        '存在明确渠道、可触达场景或自传播机制时加分。',
        '完全依赖未知流量来源时应保守处理。',
      ],
    },
    {
      key: 'result_visibility',
      label: '结果可见性',
      description: '判断价值产出是否容易被用户感知、验证和复盘。',
      enabled: true,
      required: true,
      default_weight: 0.14,
      score_scale: { min: 0, max: 5, step: 1 },
      scoring_guidance: [
        '结果越可量化、越容易展示给用户，分数越高。',
        '产出模糊或无法证明改进时应降低评分。',
      ],
    },
    {
      key: 'evidence_confidence',
      label: '证据置信度',
      description: '判断现有证据是否足以支撑问题与机会结论。',
      enabled: true,
      required: true,
      default_weight: 0.12,
      score_scale: { min: 0, max: 5, step: 1 },
      scoring_guidance: [
        '多来源、低噪声、可追溯证据应提升评分。',
        '若 gap_notes 明显或样本过少，必须降分。',
      ],
      evidence_requirements: [
        'brief 需附带 evidence_summary。',
        '评分理由需显式引用证据。',
      ],
    },
    {
      key: 'commercial_potential',
      label: '商业化潜力',
      description: '可选维度，用于评估后续商业化或付费可能性。',
      enabled: false,
      required: false,
      default_weight: 0.08,
      score_scale: { min: 0, max: 5, step: 1 },
      scoring_guidance: [
        '仅在明确启用时参与评分。',
        '如果现阶段没有足够商业化信息，不应强行打高分。',
      ],
    },
  ],
  weights: {
    demand_strength: 0.22,
    strategic_fit: 0.18,
    implementation_feasibility: 0.16,
    distribution_potential: 0.18,
    result_visibility: 0.14,
    evidence_confidence: 0.12,
    commercial_potential: 0.08,
  },
  scale: {
    min: 0,
    max: 100,
    step: 1,
  },
  normalization: {
    method: 'weighted_average',
    source_scale: {
      min: 0,
      max: 5,
      step: 1,
    },
    output_scale: {
      min: 0,
      max: 100,
      step: 1,
    },
    round_to: 0,
  },
  gate_rules: [
    {
      review_stage: 'pre_prd_gate',
      rule_key: 'minimum_total_score',
      description: '总分低于 60 时，不建议直接进入 PRD 生成。',
      decision: 'needs_more_evidence',
      enabled: true,
      aggregation: 'all',
      conditions: [
        {
          field: 'score_total',
          operator: 'lt',
          value: 60,
        },
      ],
      condition: {
        aggregation: 'all',
        conditions: [
          {
            field: 'score_total',
            operator: 'lt',
            value: 60,
          },
        ],
      },
    },
    {
      review_stage: 'pre_prd_gate',
      rule_key: 'minimum_evidence_confidence',
      description: '证据置信度低于 2.5 分时，阻断继续生成 PRD。',
      decision: 'blocked',
      enabled: true,
      aggregation: 'all',
      conditions: [
        {
          field: 'dimension_score',
          dimension_key: 'evidence_confidence',
          operator: 'lt',
          value: 2.5,
        },
      ],
      condition: {
        aggregation: 'all',
        conditions: [
          {
            field: 'dimension_score',
            dimension_key: 'evidence_confidence',
            operator: 'lt',
            value: 2.5,
          },
        ],
      },
    },
    {
      review_stage: 'pre_prd_gate',
      rule_key: 'minimum_score_confidence',
      description: '整体评分置信度低于 0.6 时，需要先补证据再做 Gate 1。',
      decision: 'needs_more_evidence',
      enabled: true,
      aggregation: 'all',
      conditions: [
        {
          field: 'score_confidence',
          operator: 'lt',
          value: 0.6,
        },
      ],
      condition: {
        aggregation: 'all',
        conditions: [
          {
            field: 'score_confidence',
            operator: 'lt',
            value: 0.6,
          },
        ],
      },
    },
  ],
  enabled: true,
  metadata: {
    owner: 'ai-demand',
    stage: 'mvp',
    notes: '默认 profile 适用于一期 opportunity_scoring 与 Gate 1 前置评审。',
  },
};

export const AI_DEMAND_DEFAULT_SCORING_PROFILES = [
  AI_DEMAND_DEFAULT_SCORING_PROFILE,
] as const;
