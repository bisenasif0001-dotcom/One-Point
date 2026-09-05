import type { ReactNode} from 'react';
import { useApp} from '../AppContext';

type DashboardShellProps = {
  sidebar: ReactNode;
  workspace: ReactNode;
  rightPanel: ReactNode;
};

export const DashboardShell = ({ sidebar, workspace, rightPanel }: DashboardShellProps) => {
  const { role, activePanel } = useApp();
  const isCustomerPortal = role === 'customer' || (activePanel.startsWith('customer-') && activePanel !== 'customer-db');
  const isEmployeePortal = activePanel === 'employee-portal';
  const isAICommandCenter = activePanel === 'ai-agents';

  return (
    <div className={`app-shell enterprise-shell ${isCustomerPortal ? 'customer-shell' : ''} ${isEmployeePortal ? 'employee-shell' : ''} ${isAICommandCenter ? 'ai-shell' : ''}`} role="application" aria-label="One Point enterprise operating system">
      {sidebar}
      <main className={`workspace enterprise-workspace ${isCustomerPortal ? 'customer-workspace' : ''} ${isEmployeePortal ? 'employee-workspace' : ''} ${isAICommandCenter ? 'ai-workspace' : ''}`} id="main-content" tabIndex={-1}>
        {workspace}
      </main>
      {rightPanel}
    </div>
  );
};
