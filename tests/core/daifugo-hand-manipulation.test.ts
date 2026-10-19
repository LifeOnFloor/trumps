import { describe, it, expect } from 'vitest';
import { DaifugoPlugin } from '../../src/core/rules/daifugo/index.js';
import type { Card } from '../../src/core/types/card.js';
import type { DaifugoConfig } from '../../src/core/rules/daifugo/config.js';

describe('Daifugo Hand Manipulation Rules (7-pass, 10-discard, and Card Exchange)', () => {
  const plugin = new DaifugoPlugin();

  const c = (id: string, suit: 'spade' | 'heart' | 'diamond' | 'club', rank: number): Card => ({
    id,
    suit,
    rank: rank as any,
    isJoker: false,
  });

  it('7-pass: requires player to pass cards to the next player when 7 is played', () => {
    const config: Partial<DaifugoConfig> = {
      sevenPass: true,
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
        { ...context.players[0]!, hand: [c('c1', 'spade', 7), c('c2', 'spade', 3)] },
        { ...context.players[1]!, hand: [c('c3', 'heart', 8)] },
        { ...context.players[2]!, hand: [c('c4', 'diamond', 8)] },
      ],
      currentTurnPlayerId: 'p1',
    };

    // p1 plays 7
    const res1 = plugin.execute(testContext, ruleState, 'p1', {
      type: 'PLAY',
      cardIds: ['c1'],
    });

    // pendingHandAction should be set
    expect(res1.nextRuleState.pendingHandAction).toEqual({
      type: 'SEVEN_PASS',
      playerId: 'p1',
      targetPlayerId: 'p2',
      count: 1,
    });

    // p1 must execute PASS_CARDS with c2
    expect(
      plugin.canExecute(res1.nextContext, res1.nextRuleState, 'p1', {
        type: 'PASS_CARDS',
        cardIds: ['c2'],
      })
    ).toBe(true);

    const res2 = plugin.execute(res1.nextContext, res1.nextRuleState, 'p1', {
      type: 'PASS_CARDS',
      cardIds: ['c2'],
    });

    // c2 is transferred from p1 to p2
    const p1Hand = res2.nextContext.players.find((p) => p.id === 'p1')!.hand;
    const p2Hand = res2.nextContext.players.find((p) => p.id === 'p2')!.hand;
    expect(p1Hand.some((c) => c.id === 'c2')).toBe(false);
    expect(p2Hand.some((c) => c.id === 'c2')).toBe(true);
    expect(res2.nextRuleState.pendingHandAction).toBeNull();
  });

  it('10-discard: allows player to discard cards when 10 is played', () => {
    const config: Partial<DaifugoConfig> = {
      tenDiscard: true,
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
        { ...context.players[0]!, hand: [c('c1', 'spade', 10), c('c2', 'spade', 3), c('c3', 'heart', 4)] },
        { ...context.players[1]!, hand: [c('c4', 'heart', 8)] },
        { ...context.players[2]!, hand: [c('c5', 'diamond', 8)] },
      ],
      currentTurnPlayerId: 'p1',
    };

    // p1 plays 10
    const res1 = plugin.execute(testContext, ruleState, 'p1', {
      type: 'PLAY',
      cardIds: ['c1'],
    });

    expect(res1.nextRuleState.pendingHandAction).toEqual({
      type: 'TEN_DISCARD',
      playerId: 'p1',
      count: 1,
    });

    // p1 discards c2
    const res2 = plugin.execute(res1.nextContext, res1.nextRuleState, 'p1', {
      type: 'DISCARD_CARDS',
      cardIds: ['c2'],
    });

    const p1Hand = res2.nextContext.players.find((p) => p.id === 'p1')!.hand;
    expect(p1Hand.some((c) => c.id === 'c2')).toBe(false);
    expect(res2.nextRuleState.pendingHandAction).toBeNull();
  });

  it('cardExchange: exchanges 2 cards between Daifugo and Daihinmin (strongest vs weakest)', async () => {
    const { executeTaxCardExchange } = await import('../../src/core/rules/daifugo/exchange.js');
    const players = [
      {
        id: 'p1', // Daifugo
        name: 'Alice',
        hand: [c('a1', 'spade', 3), c('a2', 'heart', 4), c('a3', 'diamond', 10)],
        isFinished: false,
      },
      {
        id: 'p2', // Heimin
        name: 'Bob',
        hand: [c('b1', 'club', 5)],
        isFinished: false,
      },
      {
        id: 'p3', // Daihinmin
        name: 'Charlie',
        hand: [c('c1', 'spade', 2), c('c2', 'heart', 2), c('c3', 'club', 6)],
        isFinished: false,
      },
    ];

    const { nextPlayers, exchanges } = executeTaxCardExchange(players, ['p1', 'p2', 'p3']);
    expect(exchanges.length).toBe(2);

    const p1Hand = nextPlayers.find((p) => p.id === 'p1')!.hand;
    const p3Hand = nextPlayers.find((p) => p.id === 'p3')!.hand;

    // p1 receives p3's strongest cards (c1: 2, c2: 2)
    expect(p1Hand.some((c) => c.id === 'c1')).toBe(true);
    expect(p1Hand.some((c) => c.id === 'c2')).toBe(true);
    // p3 receives p1's weakest cards (a1: 3, a2: 4)
    expect(p3Hand.some((c) => c.id === 'a1')).toBe(true);
    expect(p3Hand.some((c) => c.id === 'a2')).toBe(true);
  });

  it('7-pass: player finishes and ranks when passing their last card', () => {
    const config: Partial<DaifugoConfig> = { sevenPass: true };
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
        { ...context.players[0]!, hand: [c('c1', 'spade', 7), c('c2', 'heart', 3)] },
        { ...context.players[1]!, hand: [c('c3', 'heart', 8)] },
        { ...context.players[2]!, hand: [c('c4', 'diamond', 8)] },
      ],
      currentTurnPlayerId: 'p1',
    };

    const res1 = plugin.execute(testContext, ruleState, 'p1', {
      type: 'PLAY',
      cardIds: ['c1'],
    });

    const res2 = plugin.execute(res1.nextContext, res1.nextRuleState, 'p1', {
      type: 'PASS_CARDS',
      cardIds: ['c2'],
    });

    const p1 = res2.nextContext.players.find((p) => p.id === 'p1')!;
    expect(p1.hand.length).toBe(0);
    expect(p1.isFinished).toBe(true);
    expect(p1.rankPosition).toBe(1);
    expect(res2.nextRuleState.rankings).toContain('p1');
    expect(res2.events.some((e) => e.type === 'PLAYER_FINISHED' && (e.payload as any).playerId === 'p1')).toBe(true);
  });

  it('10-discard: player finishes and ranks when discarding their last card', () => {
    const config: Partial<DaifugoConfig> = { tenDiscard: true };
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
        { ...context.players[0]!, hand: [c('c1', 'spade', 10), c('c2', 'heart', 3)] },
        { ...context.players[1]!, hand: [c('c3', 'heart', 8)] },
        { ...context.players[2]!, hand: [c('c4', 'diamond', 8)] },
      ],
      currentTurnPlayerId: 'p1',
    };

    const res1 = plugin.execute(testContext, ruleState, 'p1', {
      type: 'PLAY',
      cardIds: ['c1'],
    });

    const res2 = plugin.execute(res1.nextContext, res1.nextRuleState, 'p1', {
      type: 'DISCARD_CARDS',
      cardIds: ['c2'],
    });

    const p1 = res2.nextContext.players.find((p) => p.id === 'p1')!;
    expect(p1.hand.length).toBe(0);
    expect(p1.isFinished).toBe(true);
    expect(p1.rankPosition).toBe(1);
    expect(res2.nextRuleState.rankings).toContain('p1');
    expect(res2.events.some((e) => e.type === 'PLAYER_FINISHED' && (e.payload as any).playerId === 'p1')).toBe(true);
  });

  it('init: integrates cardExchange when previousRankings option is provided', () => {
    const config: Partial<DaifugoConfig> = { cardExchange: true };
    const { ruleState } = plugin.init(
      [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
        { id: 'p3', name: 'Charlie' },
      ],
      config,
      { previousRankings: ['p1', 'p2', 'p3'] }
    );

    expect(ruleState.previousRankings).toEqual(['p1', 'p2', 'p3']);
  });
});
