import type { GameSnapshot, PlayerIndex, ResponseOption } from '@/core/types';
import { PHASE_LABELS, PLAYER_NAMES } from '../utils/tileLabels';
import { ResponsePanel } from './ResponsePanel';

interface ActionPanelProps {
  snapshot: GameSnapshot;
  humanPlayer: PlayerIndex;
  onStart: () => void;
  onRespond: (option: ResponseOption) => void;
  onPass: () => void;
}

export function ActionPanel({
  snapshot,
  humanPlayer,
  onStart,
  onRespond,
  onPass,
}: ActionPanelProps) {
  const { phase, currentPlayer, deck, winner } = snapshot;
  const isMyTurn = currentPlayer === humanPlayer;

  return (
    <div className="action-panel">
      <ResponsePanel
        snapshot={snapshot}
        humanPlayer={humanPlayer}
        onRespond={onRespond}
        onPass={onPass}
      />

      <div className="action-panel__main">
        <div className="action-panel__status">
          <span className="action-panel__phase">{PHASE_LABELS[phase] ?? phase}</span>
          <span className="action-panel__deck">牌墙 {deck.length} 张</span>
          {winner !== null && (
            <span className="action-panel__winner">🎉 玩家 {PLAYER_NAMES[winner]} 胡了</span>
          )}
        </div>

        <div className="action-panel__buttons">
          {(phase === 'idle' || phase === 'game_over') && (
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
