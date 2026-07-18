import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { PlayerIndex, PlayerView, ResponseOption } from '@/core/types';
import type { RoomStatePayload, ServerMessage } from '@/shared/protocol';

const DEFAULT_WS = 'ws://localhost:3001';

function pushLogEntry(setLog: Dispatch<SetStateAction<string[]>>, msg: string) {
  setLog((prev) => [msg, ...prev].slice(0, 30));
}

export function useOnlineGame() {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [playerIndex, setPlayerIndex] = useState<PlayerIndex | null>(null);
  const [roomState, setRoomState] = useState<RoomStatePayload | null>(null);
  const [view, setView] = useState<PlayerView | null>(null);
  const [drawnTileId, setDrawnTileId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);

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
        pushLogEntry(setLog, `加入房间 ${msg.roomId}，座位 ${msg.playerIndex}${msg.isHost ? '（房主）' : ''}`);
        break;
      case 'room_state':
        setRoomState(msg.state);
        break;
      case 'game_state':
        setView(msg.state.view);
        setDrawnTileId(msg.state.lastDrawnTileId);
        setRoomState((prev) => (prev ? { ...prev, inGame: true } : prev));
        break;
      case 'error':
        setError(msg.message);
        pushLogEntry(setLog, `错误：${msg.message}`);
        break;
    }
  }, []);

  const connect = useCallback(
    (roomId: string, name: string, serverUrl = DEFAULT_WS) => {
      if (connecting || connected) return;

      setConnecting(true);
      setError(null);
      setView(null);
      setRoomState(null);
      setPlayerIndex(null);
      setDrawnTileId(null);
      setLog([]);

      const ws = new WebSocket(serverUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setConnecting(false);
        ws.send(JSON.stringify({ type: 'join_room', roomId, name }));
        pushLogEntry(setLog, `已连接 ${serverUrl}`);
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
        pushLogEntry(setLog, '连接已断开');
      };
    },
    [connected, connecting, handleServerMessage],
  );

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setConnected(false);
    setConnecting(false);
    setPlayerIndex(null);
    setRoomState(null);
    setView(null);
    setDrawnTileId(null);
  }, []);

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
    error,
    log,
    inGame,
    isHost,
    connect,
    disconnect,
    ready,
    startGame,
    addBot,
    removeBot,
    discard,
    pass,
    respondOption,
  };
}

export type OnlineGameApi = ReturnType<typeof useOnlineGame>;
