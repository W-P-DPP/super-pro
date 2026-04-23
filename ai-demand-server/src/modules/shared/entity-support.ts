import dayjs from 'dayjs';
import type { ValueTransformer } from 'typeorm';

export const dateTimeStringTransformer: ValueTransformer = {
  from(value?: Date | null) {
    return value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : null;
  },
  to(value?: Date | string | null) {
    return value ? new Date(value) : value;
  },
};
