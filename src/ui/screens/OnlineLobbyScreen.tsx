import { useEffect, useState } from 'react';
import type { PlayerIndex } from '@/core/types';
import { DEFAULT_WS_URL } from '../constants';
import { ScreenShell } from '../components/ScreenShell';
import type { Character } from '../data/characters';
import type { OnlineGameApi } from '../hooks/useOnlineGame';

const SEAT_LABELS = ['东（0 号）', '南（1 号）', '西（2 号）', '北（3 号）'];

interface OnlineLobbyScreenProps {
  online: OnlineGameApi;
  character: Character;
  onBack: () => void;
}

export function OnlineLobbyScreen({ online, character, onBack }: OnlineLobbyScreenProps) {
  const [serverUrl, setServerUrl] = useState(DEFAULT_WS_URL);
  const [roomId, setRoomId] = useState('');
  const [name, setName] = useState(character.name);

  const {
    connected,
    connecting,
    roomState,
    playerIndex,
    isHost,
    error,
    connect,
    disconnect,
    ready,
    startGame,
    addBot,
    removeBot,
    lobbyNotice,
  } = online;

  const seats = roomState?.seats ?? [];
  const occupiedCount = seats.filter((s) => s.kind !== 'empty').length;
  const humanSeats = seats.filter((s) => s.kind === 'human');
  const allHumansReady = humanSeats.length > 0 && humanSeats.every((s) => s.ready && s.connected);
  const canStart = occupiedCount >= 4 && allHumansReady;
  const mySeat = playerIndex !== null ? seats[playerIndex] : null;
  const myReady = mySeat?.kind === 'human' && mySeat.ready;
  const emptyCount = seats.filter((s) => s.kind === 'empty').length;

  useEffect(() => {
    if (!connected) {
      setRoomId('');
    }
  }, [connected]);

  const handleConnect = () => {
    const trimmedName = name.trim();
    const trimmedRoom = roomId.trim();
    if (!trimmedName || !trimmedRoom) return;
    connect(trimmedRoom, trimmedName, serverUrl.trim() || DEFAULT_WS_URL);
  };

  const handleBack = () => {
    disconnect();
    onBack();
  };

  return (
    <ScreenShell
      title="多人联机"
      subtitle={
        connected
          ? `${character.name} · 房间 ${roomState?.roomId ?? roomId}${isHost ? ' · 你是房主' : ''}`
          : `${character.name} · 连接服务器并加入房间`
      }
      footer={
        connected ? (
          <button type="button" className="screen-panel__back btn btn--ghost" onClick={handleBack}>
            断开并返回
          </button>
        ) : (
          <button type="button" className="screen-panel__back btn btn--ghost" onClick={onBack}>
            返回主菜单
          </button>
        )
      }
    >
      {!connected ? (
        <div className="online-lobby__form">
          <label className="online-lobby__field">
            <span>服务器地址</span>
            <input
              type="text"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder={DEFAULT_WS_URL}
            />
          </label>
          <label className="online-lobby__field">
            <span>房间号</span>
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="输入房间号"
            />
          </label>
          <label className="online-lobby__field">
            <span>昵称</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="你的昵称"
              maxLength={12}
            />
          </label>
          {error && <p className="online-lobby__error">{error}</p>}
          <button
            type="button"
            className="btn btn--primary online-lobby__connect"
            disabled={connecting || !name.trim() || !roomId.trim()}
            onClick={handleConnect}
          >
            {connecting ? '连接中…' : '加入房间'}
          </button>
        </div>
      ) : (
        <div className="online-lobby__room">
          {lobbyNotice && (
            <p className="online-lobby__notice" role="status">
              {lobbyNotice}
            </p>
          )}
          <div className="online-lobby__seats">
            {SEAT_LABELS.map((label, i) => {
              const seat = seats.find((s) => s.playerIndex === i);
              const kind = seat?.kind ?? 'empty';
              const isBot = kind === 'bot';
              const isHuman = kind === 'human';
              const isEmpty = kind === 'empty';

              return (
                <div
                  key={label}
                  className={[
                    'online-lobby__seat',
                    !isEmpty ? 'online-lobby__seat--filled' : '',
                    isBot ? 'online-lobby__seat--bot' : '',
                    seat?.ready ? 'online-lobby__seat--ready' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <span className="online-lobby__seat-label">{label}</span>
                  <span className="online-lobby__seat-name">
                    {isEmpty ? '空位' : seat!.name}
                    {isBot && ' 🤖'}
                    {roomState?.hostPlayerIndex === i && isHuman && ' · 房主'}
                  </span>
                  <span className="online-lobby__seat-status">
                    {isEmpty && '—'}
                    {isBot && '机器人'}
                    {isHuman && (seat!.ready ? '已准备' : '未准备')}
                  </span>
                  {isHost && isBot && (
                    <button
                      type="button"
                      className="online-lobby__seat-action btn btn--ghost"
                      onClick={() => removeBot(i as PlayerIndex)}
                    >
                      移除
                    </button>
                  )}
                  {isHost && isEmpty && (
                    <button
                      type="button"
                      className="online-lobby__seat-action btn btn--ghost"
                      onClick={() => addBot(i as PlayerIndex)}
                    >
                      + 机器人
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {error && <p className="online-lobby__error">{error}</p>}

          <div className="online-lobby__actions">
            {mySeat?.kind === 'human' && !myReady && (
              <button type="button" className="btn btn--primary" onClick={ready}>
                准备
              </button>
            )}
            {myReady && !isHost && (
              <span className="online-lobby__waiting">已准备，等待房主开局…</span>
            )}
            {isHost && emptyCount > 0 && (
              <button type="button" className="btn btn--ghost" onClick={() => addBot()}>
                添加机器人（空位 {emptyCount}）
              </button>
            )}
            {isHost && (
              <button
                type="button"
                className="btn btn--primary"
                disabled={!canStart}
                onClick={startGame}
              >
                开始游戏
              </button>
            )}
          </div>

          <p className="online-lobby__hint">
            玩家 + 机器人共 4 人即可开局（当前 {occupiedCount}/4）
            {humanSeats.length > 0 && !allHumansReady && ' · 等待所有玩家准备'}
          </p>
        </div>
      )}
    </ScreenShell>
  );
}
