import { describe, it, expect } from 'vitest';
import { DaifugoPlugin } from '../../src/core/rules/daifugo/index.js';
import type { BaseGameContext } from '../../src/core/types/engine.js';
import type { DaifugoRuleState } from '../../src/core/rules/daifugo/types.js';
import { DEFAULT_DAIFUGO_CONFIG } from '../../src/core/rules/daifugo/config.js';
import { isValidPlay } from '../../src/core/rules/daifugo/validator.js';

describe('5-Skip Loopback Field Clearing & Sequence Lock Joker Wild', () => {
  const plugin = new DaifugoPlugin();

  it('5-skip: 3人戦で5を出してスキップした結果、手番が自分に戻った場合に場が流れること', () => {
    // 3 players: p1, p2, p3
    // Config has fiveSkip: true
    const config = { ...DEFAULT_DAIFUGO_CONFIG, fiveSkip: true };
    const { context: initCtx, ruleState: initRule } = plugin.init(
      [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
        { id: 'p3', name: 'Charlie' },
      ],
      config
    );

    // Overwrite p1's hand with 5s and other cards
    const card5a = { id: 'S_5', suit: 'spade' as const, rank: 5 as const, isJoker: false as const };
    const card5b = { id: 'H_5', suit: 'heart' as const, rank: 5 as const, isJoker: false as const };
    const cardK = { id: 'S_13', suit: 'spade' as const, rank: 13 as const, isJoker: false as const };

    const context: BaseGameContext = {
      ...initCtx,
      currentTurnPlayerId: 'p1',
      players: [
        { ...initCtx.players[0]!, hand: [card5a, card5b, cardK] },
        { ...initCtx.players[1]!, hand: [{ id: 'S_6', suit: 'spade' as const, rank: 6 as const, isJoker: false as const }] },
        { ...initCtx.players[2]!, hand: [{ id: 'S_7', suit: 'spade' as const, rank: 7 as const, isJoker: false as const }] },
      ],
    };

    // p1 plays pair of 5s -> countFive = 2 -> skipCount = 2
    // In 3 players: p1 -> skip p2 (skip 1) -> skip p3 (skip 2) -> loops back to p1!
    const res = plugin.execute(context, initRule, 'p1', {
      type: 'PLAY',
      cardIds: ['S_5', 'H_5'],
    });

    // Verify turn returns to p1
    expect(res.nextContext.currentTurnPlayerId).toBe('p1');

    // Verify TABLE_CLEARED event occurred and nextTable.lastPlay is null!
    expect(res.events.some((e) => e.type === 'TABLE_CLEARED')).toBe(true);
    expect(res.nextRuleState.table.lastPlay).toBeNull();
  });

  it('連番縛り発動時、Jokerをワイルドカードとして出せること', () => {
    const config = { ...DEFAULT_DAIFUGO_CONFIG, sequenceLock: true };

    // Table is sequence locked requiring rank order 6 (e.g. 4 -> 5 was played)
    const card5 = { id: 'S_5', suit: 'spade' as const, rank: 5 as const, isJoker: false as const };
    const joker = { id: 'JOKER_1', isJoker: true as const };

    const tableState = {
      lastPlay: {
        type: 'single' as const,
        cards: [card5],
        effectiveStrength: 5,
        suits: ['spade' as const],
        playerId: 'p1',
      },
      lockedSuits: null,
      isSequenceLocked: true,
      requiredNextRank: 6, // 6 is required next
      passedPlayerIds: [],
    };

    // Playing Joker as single card
    const checkResult = isValidPlay([joker], tableState, false, config);
    expect(checkResult.valid).toBe(true);
  });
});
