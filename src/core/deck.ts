import type { Suit, Tile } from './types.js';

const NUMBER_SUITS: Suit[] = ['wan', 'tong', 'tiao'];
const FENG_RANKS = 4;
const DRAGON_RANKS = 3;

let tileIdCounter = 0;

function createTile(suit: Suit, rank: number): Tile {
  return { id: `tile_${++tileIdCounter}`, suit, rank };
}

/** 标准 136 张牌（无花牌） */
export function createDeck(): Tile[] {
  tileIdCounter = 0;
  const deck: Tile[] = [];

  for (const suit of NUMBER_SUITS) {
    for (let rank = 1; rank <= 9; rank++) {
      for (let copy = 0; copy < 4; copy++) {
        deck.push(createTile(suit, rank));
      }
    }
  }

  for (let rank = 1; rank <= FENG_RANKS; rank++) {
    for (let copy = 0; copy < 4; copy++) {
      deck.push(createTile('feng', rank));
    }
  }

  for (let rank = 1; rank <= DRAGON_RANKS; rank++) {
    for (let copy = 0; copy < 4; copy++) {
      deck.push(createTile('dragon', rank));
    }
  }

  return deck;
}

export function shuffleDeck(deck: Tile[], random = Math.random): Tile[] {
  const copy = [...deck];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function tilesEqual(
  a: Pick<Tile, 'suit' | 'rank'>,
  b: Pick<Tile, 'suit' | 'rank'>,
): boolean {
  return a.suit === b.suit && a.rank === b.rank;
}
