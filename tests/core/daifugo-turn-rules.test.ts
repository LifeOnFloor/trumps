import { describe, it, expect } from 'vitest';
import { DaifugoPlugin } from '../../src/core/rules/daifugo/index.js';
import type { Card } from '../../src/core/types/card.js';
import type { DaifugoConfig } from '../../src/core/rules/daifugo/config.js';

describe('Daifugo Turn and Strength Rules (11-back, 9-reverse, 5-skip, sandstorm)', () => {
  const plugin = new DaifugoPlugin();

  const c = (id: string, suit: 'spade' | 'heart' | 'diamond' | 'club', rank: number): Card => ({
    id,
    suit,
    rank: rank as any,
    isJoker: false,
  });

  it('11-back: temporarily reverses card strength until table is cleared', () => {
    const config: Partial<DaifugoConfig> = {
      elevenBack: true,
      eightCut: true,
    };
    const { context, ruleState } = plugin.init(
      [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
        { id: 'p3', name: 'Charlie' },
      ],
      config
    );

    // Setup hands
    const p1Hand = [c('c1', 'spade', 11)]; // Jack
    const p2Hand = [c('c2', 'spade', 10), c('c3', 'spade', 12)]; // 10 and 12(Q)
    const testContext = {
      ...context,
      players: [
        { ...context.players[0]!, hand: p1Hand },
        { ...context.players[1]!, hand: p2Hand },
        { ...context.players[2]!, hand: [c('c4', 'heart', 4)] },
      ],
      currentTurnPlayerId: 'p1',
    };

    // p1 plays 11
    const res1 = plugin.execute(testContext, ruleState, 'p1', {
      type: 'PLAY',
      cardIds: ['c1'],
    });

    // 11-back should be active
    expect(res1.nextRuleState.isElevenBack).toBe(true);
    expect(res1.events.some((e) => e.type === 'ELEVEN_BACK')).toBe(true);

    // Now strength is reversed: 10 is STRONGER than 11, but 12(Q) is WEAKER than 11
    // p2 can play 10 (effective strength of 10 > 11 in 11-back)
    expect(
      plugin.canExecute(res1.nextContext, res1.nextRuleState, 'p2', {
        type: 'PLAY',
        cardIds: ['c2'], // 10
      })
    ).toBe(true);

    // p2 cannot play 12(Q) because it is weaker than 11 in 11-back
    expect(
      plugin.canExecute(res1.nextContext, res1.nextRuleState, 'p2', {
        type: 'PLAY',
        cardIds: ['c3'], // 12
      })
    ).toBe(false);
  });

  it('9-reverse: reverses turn direction when 9 is played', () => {
    const config: Partial<DaifugoConfig> = {
      nineEffect: 'reverse',
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
        { ...context.players[0]!, hand: [c('c1', 'spade', 9)] },
        { ...context.players[1]!, hand: [c('c2', 'spade', 10)] },
        { ...context.players[2]!, hand: [c('c3', 'spade', 10)] },
      ],
      currentTurnPlayerId: 'p1',
    };

    // p1 plays 9
    const res = plugin.execute(testContext, ruleState, 'p1', {
      type: 'PLAY',
      cardIds: ['c1'],
    });

    // Direction should be reversed (-1)
    expect(res.nextRuleState.turnDirection).toBe(-1);
    expect(res.events.some((e) => e.type === 'NINE_REVERSE')).toBe(true);
    // Next player should be p3 (reverse from p1 in [p1, p2, p3])
    expect(res.nextContext.currentTurnPlayerId).toBe('p3');
  });

  it('5-skip: skips players according to the number of 5s played', () => {
    const config: Partial<DaifugoConfig> = {
      fiveSkip: true,
    };
    const { context, ruleState } = plugin.init(
      [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
        { id: 'p3', name: 'Charlie' },
        { id: 'p4', name: 'Dave' },
      ],
      config
    );

    const testContext = {
      ...context,
      players: [
        { ...context.players[0]!, hand: [c('c1', 'spade', 5)] },
        { ...context.players[1]!, hand: [c('c2', 'heart', 6)] },
        { ...context.players[2]!, hand: [c('c3', 'diamond', 6)] },
        { ...context.players[3]!, hand: [c('c4', 'club', 6)] },
      ],
      currentTurnPlayerId: 'p1',
    };

    // p1 plays a single 5 -> 1 skip -> p2 is skipped, next is p3
    const res = plugin.execute(testContext, ruleState, 'p1', {
      type: 'PLAY',
      cardIds: ['c1'],
    });

    expect(res.events.some((e) => e.type === 'FIVE_SKIP')).toBe(true);
    expect(res.nextContext.currentTurnPlayerId).toBe('p3');
  });

  it('sandstorm: three 3s beats any other triple and triggers revolution', () => {
    const config: Partial<DaifugoConfig> = {
      sandstorm: true,
      revolution: true,
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
        { ...context.players[0]!, hand: [c('c1', 'spade', 2), c('c2', 'heart', 2), c('c3', 'diamond', 2)] },
        { ...context.players[1]!, hand: [c('s1', 'spade', 3), c('s2', 'heart', 3), c('s3', 'diamond', 3)] },
        { ...context.players[2]!, hand: [c('x', 'club', 4)] },
      ],
      currentTurnPlayerId: 'p1',
    };

    // p1 plays three 2s
    const res1 = plugin.execute(testContext, ruleState, 'p1', {
      type: 'PLAY',
      cardIds: ['c1', 'c2', 'c3'],
    });

    // p2 plays three 3s (sandstorm) -> beats three 2s
    expect(
      plugin.canExecute(res1.nextContext, res1.nextRuleState, 'p2', {
        type: 'PLAY',
        cardIds: ['s1', 's2', 's3'],
      })
    ).toBe(true);

    const res2 = plugin.execute(res1.nextContext, res1.nextRuleState, 'p2', {
      type: 'PLAY',
      cardIds: ['s1', 's2', 's3'],
    });

    expect(res2.events.some((e) => e.type === 'SANDSTORM')).toBe(true);
    expect(res2.nextRuleState.isRevolution).toBe(true);
  });
});
