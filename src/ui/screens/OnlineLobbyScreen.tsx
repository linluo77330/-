import { ScreenShell } from '../components/ScreenShell';

interface OnlineLobbyScreenProps {
  onBack: () => void;
}

export function OnlineLobbyScreen({ onBack }: OnlineLobbyScreenProps) {
  return (
    <ScreenShell
      title="多人联机"
      subtitle="联机大厅 UI 开发中"
      footer={
        <button type="button" className="screen-panel__back btn btn--ghost" onClick={onBack}>
          返回主菜单
        </button>
      }
    >
      <div className="placeholder-panel">
        <p className="placeholder-panel__lead">
          服务端与 WebSocket 协议已就绪，游戏内大厅界面即将接入。
        </p>
        <ul className="placeholder-panel__list">
          <li>创建 / 加入房间</li>
          <li>玩家准备与开局</li>
          <li>在线对战与同步</li>
        </ul>
        <p className="placeholder-panel__hint">
          现阶段可参考项目文档 <code>docs/联机参与说明.md</code> 手动联机测试。
        </p>
      </div>
    </ScreenShell>
  );
}
