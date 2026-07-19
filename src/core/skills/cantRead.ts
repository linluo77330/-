import type { GameSnapshot, PlayerIndex, SkillActivityView, Tile } from '../types.js';

export const JUE_WANG_DE_WEN_MANG_ID = 'jue_wang_de_wen_mang';
export const JUE_WANG_DE_WEN_MANG_NAME = '绝望的文盲';
export const CANT_READ_SKILL_ID = 'cant_read';
export const CANT_READ_SKILL_NAME = '我看不懂啊';
export const CANT_READ_SKILL_DESC =
  '回合开始时，绝望的文盲可以选择一次性丢弃所有带字的牌，即一万至九万、东、西、南、北、中、發（不含白板；丢弃的牌无法被吃和碰响应），并摸相应数量的牌，该回合跳过出牌阶段。';

/** 带字的牌：万子 + 风牌 + 中/发（不含白板） */
export function isUnreadableTile(tile: Pick<Tile, 'suit' | 'rank'>): boolean {
  if (tile.suit === 'wan' || tile.suit === 'feng') return true;
  if (tile.suit === 'dragon') return tile.rank !== 3;
  return false;
}

export function isJueWangDeWenMang(characterId: string): boolean {
  return characterId === JUE_WANG_DE_WEN_MANG_ID;
}

export function getUnreadableTilesInHand(hand: Tile[]): Tile[] {
  return hand.filter(isUnreadableTile);
}

export function canPlayerUseCantReadSkill(
  snapshot: Pick<GameSnapshot, 'playerCharacters' | 'players'>,
  player: PlayerIndex,
): boolean {
  if (!isJueWangDeWenMang(snapshot.playerCharacters[player])) return false;
  return getUnreadableTilesInHand(snapshot.players[player].hand).length > 0;
}

export function canUseCantRead(
  snapshot: Pick<
    GameSnapshot,
    'playerCharacters' | 'players' | 'phase' | 'currentPlayer' | 'dealer' | 'turnNumber' | 'drawMode' | 'skillMode'
  >,
  player: PlayerIndex,
): boolean {
  if (!canPlayerUseCantReadSkill(snapshot, player)) return false;
  if (snapshot.currentPlayer !== player) return false;
  if (snapshot.skillMode !== null) return false;

  if (snapshot.phase === 'draw') {
    return snapshot.drawMode === 'choose';
  }

  return false;
}

/** cant_read 发动后立即执行，不再进入确认弹层 */
export function buildCantReadActivity(
  _snapshot?: GameSnapshot,
  _viewer?: PlayerIndex,
): SkillActivityView | null {
  return null;
}
