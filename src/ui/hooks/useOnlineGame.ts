import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameLogEntry } from '@/core/gameLog';
import { normalizePlayerView } from '@/core/playerView';
import type { PlayerIndex, PlayerView, ResponseOption } from '@/core/types';
import type { RoomStatePayload, ServerMessage } from '@/shared/protocol';

import { DEFAULT_WS_URL, isSupportedOnlineServer, onlineServerErrorMessage } from '../constants';

/**
 * 联机对局 hook：与 useMahjongGame 暴露相同操作接口，
 * 区别是状态来自 WebSocket，本地用 normalizePlayerView 对齐单机视图。
 */
export function useOnlineGame() {
  const wsRef = useRef<WebSocket | null>(null);
  const myCharacterIdRef = useRef('');
  const roomStateRef = useRef<RoomStatePayload | null>(null);
  const abortEndsAtRef = useRef<number | null>(null);
  const abortPendingRef = useRef(false);

  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [playerIndex, setPlayerIndex] = useState<PlayerIndex | null>(null);
  const [roomState, setRoomState] = useState<RoomStatePayload | null>(null);
  const [view, setView] = useState<PlayerView | null>(null);
  const [drawnTileId, setDrawnTileId] = useState<string | null>(null);
  const [gameLog, setGameLog] = useState<GameLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [gameAbortWarning, setGameAbortWarning] = useState<{
    playerName: string;
    secondsLeft: number;
  } | null>(null);
  const [lobbyNotice, setLobbyNotice] = useState<string | null>(null);

  const send = useCallback((payload: object) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setError('未连接到服务器');
      return;
    }
    ws.send(JSON.stringify(payload));
  }, []);

  const handleServerMessage = useCallback((msg: ServerMessage) => {
    switch (msg.type) {
      case 'joined':
        setPlayerIndex(msg.playerIndex);
        setError(null);
        break;

      case 'room_state':
        roomStateRef.current = msg.state;
        setRoomState(msg.state);
        if (!msg.state.inGame) {
          setView(null);
          setDrawnTileId(null);
          setGameLog([]);
          setGameAbortWarning(null);
          abortEndsAtRef.current = null;
          abortPendingRef.current = false;
        }
        break;

      case 'game_state': {
        const payload = msg.state;
        const rawView = payload?.view;
        if (!rawView || typeof rawView.viewer !== 'number') {
          setError('收到无效对局状态，请返回房间重试');
          break;
        }

        const seatCharacterIds = Object.fromEntries(
          (roomStateRef.current?.seats ?? [])
            .filter((seat) => seat.characterId)
            .map((seat) => [seat.playerIndex, seat.characterId]),
        ) as Partial<Record<PlayerIndex, string>>;

        const nextView = normalizePlayerView(rawView, {
          viewerCharacterId: myCharacterIdRef.current,
          seatCharacterIds,
        });

        if (nextView.turnNumber === 0 && nextView.phase !== 'game_over') {
          abortPendingRef.current = false;
          setGameAbortWarning(null);
          abortEndsAtRef.current = null;
        }
        if (abortPendingRef.current) return;

        setError(null);
        setView(nextView);
        setPlayerIndex((prev) => prev ?? nextView.viewer);
        setDrawnTileId(payload.lastDrawnTileId ?? null);
        setGameLog(payload.log ?? []);
        setRoomState((prev) =>
          prev
            ? { ...prev, inGame: true }
            : {
                roomId: '',
                inGame: true,
                hostPlayerIndex: null,
                seats: [],
              },
        );
        break;
      }

      case 'game_abort_warning':
        abortPendingRef.current = true;
        abortEndsAtRef.current = Date.now() + msg.secondsLeft * 1000;
        setGameAbortWarning({
          playerName: msg.playerName,
          secondsLeft: msg.secondsLeft,
        });
        break;

      case 'game_aborted':
        abortPendingRef.current = false;
        setView(null);
        setDrawnTileId(null);
        setGameLog([]);
        setGameAbortWarning(null);
        abortEndsAtRef.current = null;
        setLobbyNotice(msg.reason);
        setRoomState((prev) => (prev ? { ...prev, inGame: false } : prev));
        break;

      case 'error':
        setError(onlineServerErrorMessage(msg.message));
        break;
    }
  }, []);

  const connect = useCallback(
    (roomId: string, name: string, serverUrl = DEFAULT_WS_URL, characterId = '') => {
      if (connecting || connected) return;

      const resolvedUrl = serverUrl.trim() || DEFAULT_WS_URL;
      if (!isSupportedOnlineServer(resolvedUrl)) {
        setError(
          '该远程服务器版本过旧，不支持角色技能。请在本机运行 npm run server，并使用 ws://127.0.0.1:3001',
        );
        return;
      }

      setConnecting(true);
      setError(null);
      myCharacterIdRef.current = characterId;
      roomStateRef.current = null;
      setView(null);
      setRoomState(null);
      setPlayerIndex(null);
      setDrawnTileId(null);
      setGameLog([]);
      setGameAbortWarning(null);
      setLobbyNotice(null);
      abortEndsAtRef.current = null;
      abortPendingRef.current = false;

      const ws = new WebSocket(resolvedUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setConnecting(false);
        ws.send(JSON.stringify({ type: 'join_room', roomId, name, characterId }));
      };

      ws.onmessage = (event) => {
        try {
          handleServerMessage(JSON.parse(event.data as string) as ServerMessage);
        } catch {
          setError('收到无效服务器消息');
        }
      };

      ws.onerror = () => {
        setError('WebSocket 连接失败');
        setConnecting(false);
      };

      ws.onclose = () => {
        setConnected(false);
        setConnecting(false);
        wsRef.current = null;
        myCharacterIdRef.current = '';
        roomStateRef.current = null;
        setPlayerIndex(null);
        setRoomState(null);
        setView(null);
        setDrawnTileId(null);
        setGameLog([]);
        setGameAbortWarning(null);
        abortEndsAtRef.current = null;
        abortPendingRef.current = false;
        setError((prev) => prev ?? '与服务器连接已断开');
      };
    },
    [connected, connecting, handleServerMessage],
  );

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    myCharacterIdRef.current = '';
    roomStateRef.current = null;
    setConnected(false);
    setConnecting(false);
    setPlayerIndex(null);
    setRoomState(null);
    setView(null);
    setDrawnTileId(null);
    setGameLog([]);
    setGameAbortWarning(null);
    setLobbyNotice(null);
    abortEndsAtRef.current = null;
    abortPendingRef.current = false;
  }, []);

  useEffect(() => {
    if (!gameAbortWarning || abortEndsAtRef.current === null) return;

    const tick = () => {
      const endsAt = abortEndsAtRef.current;
      if (endsAt === null) return;
      const secondsLeft = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setGameAbortWarning((prev) => {
        if (!prev) return null;
        if (secondsLeft <= 0) return { ...prev, secondsLeft: 0 };
        return { ...prev, secondsLeft };
      });
    };

    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [gameAbortWarning?.playerName]);

  // ── 与 useMahjongGame 对齐的操作接口 ──

  const ready = useCallback(() => send({ type: 'ready' }), [send]);
  const startGame = useCallback(() => send({ type: 'start_game' }), [send]);
  const addBot = useCallback(
    (seatIndex?: PlayerIndex) => send({ type: 'add_bot', seatIndex }),
    [send],
  );
  const removeBot = useCallback(
    (seatIndex: PlayerIndex) => send({ type: 'remove_bot', seatIndex }),
    [send],
  );

  const drawWall = useCallback(() => send({ type: 'draw_wall' }), [send]);

  const activateSkill = useCallback(
    (skillId: string) => send({ type: 'activate_skill', skillId }),
    [send],
  );

  const skillPick = useCallback(
    (params: { tileId?: string; splitRanks?: [number, number]; confirm?: boolean }) =>
      send({
        type: 'skill_pick',
        tileId: params.tileId,
        splitRanks: params.splitRanks,
        confirm: params.confirm,
      }),
    [send],
  );

  const skillVote = useCallback(
    (params: { agree: boolean }) => send({ type: 'skill_vote', agree: params.agree }),
    [send],
  );

  const discard = useCallback((tileId: string) => send({ type: 'discard', tileId }), [send]);

  const pass = useCallback(() => send({ type: 'pass' }), [send]);

  const respondOption = useCallback(
    (option: ResponseOption) => {
      if (option.action === 'chi' && option.chiTiles) {
        send({
          type: 'respond',
          action: 'chi',
          chiTileIds: [option.chiTiles[0].id, option.chiTiles[1].id],
        });
      } else {
        send({ type: 'respond', action: option.action });
      }
    },
    [send],
  );

  const leaveGame = useCallback(() => {
    send({ type: 'leave_game' });
    setView(null);
    setDrawnTileId(null);
  }, [send]);

  const inGame = view !== null && view.phase !== 'idle';

  const isHost =
    playerIndex !== null &&
    roomState !== null &&
    roomState.hostPlayerIndex === playerIndex;

  return {
    connected,
    connecting,
    playerIndex,
    roomState,
    view,
    drawnTileId,
    gameLog,
    error,
    gameAbortWarning,
    lobbyNotice,
    inGame,
    isHost,
    connect,
    disconnect,
    leaveGame,
    ready,
    startGame,
    addBot,
    removeBot,
    discard,
    pass,
    respondOption,
    drawWall,
    activateSkill,
    skillPick,
    skillVote,
  };
}

export type OnlineGameApi = ReturnType<typeof useOnlineGame>;
