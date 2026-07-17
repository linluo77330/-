import type { Suit } from '@/core/types';
import { MJ } from '../colors';

interface HonorFaceProps {
  suit: Extract<Suit, 'feng' | 'dragon'>;
  rank: number;
}

const FENG = ['東', '南', '西', '北'];

export function HonorFace({ suit, rank }: HonorFaceProps) {
  if (suit === 'feng') {
    return (
      <text
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="30"
        fontFamily="'Noto Serif SC', 'Songti SC', serif"
        fontWeight="900"
        fill={MJ.black}
      >
        {FENG[rank - 1] ?? '?'}
      </text>
    );
  }

  if (rank === 3) {
    return (
      <g>
        <rect x="-13" y="-17" width="26" height="34" rx="2" fill="#FAF6EC" stroke={MJ.frame} strokeWidth="2.2" />
        <rect x="-10" y="-14" width="20" height="28" rx="1" fill="none" stroke={MJ.frame} strokeWidth="0.8" opacity="0.5" />
      </g>
    );
  }

  const char = rank === 1 ? '中' : '發';
  const fill = rank === 1 ? MJ.red : MJ.green;

  return (
    <text
      textAnchor="middle"
      dominantBaseline="central"
      fontSize="30"
      fontFamily="'Noto Serif SC', 'Songti SC', serif"
      fontWeight="900"
      fill={fill}
    >
      {char}
    </text>
  );
}
