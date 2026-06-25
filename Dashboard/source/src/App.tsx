import { useState } from 'react';
import { AppProvider } from './AppContext';
import { TopBar, Sidebar, RightPanel } from './Navigation';
import { DashboardPanel, WorkPanels } from './panels/DashWork';
import { OrdersCrmPanels } from './panels/OrdersCrm';
import { SystemPanels } from './panels/System';
import { SearchModal, useSearchShortcut } from './SearchModal';
import { AssignmentPanel } from './panels/AssignmentPanel';
import { StaffPanel } from './panels/StaffPanel';
import { CustomerDatabase } from './panels/CustomerDatabase';
import { useApp } from './AppContext';

// Inner app with context access
const AppInner = () => {
  console.log("AppInner: Rendering start");
  const { activePanel, setActivePanel } = useApp();
  console.log("AppInner: useApp context acquired, activePanel =", activePanel);
  const [searchOpen, setSearchOpen] = useState(false);

  // Ctrl+K / ⌘K shortcut
  useSearchShortcut(() => setSearchOpen(true));

  console.log("AppInner: Returning JSX");
  return (
    <>
      <h1 className="sr-only">One Point OS Dashboard</h1>
      <TopBar onSearchOpen={() => setSearchOpen(true)} />
      <div className="app-shell flex flex-1 overflow-hidden h-screen">
        <Sidebar activePanel={activePanel} setActivePanel={setActivePanel} />

        <main className="workspace flex flex-col flex-1" id="workspace" style={{ overflowY: 'auto' }}>
          {activePanel === 'home' ? <DashboardPanel setActivePanel={setActivePanel} /> : null}
          <WorkPanels activePanel={activePanel} />
          <OrdersCrmPanels activePanel={activePanel} />
          <SystemPanels activePanel={activePanel} />

          {/* New Workflow Panels */}
          {activePanel === 'assignments'  && <AssignmentPanel />}
          {activePanel === 'staff'        && <StaffPanel />}
          {activePanel === 'customer-db'  && <CustomerDatabase />}
        </main>

        <RightPanel />
      </div>

      {/* Global Search Modal */}
      {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}
    </>
  );
};

export default function App() {
  console.log("App: rendering outer App");
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}
