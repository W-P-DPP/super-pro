import { describe, expect, it } from 'vitest';
import {
  DEFAULT_HIDDEN_MENU_KEYWORD,
  DEFAULT_PUBLIC_SITE_LOGO,
  DEFAULT_PUBLIC_SITE_TITLE,
  buildPublicMenuNavigationUrl,
  resolveHiddenMenuKeyword,
  resolvePublicSiteLoginUrl,
  resolvePublicSiteBaseUrl,
  resolvePublicSiteLogo,
  resolvePublicSiteTitle,
} from './public-global-config';

describe('public-global-config', () => {
  it('resolves public shell values from configs', () => {
    const configs = {
      'site.title': 'Portal',
      'site.logo': '/assets/logo.svg',
      'site.hiddenKeyword': 'secret',
      'site.url': 'https://www.example.com/app/',
      'site.login': 'https://login.example.com/',
    };

    expect(resolvePublicSiteTitle(configs)).toBe('Portal');
    expect(resolvePublicSiteLogo(configs)).toBe('/assets/logo.svg');
    expect(resolveHiddenMenuKeyword(configs)).toBe('secret');
    expect(resolvePublicSiteBaseUrl(configs)).toBe('https://www.example.com/app/');
    expect(resolvePublicSiteLoginUrl(configs)).toBe('https://login.example.com/');
  });

  it('falls back when config values are missing or not strings', () => {
    const configs = {
      'site.title': '   ',
      'site.logo': true,
      'site.hiddenKeyword': 100,
    };

    expect(resolvePublicSiteTitle(configs)).toBe(DEFAULT_PUBLIC_SITE_TITLE);
    expect(resolvePublicSiteLogo(configs)).toBe(DEFAULT_PUBLIC_SITE_LOGO);
    expect(resolveHiddenMenuKeyword(configs)).toBe(DEFAULT_HIDDEN_MENU_KEYWORD);
    expect(resolvePublicSiteBaseUrl(configs)).toBe('');
    expect(resolvePublicSiteLoginUrl(configs, 'https://fallback-login.example.com/')).toBe(
      'https://fallback-login.example.com/',
    );
  });

  it('keeps complete menu urls and joins relative menu paths with site.url', () => {
    const configs = {
      'site.url': 'https://www.example.com/root/',
    };

    expect(buildPublicMenuNavigationUrl('https://tool.example.com/a', configs)).toBe(
      'https://tool.example.com/a',
    );
    expect(buildPublicMenuNavigationUrl('http://tool.example.com/a', configs)).toBe(
      'http://tool.example.com/a',
    );
    expect(buildPublicMenuNavigationUrl('/admin/users', configs)).toBe(
      'https://www.example.com/root/admin/users',
    );
    expect(buildPublicMenuNavigationUrl('admin/users', configs)).toBe(
      'https://www.example.com/root/admin/users',
    );
  });

  it('uses site.login for strict menu login redirect and falls back to frontend login config', () => {
    const configs = {
      'site.url': 'https://www.example.com/root/',
      'site.login': 'https://login.example.com/',
    };

    expect(
      buildPublicMenuNavigationUrl('/admin/users', configs, {
        strict: true,
        fallbackLoginUrl: 'https://fallback-login.example.com/',
      }),
    ).toBe('https://login.example.com/?redirect=https%3A%2F%2Fwww.example.com%2Froot%2Fadmin%2Fusers');

    expect(
      buildPublicMenuNavigationUrl('/admin/users', { 'site.url': 'https://www.example.com/root/' }, {
        strict: true,
        fallbackLoginUrl: 'https://fallback-login.example.com/',
      }),
    ).toBe(
      'https://fallback-login.example.com/?redirect=https%3A%2F%2Fwww.example.com%2Froot%2Fadmin%2Fusers',
    );
  });
});
