import type { ResponseOption, Tile as TileType } from '@/core/types';
import { MiniTile } from './MiniTile';
import { Tile } from './Tile';
import type { SeatTurnIndicator } from '../utils/turnIndicators';

interface SeatTurnBannerProps {
  indicator: SeatTurnIndicator;
  position: 'bottom' | 'left' | 'top' | 'right';
  onRespond?: (option: ResponseOption) => void;
  onPass?: () => void;
  showResponseActions?: boolean;
  selectedDiscardTile?: TileType | null;
  onConfirmDiscard?: () => void;
  onClearDiscardSelection?: () => void;
}

export function SeatTurnBanner({
  indicator,
  position,
  onRespond,
  onPass,
  showResponseActions = false,
  selectedDiscardTile = null,
  onConfirmDiscard,
  onClearDiscardSelection,
}: SeatTurnBannerProps) {
  const { kind, label, tile, pulse, responseOptions } = indicator;
  const showDiscardConfirm =
    kind === 'action' && selectedDiscardTile !== null && onConfirmDiscard !== undefined;

  return (
    <div
      className={`seat-turn-banner seat-turn-banner--${kind} seat-turn-banner--${position} ${pulse ? 'seat-turn-banner--pulse' : ''}`}
      role="status"
      aria-live="polite"
    >
      <div className="seat-turn-banner__content">
        {tile && (
          <div className="seat-turn-banner__tile-wrap">
            <Tile tile={tile} size="md" />
          </div>
        )}
        <span className="seat-turn-banner__label">{label}</span>
      </div>

      {showDiscardConfirm && (
        <div className="seat-turn-banner__actions seat-turn-banner__actions--discard">
          <div className="seat-turn-banner__tile-wrap">
            <MiniTile tile={selectedDiscardTile} size={28} />
          </div>
          <button
            type="button"
            className="btn btn--primary seat-turn-banner__discard-btn"
            onClick={onConfirmDiscard}
          >
            确认出牌
          </button>
          {onClearDiscardSelection && (
            <button
              type="button"
              className="btn btn--ghost seat-turn-banner__pass-btn"
              onClick={onClearDiscardSelection}
            >
              取消
            </button>
          )}
        </div>
      )}

      {showResponseActions && kind === 'respond' && responseOptions && responseOptions.length > 0 && (
        <div className="seat-turn-banner__actions">
          {responseOptions.map((opt, i) => (
            <button
              key={`${opt.action}-${i}`}
              type="button"
              className={`btn seat-turn-banner__action-btn seat-turn-banner__action-btn--${opt.action}`}
              onClick={() => onRespond?.(opt)}
            >
              {formatResponseLabel(opt, tile)}
            </button>
          ))}
          {onPass && (
            <button type="button" className="btn btn--ghost seat-turn-banner__pass-btn" onClick={onPass}>
              过
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function formatResponseLabel(opt: ResponseOption, discardTile?: TileType): string {
  if (opt.action === 'chi' && opt.chiTiles && discardTile) {
    return `吃`;
  }
  const labels: Record<string, string> = {
    hu: '胡',
    kong: '杠',
    pong: '碰',
    chi: '吃',
  };
  return labels[opt.action] ?? opt.action;
}
