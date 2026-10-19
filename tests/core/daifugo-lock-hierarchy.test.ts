import { describe, it, expect } from 'vitest';
import { DaifugoPlugin } from '../../src/core/rules/daifugo/index.js';
import type { Card } from '../../src/core/types/card.js';
import type { DaifugoConfig } from '../../src/core/rules/daifugo/config.js';

describe('Daifugo Lock, Sequence, Miyako-Ochi, and Gekokujo Rules', () => {
  const plugin = new DaifugoPlugin();

  const c = (id: string, suit: 'spade' | 'heart' | 'diamond' | 'club', rank: number): Card => ({
    id,
    suit,
    rank: rank as any,
    isJoker: false,
  });

  it('sequenceLock: locks the table to consecutive ranks when consecutive numbers are played', () => {
    const config: Partial<DaifugoConfig> = {
      sequenceLock: true,
      suitLock: 'none',
    };
    const { context, ruleState } = plugin.init(
      [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
        { id: 'p3', name: 'Charlie' },
      ],
      config
    );

    const testContext = {
      ...context,
      players: [
        { ...context.players[0]!, hand: [c('c1', 'spade', 3), c('d1', 'spade', 10)] },
        { ...context.players[1]!, hand: [c('c2', 'heart', 4), c('d2', 'heart', 10)] },
        { ...context.players[2]!, hand: [c('c3', 'diamond', 5), c('c4', 'diamond', 7)] },
      ],
      currentTurnPlayerId: 'p1',
    };

    // p1 plays 3
    const res1 = plugin.execute(testContext, ruleState, 'p1', {
      type: 'PLAY',
      cardIds: ['c1'],
    });

    // p2 plays 4 -> sequence lock triggers (3 -> 4)
    const res2 = plugin.execute(res1.nextContext, res1.nextRuleState, 'p2', {
      type: 'PLAY',
      cardIds: ['c2'],
    });

    expect(res2.nextRuleState.isSequenceLocked).toBe(true);
    expect(res2.events.some((e) => e.type === 'SEQUENCE_LOCKED')).toBe(true);

    // p3 can play 5 (next in sequence)
    expect(
      plugin.canExecute(res2.nextContext, res2.nextRuleState, 'p3', {
        type: 'PLAY',
        cardIds: ['c3'],
      })
    ).toBe(true);

    // p3 CANNOT play 7 (violates sequence lock)
    expect(
      plugin.canExecute(res2.nextContext, res2.nextRuleState, 'p3', {
        type: 'PLAY',
        cardIds: ['c4'],
      })
    ).toBe(false);
  });

  it('miyakoOchi: previous Daifugo drops to Daihinmin if another player finishes first', () => {
    const config: Partial<DaifugoConfig> = {
      miyakoOchi: true,
    };
    const { context, ruleState } = plugin.init(
      [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
        { id: 'p3', name: 'Charlie' },
      ],
      config
    );

    // Set p2 as previous Daifugo
    const stateWithPrev: typeof ruleState = {
      ...ruleState,
      previousRankings: ['p2', 'p1', 'p3'],
    };

    const testContext = {
      ...context,
      players: [
        { ...context.players[0]!, hand: [c('c1', 'spade', 3)] }, // p1 has 1 card
        { ...context.players[1]!, hand: [c('c2', 'spade', 4), c('c3', 'heart', 4)] }, // p2 (prev Daifugo) has 2 cards
        { ...context.players[2]!, hand: [c('c4', 'spade', 5), c('c5', 'heart', 5)] },
      ],
      currentTurnPlayerId: 'p1',
    };

    // p1 finishes first!
    const res = plugin.execute(testContext, stateWithPrev, 'p1', {
      type: 'PLAY',
      cardIds: ['c1'],
    });

    // Miyako-Ochi event should be emitted for p2
    expect(res.events.some((e) => e.type === 'MIYAKO_OCHI')).toBe(true);
    const p2State = res.nextContext.players.find((p) => p.id === 'p2')!;
    expect(p2State.isFinished).toBe(true);
    expect(p2State.rankPosition).toBe(3); // Last place
  });

  it('gekokujo: when previous Daihinmin finishes first, overall ranks are inverted at game over', () => {
    const config: Partial<DaifugoConfig> = {
      gekokujo: true,
    };
    const { context, ruleState } = plugin.init(
      [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
        { id: 'p3', name: 'Charlie' },
      ],
      config
    );

    // p3 was Daihinmin in previous rankings: ['p1', 'p2', 'p3']
    const stateWithPrev: typeof ruleState = {
      ...ruleState,
      previousRankings: ['p1', 'p2', 'p3'],
    };

    const testContext = {
      ...context,
      players: [
        { ...context.players[0]!, hand: [c('c1', 'spade', 4)] },
        { ...context.players[1]!, hand: [c('c2', 'heart', 4)] },
        { ...context.players[2]!, hand: [c('c3', 'diamond', 4)] }, // p3
      ],
      currentTurnPlayerId: 'p3',
    };

    // p3 plays and finishes first
    const res = plugin.execute(testContext, stateWithPrev, 'p3', {
      type: 'PLAY',
      cardIds: ['c3'],
    });

    expect(res.events.some((e) => e.type === 'GEKOKUJO')).toBe(true);
    expect(res.nextRuleState.isGekokujo).toBe(true);
  });
});
