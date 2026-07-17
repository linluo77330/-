import { MJ } from '../colors';

interface TongFaceProps {
  rank: number;
}

function SolidDot({ cx, cy, r, color }: { cx: number; cy: number; r: number; color: string }) {
  return <circle cx={cx} cy={cy} r={r} fill={color} />;
}

export function TongFace({ rank }: TongFaceProps) {
  if (rank === 1) {
    return (
      <g>
        <circle r="20" fill="none" stroke={MJ.blue} strokeWidth="2.8" />
        <circle r="15" fill="none" stroke={MJ.green} strokeWidth="2.2" />
        <circle r="10" fill="none" stroke={MJ.red} strokeWidth="1.8" />
        <circle r="5.5" fill={MJ.red} />
      </g>
    );
  }

  const B = MJ.blue;
  const R = MJ.red;
  const G = MJ.green;

  const layouts: Record<number, [number, number, string][]> = {
    2: [[-9, -12, B], [-9, 12, B]],
    3: [[-9, -14, B], [-9, 0, B], [-9, 14, B]],
    4: [[-11, -12, B], [3, -12, B], [-11, 4, B], [3, 4, B]],
    5: [[-11, -12, B], [3, -12, B], [-11, 4, B], [3, 4, B], [-4, -4, R]],
    6: [[-11, -14, B], [3, -14, B], [-11, 0, B], [3, 0, B], [-11, 14, B], [3, 14, B]],
    7: [[-12, -16, B], [0, -16, B], [12, -16, B], [-6, 0, B], [-6, 16, B], [6, 0, G], [6, 16, G]],
    8: [[-12, -14, B], [0, -14, B], [-12, 0, B], [0, 0, B], [-12, 14, B], [0, 14, B], [12, -7, G], [12, 7, G]],
    9: [[-12, -16, B], [0, -16, B], [12, -16, B], [-12, 0, B], [0, 0, R], [12, 0, B], [-12, 16, B], [0, 16, B], [12, 16, B]],
  };

  const pattern = layouts[rank] ?? layouts[5];
  return (
    <g>
      {pattern.map(([x, y, color], i) => (
        <SolidDot key={i} cx={x} cy={y} r={5.5} color={color} />
      ))}
    </g>
  );
}
