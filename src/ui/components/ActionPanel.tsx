import type { PlayerIndex, PlayerView, ResponseOption } from '@/core/types';
import { ResponsePanel } from './ResponsePanel';

interface ActionPanelProps {
  view: PlayerView;
  humanPlayer: PlayerIndex;
  onStart?: () => void;
  onRespond: (option: ResponseOption) => void;
  onPass: () => void;
  showStart?: boolean;
}

const PHASE_LABELS: Record<string, string> = {
  idle: '等待开始',
  dealing: '发牌中',
  draw: '摸牌',
  discard: '出牌',
  response: '响应',
  game_over: '对局结束',
};

export function ActionPanel({
  view,
  humanPlayer,
  onStart,
  onRespond,
  onPass,
  showStart = true,
}: ActionPanelProps) {
  const { phase, currentPlayer, deckCount, winner } = view;
  const isMyTurn = currentPlayer === humanPlayer;

  return (
    <div className="action-panel">
      <ResponsePanel view={view} humanPlayer={humanPlayer} onRespond={onRespond} onPass={onPass} />

      <div className="action-panel__main">
        <div className="action-panel__status">
          <span className="action-panel__phase">{PHASE_LABELS[phase] ?? phase}</span>
          <span className="action-panel__deck">牌墙 {deckCount} 张</span>
          {winner !== null && (
            <span className="action-panel__winner">🎉 玩家 {winner} 胡了</span>
          )}
        </div>

        <div className="action-panel__buttons">
          {showStart && onStart && (phase === 'idle' || phase === 'game_over') && (
            <button type="button" className="btn btn--primary" onClick={onStart}>
              {phase === 'game_over' ? '再来一局' : '开始对局'}
            </button>
          )}

          {phase === 'draw' && isMyTurn && (
            <span className="action-panel__hint">摸牌中…</span>
          )}

          {phase === 'discard' && isMyTurn && (
            <span className="action-panel__hint">点击手牌出牌</span>
          )}
        </div>
      </div>
    </div>
  );
}
