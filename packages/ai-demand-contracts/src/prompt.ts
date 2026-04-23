import type {
  AiDemandCitation,
  AiDemandOpportunity,
  AiDemandOpportunityBrief,
  AiDemandProblemCluster,
} from './contracts.ts';
import type {
  AiDemandId,
  AiDemandNullable,
  AiDemandTimestamp,
} from './common.ts';
import type {
  AiDemandSchemaDefinition,
  AiDemandSchemaObjectDefinition,
} from './schema.ts';
import type {
  AiDemandGate1Decision,
  AiDemandPromptStage,
} from './state.ts';
import type { AiDemandScoreBreakdownItem } from './scoring.ts';

export const AI_DEMAND_PROMPT_WARNING_SEVERITIES = [
  'info',
  'warning',
  'error',
] as const;

export type AiDemandPromptWarningSeverity =
  (typeof AI_DEMAND_PROMPT_WARNING_SEVERITIES)[number];

export type AiDemandPromptWarning = {
  code: string;
  message: string;
  severity: AiDemandPromptWarningSeverity;
  related_field?: string;
};

export type AiDemandPromptAssumption = {
  statement: string;
  confidence?: number | null;
  note?: string | null;
};

export type AiDemandPromptOutputEnvelope<TResult> = {
  result: TResult;
  confidence: number;
  evidence_ids: AiDemandId[];
  assumptions: AiDemandPromptAssumption[];
  warnings: AiDemandPromptWarning[];
};

export type AiDemandSignalCleaningPromptInput = {
  raw_signal: {
    id: AiDemandId;
    collection_batch_id: AiDemandId;
    title: AiDemandNullable<string>;
    content_raw: string;
    source_url: AiDemandNullable<string>;
    author_name: AiDemandNullable<string>;
    published_at: AiDemandNullable<AiDemandTimestamp>;
    language: AiDemandNullable<string>;
  };
  source_context: {
    source_type: AiDemandNullable<string>;
    access_mode: AiDemandNullable<string>;
    ingestion_note: AiDemandNullable<string>;
  };
  cleaning_policy: {
    preserve_original_meaning: boolean;
    mask_pii: boolean;
    keep_evidence_trace: boolean;
    output_language: AiDemandNullable<string>;
  };
};

export type AiDemandSignalCleaningPromptResult = {
  content_clean: string;
  normalized_problem: AiDemandNullable<string>;
  summary: AiDemandNullable<string>;
  user_role_hint: AiDemandNullable<string>;
  keywords: string[];
  sentiment: AiDemandNullable<string>;
  pain_level: AiDemandNullable<number>;
  is_noise: boolean;
  pii_masked: boolean;
  quality_score: AiDemandNullable<number>;
  cleaning_notes: string[];
};

export type AiDemandSignalCleaningPromptOutput =
  AiDemandPromptOutputEnvelope<AiDemandSignalCleaningPromptResult>;

export type AiDemandProblemClusterCandidate = {
  cluster_key: string;
  title: string;
  summary: string;
  common_pain_points: string[];
  representative_signal_ids: AiDemandId[];
  confidence_score: number;
  boundary_note: AiDemandNullable<string>;
};

export type AiDemandProblemClusteringPromptInput = {
  cleaned_signals: Array<{
    id: AiDemandId;
    content_clean: string;
    normalized_problem: AiDemandNullable<string>;
    keywords: string[];
    sentiment: AiDemandNullable<string>;
    pain_level: AiDemandNullable<number>;
    quality_score: AiDemandNullable<number>;
  }>;
  clustering_policy: {
    max_cluster_count: AiDemandNullable<number>;
    min_cluster_size: number;
    require_problem_similarity: boolean;
  };
};

export type AiDemandProblemClusteringPromptResult = {
  clusters: AiDemandProblemClusterCandidate[];
  unclustered_signal_ids: AiDemandId[];
  overlap_warnings: string[];
};

export type AiDemandProblemClusteringPromptOutput =
  AiDemandPromptOutputEnvelope<AiDemandProblemClusteringPromptResult>;

export type AiDemandOpportunityBriefGenerationPromptInput = {
  problem_cluster: Pick<
    AiDemandProblemCluster,
    | 'id'
    | 'title'
    | 'summary'
    | 'cluster_key'
    | 'size'
    | 'confidence_score'
    | 'representative_signal_ids'
  >;
  representative_signals: Array<{
    id: AiDemandId;
    content_clean: string;
    normalized_problem: AiDemandNullable<string>;
    keywords: string[];
    pain_level: AiDemandNullable<number>;
  }>;
  source_context: {
    source_types: string[];
    languages: string[];
    batch_count: AiDemandNullable<number>;
  };
};

export type AiDemandOpportunityBriefGenerationPromptResult = Pick<
  AiDemandOpportunityBrief,
  | 'title'
  | 'brief_statement'
  | 'target_user'
  | 'evidence_signal_ids'
  | 'evidence_summary'
  | 'boundary_note'
  | 'distribution_hypothesis'
  | 'visibility_hypothesis'
  | 'gap_notes'
>;

export type AiDemandOpportunityBriefGenerationPromptOutput =
  AiDemandPromptOutputEnvelope<AiDemandOpportunityBriefGenerationPromptResult>;

export type AiDemandOpportunityScoringPromptInput = {
  opportunity_brief: Pick<
    AiDemandOpportunityBrief,
    | 'id'
    | 'title'
    | 'brief_statement'
    | 'target_user'
    | 'evidence_signal_ids'
    | 'evidence_summary'
    | 'boundary_note'
    | 'distribution_hypothesis'
    | 'visibility_hypothesis'
    | 'gap_notes'
  >;
  scoring_profile: {
    id: AiDemandId;
    name: string;
    strategy_key: string;
    version: string;
    dimension_keys: string[];
    weights: Record<string, number>;
    gate_rule_keys: string[];
  };
  scoring_context: {
    strategic_focus: string[];
    review_stage: 'pre_prd_gate';
    additional_notes: string[];
  };
};

export type AiDemandOpportunityScoringPromptResult = Pick<
  AiDemandOpportunity,
  | 'score_total'
  | 'score_breakdown'
  | 'score_confidence'
  | 'score_rationale'
  | 'risk_notes'
> & {
  review_questions: string[];
  recommended_decision: AiDemandNullable<AiDemandGate1Decision>;
};

export type AiDemandOpportunityScoringPromptOutput =
  AiDemandPromptOutputEnvelope<AiDemandOpportunityScoringPromptResult>;

export type AiDemandPrdDraftGenerationPromptInput = {
  opportunity: Pick<
    AiDemandOpportunity,
    | 'id'
    | 'name'
    | 'opportunity_statement'
    | 'score_total'
    | 'score_breakdown'
    | 'score_confidence'
    | 'score_rationale'
    | 'risk_notes'
  >;
  opportunity_brief: Pick<
    AiDemandOpportunityBrief,
    | 'id'
    | 'title'
    | 'brief_statement'
    | 'target_user'
    | 'evidence_signal_ids'
    | 'evidence_summary'
    | 'boundary_note'
    | 'distribution_hypothesis'
    | 'visibility_hypothesis'
    | 'gap_notes'
  >;
  drafting_policy: {
    output_language: string;
    must_cite_evidence: boolean;
    include_scope_boundaries: boolean;
  };
};

export type AiDemandPrdDraftGenerationPromptResult = {
  title: string;
  background: string;
  target_user: string;
  problem_statement: string;
  solution_hypothesis: string;
  scope_in: string[];
  scope_out: string[];
  risks: string[];
  open_questions: string[];
  citations: AiDemandCitation[];
};

export type AiDemandPrdDraftGenerationPromptOutput =
  AiDemandPromptOutputEnvelope<AiDemandPrdDraftGenerationPromptResult>;

export type AiDemandPromptIoContract<TInput, TOutput> = {
  prompt_stage: AiDemandPromptStage;
  description: string;
  input_schema: AiDemandSchemaObjectDefinition;
  output_schema: AiDemandSchemaObjectDefinition;
  sample_input?: TInput;
  sample_output?: TOutput;
};

export type AiDemandPromptIoContractMap = {
  signal_normalization: AiDemandPromptIoContract<
    AiDemandSignalCleaningPromptInput,
    AiDemandSignalCleaningPromptOutput
  >;
  problem_clustering: AiDemandPromptIoContract<
    AiDemandProblemClusteringPromptInput,
    AiDemandProblemClusteringPromptOutput
  >;
  opportunity_brief_generation: AiDemandPromptIoContract<
    AiDemandOpportunityBriefGenerationPromptInput,
    AiDemandOpportunityBriefGenerationPromptOutput
  >;
  opportunity_scoring: AiDemandPromptIoContract<
    AiDemandOpportunityScoringPromptInput,
    AiDemandOpportunityScoringPromptOutput
  >;
  prd_draft_generation: AiDemandPromptIoContract<
    AiDemandPrdDraftGenerationPromptInput,
    AiDemandPrdDraftGenerationPromptOutput
  >;
};

const confidenceSchema = {
  type: 'number',
  description: '0 到 1 的整体置信度。',
  minimum: 0,
  maximum: 1,
} satisfies AiDemandSchemaDefinition;

const assumptionSchema = {
  type: 'object',
  description: '模型在输出时依赖的假设。',
  additional_properties: false,
  required: ['statement'],
  properties: {
    statement: {
      type: 'string',
      description: '假设内容。',
      min_length: 1,
    },
    confidence: {
      type: 'number',
      description: '该假设的局部置信度。',
      nullable: true,
      minimum: 0,
      maximum: 1,
    },
    note: {
      type: 'string',
      description: '补充说明。',
      nullable: true,
    },
  },
} satisfies AiDemandSchemaObjectDefinition;

const warningSchema = {
  type: 'object',
  description: '输出过程中需要外部系统额外关注的风险或提醒。',
  additional_properties: false,
  required: ['code', 'message', 'severity'],
  properties: {
    code: {
      type: 'string',
      description: '稳定的 warning 代码。',
    },
    message: {
      type: 'string',
      description: '对 warning 的人类可读描述。',
    },
    severity: {
      type: 'string',
      description: 'warning 严重程度。',
      enum_values: [...AI_DEMAND_PROMPT_WARNING_SEVERITIES],
    },
    related_field: {
      type: 'string',
      description: '如适用，指出相关字段。',
      nullable: true,
    },
  },
} satisfies AiDemandSchemaObjectDefinition;

const scoreBreakdownItemSchema = {
  type: 'object',
  description: '单个评分维度结果。',
  additional_properties: false,
  required: ['key', 'label', 'score', 'weight', 'rationale'],
  properties: {
    key: {
      type: 'string',
      description: '维度键。',
    },
    label: {
      type: 'string',
      description: '维度名称。',
    },
    score: {
      type: 'number',
      description: '该维度分值。',
    },
    weight: {
      type: 'number',
      description: '该维度权重。',
      minimum: 0,
    },
    rationale: {
      type: 'string',
      description: '评分理由。',
    },
    confidence: {
      type: 'number',
      description: '该维度评分置信度。',
      nullable: true,
      minimum: 0,
      maximum: 1,
    },
    evidence_signal_ids: {
      type: 'array',
      description: '支撑该维度评分的 evidence IDs。',
      items: {
        type: 'string',
        description: 'signal ID。',
        format: 'identifier',
      },
      unique_items: true,
    },
  },
} satisfies AiDemandSchemaObjectDefinition;

const promptEnvelopeSchema = (
  resultSchema: AiDemandSchemaDefinition,
  description: string,
): AiDemandSchemaObjectDefinition => ({
  type: 'object',
  description,
  additional_properties: false,
  required: ['result', 'confidence', 'evidence_ids', 'assumptions', 'warnings'],
  properties: {
    result: resultSchema,
    confidence: confidenceSchema,
    evidence_ids: {
      type: 'array',
      description: '当前输出直接依赖的证据对象 ID 集合。',
      items: {
        type: 'string',
        description: '证据对象 ID。',
        format: 'identifier',
      },
      unique_items: true,
    },
    assumptions: {
      type: 'array',
      description: '需要在后续环节继续验证的假设。',
      items: assumptionSchema,
    },
    warnings: {
      type: 'array',
      description: '供调用方审计或拦截的告警。',
      items: warningSchema,
    },
  },
});

export const AI_DEMAND_SIGNAL_CLEANING_PROMPT_INPUT_SCHEMA = {
  type: 'object',
  description: 'signal_normalization 阶段输入，用于把 raw_signal 转成可聚类的 cleaned_signal 内容。',
  additional_properties: false,
  required: ['raw_signal', 'source_context', 'cleaning_policy'],
  properties: {
    raw_signal: {
      type: 'object',
      description: '待清洗的原始信号。',
      additional_properties: false,
      required: ['id', 'collection_batch_id', 'content_raw'],
      properties: {
        id: { type: 'string', description: 'raw_signal ID。', format: 'identifier' },
        collection_batch_id: {
          type: 'string',
          description: '采集批次 ID。',
          format: 'identifier',
        },
        title: {
          type: 'string',
          description: '原始标题。',
          nullable: true,
        },
        content_raw: {
          type: 'string',
          description: '原始正文。',
          min_length: 1,
        },
        source_url: {
          type: 'string',
          description: '来源链接。',
          nullable: true,
          format: 'uri',
        },
        author_name: {
          type: 'string',
          description: '作者名。',
          nullable: true,
        },
        published_at: {
          type: 'string',
          description: '发布时间。',
          nullable: true,
          format: 'date-time',
        },
        language: {
          type: 'string',
          description: '原始语言。',
          nullable: true,
        },
      },
    },
    source_context: {
      type: 'object',
      description: '来源侧补充上下文。',
      additional_properties: false,
      required: ['source_type', 'access_mode', 'ingestion_note'],
      properties: {
        source_type: {
          type: 'string',
          description: '来源类型。',
          nullable: true,
        },
        access_mode: {
          type: 'string',
          description: '接入模式。',
          nullable: true,
        },
        ingestion_note: {
          type: 'string',
          description: '导入备注。',
          nullable: true,
        },
      },
    },
    cleaning_policy: {
      type: 'object',
      description: '清洗输出约束。',
      additional_properties: false,
      required: [
        'preserve_original_meaning',
        'mask_pii',
        'keep_evidence_trace',
        'output_language',
      ],
      properties: {
        preserve_original_meaning: {
          type: 'boolean',
          description: '是否必须保留原始语义。',
        },
        mask_pii: {
          type: 'boolean',
          description: '是否执行脱敏。',
        },
        keep_evidence_trace: {
          type: 'boolean',
          description: '是否保留可追溯证据线索。',
        },
        output_language: {
          type: 'string',
          description: '期望输出语言。',
          nullable: true,
        },
      },
    },
  },
} satisfies AiDemandSchemaObjectDefinition;

export const AI_DEMAND_SIGNAL_CLEANING_PROMPT_OUTPUT_SCHEMA = promptEnvelopeSchema(
  {
    type: 'object',
    description: 'signal_normalization 阶段输出。',
    additional_properties: false,
    required: [
      'content_clean',
      'normalized_problem',
      'summary',
      'user_role_hint',
      'keywords',
      'sentiment',
      'pain_level',
      'is_noise',
      'pii_masked',
      'quality_score',
      'cleaning_notes',
    ],
    properties: {
      content_clean: {
        type: 'string',
        description: '清洗后的文本内容。',
        min_length: 1,
      },
      normalized_problem: {
        type: 'string',
        description: '归一化的问题表述。',
        nullable: true,
      },
      summary: {
        type: 'string',
        description: '简短问题摘要。',
        nullable: true,
      },
      user_role_hint: {
        type: 'string',
        description: '用户角色提示。',
        nullable: true,
      },
      keywords: {
        type: 'array',
        description: '提取出的关键词。',
        items: {
          type: 'string',
          description: '关键词。',
        },
        unique_items: true,
      },
      sentiment: {
        type: 'string',
        description: '情绪倾向。',
        nullable: true,
      },
      pain_level: {
        type: 'number',
        description: '0 到 5 的痛点强度建议值。',
        nullable: true,
        minimum: 0,
        maximum: 5,
      },
      is_noise: {
        type: 'boolean',
        description: '是否建议标记为噪声。',
      },
      pii_masked: {
        type: 'boolean',
        description: '是否已完成脱敏。',
      },
      quality_score: {
        type: 'number',
        description: '0 到 1 的质量评分建议值。',
        nullable: true,
        minimum: 0,
        maximum: 1,
      },
      cleaning_notes: {
        type: 'array',
        description: '清洗时的补充说明。',
        items: {
          type: 'string',
          description: '说明项。',
        },
      },
    },
  },
  'signal_normalization 阶段标准输出。',
);

export const AI_DEMAND_PROBLEM_CLUSTERING_PROMPT_INPUT_SCHEMA = {
  type: 'object',
  description: 'problem_clustering 阶段输入。',
  additional_properties: false,
  required: ['cleaned_signals', 'clustering_policy'],
  properties: {
    cleaned_signals: {
      type: 'array',
      description: '待聚类的 cleaned_signal 列表。',
      min_items: 1,
      items: {
        type: 'object',
        description: '单条 cleaned_signal 摘要。',
        additional_properties: false,
        required: [
          'id',
          'content_clean',
          'normalized_problem',
          'keywords',
          'sentiment',
          'pain_level',
          'quality_score',
        ],
        properties: {
          id: {
            type: 'string',
            description: 'cleaned_signal ID。',
            format: 'identifier',
          },
          content_clean: {
            type: 'string',
            description: '清洗后内容。',
            min_length: 1,
          },
          normalized_problem: {
            type: 'string',
            description: '标准化问题描述。',
            nullable: true,
          },
          keywords: {
            type: 'array',
            description: '关键词。',
            items: {
              type: 'string',
              description: '关键词项。',
            },
            unique_items: true,
          },
          sentiment: {
            type: 'string',
            description: '情绪倾向。',
            nullable: true,
          },
          pain_level: {
            type: 'number',
            description: '痛点强度。',
            nullable: true,
            minimum: 0,
            maximum: 5,
          },
          quality_score: {
            type: 'number',
            description: '质量分。',
            nullable: true,
            minimum: 0,
            maximum: 1,
          },
        },
      },
    },
    clustering_policy: {
      type: 'object',
      description: '聚类约束。',
      additional_properties: false,
      required: ['max_cluster_count', 'min_cluster_size', 'require_problem_similarity'],
      properties: {
        max_cluster_count: {
          type: 'integer',
          description: '建议的最大聚类数。',
          nullable: true,
          minimum: 1,
        },
        min_cluster_size: {
          type: 'integer',
          description: '建议的最小聚类规模。',
          minimum: 1,
        },
        require_problem_similarity: {
          type: 'boolean',
          description: '是否必须以问题相似度作为聚类核心。',
        },
      },
    },
  },
} satisfies AiDemandSchemaObjectDefinition;

export const AI_DEMAND_PROBLEM_CLUSTERING_PROMPT_OUTPUT_SCHEMA = promptEnvelopeSchema(
  {
    type: 'object',
    description: 'problem_clustering 阶段输出。',
    additional_properties: false,
    required: ['clusters', 'unclustered_signal_ids', 'overlap_warnings'],
    properties: {
      clusters: {
        type: 'array',
        description: '问题簇候选集合。',
        items: {
          type: 'object',
          description: '单个问题簇候选。',
          additional_properties: false,
          required: [
            'cluster_key',
            'title',
            'summary',
            'common_pain_points',
            'representative_signal_ids',
            'confidence_score',
            'boundary_note',
          ],
          properties: {
            cluster_key: {
              type: 'string',
              description: '稳定的聚类建议键。',
            },
            title: {
              type: 'string',
              description: '问题簇标题。',
            },
            summary: {
              type: 'string',
              description: '问题簇摘要。',
            },
            common_pain_points: {
              type: 'array',
              description: '共性痛点列表。',
              items: {
                type: 'string',
                description: '痛点项。',
              },
            },
            representative_signal_ids: {
              type: 'array',
              description: '代表信号 ID。',
              items: {
                type: 'string',
                description: 'signal ID。',
                format: 'identifier',
              },
              unique_items: true,
            },
            confidence_score: {
              type: 'number',
              description: '0 到 1 的聚类置信度。',
              minimum: 0,
              maximum: 1,
            },
            boundary_note: {
              type: 'string',
              description: '不应合并的边界说明。',
              nullable: true,
            },
          },
        },
      },
      unclustered_signal_ids: {
        type: 'array',
        description: '未聚类的 signal ID。',
        items: {
          type: 'string',
          description: 'signal ID。',
          format: 'identifier',
        },
        unique_items: true,
      },
      overlap_warnings: {
        type: 'array',
        description: '聚类交叠警告。',
        items: {
          type: 'string',
          description: 'warning 文本。',
        },
      },
    },
  },
  'problem_clustering 阶段标准输出。',
);

export const AI_DEMAND_OPPORTUNITY_BRIEF_GENERATION_PROMPT_INPUT_SCHEMA = {
  type: 'object',
  description: 'opportunity_brief_generation 阶段输入。',
  additional_properties: false,
  required: ['problem_cluster', 'representative_signals', 'source_context'],
  properties: {
    problem_cluster: {
      type: 'object',
      description: '问题簇摘要。',
      additional_properties: false,
      required: [
        'id',
        'title',
        'summary',
        'cluster_key',
        'size',
        'confidence_score',
        'representative_signal_ids',
      ],
      properties: {
        id: { type: 'string', description: 'problem_cluster ID。', format: 'identifier' },
        title: { type: 'string', description: '问题簇标题。' },
        summary: { type: 'string', description: '问题簇摘要。' },
        cluster_key: { type: 'string', description: '问题簇键。' },
        size: {
          type: 'integer',
          description: '问题簇规模。',
          minimum: 1,
        },
        confidence_score: {
          type: 'number',
          description: '问题簇置信度。',
          minimum: 0,
          maximum: 1,
        },
        representative_signal_ids: {
          type: 'array',
          description: '代表信号 ID。',
          items: {
            type: 'string',
            description: 'signal ID。',
            format: 'identifier',
          },
          unique_items: true,
        },
      },
    },
    representative_signals: {
      type: 'array',
      description: '用于生成机会摘要的代表信号。',
      min_items: 1,
      items: {
        type: 'object',
        description: '代表信号摘要。',
        additional_properties: false,
        required: [
          'id',
          'content_clean',
          'normalized_problem',
          'keywords',
          'pain_level',
        ],
        properties: {
          id: { type: 'string', description: 'signal ID。', format: 'identifier' },
          content_clean: {
            type: 'string',
            description: '清洗后文本。',
          },
          normalized_problem: {
            type: 'string',
            description: '标准化问题。',
            nullable: true,
          },
          keywords: {
            type: 'array',
            description: '关键词。',
            items: {
              type: 'string',
              description: '关键词项。',
            },
            unique_items: true,
          },
          pain_level: {
            type: 'number',
            description: '痛点强度。',
            nullable: true,
            minimum: 0,
            maximum: 5,
          },
        },
      },
    },
    source_context: {
      type: 'object',
      description: '来源级上下文。',
      additional_properties: false,
      required: ['source_types', 'languages', 'batch_count'],
      properties: {
        source_types: {
          type: 'array',
          description: '来源类型列表。',
          items: {
            type: 'string',
            description: '来源类型。',
          },
          unique_items: true,
        },
        languages: {
          type: 'array',
          description: '涉及语言列表。',
          items: {
            type: 'string',
            description: '语言代码或名称。',
          },
          unique_items: true,
        },
        batch_count: {
          type: 'integer',
          description: '覆盖批次数。',
          nullable: true,
          minimum: 1,
        },
      },
    },
  },
} satisfies AiDemandSchemaObjectDefinition;

export const AI_DEMAND_OPPORTUNITY_BRIEF_GENERATION_PROMPT_OUTPUT_SCHEMA =
  promptEnvelopeSchema(
    {
      type: 'object',
      description: 'opportunity_brief_generation 阶段输出。',
      additional_properties: false,
      required: [
        'title',
        'brief_statement',
        'target_user',
        'evidence_signal_ids',
        'evidence_summary',
        'boundary_note',
        'distribution_hypothesis',
        'visibility_hypothesis',
        'gap_notes',
      ],
      properties: {
        title: { type: 'string', description: '机会摘要标题。' },
        brief_statement: {
          type: 'string',
          description: '简洁的机会陈述。',
        },
        target_user: {
          type: 'string',
          description: '目标用户。',
        },
        evidence_signal_ids: {
          type: 'array',
          description: '支撑该 brief 的 evidence signal IDs。',
          items: {
            type: 'string',
            description: 'signal ID。',
            format: 'identifier',
          },
          unique_items: true,
        },
        evidence_summary: {
          type: 'string',
          description: '证据摘要。',
        },
        boundary_note: {
          type: 'string',
          description: '边界说明。',
          nullable: true,
        },
        distribution_hypothesis: {
          type: 'string',
          description: '分发假设。',
          nullable: true,
        },
        visibility_hypothesis: {
          type: 'string',
          description: '结果可见性假设。',
          nullable: true,
        },
        gap_notes: {
          type: 'string',
          description: '证据缺口说明。',
          nullable: true,
        },
      },
    },
    'opportunity_brief_generation 阶段标准输出。',
  );

export const AI_DEMAND_OPPORTUNITY_SCORING_PROMPT_INPUT_SCHEMA = {
  type: 'object',
  description: 'opportunity_scoring 阶段输入。',
  additional_properties: false,
  required: ['opportunity_brief', 'scoring_profile', 'scoring_context'],
  properties: {
    opportunity_brief: {
      type: 'object',
      description: '待评分的机会摘要。',
      additional_properties: false,
      required: [
        'id',
        'title',
        'brief_statement',
        'target_user',
        'evidence_signal_ids',
        'evidence_summary',
        'boundary_note',
        'distribution_hypothesis',
        'visibility_hypothesis',
        'gap_notes',
      ],
      properties: {
        id: { type: 'string', description: 'brief ID。', format: 'identifier' },
        title: { type: 'string', description: '标题。' },
        brief_statement: { type: 'string', description: '机会陈述。' },
        target_user: { type: 'string', description: '目标用户。' },
        evidence_signal_ids: {
          type: 'array',
          description: '证据 signal IDs。',
          items: {
            type: 'string',
            description: 'signal ID。',
            format: 'identifier',
          },
          unique_items: true,
        },
        evidence_summary: { type: 'string', description: '证据摘要。' },
        boundary_note: {
          type: 'string',
          description: '边界说明。',
          nullable: true,
        },
        distribution_hypothesis: {
          type: 'string',
          description: '分发假设。',
          nullable: true,
        },
        visibility_hypothesis: {
          type: 'string',
          description: '可见性假设。',
          nullable: true,
        },
        gap_notes: {
          type: 'string',
          description: '证据缺口说明。',
          nullable: true,
        },
      },
    },
    scoring_profile: {
      type: 'object',
      description: '评分配置快照。',
      additional_properties: false,
      required: [
        'id',
        'name',
        'strategy_key',
        'version',
        'dimension_keys',
        'weights',
        'gate_rule_keys',
      ],
      properties: {
        id: { type: 'string', description: 'profile ID。', format: 'identifier' },
        name: { type: 'string', description: 'profile 名称。' },
        strategy_key: { type: 'string', description: '策略键。' },
        version: {
          type: 'string',
          description: '版本号。',
          format: 'version',
        },
        dimension_keys: {
          type: 'array',
          description: '启用的评分维度键。',
          items: {
            type: 'string',
            description: 'dimension key。',
          },
          unique_items: true,
        },
        weights: {
          type: 'object',
          description: '维度权重映射。',
          properties: {},
          additional_properties: true,
        },
        gate_rule_keys: {
          type: 'array',
          description: '关联 gate rule keys。',
          items: {
            type: 'string',
            description: 'gate rule key。',
          },
          unique_items: true,
        },
      },
    },
    scoring_context: {
      type: 'object',
      description: '评分上下文。',
      additional_properties: false,
      required: ['strategic_focus', 'review_stage', 'additional_notes'],
      properties: {
        strategic_focus: {
          type: 'array',
          description: '当前战略关注点。',
          items: {
            type: 'string',
            description: '关注点项。',
          },
        },
        review_stage: {
          type: 'string',
          description: '评审阶段。',
          enum_values: ['pre_prd_gate'],
        },
        additional_notes: {
          type: 'array',
          description: '评分补充说明。',
          items: {
            type: 'string',
            description: '说明项。',
          },
        },
      },
    },
  },
} satisfies AiDemandSchemaObjectDefinition;

export const AI_DEMAND_OPPORTUNITY_SCORING_PROMPT_OUTPUT_SCHEMA =
  promptEnvelopeSchema(
    {
      type: 'object',
      description: 'opportunity_scoring 阶段输出。',
      additional_properties: false,
      required: [
        'score_total',
        'score_breakdown',
        'score_confidence',
        'score_rationale',
        'risk_notes',
        'review_questions',
        'recommended_decision',
      ],
      properties: {
        score_total: {
          type: 'number',
          description: '总分。',
        },
        score_breakdown: {
          type: 'array',
          description: '分项评分结果。',
          min_items: 1,
          items: scoreBreakdownItemSchema,
        },
        score_confidence: {
          type: 'number',
          description: '总分置信度。',
          nullable: true,
          minimum: 0,
          maximum: 1,
        },
        score_rationale: {
          type: 'string',
          description: '总分说明。',
        },
        risk_notes: {
          type: 'array',
          description: '关键风险。',
          items: {
            type: 'string',
            description: '风险项。',
          },
        },
        review_questions: {
          type: 'array',
          description: '待人工验证问题。',
          items: {
            type: 'string',
            description: '问题项。',
          },
        },
        recommended_decision: {
          type: 'string',
          description: '建议的 Gate 1 决策。',
          nullable: true,
          enum_values: ['approved_for_prd', 'needs_more_evidence', 'blocked'],
        },
      },
    },
    'opportunity_scoring 阶段标准输出。',
  );

export const AI_DEMAND_PRD_DRAFT_GENERATION_PROMPT_INPUT_SCHEMA = {
  type: 'object',
  description: 'prd_draft_generation 阶段输入。',
  additional_properties: false,
  required: ['opportunity', 'opportunity_brief', 'drafting_policy'],
  properties: {
    opportunity: {
      type: 'object',
      description: '已完成评分并允许进入 PRD 的机会。',
      additional_properties: false,
      required: [
        'id',
        'name',
        'opportunity_statement',
        'score_total',
        'score_breakdown',
        'score_confidence',
        'score_rationale',
        'risk_notes',
      ],
      properties: {
        id: { type: 'string', description: 'opportunity ID。', format: 'identifier' },
        name: { type: 'string', description: '机会名称。' },
        opportunity_statement: {
          type: 'string',
          description: '机会陈述。',
        },
        score_total: { type: 'number', description: '总分。' },
        score_breakdown: {
          type: 'array',
          description: '评分拆解。',
          items: scoreBreakdownItemSchema,
        },
        score_confidence: {
          type: 'number',
          description: '评分置信度。',
          nullable: true,
          minimum: 0,
          maximum: 1,
        },
        score_rationale: { type: 'string', description: '评分理由。' },
        risk_notes: {
          type: 'array',
          description: '风险说明。',
          items: {
            type: 'string',
            description: '风险项。',
          },
        },
      },
    },
    opportunity_brief: {
      type: 'object',
      description: '对应的机会摘要。',
      additional_properties: false,
      required: [
        'id',
        'title',
        'brief_statement',
        'target_user',
        'evidence_signal_ids',
        'evidence_summary',
        'boundary_note',
        'distribution_hypothesis',
        'visibility_hypothesis',
        'gap_notes',
      ],
      properties: {
        id: { type: 'string', description: 'brief ID。', format: 'identifier' },
        title: { type: 'string', description: '标题。' },
        brief_statement: { type: 'string', description: '机会陈述。' },
        target_user: { type: 'string', description: '目标用户。' },
        evidence_signal_ids: {
          type: 'array',
          description: '证据 IDs。',
          items: {
            type: 'string',
            description: 'signal ID。',
            format: 'identifier',
          },
          unique_items: true,
        },
        evidence_summary: { type: 'string', description: '证据摘要。' },
        boundary_note: {
          type: 'string',
          description: '边界说明。',
          nullable: true,
        },
        distribution_hypothesis: {
          type: 'string',
          description: '分发假设。',
          nullable: true,
        },
        visibility_hypothesis: {
          type: 'string',
          description: '结果可见性假设。',
          nullable: true,
        },
        gap_notes: {
          type: 'string',
          description: '证据缺口说明。',
          nullable: true,
        },
      },
    },
    drafting_policy: {
      type: 'object',
      description: 'PRD 草案生成约束。',
      additional_properties: false,
      required: ['output_language', 'must_cite_evidence', 'include_scope_boundaries'],
      properties: {
        output_language: {
          type: 'string',
          description: '输出语言。',
        },
        must_cite_evidence: {
          type: 'boolean',
          description: '是否必须带引用。',
        },
        include_scope_boundaries: {
          type: 'boolean',
          description: '是否必须明确范围内外。',
        },
      },
    },
  },
} satisfies AiDemandSchemaObjectDefinition;

export const AI_DEMAND_PRD_DRAFT_GENERATION_PROMPT_OUTPUT_SCHEMA =
  promptEnvelopeSchema(
    {
      type: 'object',
      description: 'prd_draft_generation 阶段输出。',
      additional_properties: false,
      required: [
        'title',
        'background',
        'target_user',
        'problem_statement',
        'solution_hypothesis',
        'scope_in',
        'scope_out',
        'risks',
        'open_questions',
        'citations',
      ],
      properties: {
        title: { type: 'string', description: 'PRD 标题。' },
        background: {
          type: 'string',
          description: '背景说明。',
          format: 'markdown',
        },
        target_user: { type: 'string', description: '目标用户。' },
        problem_statement: {
          type: 'string',
          description: '问题陈述。',
        },
        solution_hypothesis: {
          type: 'string',
          description: '解决方案假设。',
        },
        scope_in: {
          type: 'array',
          description: '范围内内容。',
          items: {
            type: 'string',
            description: '范围内项。',
          },
        },
        scope_out: {
          type: 'array',
          description: '范围外内容。',
          items: {
            type: 'string',
            description: '范围外项。',
          },
        },
        risks: {
          type: 'array',
          description: '主要风险。',
          items: {
            type: 'string',
            description: '风险项。',
          },
        },
        open_questions: {
          type: 'array',
          description: '未决问题。',
          items: {
            type: 'string',
            description: '问题项。',
          },
        },
        citations: {
          type: 'array',
          description: 'PRD 引用。',
          items: {
            type: 'object',
            description: '单条引用。',
            additional_properties: false,
            required: ['source_signal_id', 'source_url', 'quote', 'note'],
            properties: {
              source_signal_id: {
                type: 'string',
                description: '引用的 signal ID。',
                nullable: true,
                format: 'identifier',
              },
              source_url: {
                type: 'string',
                description: '引用来源 URL。',
                nullable: true,
                format: 'uri',
              },
              quote: {
                type: 'string',
                description: '引用摘要。',
                nullable: true,
              },
              note: {
                type: 'string',
                description: '引用说明。',
                nullable: true,
              },
            },
          },
        },
      },
    },
    'prd_draft_generation 阶段标准输出。',
  );

export const AI_DEMAND_PROMPT_IO_CONTRACTS: AiDemandPromptIoContractMap = {
  signal_normalization: {
    prompt_stage: 'signal_normalization',
    description: '原始信号清洗与结构化输出契约。',
    input_schema: AI_DEMAND_SIGNAL_CLEANING_PROMPT_INPUT_SCHEMA,
    output_schema: AI_DEMAND_SIGNAL_CLEANING_PROMPT_OUTPUT_SCHEMA,
  },
  problem_clustering: {
    prompt_stage: 'problem_clustering',
    description: '问题聚类阶段输入输出契约。',
    input_schema: AI_DEMAND_PROBLEM_CLUSTERING_PROMPT_INPUT_SCHEMA,
    output_schema: AI_DEMAND_PROBLEM_CLUSTERING_PROMPT_OUTPUT_SCHEMA,
  },
  opportunity_brief_generation: {
    prompt_stage: 'opportunity_brief_generation',
    description: '机会摘要生成契约。',
    input_schema: AI_DEMAND_OPPORTUNITY_BRIEF_GENERATION_PROMPT_INPUT_SCHEMA,
    output_schema: AI_DEMAND_OPPORTUNITY_BRIEF_GENERATION_PROMPT_OUTPUT_SCHEMA,
  },
  opportunity_scoring: {
    prompt_stage: 'opportunity_scoring',
    description: '机会评分阶段契约。',
    input_schema: AI_DEMAND_OPPORTUNITY_SCORING_PROMPT_INPUT_SCHEMA,
    output_schema: AI_DEMAND_OPPORTUNITY_SCORING_PROMPT_OUTPUT_SCHEMA,
  },
  prd_draft_generation: {
    prompt_stage: 'prd_draft_generation',
    description: 'PRD 草案生成契约。',
    input_schema: AI_DEMAND_PRD_DRAFT_GENERATION_PROMPT_INPUT_SCHEMA,
    output_schema: AI_DEMAND_PRD_DRAFT_GENERATION_PROMPT_OUTPUT_SCHEMA,
  },
};

export type AiDemandSupportedPromptIoStage =
  keyof typeof AI_DEMAND_PROMPT_IO_CONTRACTS;

export type AiDemandPromptInputMap = {
  signal_normalization: AiDemandSignalCleaningPromptInput;
  problem_clustering: AiDemandProblemClusteringPromptInput;
  opportunity_brief_generation: AiDemandOpportunityBriefGenerationPromptInput;
  opportunity_scoring: AiDemandOpportunityScoringPromptInput;
  prd_draft_generation: AiDemandPrdDraftGenerationPromptInput;
};

export type AiDemandPromptOutputMap = {
  signal_normalization: AiDemandSignalCleaningPromptOutput;
  problem_clustering: AiDemandProblemClusteringPromptOutput;
  opportunity_brief_generation: AiDemandOpportunityBriefGenerationPromptOutput;
  opportunity_scoring: AiDemandOpportunityScoringPromptOutput;
  prd_draft_generation: AiDemandPrdDraftGenerationPromptOutput;
};

export type AiDemandPromptScoreBreakdown = AiDemandScoreBreakdownItem[];
