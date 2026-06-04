import { BaseEntity } from '@super-pro/shared-server';
import type { CurrentUserRole } from './current-user.ts';

export class AuthCurrentUserEntity extends BaseEntity {
  userId!: number;
  username!: string;
  role!: CurrentUserRole;
}
