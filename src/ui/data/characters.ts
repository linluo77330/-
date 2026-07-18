export interface CharacterSkill {
  id: string;
  name: string;
  description: string;
  maxUses: number;
  limited: boolean;
}

export interface Character {
  id: string;
  name: string;
  tagline: string;
  description: string;
  accent: string;
  skill: CharacterSkill | null;
}

export const SHOU_DUAN_ZHE: Character = {
  id: 'shou_duan_zhe',
  name: '手短者',
  tagline: '让让我吧😭',
  description:
    '手短者手很短，大家好心的让他从自己打出的牌中摸牌，但手短者摸到第三次时，大家的同情心耗尽，不让他继续从打出的牌里摸了。',
  accent: '#b32428',
  skill: {
    id: 'let_me_draw',
    name: '（限定技）让让我吧😭',
    description:
      '摸牌阶段可以选择不从牌墙里摸牌，而是获得自己曾经打出过的牌里的一张。该技能只能使用三次。',
    maxUses: 3,
    limited: true,
  },
};

export const HEI_PI_TI_YU_SHENG: Character = {
  id: 'hei_pi_ti_yu_sheng',
  name: '黑皮体育生',
  tagline: '大力出奇迹',
  description:
    '黑皮体育生力大无比，可以把筒牌、条牌掰成两半，并选取自己想要的牌，可惜掰了一会就力竭了。',
  accent: '#1a3a5c',
  skill: {
    id: 'split_tile',
    name: '（限定技）大力出奇迹',
    description:
      '回合内可以选择把一张筒牌或条牌掰开，产生两张点数和为原来那张牌的新牌，并得到其中一张，丢弃另一张（即无法被吃、碰响应）。该技能只能使用两次。',
    maxUses: 2,
    limited: true,
  },
};

export const JUE_WANG_DE_WEN_MANG: Character = {
  id: 'jue_wang_de_wen_mang',
  name: '绝望的文盲',
  tagline: '我看不懂啊',
  description:
    '绝望的文盲很绝望，每次看到有字的牌只想赶紧摆脱它们，事情会如愿吗？',
  accent: '#2d7d46',
  skill: {
    id: 'cant_read',
    name: '我看不懂啊',
    description:
      '回合开始时，绝望的文盲可以选择一次性丢弃所有带字的牌，即一万至九万、东、西、南、北、中、發（不含白板；丢弃的牌无法被吃和碰响应），并摸相应数量的牌，该回合跳过出牌阶段。',
    maxUses: 0,
    limited: false,
  },
};

export const DUI_KANG_LU_GALUO: Character = {
  id: 'dui_kang_lu_galuo',
  name: '对抗路伽罗',
  tagline: '一秒四破',
  description: '大家都不相信伽罗能走对抗路，但她真的很适合对抗',
  accent: '#6b3fa0',
  skill: {
    id: 'instant_win_vote',
    name: '一秒四破',
    description:
      '回合开始时，对抗路伽罗可以发起投票，其余三人全部同意则对抗路伽罗自动获胜。',
    maxUses: 0,
    limited: false,
  },
};

export const CHARACTERS: Character[] = [
  SHOU_DUAN_ZHE,
  HEI_PI_TI_YU_SHENG,
  JUE_WANG_DE_WEN_MANG,
  DUI_KANG_LU_GALUO,
];

export function getCharacterById(id: string): Character | undefined {
  return CHARACTERS.find((c) => c.id === id);
}

export function getSkillUsesRemaining(characterId: string, usesSpent: number): number | undefined {
  const character = getCharacterById(characterId);
  if (!character?.skill || !character.skill.limited) return undefined;
  return Math.max(0, character.skill.maxUses - usesSpent);
}

export const DEFAULT_CHARACTER_ID = '';
