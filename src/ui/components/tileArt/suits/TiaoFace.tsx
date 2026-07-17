import { MJ } from '../colors';

interface TiaoFaceProps {
  rank: number;
}

function Bamboo({ x, y, h, w = 4.5 }: { x: number; y: number; h: number; w?: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x={-w / 2} y={0} width={w} height={h} rx={1} fill={MJ.green} />
      <rect x={-w / 2} y={h * 0.28} width={w} height={1.2} fill="#1F6638" opacity="0.7" />
      <rect x={-w / 2} y={h * 0.58} width={w} height={1.2} fill="#1F6638" opacity="0.7" />
      <rect x={-w / 2 + 0.5} y={1} width={1} height={h - 2} fill="#4AA868" opacity="0.45" />
    </g>
  );
}

function BirdTile() {
  return (
    <g>
      <ellipse cx="0" cy="6" rx="11" ry="8" fill={MJ.green} />
      <ellipse cx="0" cy="5" rx="9" ry="6" fill="#3A9958" />
      <circle cx="8" cy="-2" r="5" fill={MJ.green} />
      <circle cx="10" cy="-3" r="1.2" fill={MJ.black} />
      <path d="M13 -2 L16 0 L13 1 Z" fill={MJ.red} />
      <path d="M-10 4 Q-16 0 -14 -6 Q-8 -2 -10 4" fill={MJ.green} />
      <path d="M-8 6 Q-14 8 -12 12 Q-6 10 -8 6" fill="#248040" />
      <path d="M-2 12 L-4 18 M2 12 L4 18 M0 12 L0 18" stroke="#8B6914" strokeWidth="1.2" strokeLinecap="round" />
    </g>
  );
}

export function TiaoFace({ rank }: TiaoFaceProps) {
  if (rank === 1) return <BirdTile />;

  const layouts: Record<number, [number, number, number][]> = {
    2: [[-8, -8, 20], [8, 8, 20]],
    3: [[-10, -12, 17], [0, 0, 17], [10, 12, 17]],
    4: [[-9, -10, 15], [9, -10, 15], [-9, 8, 15], [9, 8, 15]],
    5: [[-10, -12, 14], [10, -12, 14], [0, 0, 14], [-10, 12, 14], [10, 12, 14]],
    6: [[-10, -14, 13], [0, -14, 13], [10, -14, 13], [-10, 4, 13], [0, 4, 13], [10, 4, 13]],
    7: [[-12, -16, 12], [0, -16, 12], [12, -16, 12], [-6, 0, 12], [6, 0, 12], [-6, 14, 12], [6, 14, 12]],
    8: [[-12, -16, 11], [0, -16, 11], [12, -16, 11], [-12, 0, 11], [0, 0, 11], [12, 0, 11], [-6, 14, 11], [6, 14, 11]],
    9: [[-12, -16, 10], [0, -16, 10], [12, -16, 10], [-12, -2, 10], [0, -2, 10], [12, -2, 10], [-12, 12, 10], [0, 12, 10], [12, 12, 10]],
  };

  const sticks = layouts[rank] ?? layouts[5];
  return (
    <g>
      {sticks.map(([x, y, h], i) => (
        <Bamboo key={i} x={x} y={y} h={h} />
      ))}
    </g>
  );
}
