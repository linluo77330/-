import { ScreenShell } from '../components/ScreenShell';

interface MainMenuScreenProps {
  onOffline: () => void;
  onOnline: () => void;
  onSettings: () => void;
}

export function MainMenuScreen({ onOffline, onOnline, onSettings }: MainMenuScreenProps) {
  return (
    <ScreenShell title="技能麻将" subtitle="请选择游戏模式">
      <div className="main-menu__modes">
        <button type="button" className="main-menu__mode main-menu__mode--offline" onClick={onOffline}>
          <span className="main-menu__mode-icon" aria-hidden>
            🀄
          </span>
          <span className="main-menu__mode-title">离线单机</span>
          <span className="main-menu__mode-desc">与 3 名电脑对战，本地运行</span>
        </button>

        <button type="button" className="main-menu__mode main-menu__mode--online" onClick={onOnline}>
          <span className="main-menu__mode-icon" aria-hidden>
            🌐
          </span>
          <span className="main-menu__mode-title">多人联机</span>
          <span className="main-menu__mode-desc">与 3 名玩家在线对战</span>
        </button>
      </div>

      <button type="button" className="main-menu__settings btn btn--ghost" onClick={onSettings}>
        ⚙ 设置
      </button>
    </ScreenShell>
  );
}
