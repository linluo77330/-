import { useEffect, useRef } from 'react';
import type { GameLogEntry } from '@/core/gameLog';
import { logTileToTile } from '@/core/gameLog';
import type { PlayerIndex, Tile as TileType } from '@/core/types';
import { Tile } from './Tile';

const KIND_LABELS: Record<GameLogEntry['kind'], string> = {
  discard: '打出',
  chi: '吃',
  pong: '碰',
  kong: '杠',
  hu: '胡',
};

interface GameLogPanelProps {
  entries: GameLogEntry[];
  seatNames: string[];
}

function playerName(seatNames: string[], player: PlayerIndex): string {
  return seatNames[player] ?? `玩家 ${player}`;
}

function LogTiles({ tiles }: { tiles: TileType[] }) {
  return (
    <span className="game-log__tiles">
      {tiles.map((tile, index) => (
        <Tile key={`${tile.suit}-${tile.rank}-${index}`} tile={tile} size="xs" />
      ))}
    </span>
  );
}

function GameLogEntryRow({
  entry,
  seatNames,
}: {
  entry: GameLogEntry;
  seatNames: string[];
}) {
  const actor = playerName(seatNames, entry.player);
  const tile = logTileToTile(entry.tile, entry.id);

  if (entry.kind === 'discard') {
    return (
      <div className="game-log__entry game-log__entry--discard">
        <span className="game-log__actor">{actor}</span>
        <span className="game-log__verb">{KIND_LABELS.discard}</span>
        <LogTiles tiles={[tile]} />
      </div>
    );
  }

  if (entry.kind === 'hu') {
    if (entry.isSelfDraw) {
      return (
        <div className="game-log__entry game-log__entry--hu">
          <span className="game-log__actor">{actor}</span>
          <span className="game-log__verb">自摸</span>
          <LogTiles tiles={[tile]} />
        </div>
      );
    }

    const from =
      entry.fromPlayer !== undefined ? playerName(seatNames, entry.fromPlayer) : '他人';
    return (
      <div className="game-log__entry game-log__entry--hu">
        <span className="game-log__actor">{actor}</span>
        <span className="game-log__verb">{KIND_LABELS.hu}</span>
        <span className="game-log__from">{from}</span>
        <span className="game-log__verb">的</span>
        <LogTiles tiles={[tile]} />
      </div>
    );
  }

  const from =
    entry.fromPlayer !== undefined ? playerName(seatNames, entry.fromPlayer) : '他人';
  const meldTiles = (entry.meldTiles ?? [entry.tile]).map((t, i) =>
    logTileToTile(t, `${entry.id}-m${i}`),
  );

  return (
    <div className={`game-log__entry game-log__entry--${entry.kind}`}>
      <span className="game-log__actor">{actor}</span>
      <span className="game-log__verb">{KIND_LABELS[entry.kind]}</span>
      <span className="game-log__from">{from}</span>
      <span className="game-log__verb">的</span>
      <LogTiles tiles={[tile]} />
      {entry.meldTiles && entry.meldTiles.length > 0 && (
        <>
          <span className="game-log__verb">（</span>
          <LogTiles tiles={meldTiles} />
          <span className="game-log__verb">）</span>
        </>
      )}
    </div>
  );
}

export function GameLogPanel({ entries, seatNames }: GameLogPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [entries.length]);

  return (
    <section className="game-log" aria-label="对局记录">
      <div className="game-log__header">对局记录</div>
      <div className="game-log__scroll" ref={scrollRef}>
        {entries.length === 0 ? (
          <p className="game-log__empty">出牌与吃碰杠会显示在这里</p>
        ) : (
          entries.map((entry) => (
            <GameLogEntryRow key={entry.id} entry={entry} seatNames={seatNames} />
          ))
        )}
      </div>
    </section>
  );
}
