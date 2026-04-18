import { BaseEntity } from '../../utils/entities/base.entity.ts';
import type { CurrentUserRole } from './current-user.ts';

export class AuthCurrentUserEntity extends BaseEntity {
  userId!: number;
  username!: string;
  role!: CurrentUserRole;
}
