import { describe, it, expect } from 'vitest';
import {
  DEFAULT_DAIFUGO_CONFIG,
  resolveRuleConflicts,
  type DaifugoConfig,
} from '../../src/core/rules/daifugo/config.js';

describe('DaifugoConfig and Conflict Resolution', () => {
  it('should have standard default configuration', () => {
    expect(DEFAULT_DAIFUGO_CONFIG.eightCut).toBe(true);
    expect(DEFAULT_DAIFUGO_CONFIG.revolution).toBe(true);
    expect(DEFAULT_DAIFUGO_CONFIG.suitLock).toBe('single');
    expect(DEFAULT_DAIFUGO_CONFIG.nineEffect).toBe('none');
    expect(DEFAULT_DAIFUGO_CONFIG.elevenBack).toBe(false);
    expect(DEFAULT_DAIFUGO_CONFIG.fiveSkip).toBe(false);
    expect(DEFAULT_DAIFUGO_CONFIG.sevenPass).toBe(false);
    expect(DEFAULT_DAIFUGO_CONFIG.tenDiscard).toBe(false);
    expect(DEFAULT_DAIFUGO_CONFIG.sequenceLock).toBe(false);
    expect(DEFAULT_DAIFUGO_CONFIG.sandstorm).toBe(false);
    expect(DEFAULT_DAIFUGO_CONFIG.miyakoOchi).toBe(false);
    expect(DEFAULT_DAIFUGO_CONFIG.gekokujo).toBe(false);
    expect(DEFAULT_DAIFUGO_CONFIG.cardExchange).toBe(false);
  });

  it('should resolve conflicting nineEffect correctly', () => {
    const configWithReverse: DaifugoConfig = {
      ...DEFAULT_DAIFUGO_CONFIG,
      nineEffect: 'reverse',
    };
    const resolved = resolveRuleConflicts(configWithReverse);
    expect(resolved.nineEffect).toBe('reverse');
  });

  it('should preserve immutable configuration object', () => {
    const original = { ...DEFAULT_DAIFUGO_CONFIG };
    const resolved = resolveRuleConflicts(original);
    expect(resolved).not.toBe(original);
    expect(resolved).toEqual(original);
  });

  it('should normalize invalid suitLock values to none', () => {
    const invalidConfig = {
      ...DEFAULT_DAIFUGO_CONFIG,
      suitLock: 'unknown' as any,
    };
    const resolved = resolveRuleConflicts(invalidConfig);
    expect(resolved.suitLock).toBe('none');
  });
});
