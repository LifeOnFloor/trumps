import type { Card } from '../../types/card.js';
import type {
  BaseGameContext,
  CardGamePlugin,
  GameEvent,
  PlayerState,
  SanitizedBaseGameContext,
  SanitizedPlayerState,
  SanitizedState,
} from '../../types/engine.js';
import { createDeck, dealHands, shuffleDeck } from '../../utils/deck.js';
import type { DaifugoConfig } from './config.js';
import { DEFAULT_DAIFUGO_CONFIG } from './config.js';
import type { DaifugoAction, DaifugoRuleState, PlayMeld } from './types.js';
import {
  checkSuitLock,
  hasEight,
  isProhibitedEnding,
  isSingleJoker,
  isSpadeThree,
  isValidPlay,
} from './validator.js';

export class DaifugoPlugin
  implements CardGamePlugin<DaifugoConfig, DaifugoRuleState, DaifugoAction>
{
  readonly id = 'daifugo';
  readonly name = 'Daifugo';
  readonly minPlayers = 3;
  readonly maxPlayers = 8;
  readonly hasChips = false;
  readonly defaultConfig: DaifugoConfig = DEFAULT_DAIFUGO_CONFIG;

  init(
    players: readonly { id: string; name: string }[],
    config?: Partial<DaifugoConfig>
  ): { context: BaseGameContext; ruleState: DaifugoRuleState } {
    if (players.length < this.minPlayers || players.length > this.maxPlayers) {
      throw new Error(`Player count must be between ${this.minPlayers} and ${this.maxPlayers}`);
    }

    const mergedConfig: DaifugoConfig = {
      ...this.defaultConfig,
      ...config,
      prohibitedEndings: {
        ...this.defaultConfig.prohibitedEndings,
        ...(config?.prohibitedEndings ?? {}),
      },
    };

    // 53 cards with 1 joker
    const deck = shuffleDeck(createDeck({ jokerCount: 1 }));
    const hands = dealHands(deck, players.length);

    const initialPlayers: PlayerState[] = players.map((p, idx) => ({
      id: p.id,
      name: p.name,
      hand: hands[idx] ?? [],
      isFinished: false,
    }));

    // Find starting player: whoever has D_3, or fallback to player 0
    let startIndex = 0;
    const d3Index = initialPlayers.findIndex((p) => p.hand.some((c) => c.id === 'D_3'));
    if (d3Index !== -1) {
      startIndex = d3Index;
    }

    const context: BaseGameContext = {
      gameId: `daifugo_${Date.now()}`,
      players: initialPlayers,
      currentTurnPlayerId: initialPlayers[startIndex]!.id,
      isGameOver: false,
      winnerPlayerIds: [],
    };

    const ruleState: DaifugoRuleState = {
      config: mergedConfig,
      isRevolution: false,
      table: {
        lastPlay: null,
        lockedSuits: null,
        passedPlayerIds: [],
      },
      rankings: [],
      foulPlayerIds: [],
    };

    return { context, ruleState };
  }

  canExecute(
    context: Readonly<BaseGameContext>,
    ruleState: Readonly<DaifugoRuleState>,
    playerId: string,
    action: DaifugoAction
  ): boolean {
    if (context.isGameOver) return false;
    if (context.currentTurnPlayerId !== playerId) return false;

    const player = context.players.find((p) => p.id === playerId);
    if (!player || player.isFinished) return false;

    if (action.type === 'PASS') {
      // Cannot pass if table is empty
      if (!ruleState.table.lastPlay) return false;
      return true;
    }

    if (action.type === 'PLAY') {
      if (action.cardIds.length === 0) return false;
      // All cardIds must be present in player's hand
      const handCardMap = new Map(player.hand.map((c) => [c.id, c]));
      const cardsToPlay: Card[] = [];
      for (const cardId of action.cardIds) {
        const card = handCardMap.get(cardId);
        if (!card) return false;
        cardsToPlay.push(card);
      }

      const { valid } = isValidPlay(
        cardsToPlay,
        ruleState.table,
        ruleState.isRevolution,
        ruleState.config
      );
      return valid;
    }

    return false;
  }

  execute(
    context: Readonly<BaseGameContext>,
    ruleState: Readonly<DaifugoRuleState>,
    playerId: string,
    action: DaifugoAction
  ): {
    nextContext: BaseGameContext;
    nextRuleState: DaifugoRuleState;
    events: GameEvent[];
  } {
    if (!this.canExecute(context, ruleState, playerId, action)) {
      throw new Error(`Action ${action.type} cannot be executed by player ${playerId}`);
    }

    const events: GameEvent[] = [];
    const playerIndex = context.players.findIndex((p) => p.id === playerId);
    const player = context.players[playerIndex]!;

    let nextPlayers = [...context.players];
    let nextTable = { ...ruleState.table };
    let nextRevolution = ruleState.isRevolution;
    let nextRankings = [...ruleState.rankings];
    let nextFoulPlayers = [...ruleState.foulPlayerIds];
    let nextTurnPlayerId: string | null = null;

    if (action.type === 'PASS') {
      events.push({ type: 'PLAYER_PASSED', payload: { playerId } });
      const nextPassed = [...nextTable.passedPlayerIds, playerId];

      // Check if all active players except lastPlay.playerId passed
      const activePlayers = nextPlayers.filter((p) => !p.isFinished);
      const lastPlayPlayerId = nextTable.lastPlay?.playerId;

      const otherActivePlayers = activePlayers.filter((p) => p.id !== lastPlayPlayerId);
      const allOthersPassed = otherActivePlayers.every((p) => nextPassed.includes(p.id));

      if (allOthersPassed) {
        // Table cleared!
        events.push({ type: 'TABLE_CLEARED' });
        nextTable = {
          lastPlay: null,
          lockedSuits: null,
          passedPlayerIds: [],
        };
        // Next turn is lastPlay player, or if finished, the next active player from them
        const lastPlayerObj = nextPlayers.find((p) => p.id === lastPlayPlayerId);
        if (lastPlayerObj && !lastPlayerObj.isFinished) {
          nextTurnPlayerId = lastPlayPlayerId!;
        } else {
          nextTurnPlayerId = this.findNextActivePlayerId(nextPlayers, lastPlayPlayerId ?? playerId);
        }
      } else {
        nextTable = {
          ...nextTable,
          passedPlayerIds: nextPassed,
        };
        nextTurnPlayerId = this.findNextActivePlayerId(nextPlayers, playerId);
      }
    } else {
      // PLAY
      const playedCards = action.cardIds.map((id) => player.hand.find((c) => c.id === id)!);
      const remainingHand = player.hand.filter((c) => !action.cardIds.includes(c.id));

      events.push({ type: 'CARDS_PLAYED', payload: { playerId, cards: playedCards } });

      const { meld } = isValidPlay(
        playedCards,
        ruleState.table,
        ruleState.isRevolution,
        ruleState.config
      );
      const currentMeld: PlayMeld = {
        ...meld!,
        playerId,
      };

      // Check Spade 3 return
      const isSp3Return =
        ruleState.config.spadeThreeReturn &&
        ruleState.table.lastPlay &&
        isSingleJoker(ruleState.table.lastPlay) &&
        playedCards.length === 1 &&
        isSpadeThree(playedCards[0]!);

      // Check Revolution: 4 cards or more
      if (ruleState.config.revolution && playedCards.length >= 4) {
        nextRevolution = !nextRevolution;
        events.push({ type: 'REVOLUTION', payload: { isRevolution: nextRevolution } });
      }

      // Check Eight Cut
      const isEightCut = ruleState.config.eightCut && hasEight(playedCards);

      // Check finish (empty hand)
      let playerFinished = false;
      let playerFoul = false;
      if (remainingHand.length === 0) {
        playerFinished = true;
        if (isProhibitedEnding(playedCards, ruleState.isRevolution, ruleState.config)) {
          playerFoul = true;
          nextFoulPlayers.push(playerId);
          events.push({ type: 'FOUL_FINISH', payload: { playerId } });
        } else {
          nextRankings.push(playerId);
          events.push({
            type: 'PLAYER_FINISHED',
            payload: { playerId, rank: nextRankings.length },
          });
        }
      }

      nextPlayers = nextPlayers.map((p, idx) =>
        idx === playerIndex
          ? {
              ...p,
              hand: remainingHand,
              isFinished: playerFinished,
              rankPosition: playerFinished && !playerFoul ? nextRankings.length : undefined,
            }
          : p
      );

      // Determine table state and next turn
      if (isSp3Return || isEightCut) {
        if (isEightCut) {
          events.push({ type: 'EIGHT_CUT', payload: { playerId } });
        }
        if (isSp3Return) {
          events.push({ type: 'SPADE_THREE_RETURN', payload: { playerId } });
        }
        events.push({ type: 'TABLE_CLEARED' });
        nextTable = {
          lastPlay: null,
          lockedSuits: null,
          passedPlayerIds: [],
        };
        // Turn stays with player if not finished
        if (!playerFinished) {
          nextTurnPlayerId = playerId;
        } else {
          nextTurnPlayerId = this.findNextActivePlayerId(nextPlayers, playerId);
        }
      } else {
        const lockedSuits = checkSuitLock(
          currentMeld,
          ruleState.table.lastPlay,
          ruleState.table.lockedSuits,
          ruleState.config
        );
        nextTable = {
          lastPlay: currentMeld,
          lockedSuits,
          passedPlayerIds: [],
        };
        nextTurnPlayerId = this.findNextActivePlayerId(nextPlayers, playerId);
      }
    }

    // Check game over
    const activeRemaining = nextPlayers.filter((p) => !p.isFinished);
    let isGameOver = context.isGameOver;

    if (activeRemaining.length <= 1) {
      isGameOver = true;
      if (activeRemaining.length === 1) {
        const lastPlayer = activeRemaining[0]!;
        nextRankings.push(lastPlayer.id);
        nextPlayers = nextPlayers.map((p) =>
          p.id === lastPlayer.id
            ? { ...p, isFinished: true, rankPosition: nextRankings.length }
            : p
        );
      }
      nextTurnPlayerId = null;
      events.push({
        type: 'GAME_OVER',
        payload: {
          rankings: [...nextRankings, ...nextFoulPlayers],
          foulPlayerIds: nextFoulPlayers,
        },
      });
    }

    const nextContext: BaseGameContext = {
      gameId: context.gameId,
      players: nextPlayers,
      currentTurnPlayerId: nextTurnPlayerId,
      isGameOver,
      winnerPlayerIds: [...nextRankings, ...nextFoulPlayers],
    };

    const nextRuleState: DaifugoRuleState = {
      config: ruleState.config,
      isRevolution: nextRevolution,
      table: nextTable,
      rankings: nextRankings,
      foulPlayerIds: nextFoulPlayers,
    };

    return { nextContext, nextRuleState, events };
  }

  sanitizeForPlayer(
    context: Readonly<BaseGameContext>,
    ruleState: Readonly<DaifugoRuleState>,
    viewerPlayerId: string
  ): SanitizedState<DaifugoRuleState> {
    const sanitizedPlayers: SanitizedPlayerState[] = context.players.map((p) => {
      const isViewer = p.id === viewerPlayerId;
      return {
        id: p.id,
        name: p.name,
        handCount: p.hand.length,
        hand: isViewer ? p.hand : undefined,
        isFinished: p.isFinished,
        rankPosition: p.rankPosition,
        chips: p.chips,
      };
    });

    const sanitizedContext: SanitizedBaseGameContext = {
      gameId: context.gameId,
      players: sanitizedPlayers,
      currentTurnPlayerId: context.currentTurnPlayerId,
      isGameOver: context.isGameOver,
      winnerPlayerIds: context.winnerPlayerIds,
    };

    return {
      context: sanitizedContext,
      ruleState,
    };
  }

  private findNextActivePlayerId(
    players: readonly PlayerState[],
    fromPlayerId: string
  ): string | null {
    const total = players.length;
    const startIndex = players.findIndex((p) => p.id === fromPlayerId);
    if (startIndex === -1) return null;

    for (let i = 1; i < total; i++) {
      const nextIdx = (startIndex + i) % total;
      const candidate = players[nextIdx]!;
      if (!candidate.isFinished) {
        return candidate.id;
      }
    }
    return null;
  }
}
