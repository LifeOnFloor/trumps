import { describe, it, expect } from 'vitest';
import {
  CHIP_PRESETS,
  calculateAnte,
  type CommonChipConfig,
} from '../../src/core/types/chips.js';
import { settleChips } from '../../src/core/rules/daifugo/settlement.js';
import type { PlayerState } from '../../src/core/types/engine.js';
import type { DaifugoConfig } from '../../src/core/rules/daifugo/config.js';
import { DEFAULT_DAIFUGO_CONFIG } from '../../src/core/rules/daifugo/config.js';

describe('Common Chips System (Presets, Escalating Ante, and Debt/Bust Rules)', () => {
  it('defines 4 quick presets with accurate default values', () => {
    expect(CHIP_PRESETS.casual.config.initialChips).toBe(1000);
    expect(CHIP_PRESETS.casual.config.bankruptcyRule).toBe('allow_debt');
    expect(CHIP_PRESETS.casual.config.anteType).toBe('none');

    expect(CHIP_PRESETS.standard.config.initialChips).toBe(1000);
    expect(CHIP_PRESETS.standard.config.baseAnte).toBe(50);
    expect(CHIP_PRESETS.standard.config.bankruptcyRule).toBe('bust_game_over');

    expect(CHIP_PRESETS.high_roller.config.initialChips).toBe(5000);
    expect(CHIP_PRESETS.high_roller.config.anteType).toBe('escalating');
    expect(CHIP_PRESETS.high_roller.config.escalationStep).toBe(50);

    expect(CHIP_PRESETS.survival_debt.config.initialChips).toBe(10000);
    expect(CHIP_PRESETS.survival_debt.config.bankruptcyRule).toBe('allow_debt');
  });

  it('calculates fixed vs escalating ante correctly across rounds', () => {
    const fixedConfig: CommonChipConfig = {
      chipsMode: true,
      initialChips: 1000,
      anteType: 'fixed',
      baseAnte: 50,
      bankruptcyRule: 'bust_game_over',
    };
    expect(calculateAnte(fixedConfig, 0)).toBe(50);
    expect(calculateAnte(fixedConfig, 3)).toBe(50);

    const escalatingConfig: CommonChipConfig = {
      chipsMode: true,
      initialChips: 5000,
      anteType: 'escalating',
      baseAnte: 50,
      escalationStep: 50,
      bankruptcyRule: 'bust_game_over',
    };
    // Round 0: 50
    expect(calculateAnte(escalatingConfig, 0)).toBe(50);
    // Round 1: 50 + 50 = 100
    expect(calculateAnte(escalatingConfig, 1)).toBe(100);
    // Round 2: 50 + 100 = 150
    expect(calculateAnte(escalatingConfig, 2)).toBe(150);

    const noneConfig: CommonChipConfig = {
      chipsMode: true,
      initialChips: 1000,
      anteType: 'none',
      baseAnte: 0,
      bankruptcyRule: 'allow_debt',
    };
    expect(calculateAnte(noneConfig, 2)).toBe(0);
  });

  it('allows debt (negative chips like mahjong black stick) when bankruptcyRule is allow_debt', () => {
    const players: PlayerState[] = [
      { id: 'p1', name: 'Winner', hand: [], isFinished: true, chips: 1000 },
      { id: 'p2', name: 'Second', hand: [], isFinished: true, chips: 1000 },
      { id: 'p3', name: 'Poor', hand: [], isFinished: true, chips: 50 }, // only 50 chips
    ];
    const initialTotal = players.reduce((sum, p) => sum + (p.chips ?? 0), 0); // 2050

    const config: DaifugoConfig = {
      ...DEFAULT_DAIFUGO_CONFIG,
      chipsMode: true,
      bankruptcyRule: 'allow_debt',
      chipSettlementType: 'ranking_transfer',
      transferRate: 100,
    };

    // p3 (3rd place) pays 200 (rate * 2) to p1. Since debt is allowed, p3 chips become 50 - 200 = -150
    const result = settleChips({
      players,
      rankings: ['p1', 'p2', 'p3'],
      foulPlayerIds: [],
      pot: 0,
      config,
    });

    const finalTotal = result.nextPlayers.reduce((sum, p) => sum + (p.chips ?? 0), 0);
    // TOTAL IS STRICTLY PRESERVED!
    expect(finalTotal).toBe(initialTotal);

    const p1 = result.nextPlayers.find((p) => p.id === 'p1');
    const p3 = result.nextPlayers.find((p) => p.id === 'p3');

    expect(p3?.chips).toBe(-150); // Mahjong-style debt!
    expect(p1?.chips).toBe(1200); // 1000 + 200 = 1200
  });

  it('stops at 0 (all-in) when bankruptcyRule is bust_game_over', () => {
    const players: PlayerState[] = [
      { id: 'p1', name: 'Winner', hand: [], isFinished: true, chips: 1000 },
      { id: 'p2', name: 'Second', hand: [], isFinished: true, chips: 1000 },
      { id: 'p3', name: 'Poor', hand: [], isFinished: true, chips: 50 },
    ];
    const initialTotal = players.reduce((sum, p) => sum + (p.chips ?? 0), 0); // 2050

    const config: DaifugoConfig = {
      ...DEFAULT_DAIFUGO_CONFIG,
      chipsMode: true,
      bankruptcyRule: 'bust_game_over',
      chipSettlementType: 'ranking_transfer',
      transferRate: 100,
    };

    const result = settleChips({
      players,
      rankings: ['p1', 'p2', 'p3'],
      foulPlayerIds: [],
      pot: 0,
      config,
    });

    const finalTotal = result.nextPlayers.reduce((sum, p) => sum + (p.chips ?? 0), 0);
    expect(finalTotal).toBe(initialTotal);

    const p1 = result.nextPlayers.find((p) => p.id === 'p1');
    const p3 = result.nextPlayers.find((p) => p.id === 'p3');

    expect(p3?.chips).toBe(0); // Cannot go below 0
    expect(p1?.chips).toBe(1050); // Only gets what was available
  });
});
