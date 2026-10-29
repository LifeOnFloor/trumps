import type { RegularCard } from '../../types/card.js';
import type {
  BaseGameContext,
  CardGamePlugin,
  GameEvent,
  PlayerState,
  SanitizedBaseGameContext,
  SanitizedPlayerState,
  SanitizedState,
} from '../../types/engine.js';
import { createDeck, shuffleDeck } from '../../utils/deck.js';
import type {
  GridCard,
  ShinkeiSuijakuAction,
  ShinkeiSuijakuConfig,
  ShinkeiSuijakuRuleState,
} from './types.js';

export const DEFAULT_SHINKEI_SUIJAKU_CONFIG: ShinkeiSuijakuConfig = {
  pairRule: 'rank',
  jokerCount: 0,
};

export class ShinkeiSuijakuPlugin
  implements CardGamePlugin<ShinkeiSuijakuConfig, ShinkeiSuijakuRuleState, ShinkeiSuijakuAction>
{
  readonly id = 'shinkei-suijaku';
  readonly name = 'Memory (Concentration)';
  readonly minPlayers = 1;
  readonly maxPlayers = 6;
  readonly hasChips = false;
  readonly defaultConfig: ShinkeiSuijakuConfig = DEFAULT_SHINKEI_SUIJAKU_CONFIG;

  init(
    players: readonly { id: string; name: string }[],
    config?: Partial<ShinkeiSuijakuConfig>,
    options?: { customDeck?: readonly RegularCard[] }
  ): { context: BaseGameContext; ruleState: ShinkeiSuijakuRuleState } {
    if (players.length < this.minPlayers || players.length > this.maxPlayers) {
      throw new Error(`Player count must be between ${this.minPlayers} and ${this.maxPlayers}`);
    }

    const mergedConfig: ShinkeiSuijakuConfig = {
      ...this.defaultConfig,
      ...config,
    };

    const rawDeck: RegularCard[] = options?.customDeck
      ? [...options.customDeck]
      : (shuffleDeck(createDeck({ jokerCount: mergedConfig.jokerCount })) as RegularCard[]);

    const cards: GridCard[] = rawDeck.map((card, index) => ({
      index,
      card,
      isFlipped: false,
      isTaken: false,
      takenByPlayerId: null,
    }));

    const playerScores: Record<string, number> = {};
    const playerStates: PlayerState[] = players.map((p) => {
      playerScores[p.id] = 0;
      return {
        id: p.id,
        name: p.name,
        hand: [],
        isFinished: false,
      };
    });

    const context: BaseGameContext = {
      gameId: this.id,
      players: playerStates,
      currentTurnPlayerId: players[0]?.id ?? null,
      isGameOver: false,
      winnerPlayerIds: [],
    };

    const ruleState: ShinkeiSuijakuRuleState = {
      config: mergedConfig,
      cards,
      firstFlippedIndex: null,
      secondFlippedIndex: null,
      lastMatchResult: null,
      playerScores,
      turnCount: 0,
    };

    return { context, ruleState };
  }

  canExecute(
    context: Readonly<BaseGameContext>,
    ruleState: Readonly<ShinkeiSuijakuRuleState>,
    playerId: string,
    action: ShinkeiSuijakuAction
  ): boolean {
    if (context.isGameOver) return false;

    // Must be current turn player
    if (context.currentTurnPlayerId !== playerId) return false;

    if (action.type === 'NEXT_TURN') {
      return (
        ruleState.firstFlippedIndex !== null &&
        ruleState.secondFlippedIndex !== null &&
        ruleState.lastMatchResult === 'miss'
      );
    }

    if (action.type === 'FLIP') {
      const { cardIndex } = action;
      if (cardIndex < 0 || cardIndex >= ruleState.cards.length) return false;

      const target = ruleState.cards[cardIndex];
      if (!target || target.isTaken) return false;

      // If previous turn was a miss and hasn't been reset yet, flipping a new card will auto-reset
      if (ruleState.lastMatchResult === 'miss') {
        // Can flip any untaken card that wasn't one of the mismatched cards
        return true;
      }

      // Step 1: flipping 1st card
      if (ruleState.firstFlippedIndex === null) {
        return !target.isFlipped;
      }

      // Step 2: flipping 2nd card
      if (ruleState.secondFlippedIndex === null) {
        return ruleState.firstFlippedIndex !== cardIndex && !target.isFlipped;
      }

      return false;
    }

    return false;
  }

  execute(
    context: Readonly<BaseGameContext>,
    ruleState: Readonly<ShinkeiSuijakuRuleState>,
    playerId: string,
    action: ShinkeiSuijakuAction
  ): {
    nextContext: BaseGameContext;
    nextRuleState: ShinkeiSuijakuRuleState;
    events: GameEvent[];
  } {
    if (!this.canExecute(context, ruleState, playerId, action)) {
      throw new Error(`Invalid action ${action.type} for player ${playerId}`);
    }

    const events: GameEvent[] = [];
    let nextCards = [...ruleState.cards];
    let nextTurnPlayerId = context.currentTurnPlayerId;
    let nextFirstFlipped = ruleState.firstFlippedIndex;
    let nextSecondFlipped = ruleState.secondFlippedIndex;
    let nextLastMatchResult = ruleState.lastMatchResult;
    let nextPlayerScores = { ...ruleState.playerScores };
    let nextTurnCount = ruleState.turnCount;
    let isGameOver = context.isGameOver;
    let winnerPlayerIds = [...context.winnerPlayerIds];

    if (action.type === 'NEXT_TURN') {
      // Flip back the two mismatched cards
      if (nextFirstFlipped !== null && nextCards[nextFirstFlipped]) {
        nextCards[nextFirstFlipped] = { ...nextCards[nextFirstFlipped], isFlipped: false };
      }
      if (nextSecondFlipped !== null && nextCards[nextSecondFlipped]) {
        nextCards[nextSecondFlipped] = { ...nextCards[nextSecondFlipped], isFlipped: false };
      }

      nextFirstFlipped = null;
      nextSecondFlipped = null;
      nextLastMatchResult = null;

      // Advance turn to next player
      const currentIndex = context.players.findIndex((p) => p.id === playerId);
      const nextIndex = (currentIndex + 1) % context.players.length;
      nextTurnPlayerId = context.players[nextIndex]?.id ?? playerId;

      events.push({
        type: 'TURN_CHANGED',
        payload: { previousPlayerId: playerId, nextPlayerId: nextTurnPlayerId },
      });
    } else if (action.type === 'FLIP') {
      const { cardIndex } = action;

      // If previous turn was a miss, auto-reset and switch turn first
      if (nextLastMatchResult === 'miss') {
        if (nextFirstFlipped !== null && nextCards[nextFirstFlipped]) {
          nextCards[nextFirstFlipped] = { ...nextCards[nextFirstFlipped], isFlipped: false };
        }
        if (nextSecondFlipped !== null && nextCards[nextSecondFlipped]) {
          nextCards[nextSecondFlipped] = { ...nextCards[nextSecondFlipped], isFlipped: false };
        }
        nextFirstFlipped = null;
        nextSecondFlipped = null;
        nextLastMatchResult = null;
      }

      if (nextFirstFlipped === null) {
        // Flipping 1st card
        const card = nextCards[cardIndex]!;
        nextCards[cardIndex] = { ...card, isFlipped: true };
        nextFirstFlipped = cardIndex;

        events.push({
          type: 'CARD_FLIPPED',
          payload: { playerId, cardIndex, isFirst: true },
        });
      } else {
        // Flipping 2nd card
        const card1 = nextCards[nextFirstFlipped]!;
        const card2 = nextCards[cardIndex]!;
        nextCards[cardIndex] = { ...card2, isFlipped: true };
        nextSecondFlipped = cardIndex;
        nextTurnCount += 1;

        events.push({
          type: 'CARD_FLIPPED',
          payload: { playerId, cardIndex, isFirst: false },
        });

        // Check match
        if (card1.card && card2.card && card1.card.rank === card2.card.rank) {
          // MATCH!
          nextCards[nextFirstFlipped] = {
            ...card1,
            isTaken: true,
            takenByPlayerId: playerId,
          };
          nextCards[cardIndex] = {
            ...card2,
            isFlipped: true,
            isTaken: true,
            takenByPlayerId: playerId,
          };
          nextPlayerScores[playerId] = (nextPlayerScores[playerId] || 0) + 1;
          nextLastMatchResult = 'match';

          events.push({
            type: 'MATCH_SUCCESS',
            payload: {
              playerId,
              cardIndices: [nextFirstFlipped, cardIndex],
              rank: card2.card.rank,
              score: nextPlayerScores[playerId],
            },
          });

          // Reset flip pointers for next turn (player keeps turn)
          nextFirstFlipped = null;
          nextSecondFlipped = null;

          // Check if all cards are taken
          const allTaken = nextCards.every((c) => c.isTaken);
          if (allTaken) {
            isGameOver = true;
            // Determine winner(s)
            let maxScore = -1;
            for (const pid of Object.keys(nextPlayerScores)) {
              const sc = nextPlayerScores[pid] ?? 0;
              if (sc > maxScore) {
                maxScore = sc;
                winnerPlayerIds = [pid];
              } else if (sc === maxScore) {
                winnerPlayerIds.push(pid);
              }
            }

            events.push({
              type: 'GAME_OVER',
              payload: { winnerPlayerIds, scores: nextPlayerScores },
            });
          }
        } else {
          // MISS!
          nextLastMatchResult = 'miss';
          events.push({
            type: 'MATCH_FAIL',
            payload: { playerId, cardIndices: [nextFirstFlipped, cardIndex] },
          });
        }
      }
    }

    const nextContext: BaseGameContext = {
      ...context,
      currentTurnPlayerId: nextTurnPlayerId,
      isGameOver,
      winnerPlayerIds,
    };

    const nextRuleState: ShinkeiSuijakuRuleState = {
      ...ruleState,
      cards: nextCards,
      firstFlippedIndex: nextFirstFlipped,
      secondFlippedIndex: nextSecondFlipped,
      lastMatchResult: nextLastMatchResult,
      playerScores: nextPlayerScores,
      turnCount: nextTurnCount,
    };

    return { nextContext, nextRuleState, events };
  }

  sanitizeForPlayer(
    context: Readonly<BaseGameContext>,
    ruleState: Readonly<ShinkeiSuijakuRuleState>,
    _viewerPlayerId: string
  ): SanitizedState<ShinkeiSuijakuRuleState> {
    const sanitizedPlayers: SanitizedPlayerState[] = context.players.map((p) => ({
      id: p.id,
      name: p.name,
      handCount: p.hand.length,
      isFinished: p.isFinished,
      rankPosition: p.rankPosition,
      chips: p.chips,
    }));

    const sanitizedContext: SanitizedBaseGameContext = {
      gameId: context.gameId,
      players: sanitizedPlayers,
      currentTurnPlayerId: context.currentTurnPlayerId,
      isGameOver: context.isGameOver,
      winnerPlayerIds: context.winnerPlayerIds,
    };

    // Information Hiding: If a card is not flipped and not taken, card details (suit, rank) must be masked to null!
    const sanitizedCards: GridCard[] = ruleState.cards.map((c) => ({
      index: c.index,
      card: c.isFlipped || c.isTaken ? c.card : null,
      isFlipped: c.isFlipped,
      isTaken: c.isTaken,
      takenByPlayerId: c.takenByPlayerId,
    }));

    const sanitizedRuleState: ShinkeiSuijakuRuleState = {
      config: ruleState.config,
      cards: sanitizedCards,
      firstFlippedIndex: ruleState.firstFlippedIndex,
      secondFlippedIndex: ruleState.secondFlippedIndex,
      lastMatchResult: ruleState.lastMatchResult,
      playerScores: ruleState.playerScores,
      turnCount: ruleState.turnCount,
    };

    return {
      context: sanitizedContext,
      ruleState: sanitizedRuleState,
    };
  }
}
