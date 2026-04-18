import type { CurrentUserDto } from './current-user.ts';
import { AuthCurrentUserEntity } from './auth.entity.ts';

export class AuthRepository {
  buildCurrentUserEntity(currentUser: CurrentUserDto): AuthCurrentUserEntity {
    const entity = new AuthCurrentUserEntity();
    entity.userId = currentUser.userId;
    entity.username = currentUser.username;
    entity.role = currentUser.role;
    return entity;
  }
}

export const authRepository = new AuthRepository();
