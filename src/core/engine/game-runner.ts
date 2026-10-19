import type {
  BaseGameContext,
  CardGamePlugin,
  GameEvent,
  SanitizedState,
} from '../types/engine.js';

export interface GameRunnerListener {
  (events: readonly GameEvent[], context: BaseGameContext): void;
}

export class GameRunner<TRuleConfig, TRuleState, TAction> {
  private readonly plugin: CardGamePlugin<TRuleConfig, TRuleState, TAction>;
  private context: BaseGameContext;
  private ruleState: TRuleState;
  private listeners: GameRunnerListener[] = [];

  constructor(
    plugin: CardGamePlugin<TRuleConfig, TRuleState, TAction>,
    players: readonly { id: string; name: string; chips?: number }[],
    config?: Partial<TRuleConfig>,
    options?: unknown
  ) {
    this.plugin = plugin;
    const initial = plugin.init(players, config, options);
    this.context = initial.context;
    this.ruleState = initial.ruleState;
  }

  getContext(): BaseGameContext {
    return this.context;
  }

  getRuleState(): TRuleState {
    return this.ruleState;
  }

  canExecute(playerId: string, action: TAction): boolean {
    return this.plugin.canExecute(this.context, this.ruleState, playerId, action);
  }

  execute(playerId: string, action: TAction): readonly GameEvent[] {
    const { nextContext, nextRuleState, events } = this.plugin.execute(
      this.context,
      this.ruleState,
      playerId,
      action
    );
    this.context = nextContext;
    this.ruleState = nextRuleState;

    for (const listener of this.listeners) {
      listener(events, this.context);
    }

    return events;
  }

  getSanitizedStateForPlayer(playerId: string): SanitizedState<TRuleState> {
    return this.plugin.sanitizeForPlayer(this.context, this.ruleState, playerId);
  }

  subscribe(listener: GameRunnerListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }
}
