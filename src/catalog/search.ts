import type { GameMetadata, CatalogFilterOptions } from './types.js';

export function filterGameCatalog(
  games: readonly GameMetadata[],
  options: CatalogFilterOptions = {}
): GameMetadata[] {
  const {
    query = '',
    category = 'all',
    playerCount = 'all',
    chipsOnly = false,
    language = 'ja',
  } = options;

  const normalizedQuery = query.trim().toLowerCase();

  return games.filter((game) => {
    // Category filter
    if (category !== 'all' && game.category !== category) {
      return false;
    }

    // Chips filter
    if (chipsOnly && !game.hasChips) {
      return false;
    }

    // Player count filter
    if (playerCount !== 'all' && typeof playerCount === 'number') {
      if (playerCount < game.players.min || playerCount > game.players.max) {
        return false;
      }
    }

    // Keyword search
    if (normalizedQuery) {
      const matchNameJa = game.name.ja.toLowerCase().includes(normalizedQuery);
      const matchNameEn = game.name.en.toLowerCase().includes(normalizedQuery);
      const matchSubtitle = game.subtitle.toLowerCase().includes(normalizedQuery);
      const matchTags = game.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery));
      const matchDesc =
        game.description.ja.toLowerCase().includes(normalizedQuery) ||
        game.description.en.toLowerCase().includes(normalizedQuery);

      if (!matchNameJa && !matchNameEn && !matchSubtitle && !matchTags && !matchDesc) {
        return false;
      }
    }

    return true;
  }).sort((a, b) => {
    // Playable games first
    if (a.isPlayable && !b.isPlayable) return -1;
    if (!a.isPlayable && b.isPlayable) return 1;

    // Then alphabetical by active language
    const nameA = a.name[language] || a.name.ja;
    const nameB = b.name[language] || b.name.ja;
    return nameA.localeCompare(nameB);
  });
}
