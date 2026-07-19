import type { ResponseOption, Tile as TileType } from '@/core/types';
import { MiniTile } from './MiniTile';
import { Tile, type TileSize } from './Tile';
import type { SeatTurnIndicator } from '../utils/turnIndicators';
import type { SeatTurnChoice } from '../utils/seatTurnChoices';

interface SeatTurnBannerProps {
  indicator: SeatTurnIndicator | null;
  position: 'bottom' | 'left' | 'top' | 'right';
  tileSize?: TileSize;
  onRespond?: (option: ResponseOption) => void;
  onPass?: () => void;
  showResponseActions?: boolean;
  selectedDiscardTile?: TileType | null;
  onConfirmDiscard?: () => void;
  onClearDiscardSelection?: () => void;
  skillActivatable?: boolean;
  skillName?: string;
  onActivateSkill?: () => void;
  turnChoices?: SeatTurnChoice[];
}

export function SeatTurnBanner({
  indicator,
  position,
  tileSize = 'sm',
  onRespond,
  onPass,
  showResponseActions = false,
  selectedDiscardTile = null,
  onConfirmDiscard,
  onClearDiscardSelection,
  skillActivatable = false,
  skillName = '',
  onActivateSkill,
  turnChoices,
}: SeatTurnBannerProps) {
  if (!indicator) {
    return (
      <div
        className={`seat-turn-banner seat-turn-banner--empty seat-turn-banner--${position}`}
        aria-hidden="true"
      >
        <div className="seat-turn-banner__inner" />
      </div>
    );
  }

  const { kind, label, tile, pulse, responseOptions } = indicator;
  const showDiscardConfirm =
    kind === 'action' && selectedDiscardTile !== null && onConfirmDiscard !== undefined;
  const showTurnChoices = !showDiscardConfirm && turnChoices && turnChoices.length > 0;
  const skillReady =
    !showTurnChoices &&
    skillActivatable &&
    kind === 'action' &&
    !showDiscardConfirm &&
    !!onActivateSkill;

  if (showTurnChoices) {
    const splitLayout = turnChoices.length >= 2;

    return (
      <div
        className={`seat-turn-banner seat-turn-banner--${kind} seat-turn-banner--${position} seat-turn-banner--choices ${splitLayout ? 'seat-turn-banner--choices-split' : 'seat-turn-banner--choices-single'} ${pulse ? 'seat-turn-banner--pulse' : ''}`}
        role="group"
        aria-label={label}
      >
        <div className="seat-turn-banner__choices">
          {turnChoices.map((choice) => (
            <button
              key={choice.id}
              type="button"
              className={`seat-turn-banner__choice seat-turn-banner__choice--${choice.tone ?? 'default'}`}
              onClick={choice.onSelect}
              aria-label={choice.hint ? `${choice.label}，${choice.hint}` : choice.label}
            >
              <span className="seat-turn-banner__choice-label">{choice.label}</span>
              {choice.hint && (
                <span className="seat-turn-banner__choice-hint">{choice.hint}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const content = showDiscardConfirm ? (
    <div className="seat-turn-banner__inner seat-turn-banner__inner--discard-confirm">
      <div className="seat-turn-banner__actions seat-turn-banner__actions--discard">
        <MiniTile tile={selectedDiscardTile} size={24} />
        <button
          type="button"
          className="btn btn--primary seat-turn-banner__discard-btn"
          onClick={onConfirmDiscard}
        >
          确认
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
    </div>
  ) : (
    <div className="seat-turn-banner__inner">
      <div className="seat-turn-banner__main">
        {tile && (
          <div className="seat-turn-banner__tile-slot">
            <div className="seat-turn-banner__tile-wrap">
              <Tile tile={tile} size={tileSize} />
            </div>
          </div>
        )}
        <div className="seat-turn-banner__text">
          <span className="seat-turn-banner__label">{label}</span>
          {skillReady && skillName && (
            <span className="seat-turn-banner__skill-hint">点击发动「{skillName}」</span>
          )}
        </div>
      </div>

      <div className="seat-turn-banner__actions-slot">
        {showResponseActions && kind === 'respond' && responseOptions && responseOptions.length > 0 && (
          <div className="seat-turn-banner__actions">
            {responseOptions.map((opt, i) => (
              <button
                key={`${opt.action}-${i}`}
                type="button"
                className={`btn seat-turn-banner__action-btn seat-turn-banner__action-btn--${opt.action}`}
                onClick={() => onRespond?.(opt)}
              >
                {formatResponseLabel(opt)}
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
    </div>
  );

  if (skillReady) {
    return (
      <button
        type="button"
        className={`seat-turn-banner seat-turn-banner--${kind} seat-turn-banner--${position} seat-turn-banner--skill-ready ${pulse ? 'seat-turn-banner--pulse' : ''}`}
        onClick={onActivateSkill}
        aria-label={`${label}，点击发动${skillName}`}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={`seat-turn-banner seat-turn-banner--${kind} seat-turn-banner--${position} ${showDiscardConfirm ? 'seat-turn-banner--confirming-discard' : ''} ${pulse ? 'seat-turn-banner--pulse' : ''}`}
      role="status"
      aria-live="polite"
    >
      {content}
    </div>
  );
}

function formatResponseLabel(opt: ResponseOption): string {
  const labels: Record<string, string> = {
    hu: '胡',
    kong: '杠',
    pong: '碰',
    chi: '吃',
  };
  return labels[opt.action] ?? opt.action;
}
