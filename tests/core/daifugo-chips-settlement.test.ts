import { describe, it, expect } from 'vitest';
import { settleChips } from '../../src/core/rules/daifugo/settlement.js';
import type { PlayerState } from '../../src/core/types/engine.js';
import type { DaifugoConfig } from '../../src/core/rules/daifugo/config.js';
import { DEFAULT_DAIFUGO_CONFIG } from '../../src/core/rules/daifugo/config.js';

describe('Daifugo Chips Settlement (Zero-Sum & Options)', () => {
  const baseConfig: DaifugoConfig = {
    ...DEFAULT_DAIFUGO_CONFIG,
    chipsMode: true,
    initialChips: 1000,
    chipSettlementType: 'ranking_transfer',
    transferRate: 100,
    ante: 0,
  };

  it('preserves total chips in a 3-player match with ranking_transfer mode', () => {
    const players: PlayerState[] = [
      { id: 'p1', name: 'Player 1', hand: [], isFinished: true, chips: 1000 },
      { id: 'p2', name: 'Player 2', hand: [], isFinished: true, chips: 1000 },
      { id: 'p3', name: 'Player 3', hand: [], isFinished: true, chips: 1000 },
    ];
    const initialTotal = players.reduce((sum, p) => sum + (p.chips ?? 0), 0);

    // p1 = 1st, p2 = 2nd, p3 = 3rd
    const result = settleChips({
      players,
      rankings: ['p1', 'p2', 'p3'],
      foulPlayerIds: [],
      pot: 0,
      config: baseConfig,
    });

    const finalTotal = result.nextPlayers.reduce((sum, p) => sum + (p.chips ?? 0), 0);
    expect(finalTotal).toBe(initialTotal);

    const p1 = result.nextPlayers.find((p) => p.id === 'p1');
    const p2 = result.nextPlayers.find((p) => p.id === 'p2');
    const p3 = result.nextPlayers.find((p) => p.id === 'p3');

    // p3 (3rd) pays 200 to p1 (1st), p2 is unchanged
    expect(p1?.chips).toBe(1200);
    expect(p2?.chips).toBe(1000);
    expect(p3?.chips).toBe(800);
  });

  it('preserves total chips in a 4-player match with ranking_transfer mode', () => {
    const players: PlayerState[] = [
      { id: 'p1', name: 'P1', hand: [], isFinished: true, chips: 1000 },
      { id: 'p2', name: 'P2', hand: [], isFinished: true, chips: 1000 },
      { id: 'p3', name: 'P3', hand: [], isFinished: true, chips: 1000 },
      { id: 'p4', name: 'P4', hand: [], isFinished: true, chips: 1000 },
    ];
    const initialTotal = players.reduce((sum, p) => sum + (p.chips ?? 0), 0);

    // p1: 1st, p2: 2nd, p3: 3rd, p4: 4th
    const result = settleChips({
      players,
      rankings: ['p1', 'p2', 'p3', 'p4'],
      foulPlayerIds: [],
      pot: 0,
      config: baseConfig,
    });

    const finalTotal = result.nextPlayers.reduce((sum, p) => sum + (p.chips ?? 0), 0);
    expect(finalTotal).toBe(initialTotal);

    const p1 = result.nextPlayers.find((p) => p.id === 'p1');
    const p2 = result.nextPlayers.find((p) => p.id === 'p2');
    const p3 = result.nextPlayers.find((p) => p.id === 'p3');
    const p4 = result.nextPlayers.find((p) => p.id === 'p4');

    // p4 pays 200 to p1, p3 pays 100 to p2
    expect(p1?.chips).toBe(1200);
    expect(p2?.chips).toBe(1100);
    expect(p3?.chips).toBe(900);
    expect(p4?.chips).toBe(800);
  });

  it('preserves total chips when foul / surrender penalty occurs in ranking_transfer mode', () => {
    const players: PlayerState[] = [
      { id: 'p1', name: 'P1', hand: [], isFinished: true, chips: 1000 },
      { id: 'p2', name: 'P2', hand: [], isFinished: true, chips: 1000 },
      { id: 'p3', name: 'P3', hand: [], isFinished: true, chips: 1000 },
    ];
    const initialTotal = players.reduce((sum, p) => sum + (p.chips ?? 0), 0);

    // p1: 1st, p2 and p3 fouled/surrendered
    const result = settleChips({
      players,
      rankings: ['p1'],
      foulPlayerIds: ['p2', 'p3'],
      pot: 0,
      config: baseConfig,
    });

    const finalTotal = result.nextPlayers.reduce((sum, p) => sum + (p.chips ?? 0), 0);
    // MUST NOT lose any chips!
    expect(finalTotal).toBe(initialTotal);

    const p1 = result.nextPlayers.find((p) => p.id === 'p1');
    const p2 = result.nextPlayers.find((p) => p.id === 'p2');
    const p3 = result.nextPlayers.find((p) => p.id === 'p3');

    // p2 and p3 pay 200 penalty each to p1 (1st place)
    expect(p2?.chips).toBe(800);
    expect(p3?.chips).toBe(800);
    expect(p1?.chips).toBe(1400); // 1000 + 200 + 200 = 1400
  });

  it('correctly splits pot in pot_split mode with ante and total preservation', () => {
    // 3 players each with 950 chips after paying 50 ante (total pot = 150)
    const players: PlayerState[] = [
      { id: 'p1', name: 'P1', hand: [], isFinished: true, chips: 950 },
      { id: 'p2', name: 'P2', hand: [], isFinished: true, chips: 950 },
      { id: 'p3', name: 'P3', hand: [], isFinished: true, chips: 950 },
    ];
    const pot = 150;
    const initialTotal = players.reduce((sum, p) => sum + (p.chips ?? 0), 0) + pot; // 3000

    const config: DaifugoConfig = {
      ...baseConfig,
      chipSettlementType: 'pot_split',
      ante: 50,
    };

    const result = settleChips({
      players,
      rankings: ['p1', 'p2', 'p3'],
      foulPlayerIds: [],
      pot,
      config,
    });

    const finalTotal = result.nextPlayers.reduce((sum, p) => sum + (p.chips ?? 0), 0);
    expect(finalTotal).toBe(initialTotal);

    const p1 = result.nextPlayers.find((p) => p.id === 'p1');
    const p2 = result.nextPlayers.find((p) => p.id === 'p2');
    const p3 = result.nextPlayers.find((p) => p.id === 'p3');

    // 150 pot: 70% to 1st (105), 30% to 2nd (45)
    expect(p1?.chips).toBe(950 + 105); // 1055
    expect(p2?.chips).toBe(950 + 45);  // 995
    expect(p3?.chips).toBe(950);       // 950
  });

  it('handles player having fewer chips than transfer/penalty amount without going negative', () => {
    const players: PlayerState[] = [
      { id: 'p1', name: 'P1', hand: [], isFinished: true, chips: 1000 },
      { id: 'p2', name: 'P2', hand: [], isFinished: true, chips: 1000 },
      { id: 'p3', name: 'P3', hand: [], isFinished: true, chips: 50 }, // only 50 chips
    ];
    const initialTotal = players.reduce((sum, p) => sum + (p.chips ?? 0), 0); // 2050

    const result = settleChips({
      players,
      rankings: ['p1', 'p2', 'p3'],
      foulPlayerIds: [],
      pot: 0,
      config: baseConfig,
    });

    const finalTotal = result.nextPlayers.reduce((sum, p) => sum + (p.chips ?? 0), 0);
    expect(finalTotal).toBe(initialTotal);

    const p1 = result.nextPlayers.find((p) => p.id === 'p1');
    const p3 = result.nextPlayers.find((p) => p.id === 'p3');

    // p3 can only pay 50 chips (all-in)
    expect(p3?.chips).toBe(0);
    expect(p1?.chips).toBe(1050);
  });
});
