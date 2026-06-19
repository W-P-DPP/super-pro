import { describe, expect, it } from 'vitest';
import {
  ADMIN_CONSOLE_PERMISSION_CODES,
  GLOBAL_CONFIG_TYPES,
  isGlobalConfigType,
} from './index.ts';

describe('global-config shared contracts', () => {
  it('exports stable global config type options', () => {
    expect(GLOBAL_CONFIG_TYPES).toEqual(['text', 'number', 'boolean']);
    expect(isGlobalConfigType('boolean')).toBe(true);
    expect(isGlobalConfigType('json')).toBe(false);
  });

  it('exports admin console permission codes for global config module', () => {
    expect(ADMIN_CONSOLE_PERMISSION_CODES.globalConfigMenuView).toBe(
      'admin-console.menu.global-config.view',
    );
    expect(ADMIN_CONSOLE_PERMISSION_CODES.globalConfigApiDelete).toBe(
      'admin-console.api.global-config.delete',
    );
  });
});
