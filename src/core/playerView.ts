import type {
  DrawMode,
  GameSnapshot,
  PlayerIndex,
  PlayerStateView,
  PlayerView,
  SkillMode,
  SkillViewState,
} from './types.js';
import {
  LET_ME_DRAW_MAX_USES,
  LET_ME_DRAW_SKILL_DESC,
  LET_ME_DRAW_SKILL_ID,
  LET_ME_DRAW_SKILL_NAME,
  SHOU_DUAN_ZHE_ID,
  buildLetMeDrawActivity,
  canPlayerUseLetMeDrawSkill,
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
  canPlayerUseCantReadSkill,
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

function normalizeHandView(hand: unknown): PlayerStateView['hand'] {
  if (hand && typeof hand === 'object' && 'kind' in hand) {
    const hv = hand as PlayerStateView['hand'];
    if (hv.kind === 'visible' && Array.isArray(hv.tiles)) return hv;
    if (hv.kind === 'hidden' && typeof hv.count === 'number') return hv;
  }
  if (Array.isArray(hand)) {
    return { kind: 'visible', tiles: hand.map((tile) => ({ ...tile })) };
  }
  return { kind: 'hidden', count: 0 };
}

function normalizePlayerState(raw: unknown): PlayerStateView {
  if (raw && typeof raw === 'object') {
    const state = raw as Partial<PlayerStateView>;
    return {
      hand: normalizeHandView(state.hand),
      discards: Array.isArray(state.discards) ? state.discards.map((t) => ({ ...t })) : [],
      melds: Array.isArray(state.melds)
        ? state.melds.map((meld) => ({
            ...meld,
            tiles: meld.tiles.map((t) => ({ ...t })),
          }))
        : [],
    };
  }
  return { hand: { kind: 'hidden', count: 0 }, discards: [], melds: [] };
}

export interface NormalizePlayerViewOptions {
  viewerCharacterId?: string;
  seatCharacterIds?: Partial<Record<PlayerIndex, string>>;
}

function patchPlayerCharacters(
  raw: Partial<PlayerView>['playerCharacters'],
  viewer: PlayerIndex,
  options?: NormalizePlayerViewOptions,
): PlayerView['playerCharacters'] {
  const playerCharacters = [...(raw ?? ['', '', '', ''])] as PlayerView['playerCharacters'];

  if (options?.viewerCharacterId && !playerCharacters[viewer]) {
    playerCharacters[viewer] = options.viewerCharacterId;
  }

  if (options?.seatCharacterIds) {
    for (const [index, characterId] of Object.entries(options.seatCharacterIds)) {
      const playerIndex = Number(index) as PlayerIndex;
      if (characterId && !playerCharacters[playerIndex]) {
        playerCharacters[playerIndex] = characterId;
      }
    }
  }

  return playerCharacters;
}

function inferDrawModeForView(view: PlayerView): DrawMode | null {
  if (view.drawMode) return view.drawMode;
  if (view.phase !== 'draw' || view.currentPlayer !== view.viewer) return null;
  if (view.skillModeActive) return null;

  const snapshot = {
    playerCharacters: view.playerCharacters,
    skillUses: view.skillUses,
    players: view.players.map(playerStateViewToRaw),
  } as Pick<GameSnapshot, 'playerCharacters' | 'skillUses' | 'players'>;

  const player = view.viewer;
  if (
    canPlayerUseLetMeDrawSkill(snapshot, player) ||
    canPlayerUseCantReadSkill(snapshot, player) ||
    isDuiKangLuGaluo(view.playerCharacters[player])
  ) {
    return 'choose';
  }

  return null;
}

function playerStateViewToRaw(state: PlayerStateView): GameSnapshot['players'][0] {
  return {
    hand: state.hand.kind === 'visible' ? state.hand.tiles.map((t) => ({ ...t })) : [],
    discards: state.discards.map((t) => ({ ...t })),
    melds: state.melds.map((m) => ({ ...m, tiles: m.tiles.map((t) => ({ ...t })) })),
  };
}

function cloneSkillMode(mode: GameSnapshot['skillMode']): SkillMode | null {
  if (!mode) return null;
  if (mode.skillId === 'split_tile' && mode.step === 'pick_keep') {
    return {
      ...mode,
      tileA: { ...mode.tileA },
      tileB: { ...mode.tileB },
    };
  }
  if (mode.skillId === 'instant_win_vote' && mode.step === 'vote') {
    return { ...mode, votes: [...mode.votes] as typeof mode.votes };
  }
  return { ...mode };
}

/** 联机客户端：重算 skill.canActivate；用 skillMode 重建 skillActivity */
export function refreshPlayerViewSkills(view: PlayerView): PlayerView {
  const skillMode =
    view.skillMode ??
    (view.skillModeActive && view.skillActivity
      ? ({ skillId: view.skillActivity.skillId, step: view.skillActivity.step } as GameSnapshot['skillMode'])
      : null);

  const snapshot = {
    phase: view.phase,
    currentPlayer: view.currentPlayer,
    dealer: view.dealer,
    turnNumber: view.turnNumber,
    drawMode: view.drawMode,
    skillMode,
    playerCharacters: view.playerCharacters,
    skillUses: view.skillUses,
    players: view.players.map(playerStateViewToRaw) as GameSnapshot['players'],
  } as GameSnapshot;

  const skillActivity = view.skillModeActive
    ? buildSkillActivity(snapshot, view.viewer) ?? view.skillActivity
    : null;

  return {
    ...view,
    skillMode,
    skill: buildSkillView(snapshot, view.viewer),
    skillActivity,
  };
}

/** 联机：规范化服务端 payload，与单机 buildPlayerView 对齐 */
export function normalizePlayerView(
  raw: Partial<PlayerView> & Pick<PlayerView, 'viewer'>,
  options?: NormalizePlayerViewOptions,
): PlayerView {
  const players = ([0, 1, 2, 3] as PlayerIndex[]).map((index) =>
    normalizePlayerState(raw.players?.[index]),
  ) as PlayerView['players'];

  const playerCharacters = patchPlayerCharacters(raw.playerCharacters, raw.viewer, options);

  const base: PlayerView = {
    viewer: raw.viewer,
    phase: raw.phase ?? 'idle',
    currentPlayer: raw.currentPlayer ?? raw.viewer,
    dealer: raw.dealer ?? 0,
    deckCount: raw.deckCount ?? 0,
    players,
    lastDiscard: raw.lastDiscard ?? null,
    pendingResponses: raw.pendingResponses ?? [],
    responseLevel: raw.responseLevel ?? null,
    turnNumber: raw.turnNumber ?? 0,
    winner: raw.winner ?? null,
    winInfo: raw.winInfo ?? null,
    wildcard: raw.wildcard ?? null,
    playerCharacters,
    skillUses: raw.skillUses ?? [0, 0, 0, 0],
    drawMode: raw.drawMode ?? null,
    skillModeActive: raw.skillModeActive ?? raw.skillActivity != null,
    skillMode: raw.skillMode ?? null,
    skill: raw.skill ?? null,
    skillActivity: raw.skillActivity ?? null,
    gameOverReason: raw.gameOverReason ?? null,
  };

  return refreshPlayerViewSkills({
    ...base,
    drawMode: inferDrawModeForView(base),
  });
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
    drawMode: snapshot.drawMode,
    skillModeActive: snapshot.skillMode !== null,
    skillMode: cloneSkillMode(snapshot.skillMode),
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
