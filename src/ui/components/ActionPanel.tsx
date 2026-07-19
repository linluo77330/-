import type { PlayerView, ResponseOption, Tile } from '@/core/types';
import { getConcealedKongCandidates } from '@/core/winCheck';
import type { Character } from '../data/characters';
import { getVisibleHand } from '../utils/handView';
import { tileLabel } from '../utils/tileLabels';
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
  onConcealedKong?: (tile: Pick<Tile, 'suit' | 'rank'>) => void;
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

function getActionHint(
  view: PlayerView,
  humanPlayer: import('@/core/types').PlayerIndex,
  canConcealedKong: boolean,
): string | null {
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
    if (skillActivity?.step === 'pick_target') {
      return '请选择黑手目标或跳过';
    }
    if (skillActivity?.step === 'pick_hand' && view.skill?.skillId === 'vegetable_juice_caishen') {
      return '请选择手牌替换万能牌';
    }
    if (skillActivity?.step === 'pick_hand' && view.skill?.skillId === 'borrow_tile') {
      return '请选择要借出的手牌';
    }
    if (skillActivity?.step === 'pick_hand' && view.skill?.skillId === 'wen_qu_descends') {
      return '请选择要改写的万字牌';
    }
    if (skillActivity?.step === 'pick_wan_rank') {
      return '请选择改写后的万字牌';
    }
    if (skillActivity?.step === 'pick_target' && view.skill?.skillId === 'borrow_tile') {
      return '请选择借牌目标';
    }
    if (skill?.canActivate && canConcealedKong) {
      return '可暗杠、发动技能；选手牌后在上方确认出牌';
    }
    if (skill?.canActivate) {
      return '可发动技能；选手牌后在上方确认出牌';
    }
    if (canConcealedKong) {
      return '可暗杠；选手牌后在上方确认出牌';
    }
    return '点击手牌选中，在上方确认出牌';
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
  onConcealedKong,
  showStart = true,
  humanDisplayName = '你',
  onShowCharacterSkillInfo,
}: ActionPanelProps) {
  const { phase, deckCount, winner } = view;
  const isMyTurn = view.currentPlayer === humanPlayer;
  const concealedKongOptions =
    phase === 'discard' &&
    isMyTurn &&
    !view.skillActivity &&
    onConcealedKong
      ? getConcealedKongCandidates(getVisibleHand(view.players[humanPlayer]) ?? [])
      : [];

  const hint = getActionHint(view, humanPlayer, concealedKongOptions.length > 0);
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

        {concealedKongOptions.length > 0 && (
          <div className="action-panel__kong-actions">
            {concealedKongOptions.map((tile) => (
              <button
                key={`${tile.suit}-${tile.rank}`}
                type="button"
                className="btn btn--ghost action-panel__kong-btn"
                onClick={() => onConcealedKong?.({ suit: tile.suit, rank: tile.rank })}
              >
                暗杠 {tileLabel(tile)}
              </button>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
