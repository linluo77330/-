import type { PlayerIndex, PlayerView, ResponseOption } from '@/core/types';
import { ACTION_LABELS, PLAYER_NAMES } from '../utils/tileLabels';
import { Tile } from './Tile';
import { ResponseActionButton } from './ResponseActionButton';

interface ResponsePanelProps {
  view: PlayerView;
  humanPlayer: PlayerIndex;
  onRespond: (option: ResponseOption) => void;
  onPass: () => void;
}

export function ResponsePanel({ view, humanPlayer, onRespond, onPass }: ResponsePanelProps) {
  const { phase, lastDiscard, pendingResponses, responseLevel } = view;
  const isActive = phase === 'response' && lastDiscard !== null;

  const myOptions = isActive ? pendingResponses.filter((o) => o.player === humanPlayer) : [];
  const othersActive = isActive ? pendingResponses.length > myOptions.length : false;
  const levelLabel = responseLevel ? ACTION_LABELS[responseLevel] : '';

  return (
    <div className={`response-panel ${isActive ? 'response-panel--active' : ''}`}>
      {isActive && lastDiscard ? (
        <>
          <div className="response-panel__info">
            <span className="response-panel__tag">响应 · {levelLabel}</span>
            <span>{PLAYER_NAMES[lastDiscard.from]} 打出</span>
            <Tile tile={lastDiscard.tile} size="sm" />
            {othersActive && myOptions.length === 0 && (
              <span className="response-panel__wait">等待其他玩家…</span>
            )}
          </div>

          {myOptions.length > 0 ? (
            <div className="response-panel__actions">
              {myOptions.map((opt, i) => (
                <ResponseActionButton
                  key={`${opt.action}-${i}`}
                  option={opt}
                  discardTile={lastDiscard.tile}
                  onClick={() => onRespond(opt)}
                />
              ))}
              <button type="button" className="btn btn--ghost" onClick={onPass}>
                过
              </button>
            </div>
          ) : (
            <div className="response-panel__actions response-panel__actions--idle" aria-hidden="true" />
          )}
        </>
      ) : (
        <div className="response-panel__placeholder" aria-hidden="true" />
      )}
    </div>
  );
}
