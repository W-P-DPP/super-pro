import { BaseEntity } from '@super-pro/shared-server';
import type { FileNodeType } from './file.dto.ts';

export class FileEntity extends BaseEntity {
  name!: string
  relativePath!: string
  type!: FileNodeType
  size?: number
  modifiedTime?: Date
  children: FileEntity[] = []
}
