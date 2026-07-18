import { ScreenShell } from '../components/ScreenShell';

interface SettingsScreenProps {
  onBack: () => void;
}

const PLACEHOLDER_SETTINGS = [
  { id: 'audio', label: '音效与音乐', note: '音量、音效开关' },
  { id: 'display', label: '画面', note: '分辨率、动画效果' },
  { id: 'controls', label: '操作', note: '快捷键、出牌确认' },
  { id: 'game', label: '对局', note: '默认模式、机器人难度' },
] as const;

export function SettingsScreen({ onBack }: SettingsScreenProps) {
  return (
    <ScreenShell
      title="设置"
      subtitle="以下选项预留，后续版本开放"
      footer={
        <button type="button" className="screen-panel__back btn btn--ghost" onClick={onBack}>
          返回主菜单
        </button>
      }
    >
      <ul className="settings-list">
        {PLACEHOLDER_SETTINGS.map((item) => (
          <li key={item.id} className="settings-list__item settings-list__item--disabled">
            <div className="settings-list__main">
              <span className="settings-list__label">{item.label}</span>
              <span className="settings-list__note">{item.note}</span>
            </div>
            <span className="settings-list__badge">待开发</span>
          </li>
        ))}
      </ul>
    </ScreenShell>
  );
}
