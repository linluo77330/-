import { createSkillTile, tilesEqual } from './deck.js';
import type { Tile, WildcardConfig } from './types.js';

/** 白板（dragon rank 3） */
export const HAKU_TYPE: Pick<Tile, 'suit' | 'rank'> = { suit: 'dragon', rank: 3 };

export function isHaku(tile: Pick<Tile, 'suit' | 'rank'>): boolean {
  return tilesEqual(tile, HAKU_TYPE);
}

/** 发牌后翻首张牌，同牌型其余 3 张为万能牌；白板视作该牌型参与胡牌（本身不是万能牌） */
export function createWildcardConfig(indicator: Tile): WildcardConfig {
  return {
    indicator,
    wildcardType: { suit: indicator.suit, rank: indicator.rank },
  };
}

/** 技能等：用新牌型替换场上万能牌展示与判定 */
export function replaceWildcardDisplay(
  wildcard: WildcardConfig,
  newType: Pick<Tile, 'suit' | 'rank'>,
): WildcardConfig {
  return {
    indicator: createSkillTile(newType.suit, newType.rank),
    wildcardType: { suit: newType.suit, rank: newType.rank },
  };
}

/** 是否万能牌（仅同牌型，不含白板）——用于 UI 高亮 */
export function isWildcardTile(
  tile: Pick<Tile, 'suit' | 'rank'>,
  wildcard: WildcardConfig | null | undefined,
): boolean {
  if (!wildcard) return false;
  return tilesEqual(tile, wildcard.wildcardType);
}

/** 胡牌判定时将牌还原为实际牌型：翻牌非白板时，白板视作指示牌型 */
export function resolveTileForWin(
  tile: Tile,
  wildcard: WildcardConfig | null | undefined,
): Tile {
  if (!wildcard) return tile;
  if (!isHaku(wildcard.indicator) && isHaku(tile)) {
    return {
      ...tile,
      suit: wildcard.wildcardType.suit,
      rank: wildcard.wildcardType.rank,
    };
  }
  return tile;
}

export function wildcardDescription(
  wildcard: WildcardConfig,
  labelFn: (t: Pick<Tile, 'suit' | 'rank'>) => string,
): string {
  const flipLabel = labelFn(wildcard.indicator);
  if (isHaku(wildcard.indicator)) {
    return `翻 ${flipLabel}，其余三张 ${flipLabel} 为万能牌`;
  }
  return `翻 ${flipLabel}，其余三张 ${flipLabel} 为万能牌，白板视作 ${flipLabel}`;
}
