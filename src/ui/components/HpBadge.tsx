interface HpBadgeProps {
  current: number;
  max: number;
  eliminated?: boolean;
  compact?: boolean;
}

export function HpBadge({ current, max, eliminated = false, compact = false }: HpBadgeProps) {
  const hearts = Array.from({ length: max }, (_, i) => i < current);

  return (
    <span
      className={`hp-badge ${eliminated ? 'hp-badge--eliminated' : ''} ${compact ? 'hp-badge--compact' : ''}`}
      aria-label={eliminated ? '已淘汰' : `生命 ${current}/${max}`}
      title={eliminated ? '已淘汰' : `生命 ${current}/${max}`}
    >
      {hearts.map((filled, i) => (
        <span
          key={i}
          className={`hp-badge__pip ${filled ? 'hp-badge__pip--filled' : 'hp-badge__pip--empty'}`}
          aria-hidden
        >
          ♥
        </span>
      ))}
    </span>
  );
}
