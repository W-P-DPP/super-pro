import type { PublicGlobalConfigDto } from '@/api/modules/global-config';
import { joinUrl } from '@super-pro/shared-constants';
import { buildLoginRedirectUrl } from '@super-pro/shared-web';

export const PUBLIC_SITE_TITLE_CONFIG_KEY = 'site.title';
export const PUBLIC_SITE_LOGO_CONFIG_KEY = 'site.logo';
export const PUBLIC_SITE_HIDDEN_KEYWORD_CONFIG_KEY = 'site.hiddenKeyword';
export const PUBLIC_SITE_BASE_URL_CONFIG_KEY = 'site.url';
export const PUBLIC_SITE_LOGIN_URL_CONFIG_KEY = 'site.login';

export const DEFAULT_PUBLIC_SITE_TITLE = 'zwpsite';
export const DEFAULT_PUBLIC_SITE_LOGO = '/public/icons/tools.png';
export const DEFAULT_HIDDEN_MENU_KEYWORD = 'dpp';
export const DEFAULT_PUBLIC_SITE_BASE_URL = '';
export const DEFAULT_PUBLIC_SITE_LOGIN_URL = '';

function getStringConfigValue(
  configs: PublicGlobalConfigDto,
  key: string,
  fallback: string,
) {
  const value = configs[key];

  if (typeof value !== 'string') {
    return fallback;
  }

  return value.trim() || fallback;
}

export function resolvePublicSiteTitle(configs: PublicGlobalConfigDto) {
  return getStringConfigValue(configs, PUBLIC_SITE_TITLE_CONFIG_KEY, DEFAULT_PUBLIC_SITE_TITLE);
}

export function resolvePublicSiteLogo(configs: PublicGlobalConfigDto) {
  return getStringConfigValue(configs, PUBLIC_SITE_LOGO_CONFIG_KEY, DEFAULT_PUBLIC_SITE_LOGO);
}

export function resolveHiddenMenuKeyword(configs: PublicGlobalConfigDto) {
  return getStringConfigValue(
    configs,
    PUBLIC_SITE_HIDDEN_KEYWORD_CONFIG_KEY,
    DEFAULT_HIDDEN_MENU_KEYWORD,
  );
}

export function resolvePublicSiteBaseUrl(configs: PublicGlobalConfigDto) {
  return getStringConfigValue(configs, PUBLIC_SITE_BASE_URL_CONFIG_KEY, DEFAULT_PUBLIC_SITE_BASE_URL);
}

export function resolvePublicSiteLoginUrl(
  configs: PublicGlobalConfigDto,
  fallbackLoginUrl = DEFAULT_PUBLIC_SITE_LOGIN_URL,
) {
  return getStringConfigValue(configs, PUBLIC_SITE_LOGIN_URL_CONFIG_KEY, fallbackLoginUrl);
}

export function isCompleteHttpUrl(value: string) {
  return /^https?:\/\//i.test(value.trim());
}

export function buildPublicMenuNavigationUrl(
  path: string,
  configs: PublicGlobalConfigDto,
  options?: {
    strict?: boolean;
    fallbackLoginUrl?: string;
  },
) {
  const normalizedPath = path.trim();

  if (!normalizedPath) {
    return '';
  }

  const siteBaseUrl = resolvePublicSiteBaseUrl(configs);
  const targetUrl = isCompleteHttpUrl(normalizedPath)
    ? normalizedPath
    : siteBaseUrl
      ? joinUrl(siteBaseUrl, normalizedPath)
      : '';

  if (!targetUrl) {
    return '';
  }

  if (!options?.strict) {
    return targetUrl;
  }

  const loginUrl = resolvePublicSiteLoginUrl(configs, options.fallbackLoginUrl);

  return loginUrl ? buildLoginRedirectUrl(loginUrl, targetUrl) : '';
}
