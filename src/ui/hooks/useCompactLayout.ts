import { useEffect, useState } from 'react';

/** 竖屏手机：紧凑牌桌 */
const PORTRAIT_COMPACT_QUERY = '(max-width: 768px) and (orientation: portrait)';
const PORTRAIT_NARROW_QUERY = '(max-width: 480px) and (orientation: portrait)';
/** 横屏手机 / 矮屏：接近桌面比例 */
const LANDSCAPE_MOBILE_QUERY = '(orientation: landscape) and (max-height: 520px)';

export function useCompactLayout() {
  const [compact, setCompact] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const [landscapeMobile, setLandscapeMobile] = useState(false);

  useEffect(() => {
    const portraitCompactMq = window.matchMedia(PORTRAIT_COMPACT_QUERY);
    const portraitNarrowMq = window.matchMedia(PORTRAIT_NARROW_QUERY);
    const landscapeMq = window.matchMedia(LANDSCAPE_MOBILE_QUERY);

    const sync = () => {
      setCompact(portraitCompactMq.matches);
      setNarrow(portraitNarrowMq.matches);
      setLandscapeMobile(landscapeMq.matches);
    };

    sync();
    portraitCompactMq.addEventListener('change', sync);
    portraitNarrowMq.addEventListener('change', sync);
    landscapeMq.addEventListener('change', sync);
    return () => {
      portraitCompactMq.removeEventListener('change', sync);
      portraitNarrowMq.removeEventListener('change', sync);
      landscapeMq.removeEventListener('change', sync);
    };
  }, []);

  return { compact, narrow, landscapeMobile };
}
