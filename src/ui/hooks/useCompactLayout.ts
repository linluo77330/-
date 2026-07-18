import { useEffect, useState } from 'react';

const COMPACT_QUERY = '(max-width: 768px)';
const NARROW_QUERY = '(max-width: 480px)';

export function useCompactLayout() {
  const [compact, setCompact] = useState(false);
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const compactMq = window.matchMedia(COMPACT_QUERY);
    const narrowMq = window.matchMedia(NARROW_QUERY);

    const sync = () => {
      setCompact(compactMq.matches);
      setNarrow(narrowMq.matches);
    };

    sync();
    compactMq.addEventListener('change', sync);
    narrowMq.addEventListener('change', sync);
    return () => {
      compactMq.removeEventListener('change', sync);
      narrowMq.removeEventListener('change', sync);
    };
  }, []);

  return { compact, narrow };
}
