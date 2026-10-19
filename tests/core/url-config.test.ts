import { describe, it, expect } from 'vitest';
import { encodeConfigToUrlParam, decodeConfigFromUrlParam } from '../../src/core/rules/daifugo/url.js';
import { DEFAULT_DAIFUGO_CONFIG } from '../../src/core/rules/daifugo/config.js';
import type { DaifugoConfig } from '../../src/core/rules/daifugo/config.js';

describe('URL Config Synchronization (encodeConfigToUrlParam & decodeConfigFromUrlParam)', () => {
  it('DEFAULT_DAIFUGO_CONFIG をエンコード＆デコードして同一の設定を復元できること', () => {
    const encoded = encodeConfigToUrlParam(DEFAULT_DAIFUGO_CONFIG);
    expect(typeof encoded).toBe('string');
    expect(encoded.length).toBeGreaterThan(0);

    const decoded = decodeConfigFromUrlParam(encoded);
    expect(decoded).toEqual(DEFAULT_DAIFUGO_CONFIG);
  });

  it('チップ設定を含むカスタム設定を正しくエンコード＆デコードできること', () => {
    const customConfig: DaifugoConfig = {
      ...DEFAULT_DAIFUGO_CONFIG,
      chipsMode: true,
      preset: 'high_roller',
      initialChips: 5000,
      anteType: 'escalating',
      baseAnte: 100,
      escalationStep: 50,
      bankruptcyRule: 'bust_game_over',
      elevenBack: true,
      cardExchange: true,
    };

    const encoded = encodeConfigToUrlParam(customConfig);
    const decoded = decodeConfigFromUrlParam(encoded);
    expect(decoded).toEqual(customConfig);
  });

  it('不正な文字列が渡された場合に null を返すこと', () => {
    expect(decodeConfigFromUrlParam('')).toBeNull();
    expect(decodeConfigFromUrlParam('invalid-base64-%%%')).toBeNull();
  });
});
