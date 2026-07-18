import { useCallback, useEffect, useRef, useState } from 'react';
import { MahjongGame } from '@/core/MahjongGame';
import type { GameEventName, GameSnapshot } from '@/core';
import type { PlayerIndex, ResponseAction, ResponseOption } from '@/core/types';
import { tileLabel } from '../utils/tileLabels';

const SYNC_EVENTS: GameEventName[] = [
  'game_start',
  'wildcard_reveal',
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
];

export function useMahjongGame() {
  const gameRef = useRef<MahjongGame | null>(null);
  if (!gameRef.current) {
    gameRef.current = new MahjongGame();
  }
  const game = gameRef.current;

  const [snapshot, setSnapshot] = useState<GameSnapshot>(() => game.getSnapshot());
  const [log, setLog] = useState<string[]>([]);
  const [drawnTileId, setDrawnTileId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setSnapshot(game.getSnapshot());
  }, [game]);

  const pushLog = useCallback((msg: string) => {
    setLog((prev) => [msg, ...prev].slice(0, 30));
  }, []);

  useEffect(() => {
    const unsubs = [
      ...SYNC_EVENTS.map((event) =>
        game.on(event, () => {
          refresh();
          return undefined;
        }),
      ),
      game.on('wildcard_reveal', (payload) => {
        pushLog(`翻万能牌：${tileLabel(payload.indicator)}`);
      }),
      game.on('after_draw', (payload) => {
        pushLog(`玩家 ${payload.player} 摸了 ${tileLabel(payload.tile)}`);
        if (payload.player === 0) {
          setDrawnTileId(payload.tile.id);
        }
      }),
      game.on('after_discard', (payload) => {
        pushLog(`玩家 ${payload.player} 打出 ${tileLabel(payload.tile)}`);
        if (payload.player === 0) {
          setDrawnTileId(null);
        }
      }),
      game.on('after_response', (payload) => {
        if (payload.won) {
          pushLog(`玩家 ${payload.player} 胡了！`);
        } else if (payload.meld) {
          pushLog(
            `玩家 ${payload.player} ${payload.meld.type === 'chi' ? '吃' : payload.meld.type === 'pong' ? '碰' : '杠'}`,
          );
        }
      }),
      game.on('response_level_change', (payload) => {
        pushLog(`响应轮次：${payload.level}`);
      }),
      game.on('game_over', (payload) => {
        pushLog(
          payload.winner !== null
            ? `对局结束：玩家 ${payload.winner} 获胜`
            : '对局结束：流局',
        );
      }),
    ];
    return () => unsubs.forEach((off) => off());
  }, [game, refresh, pushLog]);

  const start = useCallback(
    (dealer: PlayerIndex = 0) => {
      game.start(dealer);
      setDrawnTileId(null);
      refresh();
      pushLog('新对局开始');
    },
    [game, refresh, pushLog],
  );

  const draw = useCallback(() => {
    game.drawCard();
  }, [game]);

  const discard = useCallback(
    (tileId: string) => {
      game.discardCard(tileId);
    },
    [game],
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
    log,
    drawnTileId,
    start,
    draw,
    discard,
    respond,
    respondOption,
    pass,
  };
}
