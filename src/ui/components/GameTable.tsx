import type { PlayerIndex, Tile as TileType, WildcardConfig } from '@/core/types';
import { wildcardDescription } from '@/core/wildcard';
import { tileLabel, PLAYER_NAMES } from '../utils/tileLabels';
import { ActionPanel } from './ActionPanel';
import { PlayerSeat } from './PlayerSeat';
import { Tile } from './Tile';
import { getTenpaiTiles } from '@/core/winCheck';
import type { Character } from '../data/characters';
import type { useMahjongGame } from '../hooks/useMahjongGame';

const HUMAN: PlayerIndex = 0;

type GameApi = ReturnType<typeof useMahjongGame>;

interface GameTableProps {
  gameApi: GameApi;
  character: Character;
  onChangeCharacter: () => void;
}

export function GameTable({ gameApi, character, onChangeCharacter }: GameTableProps) {
  const { snapshot, start, discard, respondOption, pass, log, drawnTileId } = gameApi;

  const humanState = snapshot.players[HUMAN];
  const waitingTiles =
    snapshot.phase === 'discard' && snapshot.currentPlayer === HUMAN
      ? getTenpaiTiles(humanState.hand, humanState.melds, snapshot.wildcard)
      : [];

  const handleTileClick = (tile: TileType) => {
    if (snapshot.phase !== 'discard' || snapshot.currentPlayer !== HUMAN) return;
    discard(tile.id);
  };

  const seats: { index: PlayerIndex; position: 'bottom' | 'left' | 'top' | 'right' }[] = [
    { index: 0, position: 'bottom' },
    { index: 1, position: 'left' },
    { index: 2, position: 'top' },
    { index: 3, position: 'right' },
  ];

  return (
    <div className="game-layout">
      <header className="game-header">
        <div className="game-header__row">
          <div className="game-header__character" style={{ borderColor: character.accent }}>
            <span className="game-header__character-badge" style={{ background: character.accent }}>
              {character.name.slice(-1)}
            </span>
            <div>
              <strong>{character.name}</strong>
              <span className="game-header__character-tag">{character.tagline}</span>
            </div>
          </div>
          <div className="game-header__title">
            <h1>技能麻将</h1>
            <p className="game-header__sub">基础麻将对局 · 事件驱动引擎</p>
          </div>
          <button type="button" className="btn btn--ghost game-header__back" onClick={onChangeCharacter}>
            换角色
          </button>
        </div>
      </header>

      <div className="game-table">
        <div className="game-table__felt">
          {seats.map(({ index, position }) => (
            <PlayerSeat
              key={index}
              playerIndex={index}
              state={snapshot.players[index]}
              isDealer={snapshot.dealer === index}
              isActive={snapshot.currentPlayer === index}
              isHuman={index === HUMAN}
              position={position}
              name={PLAYER_NAMES[index]}
              wildcard={snapshot.wildcard}
              highlightTileId={index === HUMAN ? drawnTileId : null}
              onTileClick={index === HUMAN ? handleTileClick : undefined}
            />
          ))}

          <div className="game-table__center">
            <div className="center-info">
              {snapshot.wildcard && (
                <div className="center-info__wildcard">
                  <div className="center-info__wildcard-label">万能牌</div>
                  <Tile tile={snapshot.wildcard.indicator} size="sm" />
                  <div className="center-info__wildcard-desc">
                    {wildcardDescription(snapshot.wildcard, (t) => tileLabel(t as TileType))}
                  </div>
                </div>
              )}
              <div className="center-info__turn">当前：{PLAYER_NAMES[snapshot.currentPlayer]}</div>
              {snapshot.phase === 'response' && snapshot.responseLevel && (
                <div className="center-info__response">
                  等待【
                  {snapshot.responseLevel === 'chi'
                    ? '吃'
                    : snapshot.responseLevel === 'pong'
                      ? '碰'
                      : snapshot.responseLevel === 'kong'
                        ? '杠'
                        : '胡'}
                  】
                </div>
              )}
              {snapshot.lastDiscard && snapshot.phase === 'response' && (
                <div className="center-info__last">
                  <Tile tile={snapshot.lastDiscard.tile} size="md" />
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
        snapshot={snapshot}
        humanPlayer={HUMAN}
        onStart={() => start(0)}
        onRespond={respondOption}
        onPass={() => pass(HUMAN)}
      />

      <aside className="game-log">
        <h3>对局日志</h3>
        <ul>
          {log.length === 0 && <li className="game-log__empty">等待开始...</li>}
          {log.map((entry, i) => (
            <li key={`${entry}-${i}`}>{entry}</li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
