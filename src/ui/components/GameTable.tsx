import { buildPlayerView } from '@/core/playerView';
import type { PlayerIndex, Tile as TileType } from '@/core/types';
import { wildcardDescription } from '@/core/wildcard';
import { getTenpaiTiles } from '@/core/winCheck';
import type { Character } from '../data/characters';
import type { OnlineGameApi } from '../hooks/useOnlineGame';
import type { useMahjongGame } from '../hooks/useMahjongGame';
import { getVisibleHand } from '../utils/handView';
import { tileLabel, PLAYER_NAMES } from '../utils/tileLabels';
import { ActionPanel } from './ActionPanel';
import { PlayerSeat } from './PlayerSeat';
import { Tile } from './Tile';

type GameApi = ReturnType<typeof useMahjongGame>;

type GameTableProps =
  | {
      mode: 'offline';
      gameApi: GameApi;
      character: Character;
      onExit: () => void;
    }
  | {
      mode: 'online';
      online: OnlineGameApi;
      character: Character;
      onExit: () => void;
    };

const SEAT_POSITIONS: ('bottom' | 'left' | 'top' | 'right')[] = ['bottom', 'left', 'top', 'right'];

function relativeSeat(viewer: PlayerIndex, absolute: PlayerIndex): number {
  return (absolute - viewer + 4) % 4;
}

export function GameTable(props: GameTableProps) {
  if (props.mode === 'offline') {
    return <OfflineGameTable {...props} />;
  }
  return <OnlineGameTable {...props} />;
}

function OfflineGameTable({
  gameApi,
  character,
  onExit,
}: Extract<GameTableProps, { mode: 'offline' }>) {
  const { snapshot, start, discard, respondOption, pass, drawnTileId } = gameApi;
  const humanPlayer: PlayerIndex = 0;
  const view = buildPlayerView(snapshot, humanPlayer);
  const seatNames = [...PLAYER_NAMES];

  const humanState = view.players[humanPlayer];
  const visibleHand = getVisibleHand(humanState);
  const waitingTiles =
    view.phase === 'discard' && view.currentPlayer === humanPlayer && visibleHand
      ? getTenpaiTiles(visibleHand, humanState.melds, view.wildcard)
      : [];

  const handleTileClick = (tile: TileType) => {
    if (view.phase !== 'discard' || view.currentPlayer !== humanPlayer) return;
    discard(tile.id);
  };

  return (
    <GameTableLayout
      view={view}
      humanPlayer={humanPlayer}
      seatNames={seatNames}
      drawnTileId={drawnTileId}
      waitingTiles={waitingTiles}
      onTileClick={handleTileClick}
      onRespond={respondOption}
      onPass={() => pass(humanPlayer)}
      onStart={() => start(0)}
      showStart
      headerCharacter={character}
      onExit={onExit}
      exitLabel="退回主菜单"
    />
  );
}

function OnlineGameTable({
  online,
  character,
  onExit,
}: Extract<GameTableProps, { mode: 'online' }>) {
  const {
    view,
    playerIndex,
    roomState,
    drawnTileId,
    gameAbortWarning,
    discard,
    respondOption,
    pass,
  } = online;

  if (!view || playerIndex === null) {
    return null;
  }

  const seatNames =
    roomState?.seats.map((s) => s.name || PLAYER_NAMES[s.playerIndex]) ?? [...PLAYER_NAMES];

  const humanState = view.players[playerIndex];
  const visibleHand = getVisibleHand(humanState);
  const waitingTiles =
    view.phase === 'discard' && view.currentPlayer === playerIndex && visibleHand
      ? getTenpaiTiles(visibleHand, humanState.melds, view.wildcard)
      : [];

  const handleTileClick = (tile: TileType) => {
    if (view.phase !== 'discard' || view.currentPlayer !== playerIndex) return;
    discard(tile.id);
  };

  return (
    <GameTableLayout
      view={view}
      humanPlayer={playerIndex}
      seatNames={seatNames}
      drawnTileId={drawnTileId}
      waitingTiles={waitingTiles}
      onTileClick={handleTileClick}
      onRespond={respondOption}
      onPass={pass}
      showStart={false}
      headerCharacter={{
        ...character,
        tagline: `房间 ${roomState?.roomId ?? ''} · ${seatNames[playerIndex] ?? '你'}`,
      }}
      abortBanner={
        gameAbortWarning
          ? {
              playerName: gameAbortWarning.playerName,
              secondsLeft: gameAbortWarning.secondsLeft,
            }
          : null
      }
      onExit={onExit}
      exitLabel="退回主菜单"
    />
  );
}

interface GameTableLayoutProps {
  view: import('@/core/types').PlayerView;
  humanPlayer: PlayerIndex;
  seatNames: string[];
  drawnTileId: string | null;
  waitingTiles: TileType[];
  onTileClick: (tile: TileType) => void;
  onRespond: GameApi['respondOption'];
  onPass: () => void;
  onStart?: () => void;
  showStart: boolean;
  headerCharacter?: Character;
  headerOnline?: { name: string; roomId: string };
  abortBanner?: { playerName: string; secondsLeft: number } | null;
  onExit: () => void;
  exitLabel: string;
}

function GameTableLayout({
  view,
  humanPlayer,
  seatNames,
  drawnTileId,
  waitingTiles,
  onTileClick,
  onRespond,
  onPass,
  onStart,
  showStart,
  headerCharacter,
  headerOnline,
  abortBanner,
  onExit,
  exitLabel,
}: GameTableLayoutProps) {
  const seats = ([0, 1, 2, 3] as PlayerIndex[]).map((index) => ({
    index,
    position: SEAT_POSITIONS[relativeSeat(humanPlayer, index)],
  }));

  return (
    <div className="game-layout">
      <header className="game-header">
        <div className="game-header__row">
          {headerCharacter && (
            <div className="game-header__character" style={{ borderColor: headerCharacter.accent }}>
              <span
                className="game-header__character-badge"
                style={{ background: headerCharacter.accent }}
              >
                {headerCharacter.name.slice(-1)}
              </span>
              <div>
                <strong>{headerCharacter.name}</strong>
                <span className="game-header__character-tag">{headerCharacter.tagline}</span>
              </div>
            </div>
          )}
          {headerOnline && (
            <div className="game-header__character game-header__character--online">
              <div>
                <strong>{headerOnline.name}</strong>
                <span className="game-header__character-tag">房间 {headerOnline.roomId}</span>
              </div>
            </div>
          )}
          <div className="game-header__title">
            <h1>技能麻将</h1>
            <p className="game-header__sub">
              {headerOnline ? '多人联机 · 在线对局' : '离线单机 · 事件驱动引擎'}
            </p>
          </div>
          <button type="button" className="btn btn--ghost game-header__back" onClick={onExit}>
            {exitLabel}
          </button>
        </div>
      </header>

      {abortBanner && (
        <div className="game-abort-banner" role="alert">
          <div className="game-abort-banner__title">有玩家断开连接</div>
          <p className="game-abort-banner__text">
            <strong>{abortBanner.playerName}</strong> 已离开对局，
            {abortBanner.secondsLeft > 0
              ? `${abortBanner.secondsLeft} 秒后自动结束并返回大厅`
              : '正在返回大厅…'}
          </p>
        </div>
      )}

      <div className="game-table">
        <div className="game-table__felt">
          {seats.map(({ index, position }) => (
            <PlayerSeat
              key={index}
              playerIndex={index}
              state={view.players[index]}
              isDealer={view.dealer === index}
              isActive={view.currentPlayer === index}
              isHuman={index === humanPlayer}
              position={position}
              name={seatNames[index] ?? PLAYER_NAMES[index]}
              wildcard={view.wildcard}
              highlightTileId={index === humanPlayer ? drawnTileId : null}
              onTileClick={index === humanPlayer ? onTileClick : undefined}
            />
          ))}

          <div className="game-table__center">
            <div className="center-info">
              {view.wildcard && (
                <div className="center-info__wildcard">
                  <div className="center-info__wildcard-label">万能牌</div>
                  <Tile tile={view.wildcard.indicator} size="sm" />
                  <div className="center-info__wildcard-desc">
                    {wildcardDescription(view.wildcard, (t) => tileLabel(t as TileType))}
                  </div>
                </div>
              )}
              <div className="center-info__turn">
                当前：{seatNames[view.currentPlayer] ?? PLAYER_NAMES[view.currentPlayer]}
              </div>
              {view.phase === 'response' && view.responseLevel && (
                <div className="center-info__response">
                  等待【
                  {view.responseLevel === 'chi'
                    ? '吃'
                    : view.responseLevel === 'pong'
                      ? '碰'
                      : view.responseLevel === 'kong'
                        ? '杠'
                        : '胡'}
                  】
                </div>
              )}
              {view.lastDiscard && view.phase === 'response' && (
                <div className="center-info__last">
                  <Tile tile={view.lastDiscard.tile} size="md" />
                </div>
              )}
              {waitingTiles.length > 0 && (
                <div className="center-info__waiting">
                  听：{waitingTiles.map((t) => tileLabel(t)).join(' ')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ActionPanel
        view={view}
        humanPlayer={humanPlayer}
        onStart={onStart}
        onRespond={onRespond}
        onPass={onPass}
        showStart={showStart}
      />

    </div>
  );
}
