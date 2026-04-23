import type { AiDemandJsonObject, AiDemandNullable } from './common.ts';
import type { AiDemandSchemaObjectDefinition } from './schema.ts';
import type {
  AiDemandReviewDecision,
  AiDemandReviewStage,
} from './state.ts';

export const AI_DEMAND_SCORING_DIMENSION_KEYS = [
  'demand_strength',
  'strategic_fit',
  'implementation_feasibility',
  'distribution_potential',
  'result_visibility',
  'evidence_confidence',
  'commercial_potential',
] as const;

export type AiDemandScoringDimensionKey =
  (typeof AI_DEMAND_SCORING_DIMENSION_KEYS)[number];

export type AiDemandScoringScale = {
  min: number;
  max: number;
  step: number;
};

export const AI_DEMAND_SCORING_NORMALIZATION_METHODS = [
  'weighted_average',
] as const;

export type AiDemandScoringNormalizationMethod =
  (typeof AI_DEMAND_SCORING_NORMALIZATION_METHODS)[number];

export type AiDemandScoringNormalization = {
  method: AiDemandScoringNormalizationMethod;
  source_scale: AiDemandScoringScale;
  output_scale: AiDemandScoringScale;
  round_to?: number;
};

export type AiDemandScoringDimension = {
  key: AiDemandScoringDimensionKey | (string & {});
  label: string;
  description: string;
  enabled: boolean;
  required?: boolean;
  default_weight?: number;
  score_scale?: AiDemandScoringScale;
  scoring_guidance?: string[];
  evidence_requirements?: string[];
  metadata?: AiDemandNullable<AiDemandJsonObject>;
};

export type AiDemandScoringWeights = Record<string, number>;

export const AI_DEMAND_GATE_RULE_AGGREGATIONS = ['all', 'any'] as const;

export type AiDemandGateRuleAggregation =
  (typeof AI_DEMAND_GATE_RULE_AGGREGATIONS)[number];

export const AI_DEMAND_GATE_CONDITION_FIELDS = [
  'score_total',
  'score_confidence',
  'dimension_score',
  'dimension_confidence',
  'warning_count',
  'evidence_count',
] as const;

export type AiDemandGateConditionField =
  (typeof AI_DEMAND_GATE_CONDITION_FIELDS)[number];

export const AI_DEMAND_GATE_CONDITION_OPERATORS = [
  'gt',
  'gte',
  'lt',
  'lte',
  'eq',
  'neq',
] as const;

export type AiDemandGateConditionOperator =
  (typeof AI_DEMAND_GATE_CONDITION_OPERATORS)[number];

export type AiDemandGateRuleCondition = {
  field: AiDemandGateConditionField;
  operator: AiDemandGateConditionOperator;
  value: boolean | number | string;
  dimension_key?: AiDemandNullable<AiDemandScoringDimensionKey | string>;
};

export type AiDemandGateRule = {
  review_stage: AiDemandReviewStage;
  rule_key: string;
  description: string;
  decision?: AiDemandReviewDecision;
  enabled?: boolean;
  aggregation?: AiDemandGateRuleAggregation;
  conditions?: AiDemandGateRuleCondition[];
  condition: AiDemandJsonObject;
  metadata?: AiDemandNullable<AiDemandJsonObject>;
};

export type AiDemandScoreBreakdownItem = {
  key: AiDemandScoringDimensionKey | (string & {});
  label: string;
  score: number;
  weight: number;
  rationale: string;
  confidence?: number | null;
  evidence_signal_ids?: string[];
};

export const AI_DEMAND_SCORING_PROFILE_SCHEMA = {
  type: 'object',
  description: 'scoring_profile 结构定义，用于约束维度、权重、归一化和 gate rule 配置。',
  additional_properties: false,
  required: [
    'id',
    'name',
    'strategy_key',
    'version',
    'dimensions',
    'weights',
    'gate_rules',
    'enabled',
  ],
  properties: {
    id: {
      type: 'string',
      description: 'scoring_profile ID。',
      format: 'identifier',
    },
    name: {
      type: 'string',
      description: '评分策略名称。',
    },
    strategy_key: {
      type: 'string',
      description: '策略键。',
    },
    version: {
      type: 'string',
      description: '策略版本。',
      format: 'version',
    },
    dimensions: {
      type: 'array',
      description: '评分维度列表。',
      min_items: 1,
      items: {
        type: 'object',
        description: '单个评分维度配置。',
        additional_properties: false,
        required: ['key', 'label', 'description', 'enabled'],
        properties: {
          key: {
            type: 'string',
            description: '维度键。',
            enum_values: [...AI_DEMAND_SCORING_DIMENSION_KEYS],
          },
          label: {
            type: 'string',
            description: '维度名称。',
          },
          description: {
            type: 'string',
            description: '维度说明。',
          },
          enabled: {
            type: 'boolean',
            description: '是否启用。',
          },
          required: {
            type: 'boolean',
            description: '是否为强制维度。',
          },
          default_weight: {
            type: 'number',
            description: '默认权重。',
            nullable: true,
            minimum: 0,
          },
          score_scale: {
            type: 'object',
            description: '该维度的原始评分区间。',
            additional_properties: false,
            required: ['min', 'max', 'step'],
            properties: {
              min: { type: 'number', description: '最小值。' },
              max: { type: 'number', description: '最大值。' },
              step: {
                type: 'number',
                description: '步进值。',
                exclusive_minimum: 0,
              },
            },
          },
          scoring_guidance: {
            type: 'array',
            description: '评分提示。',
            items: {
              type: 'string',
              description: '提示项。',
            },
          },
          evidence_requirements: {
            type: 'array',
            description: '证据要求。',
            items: {
              type: 'string',
              description: '证据要求项。',
            },
          },
          metadata: {
            type: 'object',
            description: '额外元数据。',
            nullable: true,
            properties: {},
            additional_properties: true,
          },
        },
      },
    },
    weights: {
      type: 'object',
      description: '维度权重映射。',
      properties: {},
      additional_properties: true,
    },
    scale: {
      type: 'object',
      description: '最终评分区间。',
      nullable: true,
      additional_properties: false,
      required: ['min', 'max', 'step'],
      properties: {
        min: { type: 'number', description: '最小值。' },
        max: { type: 'number', description: '最大值。' },
        step: {
          type: 'number',
          description: '步进值。',
          exclusive_minimum: 0,
        },
      },
    },
    normalization: {
      type: 'object',
      description: '归一化规则。',
      nullable: true,
      additional_properties: false,
      required: ['method', 'source_scale', 'output_scale'],
      properties: {
        method: {
          type: 'string',
          description: '归一化方法。',
          enum_values: [...AI_DEMAND_SCORING_NORMALIZATION_METHODS],
        },
        source_scale: {
          type: 'object',
          description: '原始评分区间。',
          additional_properties: false,
          required: ['min', 'max', 'step'],
          properties: {
            min: { type: 'number', description: '最小值。' },
            max: { type: 'number', description: '最大值。' },
            step: {
              type: 'number',
              description: '步进值。',
              exclusive_minimum: 0,
            },
          },
        },
        output_scale: {
          type: 'object',
          description: '输出评分区间。',
          additional_properties: false,
          required: ['min', 'max', 'step'],
          properties: {
            min: { type: 'number', description: '最小值。' },
            max: { type: 'number', description: '最大值。' },
            step: {
              type: 'number',
              description: '步进值。',
              exclusive_minimum: 0,
            },
          },
        },
        round_to: {
          type: 'integer',
          description: '保留位数。',
          nullable: true,
          minimum: 0,
        },
      },
    },
    gate_rules: {
      type: 'array',
      description: 'Gate 规则列表。',
      items: {
        type: 'object',
        description: '单条 Gate 规则。',
        additional_properties: false,
        required: ['review_stage', 'rule_key', 'description', 'condition'],
        properties: {
          review_stage: {
            type: 'string',
            description: 'Gate 阶段。',
            enum_values: ['pre_prd_gate', 'post_prd_gate'],
          },
          rule_key: {
            type: 'string',
            description: '规则键。',
          },
          description: {
            type: 'string',
            description: '规则说明。',
          },
          decision: {
            type: 'string',
            description: '命中后的建议决策。',
            nullable: true,
            enum_values: [
              'approved_for_prd',
              'needs_more_evidence',
              'blocked',
              'approved',
              'changes_requested',
              'rejected',
            ],
          },
          enabled: {
            type: 'boolean',
            description: '规则是否启用。',
          },
          aggregation: {
            type: 'string',
            description: '多条件聚合方式。',
            nullable: true,
            enum_values: [...AI_DEMAND_GATE_RULE_AGGREGATIONS],
          },
          conditions: {
            type: 'array',
            description: '结构化条件列表。',
            items: {
              type: 'object',
              description: '单条条件。',
              additional_properties: false,
              required: ['field', 'operator', 'value'],
              properties: {
                field: {
                  type: 'string',
                  description: '命中的字段。',
                  enum_values: [...AI_DEMAND_GATE_CONDITION_FIELDS],
                },
                operator: {
                  type: 'string',
                  description: '比较操作符。',
                  enum_values: [...AI_DEMAND_GATE_CONDITION_OPERATORS],
                },
                value: {
                  type: 'string',
                  description: '对比值，运行时可再转成 number/boolean。',
                },
                dimension_key: {
                  type: 'string',
                  description: '如 field 依赖具体维度时使用。',
                  nullable: true,
                },
              },
            },
          },
          condition: {
            type: 'object',
            description: '兼容旧结构的原始条件对象。',
            properties: {},
            additional_properties: true,
          },
          metadata: {
            type: 'object',
            description: '额外元数据。',
            nullable: true,
            properties: {},
            additional_properties: true,
          },
        },
      },
    },
    enabled: {
      type: 'boolean',
      description: '是否启用。',
    },
    metadata: {
      type: 'object',
      description: 'profile 元数据。',
      nullable: true,
      properties: {},
      additional_properties: true,
    },
  },
} satisfies AiDemandSchemaObjectDefinition;
