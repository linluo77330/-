import type { GameSnapshot, PlayerIndex, SkillActivityView, SkillVoteChoice } from '../types.js';

export const DUI_KANG_LU_GALUO_ID = 'dui_kang_lu_galuo';
export const DUI_KANG_LU_GALUO_NAME = '对抗路伽罗';
export const INSTANT_WIN_VOTE_SKILL_ID = 'instant_win_vote';
export const INSTANT_WIN_VOTE_SKILL_NAME = '一秒四破';
export const INSTANT_WIN_VOTE_SKILL_DESC =
  '回合开始时，对抗路伽罗可以发起投票，其余三人全部同意则对抗路伽罗自动获胜。';

export function isDuiKangLuGaluo(characterId: string): boolean {
  return characterId === DUI_KANG_LU_GALUO_ID;
}

export function isDealerTurnOpening(
  snapshot: Pick<GameSnapshot, 'phase' | 'currentPlayer' | 'dealer' | 'turnNumber'>,
  player: PlayerIndex,
): boolean {
  return (
    snapshot.phase === 'discard' &&
    snapshot.turnNumber === 0 &&
    snapshot.dealer === player &&
    snapshot.currentPlayer === player
  );
}

export function canUseInstantWinVote(
  snapshot: Pick<
    GameSnapshot,
    'playerCharacters' | 'phase' | 'currentPlayer' | 'dealer' | 'turnNumber' | 'drawMode' | 'skillMode'
  >,
  player: PlayerIndex,
): boolean {
  if (!isDuiKangLuGaluo(snapshot.playerCharacters[player])) return false;
  if (snapshot.currentPlayer !== player) return false;
  if (snapshot.skillMode !== null) return false;

  if (snapshot.phase === 'draw') {
    return snapshot.drawMode === 'choose';
  }

  if (snapshot.phase === 'discard') {
    return isDealerTurnOpening(snapshot, player);
  }

  return false;
}

export function isInstantWinVoteActive(
  skillMode: GameSnapshot['skillMode'],
): skillMode is Extract<GameSnapshot['skillMode'], { skillId: 'instant_win_vote'; step: 'vote' }> {
  return skillMode?.skillId === INSTANT_WIN_VOTE_SKILL_ID && skillMode.step === 'vote';
}

export function getPendingSkillVoters(
  initiator: PlayerIndex,
  votes: [SkillVoteChoice | null, SkillVoteChoice | null, SkillVoteChoice | null, SkillVoteChoice | null],
): PlayerIndex[] {
  const pending: PlayerIndex[] = [];
  for (let p = 0; p < 4; p++) {
    const player = p as PlayerIndex;
    if (player === initiator) continue;
    if (votes[player] === null) pending.push(player);
  }
  return pending;
}

export function buildInstantWinVoteActivity(
  snapshot: GameSnapshot,
  viewer: PlayerIndex,
): SkillActivityView | null {
  const mode = snapshot.skillMode;
  if (!mode || mode.skillId !== INSTANT_WIN_VOTE_SKILL_ID) return null;

  const initiator = snapshot.currentPlayer;
  if (!isDuiKangLuGaluo(snapshot.playerCharacters[initiator])) return null;

  const base = {
    player: initiator,
    characterId: DUI_KANG_LU_GALUO_ID,
    characterName: DUI_KANG_LU_GALUO_NAME,
    skillId: INSTANT_WIN_VOTE_SKILL_ID,
    skillName: INSTANT_WIN_VOTE_SKILL_NAME,
  };

  if (mode.step === 'confirm') {
    return {
      ...base,
      step: 'confirm',
      votePrompt: '发起投票？其余三人全部同意则你自动获胜',
    };
  }

  if (mode.step === 'vote') {
    const voteStatus = ([0, 1, 2, 3] as PlayerIndex[])
      .filter((p) => p !== initiator)
      .map((player) => ({
        player,
        choice: (mode.votes[player] ?? 'pending') as SkillVoteChoice | 'pending',
      }));

    return {
      ...base,
      step: 'vote',
      voteStatus,
      canVote: viewer !== initiator && mode.votes[viewer] === null,
    };
  }

  return null;
}
