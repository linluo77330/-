import type { PlayerIndex, PlayerView, ResponseOption, Tile } from '@/core/types';
import { ACTION_LABELS, PLAYER_NAMES } from './tileLabels';

export type SeatTurnIndicatorKind = 'action' | 'respond' | 'discard' | 'waiting';

export interface SeatTurnIndicator {
  kind: SeatTurnIndicatorKind;
  label: string;
  tile?: Tile;
  /** 高亮脉冲，表示该座位需要操作 */
  pulse?: boolean;
  responseOptions?: ResponseOption[];
}

/** 自视角玩家出牌后开启的一轮展示周期 */
export interface DiscardDisplaySegment {
  /** 视角玩家出牌瞬间，各座位河牌数量 */
  baselineCounts: [number, number, number, number];
  /** 视角玩家在本周期打出的牌 */
  viewerDiscardTileId: string;
}

function seatName(seatNames: string[], index: PlayerIndex): string {
  return seatNames[index] ?? PLAYER_NAMES[index];
}

function isCurrentTurnSeat(view: PlayerView, seatIndex: PlayerIndex): boolean {
  return (
    (view.phase === 'draw' || view.phase === 'discard') && view.currentPlayer === seatIndex
  );
}

function getResponseOptionsForSeat(
  view: PlayerView,
  seatIndex: PlayerIndex,
): ResponseOption[] {
  if (view.phase !== 'response' || !view.lastDiscard) return [];
  return view.pendingResponses.filter((o) => o.player === seatIndex);
}

function getSegmentDiscardTile(
  view: PlayerView,
  seatIndex: PlayerIndex,
  viewer: PlayerIndex,
  segment: DiscardDisplaySegment,
): Tile | null {
  const discards = view.players[seatIndex].discards;
  if (discards.length === 0) return null;

  if (seatIndex === viewer) {
    return (
      discards.find((t) => t.id === segment.viewerDiscardTileId) ??
      discards[discards.length - 1] ??
      null
    );
  }

  if (discards.length > segment.baselineCounts[seatIndex]) {
    return discards[discards.length - 1] ?? null;
  }

  return null;
}

/** 本周期内该座位是否应展示打出的牌 */
function shouldShowSegmentDiscard(
  view: PlayerView,
  seatIndex: PlayerIndex,
  viewer: PlayerIndex,
  segment: DiscardDisplaySegment,
  isActionSeat: boolean,
): boolean {
  if (isActionSeat) return false;

  const tile = getSegmentDiscardTile(view, seatIndex, viewer, segment);
  if (!tile) return false;

  // 视角玩家刚出牌：清空他人，只保留自己
  if (view.phase === 'response' && view.lastDiscard?.from === viewer) {
    return seatIndex === viewer;
  }

  return true;
}

function playedDiscardBanner(tile: Tile): SeatTurnIndicator {
  return {
    kind: 'discard',
    label: '打出',
    tile,
  };
}

function getDiscardPhaseActionLabel(view: PlayerView, seatIndex: PlayerIndex): string {
  if (view.skillActivity?.player === seatIndex) {
    return '请完成技能选择';
  }
  return '该出牌';
}

function getDrawPhaseActionLabel(view: PlayerView, seatIndex: PlayerIndex): string {
  if (view.skillActivity?.player === seatIndex) {
    if (view.skillActivity.step === 'confirm') {
      return '请确认技能';
    }
    return '请选择技能效果';
  }
  return '请摸牌';
}

export function getSeatTurnIndicator(
  view: PlayerView,
  seatIndex: PlayerIndex,
  seatNames: string[],
  segment: DiscardDisplaySegment | null,
  viewer: PlayerIndex,
): SeatTurnIndicator | null {
  const { phase } = view;

  if (phase === 'idle' || phase === 'dealing' || phase === 'game_over') {
    return null;
  }

  const responseOptions = getResponseOptionsForSeat(view, seatIndex);
  if (responseOptions.length > 0 && view.lastDiscard) {
    const actions = [...new Set(responseOptions.map((o) => ACTION_LABELS[o.action]))];
    return {
      kind: 'respond',
      label: `请响应 · ${actions.join(' / ')}`,
      tile: view.lastDiscard.tile,
      pulse: true,
      responseOptions,
    };
  }

  const isActionSeat = isCurrentTurnSeat(view, seatIndex);

  if (isActionSeat) {
    if (phase === 'draw') {
      return {
        kind: 'action',
        label: getDrawPhaseActionLabel(view, seatIndex),
        pulse: true,
      };
    }
    return {
      kind: 'action',
      label: getDiscardPhaseActionLabel(view, seatIndex),
      pulse: true,
    };
  }

  if (
    segment &&
    shouldShowSegmentDiscard(view, seatIndex, viewer, segment, false)
  ) {
    const tile = getSegmentDiscardTile(view, seatIndex, viewer, segment);
    if (tile) return playedDiscardBanner(tile);
  }

  return null;
}

export function createDiscardSegment(
  view: PlayerView,
  viewer: PlayerIndex,
): DiscardDisplaySegment | null {
  const viewerDiscards = view.players[viewer].discards;
  const lastTile = viewerDiscards[viewerDiscards.length - 1];
  if (!lastTile) return null;

  const baselineCounts = ([0, 1, 2, 3] as PlayerIndex[]).map(
    (i) => view.players[i].discards.length,
  ) as [number, number, number, number];

  return {
    baselineCounts,
    viewerDiscardTileId: lastTile.id,
  };
}
