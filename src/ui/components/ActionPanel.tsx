import type { PlayerView, ResponseOption } from '@/core/types';
import type { Character } from '../data/characters';
import { CharacterBattleBar } from './CharacterBattleBar';
import { ResponsePanel } from './ResponsePanel';
import type { CharacterSkillInfoTarget } from './CharacterSkillInfoOverlay';

interface ActionPanelProps {
  view: PlayerView;
  humanPlayer: import('@/core/types').PlayerIndex;
  character: Character;
  onStart?: () => void;
  onRespond: (option: ResponseOption) => void;
  onPass: () => void;
  onDrawWall?: () => void;
  onActivateSkill?: (skillId: string) => void;
  showStart?: boolean;
  humanDisplayName?: string;
  onShowCharacterSkillInfo?: (target: CharacterSkillInfoTarget) => void;
}

const PHASE_LABELS: Record<string, string> = {
  idle: '等待开始',
  dealing: '发牌中',
  draw: '摸牌',
  discard: '出牌',
  response: '响应',
  game_over: '对局结束',
};

function getActionHint(view: PlayerView, humanPlayer: import('@/core/types').PlayerIndex): string | null {
  const { phase, currentPlayer, skill, skillActivity } = view;
  const isMyTurn = currentPlayer === humanPlayer;

  if (skillActivity?.player === humanPlayer) {
    return '请在牌桌中央完成技能选择';
  }
  if (skillActivity?.step === 'vote' && skillActivity.canVote) {
    return '请对投票作出选择';
  }
  if (skillActivity && skillActivity.player !== humanPlayer) {
    return '等待其他玩家发动技能…';
  }

  if (phase === 'draw' && isMyTurn) {
    if (skill?.canActivate && skill.activatePhase === 'draw') {
      return '可选择摸牌墙或发动技能';
    }
    return '摸牌中…';
  }

  if (phase === 'discard' && isMyTurn) {
    if (skill?.canActivate) {
      return '可发动技能或点击手牌出牌';
    }
    return '点击手牌出牌';
  }

  return null;
}

export function ActionPanel({
  view,
  humanPlayer,
  character,
  onStart,
  onRespond,
  onPass,
  onDrawWall,
  onActivateSkill,
  showStart = true,
  humanDisplayName = '你',
  onShowCharacterSkillInfo,
}: ActionPanelProps) {
  const { phase, deckCount, winner } = view;
  const isMyTurn = view.currentPlayer === humanPlayer;
  const hint = getActionHint(view, humanPlayer);
  const showStartBtn = showStart && onStart && (phase === 'idle' || phase === 'game_over');

  return (
    <div className="action-panel">
      <ResponsePanel view={view} humanPlayer={humanPlayer} onRespond={onRespond} onPass={onPass} />

      <div className="action-panel__main">
        <div className="action-panel__top-row">
          <span className="action-panel__phase">{PHASE_LABELS[phase] ?? phase}</span>
          <span className="action-panel__deck">牌墙 {deckCount} 张</span>
          {winner !== null && (
            <span className="action-panel__winner">🎉 玩家 {winner} 胡了</span>
          )}
          {hint && <span className="action-panel__hint">{hint}</span>}
          {showStartBtn && (
            <button type="button" className="btn btn--primary action-panel__start" onClick={onStart}>
              {phase === 'game_over' ? '再来一局' : '开始对局'}
            </button>
          )}
        </div>

        <CharacterBattleBar
          character={character}
          skill={view.skill}
          isMyTurn={isMyTurn}
          phase={phase}
          onDrawWall={onDrawWall}
          onActivateSkill={onActivateSkill}
          onShowSkillInfo={
            onShowCharacterSkillInfo
              ? () =>
                  onShowCharacterSkillInfo({
                    characterId: character.id,
                    playerName: humanDisplayName,
                    skillUsesRemaining: view.skill?.usesRemaining,
                  })
              : undefined
          }
        />
      </div>
    </div>
  );
}
