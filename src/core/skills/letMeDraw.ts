import type { GameSnapshot, PlayerIndex, SkillActivityView } from '../types.js';

export const SHOU_DUAN_ZHE_ID = 'shou_duan_zhe';
export const SHOU_DUAN_ZHE_NAME = '手短者';
export const LET_ME_DRAW_SKILL_ID = 'let_me_draw';
export const LET_ME_DRAW_MAX_USES = 3;
export const LET_ME_DRAW_SKILL_NAME = '（限定技）让让我吧😭';
export const LET_ME_DRAW_SKILL_DESC =
  '摸牌阶段可以选择不从牌墙里摸牌，而是获得自己曾经打出过的牌里的一张，其他规则不变。该技能只能使用三次。';

export function isShouDuanZhe(characterId: string): boolean {
  return characterId === SHOU_DUAN_ZHE_ID;
}

export function canPlayerUseLetMeDrawSkill(
  snapshot: Pick<GameSnapshot, 'playerCharacters' | 'skillUses' | 'players'>,
  player: PlayerIndex,
): boolean {
  if (!isShouDuanZhe(snapshot.playerCharacters[player])) return false;
  if (snapshot.skillUses[player] >= LET_ME_DRAW_MAX_USES) return false;
  return snapshot.players[player].discards.length > 0;
}

export function canUseLetMeDraw(
  snapshot: Pick<GameSnapshot, 'playerCharacters' | 'skillUses' | 'players' | 'phase' | 'currentPlayer' | 'drawMode' | 'skillMode'>,
  player: PlayerIndex,
): boolean {
  if (!canPlayerUseLetMeDrawSkill(snapshot, player)) return false;
  if (snapshot.phase !== 'draw' || snapshot.currentPlayer !== player) return false;
  return snapshot.drawMode === 'choose' && snapshot.skillMode === null;
}

export function getLetMeDrawUsesRemaining(
  skillUses: GameSnapshot['skillUses'],
  player: PlayerIndex,
): number {
  return Math.max(0, LET_ME_DRAW_MAX_USES - skillUses[player]);
}

export function buildLetMeDrawActivity(
  snapshot: GameSnapshot,
  viewer: PlayerIndex,
): SkillActivityView | null {
  const mode = snapshot.skillMode;
  if (!mode || mode.skillId !== LET_ME_DRAW_SKILL_ID || mode.step !== 'pick_discard') return null;

  const player = snapshot.currentPlayer;
  if (!isShouDuanZhe(snapshot.playerCharacters[player])) return null;

  return {
    player,
    characterId: SHOU_DUAN_ZHE_ID,
    characterName: SHOU_DUAN_ZHE_NAME,
    skillId: LET_ME_DRAW_SKILL_ID,
    skillName: LET_ME_DRAW_SKILL_NAME,
    step: 'pick_discard',
    pickableDiscards:
      viewer === player
        ? snapshot.players[player].discards.map((t) => ({ ...t }))
        : [],
  };
}
