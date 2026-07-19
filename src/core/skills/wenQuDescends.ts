import type { GameSnapshot, PlayerIndex, SkillActivityView, Tile } from '../types.js';

export const WEN_QU_XING_Y_ID = 'wen_qu_xing_y';
export const WEN_QU_XING_Y_NAME = '文曲星Y';
export const WEN_QU_DESCENDS_SKILL_ID = 'wen_qu_descends';
export const WEN_QU_DESCENDS_MAX_USES = 3;
export const WEN_QU_DESCENDS_SKILL_NAME = '（限定技）文曲下凡';
export const WEN_QU_DESCENDS_SKILL_DESC =
  '摸牌结束后，可以选择自己的一张万字牌，将其修改为任意一张万字牌。该技能只能使用三次。';

const WAN_RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export function isWenQuXingY(characterId: string): boolean {
  return characterId === WEN_QU_XING_Y_ID;
}

export function isWanTile(tile: Pick<Tile, 'suit'>): boolean {
  return tile.suit === 'wan';
}

export function getWanTileOptions(): Tile[] {
  return WAN_RANKS.map((rank) => ({
    id: `wen-qu-wan-${rank}`,
    suit: 'wan',
    rank,
  }));
}

export function parseWenQuWanTargetRank(tileId: string): number | null {
  const match = /^wen-qu-wan-(\d)$/.exec(tileId);
  if (!match) return null;
  const rank = Number(match[1]);
  return rank >= 1 && rank <= 9 ? rank : null;
}

export function canPlayerUseWenQuDescendsSkill(
  snapshot: Pick<GameSnapshot, 'playerCharacters' | 'skillUses' | 'players'>,
  player: PlayerIndex,
): boolean {
  if (!isWenQuXingY(snapshot.playerCharacters[player])) return false;
  if (snapshot.skillUses[player] >= WEN_QU_DESCENDS_MAX_USES) return false;
  return snapshot.players[player].hand.some(isWanTile);
}

export function canUseWenQuDescends(
  snapshot: Pick<
    GameSnapshot,
    'playerCharacters' | 'skillUses' | 'players' | 'phase' | 'currentPlayer' | 'skillMode'
  >,
  player: PlayerIndex,
): boolean {
  if (!canPlayerUseWenQuDescendsSkill(snapshot, player)) return false;
  if (snapshot.currentPlayer !== player) return false;
  if (snapshot.skillMode !== null) return false;
  return snapshot.phase === 'discard';
}

export function getWenQuDescendsUsesRemaining(
  skillUses: GameSnapshot['skillUses'],
  player: PlayerIndex,
): number {
  return Math.max(0, WEN_QU_DESCENDS_MAX_USES - skillUses[player]);
}

export function buildWenQuDescendsActivity(
  snapshot: GameSnapshot,
  viewer: PlayerIndex,
): SkillActivityView | null {
  const mode = snapshot.skillMode;
  if (!mode || mode.skillId !== WEN_QU_DESCENDS_SKILL_ID) return null;

  const player = snapshot.currentPlayer;

  const base = {
    player,
    characterId: WEN_QU_XING_Y_ID,
    characterName: WEN_QU_XING_Y_NAME,
    skillId: WEN_QU_DESCENDS_SKILL_ID,
    skillName: WEN_QU_DESCENDS_SKILL_NAME,
  };

  if (viewer !== player) {
    return { ...base, step: mode.step };
  }

  if (mode.step === 'pick_hand') {
    return {
      ...base,
      step: 'pick_hand',
      wildcardPrompt: '选择要改写的万字牌',
      pickableHandTiles: snapshot.players[player].hand.filter(isWanTile).map((t) => ({ ...t })),
    };
  }

  if (mode.step === 'pick_wan_rank') {
    const sourceTile = snapshot.players[player].hand.find((t) => t.id === mode.sourceTileId);
    const resolvedSource =
      sourceTile ?? ({ id: mode.sourceTileId, suit: 'wan', rank: 1 } as Tile);
    return {
      ...base,
      step: 'pick_wan_rank',
      sourceTile: { ...resolvedSource },
      previewTiles: getWanTileOptions(),
    };
  }

  return null;
}
