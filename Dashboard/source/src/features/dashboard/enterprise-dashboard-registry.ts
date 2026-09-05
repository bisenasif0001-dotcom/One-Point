export type WorkspaceLifecycle = 'Draft' | 'Review' | 'Published' | 'Deprecated' | 'Archived';
export type WorkspaceStatus = 'Active' | 'Planned' | 'Suspended' | 'Retired';

export type EnterpriseWorkspaceDefinition = {
  workspaceKey: string;
  panel: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  owner: string;
  workspaceVersion: number;
  workspaceStatus: WorkspaceStatus;
  workspaceLifecycle: WorkspaceLifecycle;
  supportedRoles: string[];
  supportedWorkspaceTypes: string[];
  compatibleLayouts: string[];
  widgetKeys: string[];
  capabilityReferences: string[];
  policyReferences: string[];
  intelligenceReferences: string[];
  businessFoundationReferences: string[];
  actionBoundary: string;
  approvalBoundary: string;
  defaultVisibility: 'admin' | 'customer_safe' | 'executive' | 'internal';
};

export type EnterpriseWidgetDefinition = {
  widgetUuid: string;
  widgetKey: string;
  widgetName: string;
  widgetType: string;
  widgetCategory: string;
  widgetVersion: number;
  widgetOwner: string;
  widgetStatus: string;
  widgetScope: string;
  widgetPermissions: string[];
  widgetDependencies: string[];
  widgetDataSources: string[];
  widgetRefreshPolicy: string;
  widgetCachePolicy: string;
  widgetVisibility: string;
  widgetLayoutConstraints: string[];
  widgetInputContract: string[];
  widgetOutputContract: string[];
  widgetRefreshStrategy: string;
  widgetLoadingStrategy: string;
  widgetErrorStrategy: string;
  widgetEmptyState: string;
  widgetPermissionBoundary: string;
  widgetFallbackPolicy: string;
};

export type DashboardRegistryRole = 'admin' | 'operator' | 'support' | 'franchise' | 'customer';

export const DASHBOARD_LAYOUT_PROFILES = [
  {
    layoutProfileUuid: 'layout-executive-001',
    layoutName: 'Executive Command Layout',
    layoutType: 'Executive',
    layoutOwner: 'dashboard_registry',
    layoutScope: 'executive',
    supportedDevices: ['desktop', 'tablet'],
    supportedWorkspaceTypes: ['executive', 'monitoring', 'analytics'],
    responsivePolicy: 'two_column_priority',
    accessibilityProfile: 'high_contrast_monitoring',
  },
  {
    layoutProfileUuid: 'layout-operations-001',
    layoutName: 'Operations Command Layout',
    layoutType: 'Operations',
    layoutOwner: 'dashboard_registry',
    layoutScope: 'operations',
    supportedDevices: ['desktop', 'tablet'],
    supportedWorkspaceTypes: ['operations', 'human', 'hybrid'],
    responsivePolicy: 'dense_queue_priority',
    accessibilityProfile: 'keyboard_first',
  },
  {
    layoutProfileUuid: 'layout-analytics-001',
    layoutName: 'Analytics Insight Layout',
    layoutType: 'Analytics',
    layoutOwner: 'dashboard_registry',
    layoutScope: 'analytics',
    supportedDevices: ['desktop', 'tablet'],
    supportedWorkspaceTypes: ['analytics', 'executive'],
    responsivePolicy: 'chart_first',
    accessibilityProfile: 'data_table_fallback',
  },
  {
    layoutProfileUuid: 'layout-mobile-001',
    layoutName: 'Mobile Summary Layout',
    layoutType: 'Mobile',
    layoutOwner: 'dashboard_registry',
    layoutScope: 'responsive',
    supportedDevices: ['mobile'],
    supportedWorkspaceTypes: ['customer', 'operator', 'executive'],
    responsivePolicy: 'single_column_priority',
    accessibilityProfile: 'touch_target_expanded',
  },
  {
    layoutProfileUuid: 'layout-ai-001',
    layoutName: 'AI Workspace Layout',
    layoutType: 'AI Workspace',
    layoutOwner: 'dashboard_registry',
    layoutScope: 'ai',
    supportedDevices: ['desktop'],
    supportedWorkspaceTypes: ['ai', 'hybrid'],
    responsivePolicy: 'context_sidecar_priority',
    accessibilityProfile: 'audit_visible',
  },
];

export const DASHBOARD_POLICY_REGISTRY = [
  { policyKey: 'layout-policy-governed', domain: 'layout policies', summary: 'Layouts must come from governed profiles only.' },
  { policyKey: 'widget-policy-governed', domain: 'widget policies', summary: 'Widgets must be registered before use.' },
  { policyKey: 'navigation-policy-context', domain: 'navigation policies', summary: 'Workspace navigation preserves enterprise context.' },
  { policyKey: 'personalization-policy-safe', domain: 'personalization policies', summary: 'Personalization stores UI preferences only.' },
  { policyKey: 'search-policy-governed', domain: 'search policies', summary: 'Search operates on governed identities and projections only.' },
  { policyKey: 'accessibility-policy-enterprise', domain: 'accessibility policies', summary: 'Workspaces must have accessible layout and fallback profiles.' },
  { policyKey: 'performance-policy-budgeted', domain: 'performance policies', summary: 'Widgets must declare refresh, cache, and rendering constraints.' },
];

export const DASHBOARD_PERSONALIZATION_FIELDS = [
  'personalization_uuid',
  'pinned_workspaces',
  'pinned_widgets',
  'recent_workspaces',
  'recent_searches',
  'favorite_actions',
  'dashboard_preferences',
  'layout_preference',
  'default_workspace',
  'shortcut_preferences',
] as const;

export const DASHBOARD_STATE_DOMAINS = [
  'UI State',
  'Workspace State',
  'Session State',
  'Navigation State',
  'Search State',
  'Filter State',
  'Notification State',
  'Selection State',
  'Command State',
] as const;

export const DASHBOARD_EVENT_CATALOG = [
  'Workspace Open',
  'Workspace Close',
  'Workspace Switch',
  'Widget Open',
  'Widget Close',
  'Widget Refresh',
  'Search Started',
  'Search Completed',
  'Command Invoked',
  'Notification Viewed',
  'Approval Viewed',
  'Timeline Viewed',
  'Audit Viewed',
] as const;

export const DASHBOARD_PLUGIN_FIELDS = [
  'plugin_uuid',
  'plugin_name',
  'plugin_version',
  'plugin_owner',
  'plugin_scope',
  'plugin_dependencies',
  'plugin_status',
  'compatibility_version',
  'lifecycle_status',
] as const;

export const CROSS_WORKSPACE_NAVIGATION_FIELDS = [
  'navigation_context',
  'workspace_transition',
  'context_transfer',
  'selection_transfer',
  'deep_link_profile',
  'bookmark_profile',
  'return_path',
  'navigation_history',
] as const;

export const DASHBOARD_PERFORMANCE_FIELDS = [
  'lazy_loading_policy',
  'widget_cache_policy',
  'refresh_policy',
  'render_priority',
  'virtualization_policy',
  'streaming_support',
  'large_dataset_strategy',
  'resource_budget',
] as const;

export const DASHBOARD_TELEMETRY_DOMAINS = [
  'UI usage metrics',
  'workspace usage',
  'widget usage',
  'navigation analytics',
  'search analytics',
  'accessibility analytics',
] as const;

export const BOOKMARK_FIELDS = [
  'bookmark_uuid',
  'bookmark_scope',
  'bookmark_workspace',
  'bookmark_context',
  'bookmark_visibility',
  'bookmark_owner',
] as const;

export const EXPORT_FIELDS = [
  'export profiles',
  'export formats',
  'export permissions',
  'export policies',
  'export audit references',
] as const;

export const LOCALIZATION_FIELDS = [
  'localization profiles',
  'language metadata',
  'regional layout',
  'formatting policy',
] as const;

export const DESIGN_SYSTEM_GOVERNANCE_FIELDS = [
  'component tokens',
  'spacing system',
  'typography system',
  'icon registry',
  'illustration registry',
  'motion policy',
  'color token registry',
  'accessibility tokens',
] as const;

export const ENTERPRISE_WIDGETS: EnterpriseWidgetDefinition[] = [
  {
    widgetUuid: 'widget-command-center-kpi-001',
    widgetKey: 'command-center-kpi-strip',
    widgetName: 'Command Center KPI Strip',
    widgetType: 'kpi',
    widgetCategory: 'executive',
    widgetVersion: 1,
    widgetOwner: 'dashboard_registry',
    widgetStatus: 'Published',
    widgetScope: 'command_center',
    widgetPermissions: ['admin', 'operator', 'support', 'franchise'],
    widgetDependencies: ['universal-business-objects', 'customer-360', 'order-orchestration'],
    widgetDataSources: ['orders', 'customers', 'payments', 'workforce'],
    widgetRefreshPolicy: 'governed_refresh_window',
    widgetCachePolicy: 'ephemeral_ui_cache',
    widgetVisibility: 'internal',
    widgetLayoutConstraints: ['executive', 'operations', 'analytics'],
    widgetInputContract: ['enterprise object counts', 'read model totals'],
    widgetOutputContract: ['display-safe operational counters'],
    widgetRefreshStrategy: 'manual_or_interval_metadata_only',
    widgetLoadingStrategy: 'skeleton_kpi',
    widgetErrorStrategy: 'fallback_to_last_safe_projection',
    widgetEmptyState: 'show_zero_state_with_governance_note',
    widgetPermissionBoundary: 'admin_governed_projection_only',
    widgetFallbackPolicy: 'show empty governed shell',
  },
  {
    widgetUuid: 'widget-workspace-launcher-001',
    widgetKey: 'workspace-launcher-grid',
    widgetName: 'Workspace Launcher Grid',
    widgetType: 'launcher',
    widgetCategory: 'navigation',
    widgetVersion: 1,
    widgetOwner: 'dashboard_registry',
    widgetStatus: 'Published',
    widgetScope: 'all_workspaces',
    widgetPermissions: ['admin', 'operator', 'support', 'franchise'],
    widgetDependencies: ['workspace-registry'],
    widgetDataSources: ['workspace registry'],
    widgetRefreshPolicy: 'registry_change_only',
    widgetCachePolicy: 'stable_registry_cache',
    widgetVisibility: 'internal',
    widgetLayoutConstraints: ['executive', 'operations', 'mobile'],
    widgetInputContract: ['workspace metadata'],
    widgetOutputContract: ['launchable workspace cards'],
    widgetRefreshStrategy: 'registry read',
    widgetLoadingStrategy: 'metadata immediate',
    widgetErrorStrategy: 'hide unavailable cards',
    widgetEmptyState: 'show workspace registry empty state',
    widgetPermissionBoundary: 'workspace visibility rules',
    widgetFallbackPolicy: 'route to command center',
  },
  {
    widgetUuid: 'widget-notification-center-001',
    widgetKey: 'notification-center',
    widgetName: 'Enterprise Notification Center',
    widgetType: 'feed',
    widgetCategory: 'communication',
    widgetVersion: 1,
    widgetOwner: 'dashboard_registry',
    widgetStatus: 'Published',
    widgetScope: 'shell',
    widgetPermissions: ['admin', 'operator', 'support', 'franchise', 'customer'],
    widgetDependencies: ['notification-registry', 'communication-foundation'],
    widgetDataSources: ['notifications', 'conversations'],
    widgetRefreshPolicy: 'session_scoped',
    widgetCachePolicy: 'session_cache',
    widgetVisibility: 'role_filtered',
    widgetLayoutConstraints: ['operations', 'mobile'],
    widgetInputContract: ['notification projections'],
    widgetOutputContract: ['display-safe notifications'],
    widgetRefreshStrategy: 'user_initiated_or_live_source',
    widgetLoadingStrategy: 'drawer_prefetch',
    widgetErrorStrategy: 'show notification unavailable',
    widgetEmptyState: 'no_notifications',
    widgetPermissionBoundary: 'customer_safe_or_admin_governed',
    widgetFallbackPolicy: 'preserve shell access',
  },
  {
    widgetUuid: 'widget-activity-timeline-001',
    widgetKey: 'activity-timeline',
    widgetName: 'Enterprise Activity Timeline',
    widgetType: 'timeline',
    widgetCategory: 'observability',
    widgetVersion: 1,
    widgetOwner: 'dashboard_registry',
    widgetStatus: 'Published',
    widgetScope: 'command_center',
    widgetPermissions: ['admin', 'operator', 'support'],
    widgetDependencies: ['activity-registry'],
    widgetDataSources: ['activities', 'orders', 'documents', 'communications'],
    widgetRefreshPolicy: 'manual_refresh_visible',
    widgetCachePolicy: 'short_lived_ui_cache',
    widgetVisibility: 'internal',
    widgetLayoutConstraints: ['operations', 'executive'],
    widgetInputContract: ['activity projections'],
    widgetOutputContract: ['timeline rows'],
    widgetRefreshStrategy: 'projection_refresh',
    widgetLoadingStrategy: 'progressive feed',
    widgetErrorStrategy: 'timeline unavailable card',
    widgetEmptyState: 'no_recent_activity',
    widgetPermissionBoundary: 'internal_projection_only',
    widgetFallbackPolicy: 'keep workspace usable',
  },
  {
    widgetUuid: 'widget-audit-timeline-001',
    widgetKey: 'audit-timeline',
    widgetName: 'Enterprise Audit Timeline',
    widgetType: 'timeline',
    widgetCategory: 'governance',
    widgetVersion: 1,
    widgetOwner: 'dashboard_registry',
    widgetStatus: 'Published',
    widgetScope: 'governance',
    widgetPermissions: ['admin'],
    widgetDependencies: ['audit-registry'],
    widgetDataSources: ['audit projections', 'governed events'],
    widgetRefreshPolicy: 'manual_review_refresh',
    widgetCachePolicy: 'no_long_term_ui_cache',
    widgetVisibility: 'admin',
    widgetLayoutConstraints: ['executive', 'operations'],
    widgetInputContract: ['audit-safe events'],
    widgetOutputContract: ['audit timeline entries'],
    widgetRefreshStrategy: 'review_session_only',
    widgetLoadingStrategy: 'paged feed',
    widgetErrorStrategy: 'audit locked fallback',
    widgetEmptyState: 'no_audit_entries',
    widgetPermissionBoundary: 'admin_only',
    widgetFallbackPolicy: 'hide sensitive details',
  },
  {
    widgetUuid: 'widget-registry-health-001',
    widgetKey: 'registry-health-summary',
    widgetName: 'Registry Health Summary',
    widgetType: 'status',
    widgetCategory: 'governance',
    widgetVersion: 1,
    widgetOwner: 'dashboard_registry',
    widgetStatus: 'Published',
    widgetScope: 'command_center',
    widgetPermissions: ['admin', 'operator'],
    widgetDependencies: ['dashboard-registry', 'intelligence-registry'],
    widgetDataSources: ['dashboard registry', 'enterprise intelligence references'],
    widgetRefreshPolicy: 'registry_change_only',
    widgetCachePolicy: 'stable_registry_cache',
    widgetVisibility: 'internal',
    widgetLayoutConstraints: ['executive', 'analytics'],
    widgetInputContract: ['registry metadata counts'],
    widgetOutputContract: ['registry health status'],
    widgetRefreshStrategy: 'metadata snapshot',
    widgetLoadingStrategy: 'synchronous metadata render',
    widgetErrorStrategy: 'show governance warning',
    widgetEmptyState: 'registry not loaded',
    widgetPermissionBoundary: 'internal_governance_view',
    widgetFallbackPolicy: 'show relationship note only',
  },
  {
    widgetUuid: 'widget-search-console-001',
    widgetKey: 'search-console',
    widgetName: 'Universal Search Console',
    widgetType: 'search',
    widgetCategory: 'navigation',
    widgetVersion: 1,
    widgetOwner: 'dashboard_registry',
    widgetStatus: 'Published',
    widgetScope: 'shell',
    widgetPermissions: ['admin', 'operator', 'support', 'franchise', 'customer'],
    widgetDependencies: ['search-registry', 'workspace-registry'],
    widgetDataSources: ['workspace registry', 'panel registry', 'governed search scopes'],
    widgetRefreshPolicy: 'query_scoped',
    widgetCachePolicy: 'recent_query_cache',
    widgetVisibility: 'role_filtered',
    widgetLayoutConstraints: ['desktop', 'mobile'],
    widgetInputContract: ['search query', 'role', 'workspace context'],
    widgetOutputContract: ['governed search results'],
    widgetRefreshStrategy: 'query_driven',
    widgetLoadingStrategy: 'instant metadata first',
    widgetErrorStrategy: 'show retry with no state mutation',
    widgetEmptyState: 'no_search_results',
    widgetPermissionBoundary: 'projection boundary by role',
    widgetFallbackPolicy: 'show workspace shortcuts',
  },
  {
    widgetUuid: 'widget-approval-center-001',
    widgetKey: 'approval-center',
    widgetName: 'Safety and Approval Center',
    widgetType: 'governance',
    widgetCategory: 'approval',
    widgetVersion: 1,
    widgetOwner: 'dashboard_registry',
    widgetStatus: 'Published',
    widgetScope: 'governance',
    widgetPermissions: ['admin', 'operator'],
    widgetDependencies: ['approval-policy', 'safety-policy'],
    widgetDataSources: ['approval policies', 'safety metadata'],
    widgetRefreshPolicy: 'policy_change_only',
    widgetCachePolicy: 'stable_registry_cache',
    widgetVisibility: 'internal',
    widgetLayoutConstraints: ['executive', 'operations'],
    widgetInputContract: ['governed approval and safety metadata'],
    widgetOutputContract: ['read-only approval surfaces'],
    widgetRefreshStrategy: 'metadata snapshot',
    widgetLoadingStrategy: 'card summary',
    widgetErrorStrategy: 'policy unavailable',
    widgetEmptyState: 'no_approval_profiles',
    widgetPermissionBoundary: 'admin_or_operator_governance_view',
    widgetFallbackPolicy: 'show policy references only',
  },
];

export const ENTERPRISE_WORKSPACES: EnterpriseWorkspaceDefinition[] = [
  {
    workspaceKey: 'command-center',
    panel: 'command-center',
    name: 'Enterprise Command Center',
    category: 'core',
    description: 'Primary dashboard registry workspace for enterprise operations, governance visibility, and workspace launch.',
    icon: 'panel-top',
    owner: 'dashboard_registry',
    workspaceVersion: 1,
    workspaceStatus: 'Active',
    workspaceLifecycle: 'Published',
    supportedRoles: ['admin', 'operator', 'support', 'franchise'],
    supportedWorkspaceTypes: ['command_center', 'hybrid', 'human'],
    compatibleLayouts: ['layout-operations-001', 'layout-executive-001'],
    widgetKeys: ['command-center-kpi-strip', 'workspace-launcher-grid', 'registry-health-summary', 'activity-timeline', 'notification-center'],
    capabilityReferences: ['workspace.launch', 'registry.observe', 'search.invoke'],
    policyReferences: ['layout-policy-governed', 'widget-policy-governed', 'search-policy-governed'],
    intelligenceReferences: ['enterprise_intelligence_registry', 'enterprise_context_registry', 'enterprise_approval_registry'],
    businessFoundationReferences: ['universal_business_objects', 'customer_360', 'service_dna', 'order_orchestration', 'document_registry', 'omnichannel', 'workforce_branch_executive'],
    actionBoundary: 'consumer_only',
    approvalBoundary: 'no_runtime_approval_execution',
    defaultVisibility: 'internal',
  },
  {
    workspaceKey: 'executive-workspace',
    panel: 'executive-workspace',
    name: 'Executive Workspace',
    category: 'executive',
    description: 'Read-only executive command surface for business health, KPI, governance pulse, and network visibility.',
    icon: 'line-chart',
    owner: 'executive_layer',
    workspaceVersion: 1,
    workspaceStatus: 'Active',
    workspaceLifecycle: 'Published',
    supportedRoles: ['admin'],
    supportedWorkspaceTypes: ['executive', 'analytics'],
    compatibleLayouts: ['layout-executive-001', 'layout-analytics-001'],
    widgetKeys: ['command-center-kpi-strip', 'registry-health-summary', 'approval-center'],
    capabilityReferences: ['kpi.view', 'network.view', 'governance.monitor'],
    policyReferences: ['layout-policy-governed', 'performance-policy-budgeted'],
    intelligenceReferences: ['enterprise_intelligence_registry', 'enterprise_safety_registry'],
    businessFoundationReferences: ['workforce_branch_executive', 'order_orchestration', 'document_registry', 'omnichannel'],
    actionBoundary: 'read_only',
    approvalBoundary: 'view_only',
    defaultVisibility: 'executive',
  },
  {
    workspaceKey: 'operations-workspace',
    panel: 'home',
    name: 'Operations Workspace',
    category: 'human',
    description: 'Operational command surface for orders, tasks, customers, communications, and workflow pulse.',
    icon: 'git-commit',
    owner: 'operations',
    workspaceVersion: 1,
    workspaceStatus: 'Active',
    workspaceLifecycle: 'Published',
    supportedRoles: ['admin', 'operator', 'support'],
    supportedWorkspaceTypes: ['operations', 'human'],
    compatibleLayouts: ['layout-operations-001'],
    widgetKeys: ['command-center-kpi-strip', 'activity-timeline', 'notification-center'],
    capabilityReferences: ['orders.view', 'tasks.view', 'communications.view'],
    policyReferences: ['widget-policy-governed', 'navigation-policy-context'],
    intelligenceReferences: ['enterprise_source_hierarchy', 'enterprise_intelligence_registry'],
    businessFoundationReferences: ['customer_360', 'order_orchestration', 'document_registry', 'omnichannel'],
    actionBoundary: 'existing_operational_routes_only',
    approvalBoundary: 'existing_manual_controls',
    defaultVisibility: 'internal',
  },
  {
    workspaceKey: 'knowledge-workspace',
    panel: 'knowledge-workspace',
    name: 'Knowledge Workspace',
    category: 'intelligence',
    description: 'Read-only enterprise knowledge surface consuming governed domains, articles, versions, and source hierarchy.',
    icon: 'book-open',
    owner: 'enterprise_intelligence_registry',
    workspaceVersion: 1,
    workspaceStatus: 'Active',
    workspaceLifecycle: 'Published',
    supportedRoles: ['admin', 'operator'],
    supportedWorkspaceTypes: ['knowledge', 'governance'],
    compatibleLayouts: ['layout-operations-001', 'layout-analytics-001'],
    widgetKeys: ['registry-health-summary', 'search-console'],
    capabilityReferences: ['knowledge.view', 'source_hierarchy.view'],
    policyReferences: ['search-policy-governed', 'accessibility-policy-enterprise'],
    intelligenceReferences: ['knowledge_domains', 'knowledge_articles', 'knowledge_versions', 'source_hierarchy'],
    businessFoundationReferences: ['service_dna', 'customer_360'],
    actionBoundary: 'consumer_only',
    approvalBoundary: 'governed_operation_future',
    defaultVisibility: 'internal',
  },
  {
    workspaceKey: 'prompt-workspace',
    panel: 'prompt-workspace',
    name: 'Prompt Governance Workspace',
    category: 'intelligence',
    description: 'Governed prompt profile, template, version, and scope explorer consuming enterprise prompt registries.',
    icon: 'message-square-text',
    owner: 'enterprise_intelligence_registry',
    workspaceVersion: 1,
    workspaceStatus: 'Active',
    workspaceLifecycle: 'Published',
    supportedRoles: ['admin'],
    supportedWorkspaceTypes: ['governance', 'ai'],
    compatibleLayouts: ['layout-operations-001', 'layout-ai-001'],
    widgetKeys: ['registry-health-summary', 'search-console'],
    capabilityReferences: ['prompt.view', 'prompt_scope.view'],
    policyReferences: ['widget-policy-governed', 'performance-policy-budgeted'],
    intelligenceReferences: ['prompt_profiles', 'prompt_templates', 'prompt_versions'],
    businessFoundationReferences: ['enterprise_intelligence_core'],
    actionBoundary: 'consumer_only',
    approvalBoundary: 'future_governed_operations',
    defaultVisibility: 'admin',
  },
  {
    workspaceKey: 'persona-workspace',
    panel: 'persona-workspace',
    name: 'Persona Registry Workspace',
    category: 'ai',
    description: 'Read-only persona and persona-composition explorer for future AI employee identity planning.',
    icon: 'bot',
    owner: 'enterprise_intelligence_registry',
    workspaceVersion: 1,
    workspaceStatus: 'Active',
    workspaceLifecycle: 'Published',
    supportedRoles: ['admin'],
    supportedWorkspaceTypes: ['ai', 'governance'],
    compatibleLayouts: ['layout-ai-001', 'layout-operations-001'],
    widgetKeys: ['registry-health-summary', 'search-console'],
    capabilityReferences: ['persona.view', 'persona_scope.view'],
    policyReferences: ['widget-policy-governed', 'search-policy-governed'],
    intelligenceReferences: ['personas', 'persona_versions', 'capabilities', 'safety_policies'],
    businessFoundationReferences: ['workforce_branch_executive'],
    actionBoundary: 'consumer_only',
    approvalBoundary: 'future_governed_operations',
    defaultVisibility: 'admin',
  },
  {
    workspaceKey: 'capability-workspace',
    panel: 'capability-workspace',
    name: 'Capability Registry Workspace',
    category: 'governance',
    description: 'Capability explorer for governed AI and dashboard capability references without duplicated action logic.',
    icon: 'shield-check',
    owner: 'enterprise_intelligence_registry',
    workspaceVersion: 1,
    workspaceStatus: 'Active',
    workspaceLifecycle: 'Published',
    supportedRoles: ['admin', 'operator'],
    supportedWorkspaceTypes: ['governance', 'ai'],
    compatibleLayouts: ['layout-operations-001', 'layout-ai-001'],
    widgetKeys: ['registry-health-summary', 'approval-center'],
    capabilityReferences: ['capability.view', 'workspace_capability_matrix.view'],
    policyReferences: ['widget-policy-governed', 'performance-policy-budgeted'],
    intelligenceReferences: ['capabilities', 'action_policies', 'approval_policies'],
    businessFoundationReferences: ['enterprise_intelligence_core'],
    actionBoundary: 'consumer_only',
    approvalBoundary: 'governance_view_only',
    defaultVisibility: 'internal',
  },
  {
    workspaceKey: 'tool-registry-workspace',
    panel: 'tool-registry',
    name: 'Tool Registry Workspace',
    category: 'governance',
    description: 'Future tool and execution boundary registry surface for governed enterprise tool metadata only.',
    icon: 'wrench',
    owner: 'enterprise_intelligence_registry',
    workspaceVersion: 1,
    workspaceStatus: 'Active',
    workspaceLifecycle: 'Published',
    supportedRoles: ['admin'],
    supportedWorkspaceTypes: ['governance', 'ai'],
    compatibleLayouts: ['layout-ai-001', 'layout-operations-001'],
    widgetKeys: ['registry-health-summary'],
    capabilityReferences: ['tool.view', 'tool_boundary.view'],
    policyReferences: ['performance-policy-budgeted', 'accessibility-policy-enterprise'],
    intelligenceReferences: ['tool_registry', 'action_policies', 'safety_policies'],
    businessFoundationReferences: ['enterprise_intelligence_core'],
    actionBoundary: 'no_tool_execution',
    approvalBoundary: 'metadata_only',
    defaultVisibility: 'admin',
  },
  {
    workspaceKey: 'safety-approval-workspace',
    panel: 'safety-approvals',
    name: 'Safety & Approval Workspace',
    category: 'governance',
    description: 'Governed safety classes, approval boundaries, and explainability policy surface.',
    icon: 'shield',
    owner: 'enterprise_intelligence_registry',
    workspaceVersion: 1,
    workspaceStatus: 'Active',
    workspaceLifecycle: 'Published',
    supportedRoles: ['admin', 'operator'],
    supportedWorkspaceTypes: ['governance', 'approval'],
    compatibleLayouts: ['layout-executive-001', 'layout-operations-001'],
    widgetKeys: ['approval-center', 'registry-health-summary'],
    capabilityReferences: ['approval.view', 'safety.view'],
    policyReferences: ['widget-policy-governed', 'layout-policy-governed'],
    intelligenceReferences: ['approval_policies', 'safety_policies', 'confidence_policies'],
    businessFoundationReferences: ['enterprise_intelligence_core'],
    actionBoundary: 'no_runtime_approval_execution',
    approvalBoundary: 'metadata_only',
    defaultVisibility: 'internal',
  },
  {
    workspaceKey: 'context-explorer',
    panel: 'context-explorer',
    name: 'Context Explorer',
    category: 'intelligence',
    description: 'Governed context metadata explorer for context profiles, source resolution, privacy class, and freshness.',
    icon: 'layers-3',
    owner: 'enterprise_intelligence_registry',
    workspaceVersion: 1,
    workspaceStatus: 'Active',
    workspaceLifecycle: 'Published',
    supportedRoles: ['admin', 'operator'],
    supportedWorkspaceTypes: ['governance', 'ai', 'hybrid'],
    compatibleLayouts: ['layout-ai-001', 'layout-analytics-001'],
    widgetKeys: ['search-console', 'registry-health-summary'],
    capabilityReferences: ['context.view', 'source_priority.view'],
    policyReferences: ['search-policy-governed'],
    intelligenceReferences: ['context_profiles', 'source_hierarchy', 'knowledge_authority'],
    businessFoundationReferences: ['customer_360', 'service_dna', 'order_orchestration', 'document_registry', 'omnichannel', 'workforce_branch_executive'],
    actionBoundary: 'consumer_only',
    approvalBoundary: 'metadata_only',
    defaultVisibility: 'internal',
  },
  {
    workspaceKey: 'decision-explorer',
    panel: 'decision-explorer',
    name: 'Decision Explorer',
    category: 'governance',
    description: 'Governed decision metadata explorer for explainability, source references, and confidence boundaries.',
    icon: 'git-fork',
    owner: 'enterprise_intelligence_registry',
    workspaceVersion: 1,
    workspaceStatus: 'Active',
    workspaceLifecycle: 'Published',
    supportedRoles: ['admin'],
    supportedWorkspaceTypes: ['governance', 'executive'],
    compatibleLayouts: ['layout-executive-001', 'layout-ai-001'],
    widgetKeys: ['audit-timeline', 'registry-health-summary'],
    capabilityReferences: ['decision.view', 'explainability.view'],
    policyReferences: ['search-policy-governed', 'performance-policy-budgeted'],
    intelligenceReferences: ['decisions', 'confidence_policies', 'approval_policies'],
    businessFoundationReferences: ['enterprise_intelligence_core'],
    actionBoundary: 'metadata_only',
    approvalBoundary: 'view_only',
    defaultVisibility: 'admin',
  },
  {
    workspaceKey: 'observation-explorer',
    panel: 'observation-explorer',
    name: 'Observation Explorer',
    category: 'governance',
    description: 'Observation metadata explorer clarifying the boundary between observations, knowledge, and memory.',
    icon: 'eye',
    owner: 'enterprise_intelligence_registry',
    workspaceVersion: 1,
    workspaceStatus: 'Active',
    workspaceLifecycle: 'Published',
    supportedRoles: ['admin', 'operator'],
    supportedWorkspaceTypes: ['governance', 'ai'],
    compatibleLayouts: ['layout-analytics-001', 'layout-ai-001'],
    widgetKeys: ['registry-health-summary'],
    capabilityReferences: ['observation.view'],
    policyReferences: ['widget-policy-governed'],
    intelligenceReferences: ['observations', 'knowledge_authority', 'context_profiles'],
    businessFoundationReferences: ['enterprise_intelligence_core'],
    actionBoundary: 'metadata_only',
    approvalBoundary: 'view_only',
    defaultVisibility: 'internal',
  },
  {
    workspaceKey: 'branch-workspace',
    panel: 'branch-workspace',
    name: 'Branch Workspace',
    category: 'business',
    description: 'Governed branch workspace using branch UUID references, network visibility, and operational pulse.',
    icon: 'store',
    owner: 'workforce_branch_executive',
    workspaceVersion: 1,
    workspaceStatus: 'Active',
    workspaceLifecycle: 'Published',
    supportedRoles: ['admin', 'franchise'],
    supportedWorkspaceTypes: ['branch', 'franchise', 'operations'],
    compatibleLayouts: ['layout-operations-001', 'layout-mobile-001'],
    widgetKeys: ['command-center-kpi-strip', 'notification-center'],
    capabilityReferences: ['branch.view', 'network.view'],
    policyReferences: ['navigation-policy-context', 'performance-policy-budgeted'],
    intelligenceReferences: ['enterprise_intelligence_registry'],
    businessFoundationReferences: ['workforce_branch_executive', 'order_orchestration', 'customer_360'],
    actionBoundary: 'existing_branch_routes_only',
    approvalBoundary: 'existing_manual_controls',
    defaultVisibility: 'internal',
  },
  {
    workspaceKey: 'department-workspace',
    panel: 'department-workspace',
    name: 'Department Workspace',
    category: 'business',
    description: 'Department ownership workspace for governed queues, workforce alignment, and operational responsibility.',
    icon: 'building-2',
    owner: 'workforce_branch_executive',
    workspaceVersion: 1,
    workspaceStatus: 'Active',
    workspaceLifecycle: 'Published',
    supportedRoles: ['admin', 'operator', 'support'],
    supportedWorkspaceTypes: ['department', 'operations'],
    compatibleLayouts: ['layout-operations-001'],
    widgetKeys: ['command-center-kpi-strip', 'activity-timeline'],
    capabilityReferences: ['department.view', 'queue.view'],
    policyReferences: ['layout-policy-governed'],
    intelligenceReferences: ['enterprise_intelligence_registry'],
    businessFoundationReferences: ['workforce_branch_executive', 'order_orchestration', 'omnichannel'],
    actionBoundary: 'existing_operational_routes_only',
    approvalBoundary: 'manual_controls_only',
    defaultVisibility: 'internal',
  },
  {
    workspaceKey: 'franchise-workspace',
    panel: 'franchise-workspace',
    name: 'Franchise Workspace',
    category: 'business',
    description: 'Franchise network workspace consuming branch and executive foundations without introducing finance automation.',
    icon: 'briefcase-business',
    owner: 'workforce_branch_executive',
    workspaceVersion: 1,
    workspaceStatus: 'Active',
    workspaceLifecycle: 'Published',
    supportedRoles: ['admin', 'franchise'],
    supportedWorkspaceTypes: ['franchise', 'executive'],
    compatibleLayouts: ['layout-operations-001', 'layout-executive-001'],
    widgetKeys: ['command-center-kpi-strip', 'notification-center'],
    capabilityReferences: ['franchise.view', 'network.view'],
    policyReferences: ['layout-policy-governed', 'navigation-policy-context'],
    intelligenceReferences: ['enterprise_intelligence_registry'],
    businessFoundationReferences: ['workforce_branch_executive', 'customer_360'],
    actionBoundary: 'no_settlement_automation',
    approvalBoundary: 'manual_controls_only',
    defaultVisibility: 'internal',
  },
  {
    workspaceKey: 'ai-workspace',
    panel: 'ai-workspace',
    name: 'AI Workspace Hub',
    category: 'ai',
    description: 'Future AI employee workspace directory consuming governed personas, prompts, safety, approval, context, and capability registries.',
    icon: 'sparkles',
    owner: 'enterprise_intelligence_registry',
    workspaceVersion: 1,
    workspaceStatus: 'Active',
    workspaceLifecycle: 'Published',
    supportedRoles: ['admin'],
    supportedWorkspaceTypes: ['ai', 'hybrid'],
    compatibleLayouts: ['layout-ai-001', 'layout-executive-001'],
    widgetKeys: ['workspace-launcher-grid', 'registry-health-summary', 'approval-center'],
    capabilityReferences: ['persona.view', 'capability.view', 'approval.view', 'context.view'],
    policyReferences: ['widget-policy-governed', 'search-policy-governed', 'performance-policy-budgeted'],
    intelligenceReferences: ['personas', 'prompt_profiles', 'capabilities', 'tools', 'approval_policies', 'safety_policies', 'context_profiles', 'confidence_policies'],
    businessFoundationReferences: ['customer_360', 'service_dna', 'order_orchestration', 'document_registry', 'omnichannel', 'workforce_branch_executive'],
    actionBoundary: 'no_runtime_ai_execution',
    approvalBoundary: 'metadata_only',
    defaultVisibility: 'admin',
  },
];

export const WORKSPACE_CAPABILITY_MATRIX = [
  { workspaceCapabilityUuid: 'wcap-001', workspaceKey: 'command-center', capabilityReference: 'workspace.launch', allowedRoles: ['admin', 'operator', 'support', 'franchise'], approvalBoundary: 'none', actionBoundary: 'navigation_only' },
  { workspaceCapabilityUuid: 'wcap-002', workspaceKey: 'executive-workspace', capabilityReference: 'kpi.view', allowedRoles: ['admin'], approvalBoundary: 'read_only', actionBoundary: 'view_only' },
  { workspaceCapabilityUuid: 'wcap-003', workspaceKey: 'knowledge-workspace', capabilityReference: 'knowledge.view', allowedRoles: ['admin', 'operator'], approvalBoundary: 'consumer_only', actionBoundary: 'view_only' },
  { workspaceCapabilityUuid: 'wcap-004', workspaceKey: 'prompt-workspace', capabilityReference: 'prompt.view', allowedRoles: ['admin'], approvalBoundary: 'consumer_only', actionBoundary: 'view_only' },
  { workspaceCapabilityUuid: 'wcap-005', workspaceKey: 'persona-workspace', capabilityReference: 'persona.view', allowedRoles: ['admin'], approvalBoundary: 'consumer_only', actionBoundary: 'view_only' },
  { workspaceCapabilityUuid: 'wcap-006', workspaceKey: 'capability-workspace', capabilityReference: 'capability.view', allowedRoles: ['admin', 'operator'], approvalBoundary: 'consumer_only', actionBoundary: 'view_only' },
  { workspaceCapabilityUuid: 'wcap-007', workspaceKey: 'tool-registry-workspace', capabilityReference: 'tool.view', allowedRoles: ['admin'], approvalBoundary: 'metadata_only', actionBoundary: 'view_only' },
  { workspaceCapabilityUuid: 'wcap-008', workspaceKey: 'safety-approval-workspace', capabilityReference: 'approval.view', allowedRoles: ['admin', 'operator'], approvalBoundary: 'metadata_only', actionBoundary: 'view_only' },
];

export const WORKSPACE_DEPENDENCY_GRAPH = [
  { dependencyUuid: 'dep-001', sourceWorkspace: 'command-center', targetWorkspace: 'executive-workspace', dependencyType: 'launches', dependencyStrength: 'strong', dependencyDirection: 'outbound' },
  { dependencyUuid: 'dep-002', sourceWorkspace: 'command-center', targetWorkspace: 'knowledge-workspace', dependencyType: 'references', dependencyStrength: 'strong', dependencyDirection: 'outbound' },
  { dependencyUuid: 'dep-003', sourceWorkspace: 'ai-workspace', targetWorkspace: 'persona-workspace', dependencyType: 'consumes', dependencyStrength: 'strong', dependencyDirection: 'outbound' },
  { dependencyUuid: 'dep-004', sourceWorkspace: 'ai-workspace', targetWorkspace: 'context-explorer', dependencyType: 'consumes', dependencyStrength: 'strong', dependencyDirection: 'outbound' },
  { dependencyUuid: 'dep-005', sourceWorkspace: 'executive-workspace', targetWorkspace: 'branch-workspace', dependencyType: 'monitors', dependencyStrength: 'medium', dependencyDirection: 'outbound' },
  { dependencyUuid: 'dep-006', sourceWorkspace: 'department-workspace', targetWorkspace: 'operations-workspace', dependencyType: 'shares_context', dependencyStrength: 'medium', dependencyDirection: 'bidirectional' },
];

export const WORKSPACE_VERSION_COMPATIBILITY = [
  { workspaceKey: 'command-center', compatibleLayouts: ['layout-operations-001', 'layout-executive-001'], compatibleWidgets: ['command-center-kpi-strip', 'workspace-launcher-grid'], compatibleDashboardVersions: ['3.3'], deprecatedAfter: null, minimumDashboardVersion: '3.3' },
  { workspaceKey: 'executive-workspace', compatibleLayouts: ['layout-executive-001', 'layout-analytics-001'], compatibleWidgets: ['registry-health-summary', 'approval-center'], compatibleDashboardVersions: ['3.3'], deprecatedAfter: null, minimumDashboardVersion: '3.3' },
  { workspaceKey: 'ai-workspace', compatibleLayouts: ['layout-ai-001'], compatibleWidgets: ['workspace-launcher-grid', 'approval-center'], compatibleDashboardVersions: ['3.3'], deprecatedAfter: null, minimumDashboardVersion: '3.3' },
];

export const ENTERPRISE_DASHBOARD_REGISTRY = {
  registryKey: 'enterprise-dashboard-registry',
  registryVersion: 1,
  referencesEnterpriseIntelligenceRegistry: true,
  registryDirection: ['dashboard_registry', 'enterprise_intelligence_registry', 'business_foundations'],
  registeredDomains: [
    'Workspace Registry',
    'Widget Registry',
    'Layout Registry',
    'Navigation Registry',
    'Search Registry',
    'Command Registry',
    'Notification Registry',
    'Activity Registry',
    'Audit Registry',
    'Explorer Registry',
    'Dashboard Module Registry',
  ],
  prohibitedBehavior: [
    'duplicate intelligence registry',
    'duplicate knowledge',
    'duplicate prompts',
    'duplicate personas',
    'duplicate capabilities',
    'duplicate tools',
  ],
};

export function canAccessWorkspace(role: DashboardRegistryRole, workspace: EnterpriseWorkspaceDefinition) {
  return workspace.supportedRoles.includes(role);
}

export function getVisibleWorkspaces(role: DashboardRegistryRole) {
  return ENTERPRISE_WORKSPACES.filter((workspace) => canAccessWorkspace(role, workspace));
}

export function getRegistryNavigationLinks(role: DashboardRegistryRole) {
  return getVisibleWorkspaces(role)
    .filter((workspace) => workspace.workspaceKey === 'command-center')
    .map((workspace) => ({
      label: workspace.name,
      panel: workspace.panel,
      icon: 'command',
      group: 'Navigation',
    }));
}

export function getWorkspaceByPanel(panel: string) {
  return ENTERPRISE_WORKSPACES.find((workspace) => workspace.panel === panel);
}

export function getWorkspaceByKey(workspaceKey: string) {
  return ENTERPRISE_WORKSPACES.find((workspace) => workspace.workspaceKey === workspaceKey);
}

export function getWidgetByKey(widgetKey: string) {
  return ENTERPRISE_WIDGETS.find((widget) => widget.widgetKey === widgetKey);
}

export function canAccessWidget(role: DashboardRegistryRole, widget: EnterpriseWidgetDefinition) {
  return widget.widgetPermissions.includes(role);
}

export function searchDashboardRegistry(query: string, role?: DashboardRegistryRole) {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const visibleWorkspaces = role ? getVisibleWorkspaces(role) : ENTERPRISE_WORKSPACES;

  const workspaceHits = visibleWorkspaces.filter((workspace) =>
    [
      workspace.name,
      workspace.category,
      workspace.description,
      ...workspace.intelligenceReferences,
      ...workspace.businessFoundationReferences,
    ].some((value) => value.toLowerCase().includes(q))
  ).map((workspace) => ({
    id: `workspace-${workspace.workspaceKey}`,
    label: workspace.name,
    sub: workspace.description,
    icon: workspace.icon,
    group: 'Enterprise Workspaces',
    panel: workspace.panel,
  }));

  const widgetHits = ENTERPRISE_WIDGETS.filter((widget) => {
    if (role && !canAccessWidget(role, widget)) return false;
    return [
      widget.widgetName,
      widget.widgetCategory,
      widget.widgetScope,
      ...widget.widgetDataSources,
    ].some((value) => value.toLowerCase().includes(q));
  }).map((widget) => ({
    id: `widget-${widget.widgetKey}`,
    label: widget.widgetName,
    sub: `${widget.widgetCategory} | ${widget.widgetScope}`,
    icon: 'layout-grid',
    group: 'Enterprise Widgets',
    panel: 'command-center',
  }));

  const policyHits = DASHBOARD_POLICY_REGISTRY.filter((policy) =>
    `${policy.domain} ${policy.summary}`.toLowerCase().includes(q)
  ).map((policy) => ({
    id: `policy-${policy.policyKey}`,
    label: policy.domain,
    sub: policy.summary,
    icon: 'shield',
    group: 'Dashboard Policies',
    panel: 'command-center',
  }));

  return [...workspaceHits, ...widgetHits, ...policyHits];
}

export function getRegistryCounts() {
  return {
    workspaces: ENTERPRISE_WORKSPACES.length,
    widgets: ENTERPRISE_WIDGETS.length,
    layouts: DASHBOARD_LAYOUT_PROFILES.length,
    policies: DASHBOARD_POLICY_REGISTRY.length,
    capabilities: WORKSPACE_CAPABILITY_MATRIX.length,
    dependencies: WORKSPACE_DEPENDENCY_GRAPH.length,
  };
}
