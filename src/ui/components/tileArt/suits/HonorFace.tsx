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
    const outer = 13;
    const gap = 6;
    const inner = 8;
    const corner = 24;
    const l = -13;
    const t = -17;
    const r = 13;
    const b = 17;
    const l2 = l + outer + gap;
    const t2 = t + outer + gap;
    const r2 = r - outer - gap;
    const b2 = b - outer - gap;

    return (
      <g fill={MJ.black} stroke="none">
        <rect x={l} y={t} width={r - l} height={outer} />
        <rect x={l} y={b - outer} width={r - l} height={outer} />
        <rect x={l} y={t} width={outer} height={b - t} />
        <rect x={r - outer} y={t} width={outer} height={b - t} />
        <rect x={l2 + corner} y={t2} width={r2 - l2 - corner * 2} height={inner} />
        <rect x={l2 + corner} y={b2 - inner} width={r2 - l2 - corner * 2} height={inner} />
        <rect x={l2} y={t2 + corner} width={inner} height={b2 - t2 - corner * 2} />
        <rect x={r2 - inner} y={t2 + corner} width={inner} height={b2 - t2 - corner * 2} />
        <polygon points={`${l2},${t2} ${l2 + corner},${t2} ${l2},${t2 + corner}`} />
        <polygon points={`${r2},${t2} ${r2 - corner},${t2} ${r2},${t2 + corner}`} />
        <polygon points={`${l2},${b2} ${l2 + corner},${b2} ${l2},${b2 - corner}`} />
        <polygon points={`${r2},${b2} ${r2 - corner},${b2} ${r2},${b2 - corner}`} />
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
