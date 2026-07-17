import { MJ, WAN_NUMS } from '../colors';

interface WanFaceProps {
  rank: number;
}

export function WanFace({ rank }: WanFaceProps) {
  const num = WAN_NUMS[rank - 1] ?? '?';
  return (
    <g textAnchor="middle">
      <text
        y="-8"
        fontSize="20"
        fontFamily="'Noto Serif SC', 'Songti SC', serif"
        fontWeight="700"
        fill={MJ.black}
      >
        {num}
      </text>
      <text
        y="14"
        fontSize="22"
        fontFamily="'Noto Serif SC', 'Songti SC', serif"
        fontWeight="700"
        fill={MJ.red}
      >
        萬
      </text>
    </g>
  );
}
