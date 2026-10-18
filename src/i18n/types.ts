export type Language = 'ja' | 'en';

export interface TranslationDictionary {
  app: {
    title: string;
    subtitle: string;
    rules: string;
    inviteLink: string;
    copied: string;
    copyLink: string;
    language: string;
  };
  lobby: {
    playerName: string;
    nicknamePlaceholder: string;
    selectGame: string;
    comingSoon: string;
    playable: string;
    createRoom: string;
    joinRoom: string;
    hostTitle: string;
    inviteUrlDesc: string;
    chipsMode: string;
    chipsModeDesc: string;
    rulePresets: string;
    ruleDetails: string;
    playersCount: string;
    minPlayersToStart: string;
    hostBadge: string;
    startGame: string;
    waitingPlayers: string;
    enterHostId: string;
    idPlaceholder: string;
    roomRules: string;
    joinedPlayers: string;
    enterRoom: string;
    backToModeSelect: string;
  };
  catalog: {
    searchPlaceholder: string;
    allCategories: string;
    climbing: string;
    trickTaking: string;
    casino: string;
    matching: string;
    solitaire: string;
    party: string;
    allPlayers: string;
    onePlayer: string;
    twoPlayers: string;
    threePlayers: string;
    fourPlusPlayers: string;
    chipsOnly: string;
    gamesFound: string;
    noGamesFound: string;
  };
  table: {
    yourTurn: string;
    waitingTurn: string;
    play: string;
    pass: string;
    tableCleared: string;
    revolution: string;
    suitLock: string;
    handCount: string;
    selectedCount: string;
    chipsBadge: string;
    disconnected: string;
  };
  rules: {
    title: string;
    eightCutTitle: string;
    eightCutDesc: string;
    revolutionTitle: string;
    revolutionDesc: string;
    spadeThreeTitle: string;
    spadeThreeDesc: string;
    stairsTitle: string;
    stairsDesc: string;
    suitLockTitle: string;
    suitLockDesc: string;
    prohibitedEndingsTitle: string;
    prohibitedEndingsDesc: string;
    chipsTitle: string;
    chipsDesc: string;
    close: string;
  };
  events: {
    eightCut: string;
    revolution: string;
    spadeThreeReturn: string;
    foulFinish: string;
    playerJoined: string;
    playerDisconnected: string;
  };
  results: {
    gameOver: string;
    playAgain: string;
    ranks: {
      daifugo: string;
      fugo: string;
      heimin: string;
      hinmin: string;
      daihinmin: string;
    };
  };
}
