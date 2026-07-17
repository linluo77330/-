import type { GameSnapshot, PlayerIndex } from '@/core/types';
import { PHASE_LABELS, PLAYER_NAMES } from '../utils/tileLabels';

interface ActionPanelProps {
  snapshot: GameSnapshot;
  humanPlayer: PlayerIndex;
  onStart: () => void;
  onDraw: () => void;
}

export function ActionPanel({ snapshot, humanPlayer, onStart, onDraw }: ActionPanelProps) {
  const { phase, currentPlayer, deck, winner } = snapshot;
  const isMyTurn = currentPlayer === humanPlayer;
  const canDraw = phase === 'draw' && isMyTurn;

  return (
    <div className="action-panel">
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

        {canDraw && (
          <button type="button" className="btn btn--primary" onClick={onDraw}>
            摸牌
          </button>
        )}

        {phase === 'discard' && isMyTurn && (
          <span className="action-panel__hint">点击手牌出牌</span>
        )}

        {phase === 'response' && (
          <span className="action-panel__hint">请在上方响应栏选择 吃 / 碰 / 杠 / 胡 / 过</span>
        )}
      </div>
    </div>
  );
}
