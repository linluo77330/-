export const DEFAULT_CHARACTER_MAX_HP = 3;

/** 各角色起始生命值（未列出的角色使用默认值） */
export const CHARACTER_MAX_HP: Record<string, number> = {
  shou_duan_zhe: 4,
  jue_wang_de_wen_mang: 4,
  dui_kang_lu_galuo: 10,
  ling_shi_da_zong_tong: 2,
  jie_dong_xi_zhi_ren: 2,
  wen_qu_xing_y: 4,
};

export function getCharacterMaxHp(characterId: string): number {
  return CHARACTER_MAX_HP[characterId] ?? DEFAULT_CHARACTER_MAX_HP;
}
