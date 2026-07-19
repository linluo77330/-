interface ZoneFoldChipProps {
  label: string;
  count: number;
  tone?: 'meld' | 'river';
  onClick: () => void;
}

export function ZoneFoldChip({ label, count, tone = 'meld', onClick }: ZoneFoldChipProps) {
  const disabled = count === 0;

  return (
    <button
      type="button"
      className={`zone-fold-chip zone-fold-chip--${tone} ${disabled ? 'zone-fold-chip--empty' : ''}`}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-label={disabled ? `${label}牌暂无` : `查看${label}牌 ${count} 张`}
    >
      <span className="zone-fold-chip__label">{label}</span>
      <span className="zone-fold-chip__count">{count}</span>
    </button>
  );
}
