import type { AuthCurrentUserResponseDto } from './auth.dto.ts';
import { authRepository } from './auth.repository.ts';
import type { CurrentUserDto } from './current-user.ts';

export class AuthService {
  getCurrentUser(currentUser: CurrentUserDto): AuthCurrentUserResponseDto {
    const entity = authRepository.buildCurrentUserEntity(currentUser);

    return {
      userId: entity.userId,
      username: entity.username,
      role: entity.role,
    };
  }
}

export const authService = new AuthService();
