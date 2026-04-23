import type { AiDemandJsonValue } from './common.ts';

export const AI_DEMAND_SCHEMA_VALUE_TYPES = [
  'string',
  'number',
  'integer',
  'boolean',
  'object',
  'array',
] as const;

export type AiDemandSchemaValueType =
  (typeof AI_DEMAND_SCHEMA_VALUE_TYPES)[number];

type AiDemandSchemaBaseDefinition = {
  type: AiDemandSchemaValueType;
  description: string;
  nullable?: boolean;
  default?: AiDemandJsonValue;
  examples?: AiDemandJsonValue[];
};

export type AiDemandSchemaStringDefinition = AiDemandSchemaBaseDefinition & {
  type: 'string';
  enum_values?: string[];
  format?: 'date-time' | 'identifier' | 'markdown' | 'uri' | 'version';
  min_length?: number;
  max_length?: number;
  pattern?: string;
};

export type AiDemandSchemaNumberDefinition = AiDemandSchemaBaseDefinition & {
  type: 'number' | 'integer';
  minimum?: number;
  maximum?: number;
  exclusive_minimum?: number;
  exclusive_maximum?: number;
  multiple_of?: number;
};

export type AiDemandSchemaBooleanDefinition = AiDemandSchemaBaseDefinition & {
  type: 'boolean';
};

export type AiDemandSchemaObjectDefinition = AiDemandSchemaBaseDefinition & {
  type: 'object';
  properties: Record<string, AiDemandSchemaDefinition>;
  required?: string[];
  additional_properties?: boolean;
};

export type AiDemandSchemaArrayDefinition = AiDemandSchemaBaseDefinition & {
  type: 'array';
  items: AiDemandSchemaDefinition;
  min_items?: number;
  max_items?: number;
  unique_items?: boolean;
};

export type AiDemandSchemaDefinition =
  | AiDemandSchemaArrayDefinition
  | AiDemandSchemaBooleanDefinition
  | AiDemandSchemaNumberDefinition
  | AiDemandSchemaObjectDefinition
  | AiDemandSchemaStringDefinition;
