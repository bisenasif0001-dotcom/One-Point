import React from 'react';
import { Card, Badge, Icon, PanelHeader} from '../Shared';
import { useApp} from '../AppContext';
import {
  BOOKMARK_FIELDS, canAccessWorkspace, CROSS_WORKSPACE_NAVIGATION_FIELDS, DASHBOARD_EVENT_CATALOG, DASHBOARD_LAYOUT_PROFILES, DASHBOARD_PERFORMANCE_FIELDS, DASHBOARD_PERSONALIZATION_FIELDS, DASHBOARD_PLUGIN_FIELDS, DASHBOARD_POLICY_REGISTRY, DASHBOARD_STATE_DOMAINS, DASHBOARD_TELEMETRY_DOMAINS, DESIGN_SYSTEM_GOVERNANCE_FIELDS, ENTERPRISE_DASHBOARD_REGISTRY, EXPORT_FIELDS, getRegistryCounts, getVisibleWorkspaces, getWidgetByKey, getWorkspaceByPanel, getWorkspaceByKey, LOCALIZATION_FIELDS, WORKSPACE_CAPABILITY_MATRIX, WORKSPACE_DEPENDENCY_GRAPH, WORKSPACE_VERSION_COMPATIBILITY, type EnterpriseWorkspaceDefinition, } from '../features/dashboard/enterprise-dashboard-registry';

const REGISTRY_RELATIONSHIP = ['Dashboard Registry', 'Enterprise Intelligence Registry', 'Business Foundations'];

const listStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
};

const chipStyle: React.CSSProperties = {
  padding: '4px 8px',
  borderRadius: 999,
  background: 'var(--bg-3)',
  border: '1px solid var(--border-1)',
  fontSize: 'var(--fs-xs)',
  color: 'var(--text-2)',
};

function FoundationCountCard({
  label,
  value,
  sub,
  icon,
  color,
  onClick,
}: {
  label: string;
  value: string;
  sub: string;
  icon: string;
  color: string;
  onClick?: () => void;
}) {
  return (
    <div
      className="card hover-lift"
      style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={16} color={color} />
        </div>
        <span style={{ fontSize: '10px', color: 'var(--text-4)' }}>Governed</span>
      </div>
      <div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', marginBottom: 3 }}>{label}</div>
        <div style={{ fontSize: 'var(--fs-xl)', fontWeight: 'var(--fw-semibold)' }}>{value}</div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', marginTop: 4 }}>{sub}</div>
      </div>
    </div>
  );
}

function WorkspaceCard({
  workspace,
  onOpen,
}: {
  workspace: EnterpriseWorkspaceDefinition;
  onOpen: (panel: string) => void;
}) {
  return (
    <button
      type="button"
      className="card hover-lift"
      style={{
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        cursor: 'pointer',
        width: '100%',
        textAlign: 'left',
        background: 'var(--bg-1)',
      }}
      onClick={() => onOpen(workspace.panel)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--blue-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={workspace.icon} size={18} color="var(--blue)" />
          </div>
          <div>
            <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-semibold)' }}>{workspace.name}</div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>{workspace.category}</div>
          </div>
        </div>
        <Badge type={workspace.actionBoundary === 'read_only' ? 'neutral' : 'info'}>{workspace.workspaceLifecycle}</Badge>
      </div>
      <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-2)', lineHeight: 1.55 }}>{workspace.description}</div>
      <div style={listStyle}>
        {workspace.intelligenceReferences.slice(0, 2).map((reference) => (
          <span key={reference} style={chipStyle}>{reference.replace(/_/g, ' ')}</span>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>
        <span>{workspace.widgetKeys.length} widgets</span>
        <span>{workspace.supportedRoles.length} roles</span>
      </div>
    </button>
  );
}

function WorkspaceFieldGroup({ title, fields }: { title: string; fields: readonly string[] | string[] }) {
  return (
    <Card title={title}>
      <div style={listStyle}>
        {fields.map((field) => (
          <span key={field} style={chipStyle}>{field}</span>
        ))}
      </div>
    </Card>
  );
}

function WorkspaceDetail({ workspace, setActivePanel }: { workspace: EnterpriseWorkspaceDefinition; setActivePanel: (panel: string) => void }) {
  const widgets = workspace.widgetKeys.map((widgetKey) => getWidgetByKey(widgetKey)).filter(Boolean);
  const capabilityRows = WORKSPACE_CAPABILITY_MATRIX.filter((row) => row.workspaceKey === workspace.workspaceKey);
  const dependencyRows = WORKSPACE_DEPENDENCY_GRAPH.filter((row) => row.sourceWorkspace === workspace.workspaceKey || row.targetWorkspace === workspace.workspaceKey);
  const compatibility = WORKSPACE_VERSION_COMPATIBILITY.find((row) => row.workspaceKey === workspace.workspaceKey);

  return (
    <div className="panel active">
      <PanelHeader
        title={workspace.name}
        sub={workspace.description}
        actions={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setActivePanel('command-center')}>
              <Icon name="arrow-left" size={14} /> Back to Command Center
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => setActivePanel('home')}>
              <Icon name="layout-dashboard" size={14} /> Open Operations Home
            </button>
          </div>
        }
      />

      <div className="panels">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <FoundationCountCard label="Workspace Version" value={`v${workspace.workspaceVersion}`} sub={workspace.workspaceStatus} icon="layers-3" color="var(--blue)" />
          <FoundationCountCard label="Capabilities" value={String(capabilityRows.length)} sub="Referenced only" icon="shield-check" color="var(--emerald)" />
          <FoundationCountCard label="Dependencies" value={String(dependencyRows.length)} sub="Graph-linked" icon="git-fork" color="var(--amber)" />
          <FoundationCountCard label="Widgets" value={String(widgets.length)} sub="Registry-backed" icon="layout-grid" color="var(--violet)" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          <Card title="Workspace Governance" sub="Lifecycle, ownership, boundaries, and intelligence references">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              {[
                ['Owner', workspace.owner],
                ['Lifecycle', workspace.workspaceLifecycle],
                ['Status', workspace.workspaceStatus],
                ['Action Boundary', workspace.actionBoundary],
                ['Approval Boundary', workspace.approvalBoundary],
                ['Visibility', workspace.defaultVisibility],
              ].map(([label, value]) => (
                <div key={label} style={{ padding: 12, borderRadius: 10, background: 'var(--bg-2)', border: '1px solid var(--border-1)' }}>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-semibold)' }}>{value}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', marginBottom: 8 }}>Intelligence References</div>
              <div style={listStyle}>
                {workspace.intelligenceReferences.map((reference) => (
                  <span key={reference} style={chipStyle}>{reference}</span>
                ))}
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', marginBottom: 8 }}>Business Foundation Dependencies</div>
              <div style={listStyle}>
                {workspace.businessFoundationReferences.map((reference) => (
                  <span key={reference} style={chipStyle}>{reference}</span>
                ))}
              </div>
            </div>
          </Card>

          <Card title="Compatibility & Layouts" sub="Governed compatibility metadata only">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', marginBottom: 8 }}>Supported Roles</div>
                <div style={listStyle}>
                  {workspace.supportedRoles.map((role) => <span key={role} style={chipStyle}>{role}</span>)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', marginBottom: 8 }}>Compatible Layout Profiles</div>
                <div style={listStyle}>
                  {workspace.compatibleLayouts.map((layout) => <span key={layout} style={chipStyle}>{layout}</span>)}
                </div>
              </div>
              {compatibility ? (
                <div>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', marginBottom: 8 }}>Dashboard Version Boundary</div>
                  <div style={listStyle}>
                    {compatibility.compatibleDashboardVersions.map((version) => (
                      <span key={version} style={chipStyle}>{version}</span>
                    ))}
                    <span style={chipStyle}>min {compatibility.minimumDashboardVersion}</span>
                  </div>
                </div>
              ) : null}
            </div>
          </Card>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          <Card title="Widget Contract Surface" sub="Widgets consume governed APIs and enterprise identities only">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {widgets.map((widget) => (
                <div key={widget?.widgetKey} style={{ padding: 12, borderRadius: 10, background: 'var(--bg-2)', border: '1px solid var(--border-1)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                    <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-semibold)' }}>{widget?.widgetName}</div>
                    <Badge type="info">{widget?.widgetCategory}</Badge>
                  </div>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', marginBottom: 8 }}>{widget?.widgetScope}</div>
                  <div style={listStyle}>
                    {widget?.widgetDataSources.map((source) => (
                      <span key={source} style={chipStyle}>{source}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Capability Matrix & Dependency Graph" sub="Referenced capabilities and workspace graph only">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {capabilityRows.map((capability) => (
                <div key={capability.workspaceCapabilityUuid} style={{ padding: 12, borderRadius: 10, background: 'var(--bg-2)', border: '1px solid var(--border-1)' }}>
                  <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-semibold)' }}>{capability.capabilityReference}</div>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', marginTop: 4 }}>
                    Roles: {capability.allowedRoles.join(', ')} | Action: {capability.actionBoundary} | Approval: {capability.approvalBoundary}
                  </div>
                </div>
              ))}
              {dependencyRows.map((dependency) => (
                <div key={dependency.dependencyUuid} style={{ padding: 12, borderRadius: 10, background: 'var(--bg-2)', border: '1px solid var(--border-1)' }}>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>
                    {dependency.sourceWorkspace} {'->'} {dependency.targetWorkspace}
                  </div>
                  <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-semibold)', marginTop: 4 }}>{dependency.dependencyType}</div>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', marginTop: 4 }}>
                    {dependency.dependencyStrength} | {dependency.dependencyDirection}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export const EnterpriseCommandCenterPanel = ({ setActivePanel }: { setActivePanel: (panel: string) => void }) => {
  const { customers, allOrders, tasks, notifications, backendSync, role } = useApp();
  const counts = getRegistryCounts();
  const pendingOrders = allOrders.filter((order) => ['Pending', 'Verified', 'Processing'].includes(order.status)).length;
  const completedOrders = allOrders.filter((order) => order.status === 'Completed').length;
  const paidOrders = allOrders.filter((order) => order.payStatus === 'Paid').length;
  const totalRevenue = allOrders.reduce((sum, order) => sum + Number(order.amount || 0), 0);
  const executiveWorkspace = getWorkspaceByKey('executive-workspace');

  const keyWorkspaces = getVisibleWorkspaces(role).filter((workspace) =>
    ['command-center', 'executive-workspace', 'knowledge-workspace', 'ai-workspace', 'safety-approval-workspace', 'context-explorer'].includes(workspace.workspaceKey)
  );

  return (
    <div className="panel active">
      <PanelHeader
        title="Enterprise Dashboard Command Center"
        sub="Governed workspace registry, widget registry, layout planning, and enterprise command architecture built on frozen business and intelligence foundations."
        actions={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setActivePanel('home')}>
              <Icon name="layout-dashboard" size={14} /> Operations Home
            </button>
            {executiveWorkspace && canAccessWorkspace(role, executiveWorkspace) ? (
              <button className="btn btn-primary btn-sm" onClick={() => setActivePanel('executive-workspace')}>
                <Icon name="line-chart" size={14} /> Executive Workspace
              </button>
            ) : null}
          </div>
        }
      />

      <div className="panels">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <FoundationCountCard label="Registered Workspaces" value={String(counts.workspaces)} sub="Lifecycle-governed" icon="layout-panel-top" color="var(--blue)" />
          <FoundationCountCard label="Registered Widgets" value={String(counts.widgets)} sub="Contract-governed" icon="layout-grid" color="var(--emerald)" />
          <FoundationCountCard label="Layout Profiles" value={String(counts.layouts)} sub="Responsive metadata" icon="columns-3" color="var(--amber)" />
          <FoundationCountCard label="Policy Domains" value={String(counts.policies)} sub="Behavior references" icon="shield" color="var(--violet)" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          <Card title="Registry Relationship Rule" sub="Dashboard registry consumes intelligence registries. It never copies them.">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
              {REGISTRY_RELATIONSHIP.map((item, index) => (
                <React.Fragment key={item}>
                  <div style={{ flex: '1 1 180px', minWidth: 180, padding: 16, borderRadius: 12, background: 'var(--bg-2)', border: '1px solid var(--border-1)', textAlign: 'center' }}>
                    <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-semibold)' }}>{item}</div>
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', marginTop: 6 }}>
                      {index === 0 ? 'consumer layer' : index === 1 ? 'governed intelligence source' : 'enterprise operational truth'}
                    </div>
                  </div>
                  {index < REGISTRY_RELATIONSHIP.length - 1 ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--blue)', flex: '0 0 24px' }}>
                      <Icon name="arrow-right" size={18} />
                    </div>
                  ) : null}
                </React.Fragment>
              ))}
            </div>
            <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {ENTERPRISE_DASHBOARD_REGISTRY.prohibitedBehavior.map((item) => (
                <Badge key={item} type="warning">{item.replace(/_/g, ' ')}</Badge>
              ))}
            </div>
          </Card>

          <Card title="Live Enterprise Pulse" sub="Consumer-only operational visibility">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                ['Customers', String(customers.length)],
                ['Orders', String(allOrders.length)],
                ['Pending Workflow', String(pendingOrders)],
                ['Completed Orders', String(completedOrders)],
                ['Paid Orders', String(paidOrders)],
                ['Open Tasks', String(tasks.filter((task) => task.status !== 'done').length)],
                ['Notifications', String(notifications.length)],
                ['Backend Sync', backendSync.status],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: '1px solid var(--border-1)' }}>
                  <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>{label}</span>
                  <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-semibold)' }}>{value}</span>
                </div>
              ))}
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--emerald)' }}>Revenue visibility: Rs. {totalRevenue.toLocaleString('en-IN')}</div>
            </div>
          </Card>
        </div>

        <Card title="Workspace Directory" sub="Governed workspaces for human, hybrid, executive, and future AI operations" style={{ flexShrink: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            {keyWorkspaces.map((workspace) => (
              <div key={workspace.workspaceKey}>
                <WorkspaceCard workspace={workspace} onOpen={setActivePanel} />
              </div>
            ))}
          </div>
        </Card>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          <WorkspaceFieldGroup title="Layout Profiles" fields={DASHBOARD_LAYOUT_PROFILES.map((layout) => layout.layoutName)} />
          <WorkspaceFieldGroup title="Policy Registry" fields={DASHBOARD_POLICY_REGISTRY.map((policy) => policy.domain)} />
          <WorkspaceFieldGroup title="Personalization Metadata" fields={DASHBOARD_PERSONALIZATION_FIELDS} />
          <WorkspaceFieldGroup title="Dashboard State Domains" fields={DASHBOARD_STATE_DOMAINS} />
          <WorkspaceFieldGroup title="Dashboard Event Metadata" fields={DASHBOARD_EVENT_CATALOG} />
          <WorkspaceFieldGroup title="Plugin Governance Metadata" fields={DASHBOARD_PLUGIN_FIELDS} />
          <WorkspaceFieldGroup title="Cross Workspace Navigation" fields={CROSS_WORKSPACE_NAVIGATION_FIELDS} />
          <WorkspaceFieldGroup title="Performance Governance" fields={DASHBOARD_PERFORMANCE_FIELDS} />
          <WorkspaceFieldGroup title="Telemetry Metadata" fields={DASHBOARD_TELEMETRY_DOMAINS} />
          <WorkspaceFieldGroup title="Bookmark Governance" fields={BOOKMARK_FIELDS} />
          <WorkspaceFieldGroup title="Export Architecture" fields={EXPORT_FIELDS} />
          <WorkspaceFieldGroup title="Localization Architecture" fields={LOCALIZATION_FIELDS} />
          <WorkspaceFieldGroup title="Design System Governance" fields={DESIGN_SYSTEM_GOVERNANCE_FIELDS} />
        </div>
      </div>
    </div>
  );
};

export const EnterpriseDashboardPanels = ({
  activePanel,
  setActivePanel,
}: {
  activePanel: string;
  setActivePanel: (panel: string) => void;
}) => {
  const { role } = useApp();
  const commandCenterWorkspace = getWorkspaceByKey('command-center');

  if (activePanel === 'command-center') {
    return commandCenterWorkspace && canAccessWorkspace(role, commandCenterWorkspace)
      ? <EnterpriseCommandCenterPanel setActivePanel={setActivePanel} />
      : null;
  }

  const workspace = getWorkspaceByPanel(activePanel);
  if (!workspace || workspace.panel === 'home') return null;
  if (!canAccessWorkspace(role, workspace)) {
    return commandCenterWorkspace && canAccessWorkspace(role, commandCenterWorkspace)
      ? <EnterpriseCommandCenterPanel setActivePanel={setActivePanel} />
      : null;
  }

  return <WorkspaceDetail workspace={workspace} setActivePanel={setActivePanel} />;
};
