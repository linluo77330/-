import type { GameSnapshot, PlayerIndex, SkillActivityView, Tile } from '../types.js';

export const CAI_SHEN_A_YI_ID = 'cai_shen_a_yi';
export const CAI_SHEN_A_YI_NAME = '财神阿姨';
export const VEGETABLE_JUICE_CAISHEN_SKILL_ID = 'vegetable_juice_caishen';
export const VEGETABLE_JUICE_CAISHEN_MAX_USES = 1;
export const VEGETABLE_JUICE_CAISHEN_SKILL_NAME = '（限定技）蔬菜汁财神';
export const VEGETABLE_JUICE_CAISHEN_SKILL_DESC =
  '摸牌结束后，可以选择自己的一张手牌替换现有万能牌，并获得原有万能牌。该技能只能使用一次。';

export function isCaiShenAYi(characterId: string): boolean {
  return characterId === CAI_SHEN_A_YI_ID;
}

export function canPlayerUseVegetableJuiceCaishenSkill(
  snapshot: Pick<GameSnapshot, 'playerCharacters' | 'skillUses' | 'wildcard' | 'players'>,
  player: PlayerIndex,
): boolean {
  if (!isCaiShenAYi(snapshot.playerCharacters[player])) return false;
  if (snapshot.skillUses[player] >= VEGETABLE_JUICE_CAISHEN_MAX_USES) return false;
  if (!snapshot.wildcard) return false;
  return snapshot.players[player].hand.length > 0;
}

export function canUseVegetableJuiceCaishen(
  snapshot: Pick<
    GameSnapshot,
    'playerCharacters' | 'skillUses' | 'wildcard' | 'players' | 'phase' | 'currentPlayer' | 'skillMode'
  >,
  player: PlayerIndex,
): boolean {
  if (!canPlayerUseVegetableJuiceCaishenSkill(snapshot, player)) return false;
  if (snapshot.currentPlayer !== player) return false;
  if (snapshot.skillMode !== null) return false;
  return snapshot.phase === 'discard';
}

export function getVegetableJuiceCaishenUsesRemaining(
  skillUses: GameSnapshot['skillUses'],
  player: PlayerIndex,
): number {
  return Math.max(0, VEGETABLE_JUICE_CAISHEN_MAX_USES - skillUses[player]);
}

export function buildVegetableJuiceCaishenActivity(
  snapshot: GameSnapshot,
  viewer: PlayerIndex,
): SkillActivityView | null {
  const mode = snapshot.skillMode;
  if (!mode || mode.skillId !== VEGETABLE_JUICE_CAISHEN_SKILL_ID || mode.step !== 'pick_hand') {
    return null;
  }

  const player = snapshot.currentPlayer;
  const wildcard = snapshot.wildcard;

  const base = {
    player,
    characterId: CAI_SHEN_A_YI_ID,
    characterName: CAI_SHEN_A_YI_NAME,
    skillId: VEGETABLE_JUICE_CAISHEN_SKILL_ID,
    skillName: VEGETABLE_JUICE_CAISHEN_SKILL_NAME,
    step: 'pick_hand' as const,
    wildcardPrompt: wildcard ? '选择一张手牌替换当前万能牌' : undefined,
    previewTiles: wildcard
      ? [{ ...wildcard.indicator, id: 'wildcard-preview' }]
      : undefined,
  };

  if (viewer !== player) {
    return base;
  }

  return {
    ...base,
    pickableHandTiles: snapshot.players[player].hand.map((t) => ({ ...t })),
  };
}

export function wildcardTypeLabel(tile: Pick<Tile, 'suit' | 'rank'>): string {
  return `${tile.suit}-${tile.rank}`;
}
