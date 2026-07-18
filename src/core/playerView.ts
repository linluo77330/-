import type { GameSnapshot, PlayerIndex, PlayerStateView, PlayerView, SkillViewState } from './types.js';
import {
  LET_ME_DRAW_MAX_USES,
  LET_ME_DRAW_SKILL_DESC,
  LET_ME_DRAW_SKILL_ID,
  LET_ME_DRAW_SKILL_NAME,
  SHOU_DUAN_ZHE_ID,
  buildLetMeDrawActivity,
  canUseLetMeDraw,
  getLetMeDrawUsesRemaining,
  isShouDuanZhe,
} from './skills/letMeDraw.js';
import {
  HEI_PI_TI_YU_SHENG_ID,
  buildSplitTileActivity,
  canUseSplitTile,
  getSplitTileUsesRemaining,
  isHeiPiTiYuSheng,
  SPLIT_TILE_MAX_USES,
  SPLIT_TILE_SKILL_DESC,
  SPLIT_TILE_SKILL_ID,
  SPLIT_TILE_SKILL_NAME,
} from './skills/splitTile.js';
import {
  JUE_WANG_DE_WEN_MANG_ID,
  buildCantReadActivity,
  canUseCantRead,
  CANT_READ_SKILL_DESC,
  CANT_READ_SKILL_ID,
  CANT_READ_SKILL_NAME,
  isJueWangDeWenMang,
} from './skills/cantRead.js';
import {
  DUI_KANG_LU_GALUO_ID,
  buildInstantWinVoteActivity,
  canUseInstantWinVote,
  INSTANT_WIN_VOTE_SKILL_DESC,
  INSTANT_WIN_VOTE_SKILL_ID,
  INSTANT_WIN_VOTE_SKILL_NAME,
  isDuiKangLuGaluo,
} from './skills/instantWinVote.js';

function cloneMeld(meld: GameSnapshot['players'][0]['melds'][0]) {
  return {
    ...meld,
    tiles: meld.tiles.map((t) => ({ ...t })),
  };
}

function clonePlayerState(
  state: GameSnapshot['players'][0],
  viewer: PlayerIndex,
  playerIndex: PlayerIndex,
  snapshot: GameSnapshot,
): PlayerStateView {
  const revealWinnerHand =
    snapshot.phase === 'game_over' && snapshot.winner === playerIndex;

  return {
    hand:
      playerIndex === viewer || revealWinnerHand
        ? { kind: 'visible', tiles: state.hand.map((t) => ({ ...t })) }
        : { kind: 'hidden', count: state.hand.length },
    discards: state.discards.map((t) => ({ ...t })),
    melds: state.melds.map(cloneMeld),
  };
}

function buildSkillView(snapshot: GameSnapshot, viewer: PlayerIndex): SkillViewState | null {
  const characterId = snapshot.playerCharacters[viewer];
  const isMyDraw = snapshot.phase === 'draw' && snapshot.currentPlayer === viewer;
  const isMyDiscard = snapshot.phase === 'discard' && snapshot.currentPlayer === viewer;

  if (isShouDuanZhe(characterId)) {
    return {
      characterId: SHOU_DUAN_ZHE_ID,
      skillId: LET_ME_DRAW_SKILL_ID,
      skillName: LET_ME_DRAW_SKILL_NAME,
      skillDescription: LET_ME_DRAW_SKILL_DESC,
      usesRemaining: getLetMeDrawUsesRemaining(snapshot.skillUses, viewer),
      maxUses: LET_ME_DRAW_MAX_USES,
      limited: true,
      canActivate: isMyDraw && canUseLetMeDraw(snapshot, viewer),
      activatePhase: 'draw',
    };
  }

  if (isHeiPiTiYuSheng(characterId)) {
    return {
      characterId: HEI_PI_TI_YU_SHENG_ID,
      skillId: SPLIT_TILE_SKILL_ID,
      skillName: SPLIT_TILE_SKILL_NAME,
      skillDescription: SPLIT_TILE_SKILL_DESC,
      usesRemaining: getSplitTileUsesRemaining(snapshot.skillUses, viewer),
      maxUses: SPLIT_TILE_MAX_USES,
      limited: true,
      canActivate: isMyDiscard && canUseSplitTile(snapshot, viewer),
      activatePhase: 'discard',
    };
  }

  if (isJueWangDeWenMang(characterId)) {
    return {
      characterId: JUE_WANG_DE_WEN_MANG_ID,
      skillId: CANT_READ_SKILL_ID,
      skillName: CANT_READ_SKILL_NAME,
      skillDescription: CANT_READ_SKILL_DESC,
      usesRemaining: 0,
      maxUses: 0,
      limited: false,
      canActivate:
        (isMyDraw || (snapshot.phase === 'discard' && snapshot.currentPlayer === viewer)) &&
        canUseCantRead(snapshot, viewer),
      activatePhase: 'draw',
    };
  }

  if (isDuiKangLuGaluo(characterId)) {
    return {
      characterId: DUI_KANG_LU_GALUO_ID,
      skillId: INSTANT_WIN_VOTE_SKILL_ID,
      skillName: INSTANT_WIN_VOTE_SKILL_NAME,
      skillDescription: INSTANT_WIN_VOTE_SKILL_DESC,
      usesRemaining: 0,
      maxUses: 0,
      limited: false,
      canActivate:
        (isMyDraw || (snapshot.phase === 'discard' && snapshot.currentPlayer === viewer)) &&
        canUseInstantWinVote(snapshot, viewer),
      activatePhase: 'draw',
    };
  }

  return null;
}

function buildSkillActivity(snapshot: GameSnapshot, viewer: PlayerIndex) {
  return (
    buildLetMeDrawActivity(snapshot, viewer) ??
    buildCantReadActivity(snapshot, viewer) ??
    buildInstantWinVoteActivity(snapshot, viewer) ??
    buildSplitTileActivity(snapshot, viewer)
  );
}

/** 联机：按 viewer 隐藏他人手牌与牌墙 */
export function buildPlayerView(snapshot: GameSnapshot, viewer: PlayerIndex): PlayerView {
  const players = snapshot.players.map((state, i) =>
    clonePlayerState(state, viewer, i as PlayerIndex, snapshot),
  ) as PlayerView['players'];

  return {
    viewer,
    phase: snapshot.phase,
    currentPlayer: snapshot.currentPlayer,
    dealer: snapshot.dealer,
    deckCount: snapshot.deck.length,
    players,
    lastDiscard: snapshot.lastDiscard
      ? {
          from: snapshot.lastDiscard.from,
          tile: { ...snapshot.lastDiscard.tile },
        }
      : null,
    pendingResponses: snapshot.pendingResponses.filter((o) => o.player === viewer),
    responseLevel: snapshot.responseLevel,
    turnNumber: snapshot.turnNumber,
    winner: snapshot.winner,
    winInfo: snapshot.winInfo
      ? {
          tile: { ...snapshot.winInfo.tile },
          isSelfDraw: snapshot.winInfo.isSelfDraw,
        }
      : null,
    wildcard: snapshot.wildcard
      ? {
          indicator: { ...snapshot.wildcard.indicator },
          wildcardType: { ...snapshot.wildcard.wildcardType },
        }
      : null,
  playerCharacters: [...snapshot.playerCharacters] as PlayerView['playerCharacters'],
  skillUses: [...snapshot.skillUses] as PlayerView['skillUses'],
    skill: buildSkillView(snapshot, viewer),
    skillActivity: buildSkillActivity(snapshot, viewer),
    gameOverReason: snapshot.gameOverReason,
  };
}

/** 测试用：确保他人手牌未泄露 */
export function assertPlayerViewSafe(view: PlayerView): void {
  for (let i = 0; i < 4; i++) {
    if (i === view.viewer) continue;
    if (view.phase === 'game_over' && view.winner === i) continue;
    const hand = view.players[i as PlayerIndex].hand;
    if (hand.kind === 'visible') {
      throw new Error(`Player ${i} hand must be hidden for viewer ${view.viewer}`);
    }
  }
}
