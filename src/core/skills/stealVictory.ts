import type { GameSnapshot, PlayerIndex, SkillActivityView, Tile } from '../types.js';

export const LING_SHI_DA_ZONG_TONG_ID = 'ling_shi_da_zong_tong';
export const LING_SHI_DA_ZONG_TONG_NAME = '零食大总统';
export const STEAL_VICTORY_SKILL_ID = 'steal_victory';
export const STEAL_VICTORY_SKILL_NAME = '窃取胜利果实';
export const STEAL_VICTORY_SKILL_DESC =
  '摸牌后、出牌前，可点击技能按钮指定一名玩家对其使用「黑手」（可选，每回合一次）。若该玩家在其下一个自己的回合内胡牌，则从牌墙判定一张：若不是东、西、南、北、中、發，则视为零食大总统胡牌。';

/** 黑手判定中的「字牌」：东南西北中發（不含白板） */
export function isBlackHandJudgmentHonorTile(tile: Pick<Tile, 'suit' | 'rank'>): boolean {
  if (tile.suit === 'feng') return true;
  if (tile.suit === 'dragon' && tile.rank <= 2) return true;
  return false;
}

export function isLingShiDaZongTong(characterId: string): boolean {
  return characterId === LING_SHI_DA_ZONG_TONG_ID;
}

export function canPlayerUseStealVictorySkill(
  snapshot: Pick<GameSnapshot, 'playerCharacters'>,
  player: PlayerIndex,
): boolean {
  return isLingShiDaZongTong(snapshot.playerCharacters[player]);
}

export function canUseStealVictory(
  snapshot: Pick<
    GameSnapshot,
    'playerCharacters' | 'phase' | 'currentPlayer' | 'skillMode'
  >,
  player: PlayerIndex,
): boolean {
  if (!canPlayerUseStealVictorySkill(snapshot, player)) return false;
  if (snapshot.currentPlayer !== player) return false;
  if (snapshot.skillMode !== null) return false;
  return snapshot.phase === 'discard';
}

export function buildStealVictoryActivity(
  snapshot: GameSnapshot,
  viewer: PlayerIndex,
): SkillActivityView | null {
  const mode = snapshot.skillMode;
  if (!mode || mode.skillId !== STEAL_VICTORY_SKILL_ID || mode.step !== 'pick_target') {
    return null;
  }

  const player = snapshot.currentPlayer;

  const base = {
    player,
    characterId: LING_SHI_DA_ZONG_TONG_ID,
    characterName: LING_SHI_DA_ZONG_TONG_NAME,
    skillId: STEAL_VICTORY_SKILL_ID,
    skillName: STEAL_VICTORY_SKILL_NAME,
    step: 'pick_target' as const,
  };

  if (viewer !== player) {
    return base;
  }

  const pickableTargets = ([0, 1, 2, 3] as PlayerIndex[]).filter((p) => p !== player);
  return { ...base, pickableTargets };
}
