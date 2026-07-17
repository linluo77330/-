import type { PlayerIndex, Tile as TileType, ResponseOption } from '@/core/types';
import { tileLabel, PLAYER_NAMES } from '../utils/tileLabels';
import { ActionPanel } from './ActionPanel';
import { PlayerSeat } from './PlayerSeat';
import { ResponseBanner } from './ResponseBanner';
import { Tile } from './Tile';
import { getTenpaiTiles } from '@/core/winCheck';
import type { useMahjongGame } from '../hooks/useMahjongGame';

const HUMAN: PlayerIndex = 0;

type GameApi = ReturnType<typeof useMahjongGame>;

interface GameTableProps {
  gameApi: GameApi;
}

const SEAT_LAYOUT: { index: PlayerIndex; position: 'bottom' | 'left' | 'top' | 'right' }[] = [
  { index: 0, position: 'bottom' },
  { index: 1, position: 'left' },
  { index: 2, position: 'top' },
  { index: 3, position: 'right' },
];

export function GameTable({ gameApi }: GameTableProps) {
  const { snapshot, start, draw, discard, respondOption, pass, log } = gameApi;

  const humanState = snapshot.players[HUMAN];
  const waitingTiles =
    snapshot.phase === 'discard' && snapshot.currentPlayer === HUMAN
      ? getTenpaiTiles(humanState.hand, humanState.melds)
      : [];

  const handleTileClick = (tile: TileType) => {
    if (snapshot.phase !== 'discard' || snapshot.currentPlayer !== HUMAN) return;
    discard(tile.id);
  };

  return (
    <div className="game-layout">
      <header className="game-header">
        <h1>技能麻将</h1>
        <p className="game-header__sub">基础麻将对局 · 事件驱动引擎</p>
      </header>

      <ResponseBanner
        snapshot={snapshot}
        humanPlayer={HUMAN}
        onRespond={respondOption}
        onPass={() => pass(HUMAN)}
      />

      <div className="game-table">
        <div className="game-table__felt">
          <div className="game-table__center">
            <div className="center-info">
              <div className="center-info__turn">
                当前：{PLAYER_NAMES[snapshot.currentPlayer]}
              </div>
              {snapshot.phase === 'response' && snapshot.responseLevel && (
                <div className="center-info__response">
                  等待【{snapshot.responseLevel === 'chi' ? '吃' : snapshot.responseLevel === 'pong' ? '碰' : snapshot.responseLevel === 'kong' ? '杠' : '胡'}】
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

          {SEAT_LAYOUT.map(({ index, position }) => (
            <PlayerSeat
              key={index}
              playerIndex={index}
              state={snapshot.players[index]}
              isDealer={snapshot.dealer === index}
              isActive={snapshot.currentPlayer === index}
              isHuman={index === HUMAN}
              position={position}
              name={PLAYER_NAMES[index]}
              onTileClick={index === HUMAN ? handleTileClick : undefined}
            />
          ))}
        </div>
      </div>

      <ActionPanel
        snapshot={snapshot}
        humanPlayer={HUMAN}
        onStart={() => start(0)}
        onDraw={draw}
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
