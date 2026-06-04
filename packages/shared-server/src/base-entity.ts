import dayjs from 'dayjs';
import type { EntitySchemaColumnOptions } from 'typeorm';

export abstract class BaseEntity {
  createBy?: string;
  createTime?: Date;
  updateBy?: string;
  updateTime?: Date;
  deleteFlag?: number;
  remark?: string;
  params?: any;
}

export const BaseSchemaColumns: Record<
  keyof Omit<BaseEntity, 'params'>,
  EntitySchemaColumnOptions
> = {
  createBy: {
    name: 'create_by',
    type: String,
    length: 64,
    nullable: true,
    comment: '创建者',
    select: false,
  },
  createTime: {
    name: 'create_time',
    type: 'datetime',
    createDate: true,
    comment: '创建时间',
    select: false,
    transformer: {
      from(value?: Date) {
        return value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : null;
      },
      to(value?: Date) {
        return value;
      },
    },
  },
  updateBy: {
    name: 'update_by',
    type: String,
    length: 64,
    nullable: true,
    comment: '更新者',
    select: false,
  },
  updateTime: {
    name: 'update_time',
    type: 'datetime',
    updateDate: true,
    comment: '更新时间',
    select: false,
    transformer: {
      from(value?: Date) {
        return value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : null;
      },
      to(value?: Date) {
        return value;
      },
    },
  },
  deleteFlag: {
    name: 'delete_flag',
    type: Number,
    nullable: false,
    default: 0,
    comment: 'delete flag',
  },
  remark: {
    name: 'remark',
    type: String,
    nullable: true,
    comment: '备注',
    select: false,
  },
};
