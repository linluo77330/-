import { tilesEqual } from './deck.js';
import type { Tile, WildcardConfig } from './types.js';

/** 白板（dragon rank 3） */
export const HAKU_TYPE: Pick<Tile, 'suit' | 'rank'> = { suit: 'dragon', rank: 3 };

export function isHaku(tile: Pick<Tile, 'suit' | 'rank'>): boolean {
  return tilesEqual(tile, HAKU_TYPE);
}

/** 发牌后翻首张牌，同牌型另 3 张 +（翻牌非白板时）白板作赖子 */
export function createWildcardConfig(indicator: Tile): WildcardConfig {
  return {
    indicator,
    wildcardType: { suit: indicator.suit, rank: indicator.rank },
  };
}

export function isWildcardTile(
  tile: Pick<Tile, 'suit' | 'rank'>,
  wildcard: WildcardConfig | null | undefined,
): boolean {
  if (!wildcard) return false;
  if (tilesEqual(tile, wildcard.wildcardType)) return true;
  if (!isHaku(wildcard.indicator) && isHaku(tile)) return true;
  return false;
}

export function wildcardDescription(
  wildcard: WildcardConfig,
  labelFn: (t: Pick<Tile, 'suit' | 'rank'>) => string,
): string {
  const flipLabel = labelFn(wildcard.indicator);
  if (isHaku(wildcard.indicator)) {
    return `翻 ${flipLabel}，${flipLabel} 为赖子`;
  }
  return `翻 ${flipLabel}，${flipLabel} 与白板 为赖子`;
}
