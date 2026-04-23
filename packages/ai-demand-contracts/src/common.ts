export type AiDemandId = string;

export type AiDemandTimestamp = string;

export type AiDemandJsonPrimitive = boolean | number | string | null;

export type AiDemandJsonValue =
  | AiDemandJsonObject
  | AiDemandJsonPrimitive
  | AiDemandJsonValue[];

export type AiDemandJsonObject = {
  [key: string]: AiDemandJsonValue;
};

export type AiDemandNullable<T> = T | null;
