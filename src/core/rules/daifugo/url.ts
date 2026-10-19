import type { DaifugoConfig } from './config.js';

/**
 * Encodes a DaifugoConfig into a URL-safe compact string.
 */
export function encodeConfigToUrlParam(config: DaifugoConfig): string {
  try {
    const json = JSON.stringify(config);
    if (typeof btoa !== 'undefined') {
      return btoa(unescape(encodeURIComponent(json)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    }
    return encodeURIComponent(json);
  } catch {
    return '';
  }
}

/**
 * Decodes a URL-safe string back into a DaifugoConfig object.
 */
export function decodeConfigFromUrlParam(param: string): DaifugoConfig | null {
  try {
    if (!param) return null;
    let json = '';
    if (typeof atob !== 'undefined') {
      let b64 = param.replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4 !== 0) {
        b64 += '=';
      }
      json = decodeURIComponent(escape(atob(b64)));
    } else {
      json = decodeURIComponent(param);
    }
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed === 'object') {
      return parsed as DaifugoConfig;
    }
    return null;
  } catch {
    try {
      const parsed = JSON.parse(decodeURIComponent(param));
      if (parsed && typeof parsed === 'object') {
        return parsed as DaifugoConfig;
      }
      return null;
    } catch {
      return null;
    }
  }
}
