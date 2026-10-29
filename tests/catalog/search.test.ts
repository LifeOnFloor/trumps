import { describe, it, expect } from 'vitest';
import { GAME_CATALOG } from '../../src/catalog/games.js';
import { filterGameCatalog } from '../../src/catalog/search.js';

describe('Game Catalog Search and Filter', () => {
  it('デフォルトで全件が返り、プレイ可能ゲームが先頭にソートされること', () => {
    const results = filterGameCatalog(GAME_CATALOG);
    expect(results.length).toBe(GAME_CATALOG.length);
    const playableGames = results.filter((g) => g.isPlayable);
    expect(playableGames.length).toBeGreaterThanOrEqual(1);
    expect(playableGames.map((g) => g.id)).toContain('daifugo');
    expect(playableGames.map((g) => g.id)).toContain('klondike');
    expect(results[0]?.isPlayable).toBe(true);
    expect(results[1]?.isPlayable).toBe(true);
  });

  it('キーワード検索（日本語・英語・タグ）が正しく動作すること', () => {
    // Search by Japanese name
    const daifugoResults = filterGameCatalog(GAME_CATALOG, { query: '大富豪' });
    expect(daifugoResults.some((g) => g.id === 'daifugo')).toBe(true);

    // Search by English name
    const pokerResults = filterGameCatalog(GAME_CATALOG, { query: 'holdem' });
    expect(pokerResults.some((g) => g.id === 'poker')).toBe(true);

    // Search by tag
    const trickResults = filterGameCatalog(GAME_CATALOG, { query: 'トリックテイキング' });
    expect(trickResults.length).toBeGreaterThan(0);
    expect(trickResults.every((g) => g.tags.includes('トリックテイキング'))).toBe(true);
  });

  it('カテゴリ絞り込みが正しく動作すること', () => {
    const casinoGames = filterGameCatalog(GAME_CATALOG, { category: 'casino' });
    expect(casinoGames.length).toBeGreaterThan(0);
    expect(casinoGames.every((g) => g.category === 'casino')).toBe(true);
  });

  it('プレイ人数での絞り込みが正しく動作すること', () => {
    const singlePlayerGames = filterGameCatalog(GAME_CATALOG, { playerCount: 1 });
    expect(singlePlayerGames.length).toBeGreaterThan(0);
    expect(singlePlayerGames.every((g) => g.players.min <= 1 && g.players.max >= 1)).toBe(true);
    expect(singlePlayerGames.some((g) => g.id === 'klondike')).toBe(true);
  });

  it('チップ対応のみの絞り込みが正しく動作すること', () => {
    const chipsGames = filterGameCatalog(GAME_CATALOG, { chipsOnly: true });
    expect(chipsGames.length).toBeGreaterThan(0);
    expect(chipsGames.every((g) => g.hasChips)).toBe(true);
  });
});
