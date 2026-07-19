import { useEffect, useRef } from 'react';
import { LET_ME_DRAW_SKILL_ID } from '@/core/skills/letMeDraw';
import { SPLIT_TILE_SKILL_ID } from '@/core/skills/splitTile';
import { CANT_READ_SKILL_ID } from '@/core/skills/cantRead';
import { INSTANT_WIN_VOTE_SKILL_ID } from '@/core/skills/instantWinVote';
import { STEAL_VICTORY_SKILL_ID } from '@/core/skills/stealVictory';
import { VEGETABLE_JUICE_CAISHEN_SKILL_ID } from '@/core/skills/vegetableJuiceCaishen';
import { BORROW_TILE_SKILL_ID } from '@/core/skills/borrowTile';
import { WEN_QU_DESCENDS_SKILL_ID } from '@/core/skills/wenQuDescends';
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
  skill: '发动',
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

  if (entry.kind === 'skill') {
    if (entry.skillId === STEAL_VICTORY_SKILL_ID && entry.blackHandPublic) {
      return (
        <div className="game-log__entry game-log__entry--skill">
          <span className="game-log__actor">{actor}</span>
          <span className="game-log__verb">使用了</span>
          <span className="game-log__skill-name">黑手</span>
        </div>
      );
    }

    if (entry.skillId === LET_ME_DRAW_SKILL_ID) {
      return (
        <div className="game-log__entry game-log__entry--skill">
          <span className="game-log__actor">{actor}</span>
          <span className="game-log__verb">发动</span>
          <span className="game-log__skill-name">{entry.skillName ?? '技能'}</span>
          <span className="game-log__verb">，从河牌获得了</span>
          <LogTiles tiles={[tile]} />
        </div>
      );
    }

    if (entry.skillId === INSTANT_WIN_VOTE_SKILL_ID) {
      if (entry.votePassed) {
        return (
          <div className="game-log__entry game-log__entry--skill">
            <span className="game-log__actor">{actor}</span>
            <span className="game-log__verb">发动</span>
            <span className="game-log__skill-name">{entry.skillName ?? '技能'}</span>
            <span className="game-log__verb">，投票通过，自动获胜</span>
          </div>
        );
      }
      if (entry.rejectedBy !== undefined) {
        const rejecter = playerName(seatNames, entry.rejectedBy);
        return (
          <div className="game-log__entry game-log__entry--skill">
            <span className="game-log__actor">{actor}</span>
            <span className="game-log__verb">发动</span>
            <span className="game-log__skill-name">{entry.skillName ?? '技能'}</span>
            <span className="game-log__verb">，</span>
            <span className="game-log__actor">{rejecter}</span>
            <span className="game-log__verb">拒绝，投票失败</span>
          </div>
        );
      }
    }

    if (entry.skillId === CANT_READ_SKILL_ID && entry.skillTiles && entry.skillTiles.length > 0) {
      const discarded = entry.skillTiles.map((t, i) => logTileToTile(t, `${entry.id}-d${i}`));
      const drawn = (entry.drawnTiles ?? []).map((t, i) => logTileToTile(t, `${entry.id}-w${i}`));
      return (
        <div className="game-log__entry game-log__entry--skill">
          <span className="game-log__actor">{actor}</span>
          <span className="game-log__verb">发动</span>
          <span className="game-log__skill-name">{entry.skillName ?? '技能'}</span>
          <span className="game-log__verb">，丢弃</span>
          <LogTiles tiles={discarded} />
          {drawn.length > 0 ? (
            <>
              <span className="game-log__verb">，摸了</span>
              <LogTiles tiles={drawn} />
            </>
          ) : (
            <span className="game-log__verb">，未补摸</span>
          )}
          <span className="game-log__verb">，跳过出牌</span>
        </div>
      );
    }

    if (entry.skillId === SPLIT_TILE_SKILL_ID && entry.sourceTile && entry.secondaryTile) {
      const source = logTileToTile(entry.sourceTile, `${entry.id}-src`);
      const discarded = logTileToTile(entry.secondaryTile, `${entry.id}-discard`);
      return (
        <div className="game-log__entry game-log__entry--skill">
          <span className="game-log__actor">{actor}</span>
          <span className="game-log__verb">发动</span>
          <span className="game-log__skill-name">{entry.skillName ?? '技能'}</span>
          <span className="game-log__verb">，将</span>
          <LogTiles tiles={[source]} />
          <span className="game-log__verb">掰开，获得了</span>
          <LogTiles tiles={[tile]} />
          <span className="game-log__verb">，丢弃</span>
          <LogTiles tiles={[discarded]} />
        </div>
      );
    }

    if (entry.skillId === VEGETABLE_JUICE_CAISHEN_SKILL_ID && entry.sourceTile) {
      const sacrificed = logTileToTile(entry.sourceTile, `${entry.id}-src`);
      return (
        <div className="game-log__entry game-log__entry--skill">
          <span className="game-log__actor">{actor}</span>
          <span className="game-log__verb">发动</span>
          <span className="game-log__skill-name">{entry.skillName ?? '技能'}</span>
          <span className="game-log__verb">，将万能牌替换为</span>
          <LogTiles tiles={[sacrificed]} />
          <span className="game-log__verb">，获得</span>
          <LogTiles tiles={[tile]} />
        </div>
      );
    }

    if (entry.skillId === BORROW_TILE_SKILL_ID && entry.sourceTile && entry.targetPlayer !== undefined) {
      const offered = logTileToTile(entry.sourceTile, `${entry.id}-src`);
      const target = playerName(seatNames, entry.targetPlayer);
      return (
        <div className="game-log__entry game-log__entry--skill">
          <span className="game-log__actor">{actor}</span>
          <span className="game-log__verb">发动</span>
          <span className="game-log__skill-name">{entry.skillName ?? '技能'}</span>
          <span className="game-log__verb">，用</span>
          <LogTiles tiles={[offered]} />
          <span className="game-log__verb">与</span>
          <span className="game-log__actor">{target}</span>
          <span className="game-log__verb">随机互换一张手牌</span>
        </div>
      );
    }

    if (entry.skillId === WEN_QU_DESCENDS_SKILL_ID && entry.sourceTile) {
      const source = logTileToTile(entry.sourceTile, `${entry.id}-src`);
      return (
        <div className="game-log__entry game-log__entry--skill">
          <span className="game-log__actor">{actor}</span>
          <span className="game-log__verb">发动</span>
          <span className="game-log__skill-name">{entry.skillName ?? '技能'}</span>
          <span className="game-log__verb">，将</span>
          <LogTiles tiles={[source]} />
          <span className="game-log__verb">改写为</span>
          <LogTiles tiles={[tile]} />
        </div>
      );
    }

    return (
      <div className="game-log__entry game-log__entry--skill">
        <span className="game-log__actor">{actor}</span>
        <span className="game-log__verb">发动</span>
        <span className="game-log__skill-name">{entry.skillName ?? '技能'}</span>
        <span className="game-log__verb">，获得了</span>
        <LogTiles tiles={[tile]} />
      </div>
    );
  }

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
          <p className="game-log__empty">出牌、吃碰杠与技能会显示在这里</p>
        ) : (
          entries.map((entry) => (
            <GameLogEntryRow key={entry.id} entry={entry} seatNames={seatNames} />
          ))
        )}
      </div>
    </section>
  );
}
