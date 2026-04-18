import type { CurrentUserRole } from './current-user.ts';

export interface AuthCurrentUserResponseDto {
  userId: number;
  username: string;
  role: CurrentUserRole;
}
