/** 竖屏手机对战时提示横屏，横屏后自动隐藏 */
export function LandscapeHint() {
  return (
    <div className="landscape-hint" role="note">
      <span className="landscape-hint__icon" aria-hidden="true">
        ↻
      </span>
      <span className="landscape-hint__text">旋转手机横屏，牌桌布局更接近电脑版</span>
    </div>
  );
}
