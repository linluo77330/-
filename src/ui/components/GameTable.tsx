import { buildPlayerView } from '@/core/playerView';
import type { PlayerIndex, Tile as TileType } from '@/core/types';
import { getWinHandGroups } from '@/core/winDecompose';
import { wildcardDescription } from '@/core/wildcard';
import { useMemo, useState, useEffect, useRef } from 'react';
import { getSkillUsesRemaining, type Character } from '../data/characters';
import { getSeatTurnIndicator, createDiscardSegment } from '../utils/turnIndicators';
import type { OnlineGameApi } from '../hooks/useOnlineGame';
import type { useMahjongGame } from '../hooks/useMahjongGame';
import { useGameLog } from '../hooks/useGameLog';
import { getVisibleHand } from '../utils/handView';
import { tileLabel, PLAYER_NAMES } from '../utils/tileLabels';
import type { GameLogEntry } from '@/core/gameLog';
import { ActionPanel } from './ActionPanel';
import { GameLogPanel } from './GameLogPanel';
import { LandscapeHint } from './LandscapeHint';
import { PlayerSeat } from './PlayerSeat';
import { SkillActivityOverlay } from './SkillActivityOverlay';
import {
  CharacterSkillInfoOverlay,
  type CharacterSkillInfoTarget,
} from './CharacterSkillInfoOverlay';
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

function OnlineGameLoading({ message = '正在同步联机对局…' }: { message?: string }) {
  return (
    <div className="game-layout game-layout--loading">
      <div className="game-layout__loading-panel">
        <p>{message}</p>
        <p className="game-layout__loading-sub">若长时间无响应，请返回房间重新连接</p>
      </div>
    </div>
  );
}

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
  const {
    snapshot,
    start,
    discard,
    declareConcealedKong,
    respondOption,
    pass,
    drawnTileId,
    game,
    drawWall,
    activateSkill,
    skillPick,
    skillVote,
  } = gameApi;
  const humanPlayer: PlayerIndex = 0;
  const view = buildPlayerView(snapshot, humanPlayer);
  const seatNames = [...PLAYER_NAMES];
  const gameLog = useGameLog(game, view.phase !== 'idle');

  return (
    <GameTableLayout
      view={view}
      humanPlayer={humanPlayer}
      seatNames={seatNames}
      drawnTileId={drawnTileId}
      gameLog={gameLog}
      onDiscard={discard}
      onRespond={respondOption}
      onPass={() => pass(humanPlayer)}
      onStart={() =>
        start(0, [character.id, '', '', ''] as [string, string, string, string])
      }
      character={character}
      onDrawWall={drawWall}
      onActivateSkill={activateSkill}
      onSkillPick={skillPick}
      onSkillVote={skillVote}
      onConcealedKong={declareConcealedKong}
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
    gameLog,
    error,
    discard,
    declareConcealedKong,
    respondOption,
    pass,
    drawWall,
    activateSkill,
    skillPick,
    skillVote,
  } = online;

  if (!view) {
    return <OnlineGameLoading />;
  }

  const humanPlayer = playerIndex ?? view.viewer;

  const seatNames =
    roomState?.seats.map((s) => s.name || PLAYER_NAMES[s.playerIndex]) ?? [...PLAYER_NAMES];

  return (
    <GameTableLayout
      view={view}
      humanPlayer={humanPlayer}
      seatNames={seatNames}
      drawnTileId={drawnTileId}
      gameLog={gameLog}
      onDiscard={discard}
      onRespond={respondOption}
      onPass={pass}
      character={character}
      onDrawWall={drawWall}
      onActivateSkill={activateSkill}
      onSkillPick={skillPick}
      onSkillVote={skillVote}
      onConcealedKong={declareConcealedKong}
      showStart={false}
      headerOnline={{
        name: seatNames[humanPlayer] ?? '你',
        roomId: roomState?.roomId ?? '',
      }}
      headerCharacter={{
        ...character,
        tagline: `房间 ${roomState?.roomId ?? ''} · ${seatNames[humanPlayer] ?? '你'}`,
      }}
      abortBanner={
        gameAbortWarning
          ? {
              playerName: gameAbortWarning.playerName,
              secondsLeft: gameAbortWarning.secondsLeft,
            }
          : null
      }
      errorBanner={error}
      onExit={onExit}
      exitLabel="返回房间"
    />
  );
}

interface GameTableLayoutProps {
  view: import('@/core/types').PlayerView;
  humanPlayer: PlayerIndex;
  seatNames: string[];
  drawnTileId: string | null;
  gameLog: GameLogEntry[];
  onDiscard: (tileId: string) => void;
  onRespond: GameApi['respondOption'];
  onPass: () => void;
  onStart?: () => void;
  showStart: boolean;
  headerCharacter?: Character;
  headerOnline?: { name: string; roomId: string };
  abortBanner?: { playerName: string; secondsLeft: number } | null;
  errorBanner?: string | null;
  onExit: () => void;
  exitLabel: string;
  character: Character;
  onDrawWall?: () => void;
  onActivateSkill?: (skillId: string) => void;
  onSkillPick?: (params: { tileId?: string; splitRanks?: [number, number]; confirm?: boolean }) => void;
  onSkillVote?: (params: { agree: boolean }) => void;
  onConcealedKong?: (tile: Pick<TileType, 'suit' | 'rank'>) => void;
}

function GameTableLayout({
  view,
  humanPlayer,
  seatNames,
  drawnTileId,
  gameLog,
  onDiscard,
  onRespond,
  onPass,
  onStart,
  showStart,
  headerCharacter,
  headerOnline,
  abortBanner,
  errorBanner,
  onExit,
  exitLabel,
  character,
  onDrawWall,
  onActivateSkill,
  onSkillPick,
  onSkillVote,
  onConcealedKong,
}: GameTableLayoutProps) {
  const [skillInfoTarget, setSkillInfoTarget] = useState<CharacterSkillInfoTarget | null>(null);
  const [selectedDiscardTileId, setSelectedDiscardTileId] = useState<string | null>(null);
  const [discardSegment, setDiscardSegment] = useState<import('../utils/turnIndicators').DiscardDisplaySegment | null>(null);
  const humanDiscardCountRef = useRef(0);

  const canSelectDiscard =
    view.phase === 'discard' &&
    view.currentPlayer === humanPlayer &&
    view.skillActivity?.player !== humanPlayer;

  useEffect(() => {
    if (view.skillActivity) {
      setSkillInfoTarget(null);
    }
  }, [view.skillActivity]);

  useEffect(() => {
    setSelectedDiscardTileId(null);
  }, [view.phase, view.currentPlayer, view.turnNumber, view.skillActivity?.skillId, view.skillActivity?.step]);

  useEffect(() => {
    if (view.phase === 'idle' || view.phase === 'dealing') {
      setDiscardSegment(null);
      humanDiscardCountRef.current = view.players[humanPlayer].discards.length;
    }
  }, [view.phase, humanPlayer, view.players]);

  useEffect(() => {
    const humanDiscards = view.players[humanPlayer].discards;
    const newCount = humanDiscards.length;

    if (newCount > humanDiscardCountRef.current && view.lastDiscard?.from === humanPlayer) {
      const next = createDiscardSegment(view, humanPlayer);
      if (next) setDiscardSegment(next);
    }

    humanDiscardCountRef.current = newCount;
  }, [
    view.players[0].discards.length,
    view.players[1].discards.length,
    view.players[2].discards.length,
    view.players[3].discards.length,
    view.lastDiscard?.from,
    view.lastDiscard?.tile.id,
    humanPlayer,
    view,
  ]);

  const handleTileSelect = (tile: TileType) => {
    if (!canSelectDiscard) return;
    setSelectedDiscardTileId((prev) => (prev === tile.id ? null : tile.id));
  };

  const handleConfirmDiscard = () => {
    if (!selectedDiscardTileId || !canSelectDiscard) return;
    onDiscard(selectedDiscardTileId);
    setSelectedDiscardTileId(null);
  };

  const humanHand = getVisibleHand(view.players[humanPlayer]) ?? [];
  const selectedDiscardTile =
    selectedDiscardTileId !== null
      ? humanHand.find((tile) => tile.id === selectedDiscardTileId) ?? null
      : null;

  const showCharacterSkillInfo = (target: CharacterSkillInfoTarget) => {
    if (view.skillActivity) return;
    setSkillInfoTarget(target);
  };

  const seats = ([0, 1, 2, 3] as PlayerIndex[]).map((index) => ({
    index,
    position: SEAT_POSITIONS[relativeSeat(humanPlayer, index)],
  }));

  const winnerWinHandDisplay = useMemo(() => {
    if (view.phase !== 'game_over' || view.winner === null || !view.winInfo) return null;
    const winnerState = view.players[view.winner];
    const hand = getVisibleHand(winnerState);
    if (!hand) return null;
    return getWinHandGroups(hand, winnerState.melds, view.winInfo.tile, view.wildcard);
  }, [view]);

  const getSeatWinHandDisplay = (index: PlayerIndex) => {
    if (view.phase === 'game_over' && view.winner === index && winnerWinHandDisplay) {
      return winnerWinHandDisplay;
    }
    return null;
  };

  const centerTurnLabel =
    view.phase === 'game_over' && view.winner !== null
      ? view.gameOverReason === 'skill_vote'
        ? `投票通过：${seatNames[view.winner] ?? PLAYER_NAMES[view.winner]} 获胜`
        : view.gameOverReason === 'skill_steal'
          ? `黑手窃取：${seatNames[view.winner] ?? PLAYER_NAMES[view.winner]} 获胜`
          : view.winInfo
            ? `胡牌：${seatNames[view.winner] ?? PLAYER_NAMES[view.winner]}`
            : `获胜：${seatNames[view.winner] ?? PLAYER_NAMES[view.winner]}`
      : view.phase === 'response' && view.lastDiscard
        ? `${seatNames[view.lastDiscard.from] ?? PLAYER_NAMES[view.lastDiscard.from]} 出牌 · 响应阶段`
        : view.phase === 'draw' || view.phase === 'discard'
          ? `轮到 ${seatNames[view.currentPlayer] ?? PLAYER_NAMES[view.currentPlayer]}`
          : `当前：${seatNames[view.currentPlayer] ?? PLAYER_NAMES[view.currentPlayer]}`;

  return (
    <div className="game-layout">
      <LandscapeHint />
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
          <div className="game-abort-banner__title">有玩家退出对局</div>
          <p className="game-abort-banner__text">
            <strong>{abortBanner.playerName}</strong> 已离开对局，
            {abortBanner.secondsLeft > 0
              ? `${abortBanner.secondsLeft} 秒后自动结束并返回大厅`
              : '正在返回大厅…'}
          </p>
        </div>
      )}

      {errorBanner && (
        <div className="game-error-banner" role="alert">
          {errorBanner}
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
              isActive={view.phase !== 'game_over' && view.currentPlayer === index}
              isWinner={view.phase === 'game_over' && view.winner === index}
              isHuman={index === humanPlayer}
              position={position}
              name={seatNames[index] ?? PLAYER_NAMES[index]}
              characterId={view.playerCharacters[index]}
              hasBlackHand={view.blackHandTarget === index}
              turnIndicator={getSeatTurnIndicator(view, index, seatNames, discardSegment, humanPlayer)}
              onRespond={index === humanPlayer ? onRespond : undefined}
              onPass={index === humanPlayer ? onPass : undefined}
              showResponseActions={index === humanPlayer && view.phase === 'response'}
              onCharacterAvatarClick={
                view.playerCharacters[index]
                  ? () =>
                      showCharacterSkillInfo({
                        characterId: view.playerCharacters[index],
                        playerName: seatNames[index] ?? PLAYER_NAMES[index],
                        skillUsesRemaining: getSkillUsesRemaining(
                          view.playerCharacters[index],
                          view.skillUses[index],
                        ),
                      })
                  : undefined
              }
              wildcard={view.wildcard}
              highlightTileId={
                index === humanPlayer
                  ? drawnTileId
                  : view.phase === 'game_over' &&
                      view.winner === index &&
                      view.winInfo?.isSelfDraw
                    ? view.winInfo.tile.id
                    : null
              }
              winHandDisplay={getSeatWinHandDisplay(index)}
              onTileClick={index === humanPlayer ? handleTileSelect : undefined}
              selectedDiscardTileId={
                index === humanPlayer && canSelectDiscard ? selectedDiscardTileId : null
              }
              selectedDiscardTile={
                index === humanPlayer && canSelectDiscard ? selectedDiscardTile : null
              }
              onConfirmDiscard={
                index === humanPlayer && canSelectDiscard ? handleConfirmDiscard : undefined
              }
              onClearDiscardSelection={
                index === humanPlayer && canSelectDiscard
                  ? () => setSelectedDiscardTileId(null)
                  : undefined
              }
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
              <div className={`center-info__turn ${view.phase === 'response' ? 'center-info__turn--response' : ''}`}>
                {centerTurnLabel}
              </div>
              {view.phase === 'response' && view.lastDiscard && (
                <div className="center-info__last">
                  <Tile tile={view.lastDiscard.tile} size="md" />
                </div>
              )}
            </div>
          </div>

          {view.skillModeActive && view.skillActivity && (
            <SkillActivityOverlay
              activity={view.skillActivity}
              viewer={humanPlayer}
              seatNames={seatNames}
              onSkillPick={onSkillPick}
              onSkillVote={onSkillVote}
            />
          )}

          {skillInfoTarget && !view.skillActivity && (
            <CharacterSkillInfoOverlay
              target={skillInfoTarget}
              onClose={() => setSkillInfoTarget(null)}
            />
          )}
        </div>
      </div>

      <ActionPanel
        view={view}
        humanPlayer={humanPlayer}
        character={character}
        onStart={onStart}
        onRespond={onRespond}
        onPass={onPass}
        onDrawWall={onDrawWall}
        onActivateSkill={onActivateSkill}
        onConcealedKong={onConcealedKong}
        showStart={showStart}
        humanDisplayName={seatNames[humanPlayer] ?? PLAYER_NAMES[humanPlayer]}
        onShowCharacterSkillInfo={(target) => showCharacterSkillInfo(target)}
      />

      <GameLogPanel entries={gameLog} seatNames={seatNames} />
    </div>
  );
}
