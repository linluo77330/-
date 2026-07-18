import type { ReactNode } from 'react';

interface ScreenShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function ScreenShell({ title, subtitle, children, footer }: ScreenShellProps) {
  return (
    <div className="screen-shell">
      <div className="screen-panel">
        <header className="screen-panel__header">
          <h1>{title}</h1>
          {subtitle && <p className="screen-panel__sub">{subtitle}</p>}
        </header>
        {children}
        {footer}
      </div>
    </div>
  );
}
