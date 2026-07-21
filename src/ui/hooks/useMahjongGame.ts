import { useCallback, useEffect, useRef, useState } from 'react';
import { MahjongGame } from '@/core/MahjongGame';
import type { GameEventName, GameSnapshot } from '@/core';
import type { PlayerIndex, ResponseAction, ResponseOption, MatchViewState } from '@/core/types';
import {
  activePlayersMask,
  beginNextRound,
  buildMaxHpFromCharacters,
  createInitialMatchState,
  getMatchWinners,
  isMatchFinished,
  processRoundEnd,
  toMatchViewState,
  type MatchState,
  ROUND_INTERMISSION_MS,
} from '@/core/matchState';
import { getCharacterMaxHp } from '../data/characters';

const SYNC_EVENTS: GameEventName[] = [
  'game_start',
  'wildcard_reveal',
  'wildcard_change',
  'game_over',
  'phase_change',
  'turn_change',
  'before_draw',
  'before_discard',
  'before_response',
  'after_response',
  'response_pass',
  'response_window_open',
  'response_level_change',
  'response_window_close',
  'before_hu',
  'after_hu',
  'draw_choice_open',
  'skill_pick_open',
  'skill_used',
  'skill_vote_open',
  'skill_vote_cast',
  'skill_vote_failed',
];

export function useMahjongGame() {
  const gameRef = useRef<MahjongGame | null>(null);
  if (!gameRef.current) {
    gameRef.current = new MahjongGame();
  }
  const game = gameRef.current;

  const [snapshot, setSnapshot] = useState<GameSnapshot>(() => game.getSnapshot());
  const [drawnTileId, setDrawnTileId] = useState<string | null>(null);
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [countdownTick, setCountdownTick] = useState(0);

  const matchStateRef = useRef<MatchState | null>(null);
  const lastDiscardFromRef = useRef<PlayerIndex | null>(null);
  const intermissionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(() => {
    setSnapshot(game.getSnapshot());
    setCountdownTick((t) => t + 1);
  }, [game]);

  const syncDrawnHighlight = useCallback(
    (player: PlayerIndex) => {
      setDrawnTileId(game.getSnapshot().lastDrawnTileIds[player] ?? null);
    },
    [game],
  );

  const clearIntermissionTimers = useCallback(() => {
    if (intermissionTimerRef.current) clearTimeout(intermissionTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    intermissionTimerRef.current = null;
    countdownIntervalRef.current = null;
  }, []);

  const startRound = useCallback(
    (state: MatchState, playerCharacters: [string, string, string, string]) => {
      const mask = activePlayersMask(state);
      game.setPlayerActive(mask);
      game.start(state.dealer, playerCharacters, { playerActive: mask });
      setDrawnTileId(null);
      refresh();
    },
    [game, refresh],
  );

  const scheduleNextRound = useCallback(
    (state: MatchState, playerCharacters: [string, string, string, string]) => {
      clearIntermissionTimers();
      countdownIntervalRef.current = setInterval(() => {
        setCountdownTick((t) => t + 1);
      }, 500);
      intermissionTimerRef.current = setTimeout(() => {
        clearIntermissionTimers();
        if (isMatchFinished(state)) {
          const finished = {
            ...state,
            matchPhase: 'match_over' as const,
            matchWinners: getMatchWinners(state),
            nextRoundAt: null,
          };
          matchStateRef.current = finished;
          setMatchState(finished);
          return;
        }
        const next = beginNextRound(state);
        matchStateRef.current = next;
        setMatchState(next);
        startRound(next, playerCharacters);
      }, ROUND_INTERMISSION_MS);
    },
    [clearIntermissionTimers, startRound],
  );

  const handleRoundEnd = useCallback(
    (playerCharacters: [string, string, string, string]) => {
      const current = matchStateRef.current;
      if (!current) {
        refresh();
        return;
      }

      const snap = game.getSnapshot();
      const updated = processRoundEnd(current, {
        winner: snap.winner,
        gameOverReason: snap.gameOverReason,
        winInfo: snap.winInfo,
        lastDiscardFrom: lastDiscardFromRef.current,
        stealTarget:
          snap.gameOverReason === 'skill_steal' ? snap.blackHandTarget : null,
      });

      matchStateRef.current = updated;
      setMatchState(updated);
      refresh();

      if (updated.matchPhase === 'round_intermission') {
        scheduleNextRound(updated, playerCharacters);
      } else {
        clearIntermissionTimers();
      }
    },
    [game, refresh, scheduleNextRound, clearIntermissionTimers],
  );

  const playerCharactersRef = useRef<[string, string, string, string]>(['', '', '', '']);

  useEffect(() => {
    const unsubs = [
      game.on('after_draw', (payload) => {
        syncDrawnHighlight(payload.player);
        refresh();
      }),
      game.on('after_discard', (payload) => {
        lastDiscardFromRef.current = payload.player;
        syncDrawnHighlight(payload.player);
        refresh();
      }),
      ...SYNC_EVENTS.map((event) =>
        game.on(event, () => {
          refresh();
          return undefined;
        }),
      ),
      game.on('game_over', () => {
        handleRoundEnd(playerCharactersRef.current);
        return undefined;
      }),
    ];
    return () => {
      unsubs.forEach((off) => off());
      clearIntermissionTimers();
    };
  }, [game, refresh, handleRoundEnd, clearIntermissionTimers, syncDrawnHighlight]);

  const startMatch = useCallback(
    (
      playerCharacters: [string, string, string, string],
      survivorsToWin = 1,
      dealer: PlayerIndex = 0,
    ) => {
      clearIntermissionTimers();
      playerCharactersRef.current = playerCharacters;
      const maxHp = buildMaxHpFromCharacters(playerCharacters, getCharacterMaxHp);
      const initial = { ...createInitialMatchState(maxHp, survivorsToWin), dealer };
      matchStateRef.current = initial;
      setMatchState(initial);
      startRound(initial, playerCharacters);
    },
    [clearIntermissionTimers, startRound],
  );

  const start = useCallback(
    (
      dealer: PlayerIndex = 0,
      playerCharacters: [string, string, string, string] = ['', '', '', ''],
    ) => {
      startMatch(playerCharacters, 1, dealer);
    },
    [startMatch],
  );

  const matchView: MatchViewState | null = matchState
    ? toMatchViewState(matchState)
    : null;

  const drawWall = useCallback(() => {
    game.drawCard();
    syncDrawnHighlight(0);
    refresh();
  }, [game, refresh, syncDrawnHighlight]);

  const activateSkill = useCallback(
    (skillId: string) => {
      try {
        if (!game.activateSkill(skillId)) {
          console.warn('技能发动失败', skillId);
        }
        refresh();
      } catch (err) {
        console.error(err);
        refresh();
      }
    },
    [game, refresh],
  );

  const skillPick = useCallback(
    (params: {
      tileId?: string;
      splitRanks?: [number, number];
      confirm?: boolean;
      targetPlayer?: PlayerIndex;
      skip?: boolean;
    }) => {
      try {
        game.resolveSkillPick(params);
        const snap = game.getSnapshot();
        if (
          params.tileId &&
          snap.skillMode === null &&
          snap.currentPlayer === 0 &&
          snap.players[0].hand.some((t) => t.id === params.tileId)
        ) {
          setDrawnTileId(params.tileId);
        }
        refresh();
      } catch (err) {
        console.error(err);
        refresh();
      }
    },
    [game, refresh],
  );

  const skillVote = useCallback(
    (params: { agree: boolean }) => {
      try {
        game.submitSkillVote(0, params.agree);
        refresh();
      } catch (err) {
        console.error(err);
        refresh();
      }
    },
    [game, refresh],
  );

  const discard = useCallback(
    (tileId: string) => {
      game.discardCard(tileId);
      syncDrawnHighlight(0);
      refresh();
    },
    [game, refresh, syncDrawnHighlight],
  );

  const declareConcealedKong = useCallback(
    (tile: Pick<import('@/core/types').Tile, 'suit' | 'rank'>) => {
      try {
        game.declareConcealedKong(tile);
        refresh();
      } catch (err) {
        console.error(err);
        refresh();
      }
    },
    [game, refresh],
  );

  const respondOption = useCallback(
    (option: ResponseOption) => {
      game.respond(option.player, option.action, option.chiTiles);
    },
    [game],
  );

  const respond = useCallback(
    (
      player: PlayerIndex,
      action: Exclude<ResponseAction, 'pass'>,
      chiTiles?: [string, string],
    ) => {
      const snap = game.getSnapshot();
      let resolvedChi: [typeof snap.players[0]['hand'][0], typeof snap.players[0]['hand'][0]] | undefined;
      if (chiTiles) {
        const hand = snap.players[player].hand;
        const t1 = hand.find((t) => t.id === chiTiles[0]);
        const t2 = hand.find((t) => t.id === chiTiles[1]);
        if (t1 && t2) resolvedChi = [t1, t2];
      } else {
        const option = snap.pendingResponses.find(
          (o) => o.player === player && o.action === action,
        );
        if (option?.chiTiles) resolvedChi = option.chiTiles;
      }
      game.respond(player, action, resolvedChi);
    },
    [game],
  );

  const pass = useCallback(
    (player: PlayerIndex) => {
      game.passResponse(player);
    },
    [game],
  );

  return {
    game,
    snapshot,
    drawnTileId,
    matchView,
    start,
    startMatch,
    drawWall,
    activateSkill,
    skillPick,
    skillVote,
    discard,
    declareConcealedKong,
    respond,
    respondOption,
    pass,
  };
}
