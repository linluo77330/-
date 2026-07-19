import { useCallback, useEffect, useRef, useState } from 'react';
import { MahjongGame } from '@/core/MahjongGame';
import type { GameEventName, GameSnapshot } from '@/core';
import type { PlayerIndex, ResponseAction, ResponseOption } from '@/core/types';

const SYNC_EVENTS: GameEventName[] = [
  'game_start',
  'wildcard_reveal',
  'wildcard_change',
  'game_over',
  'phase_change',
  'turn_change',
  'before_draw',
  'after_draw',
  'before_discard',
  'after_discard',
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

  const refresh = useCallback(() => {
    setSnapshot(game.getSnapshot());
  }, [game]);

  useEffect(() => {
    const unsubs = [
      ...SYNC_EVENTS.map((event) =>
        game.on(event, () => {
          refresh();
          return undefined;
        }),
      ),
      game.on('after_draw', (payload) => {
        if (payload.player === 0) {
          setDrawnTileId(payload.tile.id);
        }
      }),
      game.on('after_discard', (payload) => {
        if (payload.player === 0) {
          setDrawnTileId(null);
        }
      }),
    ];
    return () => unsubs.forEach((off) => off());
  }, [game, refresh]);

  const start = useCallback(
    (
      dealer: PlayerIndex = 0,
      playerCharacters: [string, string, string, string] = ['', '', '', ''],
    ) => {
      game.start(dealer, playerCharacters);
      setDrawnTileId(null);
      refresh();
    },
    [game, refresh],
  );

  const drawWall = useCallback(() => {
    game.drawCard();
  }, [game]);

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
    },
    [game],
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
    start,
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
