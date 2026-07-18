export interface Character {
  id: string;
  name: string;
  tagline: string;
  accent: string;
}

export const CHARACTERS: Character[] = [
  { id: 'jia', name: '角色甲', tagline: '技能待定', accent: '#b32428' },
  { id: 'yi', name: '角色乙', tagline: '技能待定', accent: '#1a3a5c' },
  { id: 'bing', name: '角色丙', tagline: '技能待定', accent: '#2d7d46' },
  { id: 'ding', name: '角色丁', tagline: '技能待定', accent: '#6b3fa0' },
];
