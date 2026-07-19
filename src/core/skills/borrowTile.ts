import type { GameSnapshot, PlayerIndex, SkillActivityView, Tile } from '../types.js';

export const JIE_DONG_XI_ZHI_REN_ID = 'jie_dong_xi_zhi_ren';
export const JIE_DONG_XI_ZHI_REN_NAME = '借东西之人';
export const BORROW_TILE_SKILL_ID = 'borrow_tile';
export const BORROW_TILE_MAX_USES = 1;
export const BORROW_TILE_SKILL_NAME = '（限定技）同学这个借我用一下';
export const BORROW_TILE_SKILL_DESC =
  '摸牌结束后，可以选择自己的一张手牌并指定一位玩家，将自己选择的牌和该玩家随机一张牌互换。该技能只能使用一次。';

export function isJieDongXiZhiRen(characterId: string): boolean {
  return characterId === JIE_DONG_XI_ZHI_REN_ID;
}

export function getBorrowTileTargets(
  snapshot: Pick<GameSnapshot, 'players'>,
  player: PlayerIndex,
): PlayerIndex[] {
  return ([0, 1, 2, 3] as PlayerIndex[]).filter(
    (p) => p !== player && snapshot.players[p].hand.length > 0,
  );
}

export function canPlayerUseBorrowTileSkill(
  snapshot: Pick<GameSnapshot, 'playerCharacters' | 'skillUses' | 'players'>,
  player: PlayerIndex,
): boolean {
  if (!isJieDongXiZhiRen(snapshot.playerCharacters[player])) return false;
  if (snapshot.skillUses[player] >= BORROW_TILE_MAX_USES) return false;
  if (snapshot.players[player].hand.length === 0) return false;
  return getBorrowTileTargets(snapshot, player).length > 0;
}

export function canUseBorrowTile(
  snapshot: Pick<
    GameSnapshot,
    'playerCharacters' | 'skillUses' | 'players' | 'phase' | 'currentPlayer' | 'skillMode'
  >,
  player: PlayerIndex,
): boolean {
  if (!canPlayerUseBorrowTileSkill(snapshot, player)) return false;
  if (snapshot.currentPlayer !== player) return false;
  if (snapshot.skillMode !== null) return false;
  return snapshot.phase === 'discard';
}

export function getBorrowTileUsesRemaining(
  skillUses: GameSnapshot['skillUses'],
  player: PlayerIndex,
): number {
  return Math.max(0, BORROW_TILE_MAX_USES - skillUses[player]);
}

export function buildBorrowTileActivity(
  snapshot: GameSnapshot,
  viewer: PlayerIndex,
): SkillActivityView | null {
  const mode = snapshot.skillMode;
  if (!mode || mode.skillId !== BORROW_TILE_SKILL_ID) return null;

  const player = snapshot.currentPlayer;

  const base = {
    player,
    characterId: JIE_DONG_XI_ZHI_REN_ID,
    characterName: JIE_DONG_XI_ZHI_REN_NAME,
    skillId: BORROW_TILE_SKILL_ID,
    skillName: BORROW_TILE_SKILL_NAME,
  };

  if (viewer !== player) {
    return { ...base, step: mode.step };
  }

  if (mode.step === 'pick_hand') {
    return {
      ...base,
      step: 'pick_hand',
      wildcardPrompt: '选择要借出的手牌',
      pickableHandTiles: snapshot.players[player].hand.map((t) => ({ ...t })),
    };
  }

  if (mode.step === 'pick_target') {
    const sourceTile = snapshot.players[player].hand.find((t) => t.id === mode.sourceTileId);
    const resolvedSource =
      sourceTile ??
      ({ id: mode.sourceTileId, suit: 'wan', rank: 1 } as Tile);
    return {
      ...base,
      step: 'pick_target',
      sourceTile: { ...resolvedSource },
      previewTiles: [{ ...resolvedSource }],
      pickableTargets: getBorrowTileTargets(snapshot, player),
    };
  }

  return null;
}
