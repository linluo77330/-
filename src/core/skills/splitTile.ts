import type { GameSnapshot, PlayerIndex, SkillActivityView, Tile } from '../types.js';

export const HEI_PI_TI_YU_SHENG_ID = 'hei_pi_ti_yu_sheng';
export const HEI_PI_TI_YU_SHENG_NAME = '黑皮体育生';
export const SPLIT_TILE_SKILL_ID = 'split_tile';
export const SPLIT_TILE_MAX_USES = 2;
export const SPLIT_TILE_SKILL_NAME = '（限定技）大力出奇迹';
export const SPLIT_TILE_SKILL_DESC =
  '回合内可以选择把一张筒牌或条牌掰开，产生两张点数和为原来那张牌的新牌，并得到其中一张，丢弃另一张（即无法被吃、碰响应）。该技能只能使用两次。';

const SPLITTABLE_SUITS: Tile['suit'][] = ['tong', 'tiao'];

export function isHeiPiTiYuSheng(characterId: string): boolean {
  return characterId === HEI_PI_TI_YU_SHENG_ID;
}

export function isSplittableTile(tile: Pick<Tile, 'suit' | 'rank'>): boolean {
  return SPLITTABLE_SUITS.includes(tile.suit) && tile.rank >= 2;
}

export function getSplitPairs(rank: number): { rankA: number; rankB: number }[] {
  const pairs: { rankA: number; rankB: number }[] = [];
  for (let rankA = 1; rankA <= rank - 1; rankA++) {
    const rankB = rank - rankA;
    if (rankB >= 1 && rankB <= 9 && rankA <= rankB) {
      pairs.push({ rankA, rankB });
    }
  }
  return pairs;
}

export function canPlayerUseSplitTileSkill(
  snapshot: Pick<GameSnapshot, 'playerCharacters' | 'skillUses' | 'players'>,
  player: PlayerIndex,
): boolean {
  if (!isHeiPiTiYuSheng(snapshot.playerCharacters[player])) return false;
  if (snapshot.skillUses[player] >= SPLIT_TILE_MAX_USES) return false;
  return snapshot.players[player].hand.some(isSplittableTile);
}

export function canUseSplitTile(
  snapshot: Pick<
    GameSnapshot,
    'playerCharacters' | 'skillUses' | 'players' | 'phase' | 'currentPlayer' | 'skillMode'
  >,
  player: PlayerIndex,
): boolean {
  if (!canPlayerUseSplitTileSkill(snapshot, player)) return false;
  if (snapshot.phase !== 'discard' || snapshot.currentPlayer !== player) return false;
  return snapshot.skillMode === null;
}

export function getSplitTileUsesRemaining(
  skillUses: GameSnapshot['skillUses'],
  player: PlayerIndex,
): number {
  return Math.max(0, SPLIT_TILE_MAX_USES - skillUses[player]);
}

export function buildSplitTileActivity(
  snapshot: GameSnapshot,
  viewer: PlayerIndex,
): SkillActivityView | null {
  const mode = snapshot.skillMode;
  if (!mode || mode.skillId !== SPLIT_TILE_SKILL_ID) return null;

  const player = snapshot.currentPlayer;
  if (!isHeiPiTiYuSheng(snapshot.playerCharacters[player])) return null;

  const base = {
    player,
    characterId: HEI_PI_TI_YU_SHENG_ID,
    characterName: HEI_PI_TI_YU_SHENG_NAME,
    skillId: SPLIT_TILE_SKILL_ID,
    skillName: SPLIT_TILE_SKILL_NAME,
  };

  if (viewer !== player) {
    return { ...base, step: mode.step };
  }

  if (mode.step === 'pick_source') {
    const pickableHandTiles = snapshot.players[player].hand
      .filter(isSplittableTile)
      .map((t) => ({ ...t }));
    return { ...base, step: 'pick_source', pickableHandTiles };
  }

  if (mode.step === 'pick_split') {
    const sourceTile = snapshot.players[player].hand.find((t) => t.id === mode.sourceTileId);
    if (!sourceTile) return { ...base, step: 'pick_split' };
    return {
      ...base,
      step: 'pick_split',
      sourceTile: { ...sourceTile },
      splitOptions: getSplitPairs(sourceTile.rank),
    };
  }

  if (mode.step === 'pick_keep') {
    return {
      ...base,
      step: 'pick_keep',
      sourceTile: { id: mode.sourceTileId, suit: mode.suit, rank: mode.rankA + mode.rankB },
      splitTiles: [{ ...mode.tileA }, { ...mode.tileB }],
    };
  }

  return null;
}
