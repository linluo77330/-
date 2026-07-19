import { describe, expect, it } from 'vitest';
import type { GameSnapshot, Tile } from './types.js';
import { buildPlayerView, assertPlayerViewSafe, normalizePlayerView } from './playerView.js';

let id = 0;
function t(suit: Tile['suit'], rank: number): Tile {
  return { id: `t${++id}`, suit, rank };
}

function baseSnapshot(overrides: Partial<GameSnapshot> = {}): GameSnapshot {
  return {
    phase: 'game_over',
    currentPlayer: 0,
    dealer: 0,
    deck: [],
    players: [
      { hand: [t('wan', 1), t('wan', 2)], discards: [], melds: [] },
      { hand: [t('tong', 1), t('tong', 2), t('tong', 3)], discards: [], melds: [] },
      { hand: [t('tiao', 5)], discards: [], melds: [] },
      { hand: [t('feng', 1)], discards: [], melds: [] },
    ],
    lastDiscard: null,
    pendingResponses: [],
    responseLevel: null,
    turnNumber: 1,
    winner: 1,
    winInfo: { tile: t('tong', 4), isSelfDraw: false },
    wildcard: null,
    playerCharacters: ['', 'shou_duan_zhe', '', ''],
    skillUses: [0, 0, 0, 0],
    drawMode: null,
    skillMode: null,
    blackHandTarget: null,
    blackHandOwner: null,
    gameOverReason: null,
    ...overrides,
  };
}

describe('buildPlayerView winner reveal', () => {
  it('胡牌后向所有视角公开赢家手牌', () => {
    const snapshot = baseSnapshot();
    const view = buildPlayerView(snapshot, 0);

    expect(view.players[1].hand.kind).toBe('visible');
    if (view.players[1].hand.kind === 'visible') {
      expect(view.players[1].hand.tiles).toHaveLength(3);
    }
    expect(view.players[2].hand.kind).toBe('hidden');
    assertPlayerViewSafe(view);
  });

  it('非胡牌结束时不公开他人手牌', () => {
    const snapshot = baseSnapshot({ winner: null, winInfo: null, phase: 'game_over' });
    const view = buildPlayerView(snapshot, 0);

    expect(view.players[1].hand.kind).toBe('hidden');
  });

  it('技能选牌时向所有玩家展示发动信息，选牌列表仅发动者可见', () => {
    const discard = t('feng', 1);
    const snapshot = baseSnapshot({
      phase: 'draw',
      currentPlayer: 1,
      skillMode: { skillId: 'let_me_draw', step: 'pick_discard' },
      players: [
        { hand: [t('wan', 1)], discards: [], melds: [] },
        { hand: [t('tong', 1)], discards: [discard], melds: [] },
        { hand: [t('tiao', 5)], discards: [], melds: [] },
        { hand: [t('feng', 2)], discards: [], melds: [] },
      ],
    });

    const actorView = buildPlayerView(snapshot, 1);
    const observerView = buildPlayerView(snapshot, 0);

    expect(actorView.skillActivity?.skillName).toContain('让让我吧');
    expect(actorView.skillActivity?.pickableDiscards).toHaveLength(1);
    expect(observerView.skillActivity?.player).toBe(1);
    expect(observerView.skillActivity?.pickableDiscards).toHaveLength(0);
  });
});

describe('normalizePlayerView', () => {
  it('drawMode 为 choose 时可激活摸牌阶段技能', () => {
    const tile = t('wan', 1);
    const view = normalizePlayerView({
      viewer: 0,
      phase: 'draw',
      currentPlayer: 0,
      dealer: 0,
      deckCount: 80,
      drawMode: 'choose',
      skillModeActive: false,
      playerCharacters: ['shou_duan_zhe', '', '', ''],
      skillUses: [0, 0, 0, 0],
      players: [
        { hand: { kind: 'visible', tiles: [tile] }, discards: [t('tong', 2)], melds: [] },
        { hand: { kind: 'hidden', count: 13 }, discards: [], melds: [] },
        { hand: { kind: 'hidden', count: 13 }, discards: [], melds: [] },
        { hand: { kind: 'hidden', count: 13 }, discards: [], melds: [] },
      ],
    } as never);

    expect(view.skill?.canActivate).toBe(true);
  });

  it('缺 drawMode 时客户端推断 choose 并重算 canActivate', () => {
    const tile = t('wan', 1);
    const view = normalizePlayerView(
      {
        viewer: 0,
        phase: 'draw',
        currentPlayer: 0,
        dealer: 0,
        deckCount: 80,
        playerCharacters: ['', '', '', ''],
        skillUses: [0, 0, 0, 0],
        players: [
          { hand: { kind: 'visible', tiles: [tile] }, discards: [t('tong', 2)], melds: [] },
          { hand: { kind: 'hidden', count: 13 }, discards: [], melds: [] },
          { hand: { kind: 'hidden', count: 13 }, discards: [], melds: [] },
          { hand: { kind: 'hidden', count: 13 }, discards: [], melds: [] },
        ],
      } as never,
      { viewerCharacterId: 'shou_duan_zhe' },
    );

    expect(view.drawMode).toBe('choose');
    expect(view.skill?.canActivate).toBe(true);
  });

  it('保留服务端 skillActivity 的拆分选项（联机黑皮体育生）', () => {
    const source = t('tong', 5);
    const view = normalizePlayerView({
      viewer: 0,
      phase: 'discard',
      currentPlayer: 0,
      dealer: 0,
      deckCount: 80,
      skillModeActive: true,
      playerCharacters: ['hei_pi_ti_yu_sheng', '', '', ''],
      skillUses: [0, 0, 0, 0],
      skillActivity: {
        player: 0,
        characterId: 'hei_pi_ti_yu_sheng',
        characterName: '黑皮体育生',
        skillId: 'split_tile',
        skillName: '大力出奇迹',
        step: 'pick_split',
        sourceTile: source,
        splitOptions: [
          { rankA: 1, rankB: 4 },
          { rankA: 2, rankB: 3 },
        ],
      },
      skillMode: {
        skillId: 'split_tile',
        step: 'pick_split',
        sourceTileId: source.id,
        suit: 'tong',
        rank: 5,
      },
      players: [
        { hand: { kind: 'visible', tiles: [source, t('wan', 1)] }, discards: [], melds: [] },
        { hand: { kind: 'hidden', count: 13 }, discards: [], melds: [] },
        { hand: { kind: 'hidden', count: 13 }, discards: [], melds: [] },
        { hand: { kind: 'hidden', count: 13 }, discards: [], melds: [] },
      ],
    } as never);

    expect(view.skillActivity?.splitOptions).toHaveLength(2);
    expect(view.skillActivity?.sourceTile?.id).toBe(source.id);
  });

  it('skillMode 可重建缺失 splitOptions 的 skillActivity（旧版云端客户端兼容）', () => {
    const source = t('tong', 8);
    const view = normalizePlayerView({
      viewer: 0,
      phase: 'discard',
      currentPlayer: 0,
      dealer: 0,
      deckCount: 80,
      skillModeActive: true,
      playerCharacters: ['hei_pi_ti_yu_sheng', '', '', ''],
      skillUses: [0, 0, 0, 0],
      skillActivity: {
        player: 0,
        characterId: 'hei_pi_ti_yu_sheng',
        characterName: '黑皮体育生',
        skillId: 'split_tile',
        skillName: '大力出奇迹',
        step: 'pick_split',
      },
      skillMode: {
        skillId: 'split_tile',
        step: 'pick_split',
        sourceTileId: source.id,
        suit: 'tong',
        rank: 8,
      },
      players: [
        { hand: { kind: 'visible', tiles: [source, t('wan', 1)] }, discards: [], melds: [] },
        { hand: { kind: 'hidden', count: 13 }, discards: [], melds: [] },
        { hand: { kind: 'hidden', count: 13 }, discards: [], melds: [] },
        { hand: { kind: 'hidden', count: 13 }, discards: [], melds: [] },
      ],
    } as never);

    expect(view.skillActivity?.splitOptions?.length).toBeGreaterThan(0);
    expect(view.skillActivity?.sourceTile?.rank).toBe(8);
  });

  it('保留服务端 skillActivity 的投票确认（联机对抗路伽罗）', () => {
    const view = normalizePlayerView({
      viewer: 0,
      phase: 'draw',
      currentPlayer: 0,
      dealer: 0,
      deckCount: 80,
      drawMode: 'choose',
      skillModeActive: true,
      skillMode: { skillId: 'instant_win_vote', step: 'confirm' },
      playerCharacters: ['dui_kang_lu_galuo', '', '', ''],
      skillUses: [0, 0, 0, 0],
      skillActivity: {
        player: 0,
        characterId: 'dui_kang_lu_galuo',
        characterName: '对抗路伽罗',
        skillId: 'instant_win_vote',
        skillName: '一秒四破',
        step: 'confirm',
        votePrompt: '发起投票？其余三人全部同意则你自动获胜',
      },
      players: [
        { hand: { kind: 'visible', tiles: [t('wan', 1)] }, discards: [], melds: [] },
        { hand: { kind: 'hidden', count: 13 }, discards: [], melds: [] },
        { hand: { kind: 'hidden', count: 13 }, discards: [], melds: [] },
        { hand: { kind: 'hidden', count: 13 }, discards: [], melds: [] },
      ],
    } as never);

    expect(view.skillActivity?.votePrompt).toContain('发起投票');
  });

  it('normalizePlayerView 忽略无 skillMode 的陈旧 skillActivity', () => {
    const view = normalizePlayerView({
      viewer: 0,
      phase: 'discard',
      currentPlayer: 0,
      dealer: 0,
      deckCount: 80,
      skillMode: null,
      skillActivity: {
        player: 0,
        characterId: 'jue_wang_de_wen_mang',
        characterName: '绝望的文盲',
        skillId: 'cant_read',
        skillName: '我看不懂啊',
        step: 'confirm',
        previewTiles: [],
        drawPreviewCount: 0,
      },
      playerCharacters: ['ling_shi_da_zong_tong', '', '', ''],
      skillUses: [0, 0, 0, 0],
      players: [
        { hand: { kind: 'visible', tiles: [t('wan', 1)] }, discards: [], melds: [] },
        { hand: { kind: 'hidden', count: 13 }, discards: [], melds: [] },
        { hand: { kind: 'hidden', count: 13 }, discards: [], melds: [] },
        { hand: { kind: 'hidden', count: 13 }, discards: [], melds: [] },
      ],
    } as never);

    expect(view.skillModeActive).toBe(false);
    expect(view.skillActivity).toBeNull();
  });

  it('零食大总统 skillMode 可重建 pick_target 界面', () => {
    const view = normalizePlayerView({
      viewer: 0,
      phase: 'discard',
      currentPlayer: 0,
      dealer: 0,
      deckCount: 80,
      skillMode: { skillId: 'steal_victory', step: 'pick_target' },
      playerCharacters: ['ling_shi_da_zong_tong', '', '', ''],
      skillUses: [0, 0, 0, 0],
      players: [
        { hand: { kind: 'visible', tiles: [t('wan', 1)] }, discards: [], melds: [] },
        { hand: { kind: 'hidden', count: 13 }, discards: [], melds: [] },
        { hand: { kind: 'hidden', count: 13 }, discards: [], melds: [] },
        { hand: { kind: 'hidden', count: 13 }, discards: [], melds: [] },
      ],
    } as never);

    expect(view.skillModeActive).toBe(true);
    expect(view.skillActivity?.step).toBe('pick_target');
    expect(view.skillActivity?.pickableTargets).toEqual([1, 2, 3]);
  });

  it('联机客户端重算财神阿姨技能：需保留 wildcard', () => {
    const view = normalizePlayerView({
      viewer: 0,
      phase: 'discard',
      currentPlayer: 0,
      dealer: 0,
      deckCount: 80,
      playerCharacters: ['cai_shen_a_yi', '', '', ''],
      skillUses: [0, 0, 0, 0],
      wildcard: {
        indicator: t('wan', 3),
        wildcardType: { suit: 'wan', rank: 3 },
      },
      players: [
        { hand: { kind: 'visible', tiles: [t('wan', 5)] }, discards: [], melds: [] },
        { hand: { kind: 'hidden', count: 13 }, discards: [], melds: [] },
        { hand: { kind: 'hidden', count: 13 }, discards: [], melds: [] },
        { hand: { kind: 'hidden', count: 13 }, discards: [], melds: [] },
      ],
    } as never);

    expect(view.skill?.canActivate).toBe(true);
  });

  it('联机客户端重算借东西之人技能：隐藏手牌按张数计目标', () => {
    const view = normalizePlayerView({
      viewer: 0,
      phase: 'discard',
      currentPlayer: 0,
      dealer: 0,
      deckCount: 80,
      playerCharacters: ['jie_dong_xi_zhi_ren', '', '', ''],
      skillUses: [0, 0, 0, 0],
      players: [
        { hand: { kind: 'visible', tiles: [t('wan', 5)] }, discards: [], melds: [] },
        { hand: { kind: 'hidden', count: 13 }, discards: [], melds: [] },
        { hand: { kind: 'hidden', count: 13 }, discards: [], melds: [] },
        { hand: { kind: 'hidden', count: 0 }, discards: [], melds: [] },
      ],
    } as never);

    expect(view.skill?.canActivate).toBe(true);
  });
});
