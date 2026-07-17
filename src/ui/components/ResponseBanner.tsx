import type { GameSnapshot, PlayerIndex, ResponseOption, Tile } from '@/core/types';
import { ACTION_LABELS, PLAYER_NAMES, tileLabel } from '../utils/tileLabels';
import { Tile as TileView } from './Tile';

interface ResponseBannerProps {
  snapshot: GameSnapshot;
  humanPlayer: PlayerIndex;
  onRespond: (option: ResponseOption) => void;
  onPass: () => void;
}

export function ResponseBanner({ snapshot, humanPlayer, onRespond, onPass }: ResponseBannerProps) {
  const { phase, lastDiscard, pendingResponses, responseLevel } = snapshot;
  if (phase !== 'response' || !lastDiscard) return null;

  const myOptions = pendingResponses.filter((o) => o.player === humanPlayer);
  const othersActive = pendingResponses.filter((o) => o.player !== humanPlayer);
  const levelLabel = responseLevel ? ACTION_LABELS[responseLevel] : '';

  return (
    <div className="response-banner">
      <div className="response-banner__info">
        <span className="response-banner__tag">响应阶段 · {levelLabel}</span>
        <span>{PLAYER_NAMES[lastDiscard.from]} 打出</span>
        <TileView tile={lastDiscard.tile} size="md" />
        {othersActive.length > 0 && myOptions.length === 0 && (
          <span className="response-banner__wait">等待其他玩家…</span>
        )}
      </div>

      {myOptions.length > 0 && (
        <div className="response-banner__actions">
          {myOptions.map((opt, i) => (
            <button
              key={`${opt.action}-${i}`}
              type="button"
              className={`btn btn--respond btn--${opt.action}`}
              onClick={() => onRespond(opt)}
            >
              {formatOptionLabel(opt, lastDiscard.tile)}
            </button>
          ))}
          <button type="button" className="btn btn--ghost" onClick={onPass}>
            过
          </button>
        </div>
      )}
    </div>
  );
}

function formatOptionLabel(opt: ResponseOption, discardTile: Tile): string {
  if (opt.action !== 'chi' || !opt.chiTiles) return ACTION_LABELS[opt.action];
  const sorted = [...opt.chiTiles, discardTile].sort((a, b) => a.rank - b.rank);
  return `吃 ${sorted.map(tileLabel).join('')}`;
}
