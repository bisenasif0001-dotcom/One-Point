import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Badge, Icon } from '../Shared';
import { useApp } from '../AppContext';

type EmployeeTab =
  | 'overview'
  | 'verification'
  | 'tasks'
  | 'attendance'
  | 'knowledge'
  | 'performance'
  | 'communication'
  | 'security';

type EmployeeTask = {
  id: string;
  applicationId: string;
  customerName: string;
  serviceName: string;
  submittedAt: string;
  slaHoursLeft: number;
  priority: 'Critical' | 'High' | 'Normal';
  status: 'Assigned' | 'In Progress' | 'Waiting' | 'Completed' | 'Returned';
  assignee: string;
  channel: string;
  documents: string[];
  checklist: string[];
  note: string;
};

const STORAGE_KEY = 'opds_emp_active_tab';

const tabMap: Record<string, EmployeeTab> = {
  dashboard: 'overview',
  verification: 'verification',
  kanban: 'tasks',
  sop: 'knowledge',
  kpi: 'performance',
  overview: 'overview',
  tasks: 'tasks',
  attendance: 'attendance',
  knowledge: 'knowledge',
  performance: 'performance',
  communication: 'communication',
  security: 'security',
};

const employeeTasksSeed: EmployeeTask[] = [
  {
    id: 'EVQ-2407-018',
    applicationId: 'OPDS-20260708-000184',
    customerName: 'Aarav Mehta',
    serviceName: 'PAN Card Correction',
    submittedAt: '2026-07-08 09:12',
    slaHoursLeft: 1.4,
    priority: 'Critical',
    status: 'Assigned',
    assignee: 'Asif Bisen',
    channel: 'Customer Portal',
    documents: ['PAN proof', 'Aadhaar front', 'Signed correction form'],
    checklist: ['Photo clarity', 'Name match', 'DOB match', 'Signature present'],
    note: 'Name mismatch between Aadhaar and PAN request. Needs careful review.',
  },
  {
    id: 'EVQ-2407-019',
    applicationId: 'OPDS-20260708-000185',
    customerName: 'Priya Sharma',
    serviceName: 'Income Certificate',
    submittedAt: '2026-07-08 10:05',
    slaHoursLeft: 3.2,
    priority: 'High',
    status: 'In Progress',
    assignee: 'Asif Bisen',
    channel: 'Operator Desk',
    documents: ['Income affidavit', 'Ration card', 'Photo ID'],
    checklist: ['Applicant identity', 'Address proof', 'Income declaration', 'Form completeness'],
    note: 'Income declaration and address proof are aligned.',
  },
  {
    id: 'EVQ-2407-020',
    applicationId: 'OPDS-20260708-000186',
    customerName: 'Kabir Singh',
    serviceName: 'Police Verification',
    submittedAt: '2026-07-08 11:40',
    slaHoursLeft: 6.8,
    priority: 'Normal',
    status: 'Waiting',
    assignee: 'Asif Bisen',
    channel: 'CSC Counter',
    documents: ['Residence proof', 'Photo', 'Identity proof'],
    checklist: ['Address history', 'Police station mapping', 'Photo validation', 'Mobile OTP'],
    note: 'Waiting for clearer residence proof scan.',
  },
  {
    id: 'EVQ-2407-021',
    applicationId: 'OPDS-20260708-000187',
    customerName: 'Ananya Roy',
    serviceName: 'Domicile Certificate',
    submittedAt: '2026-07-08 12:00',
    slaHoursLeft: 12,
    priority: 'Normal',
    status: 'Assigned',
    assignee: 'Asif Bisen',
    channel: 'Website Checkout',
    documents: ['School record', 'Address proof', 'Parent ID'],
    checklist: ['Residency evidence', 'Guardian identity', 'Form data match', 'Fee receipt'],
    note: 'Fresh queue item. Standard verification path.',
  },
];

const tabs: Array<{ id: EmployeeTab; label: string; icon: string }> = [
  { id: 'overview', label: 'Operations', icon: 'layout-dashboard' },
  { id: 'verification', label: 'Verification', icon: 'file-check-2' },
  { id: 'tasks', label: 'Tasks', icon: 'list-checks' },
  { id: 'attendance', label: 'Shift', icon: 'clock-4' },
  { id: 'knowledge', label: 'Knowledge', icon: 'book-open' },
  { id: 'performance', label: 'Performance', icon: 'line-chart' },
  { id: 'communication', label: 'Comms', icon: 'messages-square' },
  { id: 'security', label: 'Security', icon: 'shield-check' },
];

const money = (value: any) => `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;

const priorityType = (priority: EmployeeTask['priority']) => {
  if (priority === 'Critical') return 'danger';
  if (priority === 'High') return 'warning';
  return 'info';
};

const statusType = (status: EmployeeTask['status']) => {
  if (status === 'Completed') return 'success';
  if (status === 'Returned') return 'danger';
  if (status === 'Waiting') return 'warning';
  if (status === 'In Progress') return 'info';
  return 'neutral';
};

const formatSubmitted = (value: string) => {
  const date = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const TabButton = ({
  tab,
  active,
  onClick,
}: {
  tab: { id: EmployeeTab; label: string; icon: string };
  active: boolean;
  onClick: () => void;
}) => (
  <button className={`employee-tab ${active ? 'active' : ''}`} type="button" onClick={onClick}>
    <Icon name={tab.icon} size={15} />
    <span>{tab.label}</span>
  </button>
);

const SectionHeader = ({ eyebrow, title, text, action }: { eyebrow: string; title: string; text?: string; action?: ReactNode }) => (
  <div className="employee-section-header">
    <div>
      <span>{eyebrow}</span>
      <h2>{title}</h2>
      {text && <p>{text}</p>}
    </div>
    {action && <div className="employee-section-action">{action}</div>}
  </div>
);

const MetricCard = ({ icon, label, value, meta, tone = 'blue' }: { icon: string; label: string; value: string | number; meta: string; tone?: string }) => (
  <article className={`employee-metric-card tone-${tone}`}>
    <div>
      <span><Icon name={icon} size={18} /></span>
      <small>{label}</small>
    </div>
    <strong>{value}</strong>
    <p>{meta}</p>
  </article>
);

const QueueRow = ({
  task,
  active,
  selected,
  onOpen,
  onSelect,
}: {
  task: EmployeeTask;
  active: boolean;
  selected: boolean;
  onOpen: () => void;
  onSelect: (checked: boolean) => void;
}) => (
  <article className={`employee-queue-row ${active ? 'active' : ''}`} onClick={onOpen}>
    <label className="employee-check" onClick={event => event.stopPropagation()}>
      <input type="checkbox" checked={selected} onChange={event => onSelect(event.target.checked)} aria-label={`Select ${task.id}`} />
    </label>
    <div className="employee-queue-main">
      <div>
        <strong>{task.serviceName}</strong>
        <span>{task.applicationId} / {task.customerName}</span>
      </div>
      <div className="employee-queue-meta">
        <span><Icon name="clock" size={12} /> {task.slaHoursLeft.toFixed(1)}h SLA</span>
        <span><Icon name="inbox" size={12} /> {task.channel}</span>
        <span><Icon name="calendar" size={12} /> {formatSubmitted(task.submittedAt)}</span>
      </div>
    </div>
    <div className="employee-queue-badges">
      <Badge type={priorityType(task.priority)}>{task.priority}</Badge>
      <Badge type={statusType(task.status)}>{task.status}</Badge>
    </div>
  </article>
);

const DocumentPreview = ({ task }: { task: EmployeeTask }) => (
  <div className="employee-document-preview" aria-label="Document preview">
    <div className="employee-document-toolbar">
      <span><Icon name="file-text" size={15} /> Preview</span>
      <Badge type="info">AI readable</Badge>
    </div>
    <div className="employee-document-sheet">
      <div className="employee-doc-mark">OP</div>
      <div className="employee-doc-lines">
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="employee-doc-grid">
        {task.documents.map(document => <span key={document}>{document}</span>)}
      </div>
      <div className="employee-doc-signature" />
    </div>
  </div>
);

const OperationsOverview = ({
  tasks,
  selectedTask,
  setActiveTab,
  setSelectedTaskId,
  checkedIn,
  workloadValue,
}: {
  tasks: EmployeeTask[];
  selectedTask: EmployeeTask;
  setActiveTab: (tab: EmployeeTab) => void;
  setSelectedTaskId: (id: string) => void;
  checkedIn: boolean;
  workloadValue: number;
}) => {
  const critical = tasks.filter(task => task.priority === 'Critical').length;
  const completed = tasks.filter(task => task.status === 'Completed').length;
  const pending = tasks.filter(task => task.status !== 'Completed').length;

  return (
    <div className="employee-view">
      <section className="employee-hero">
        <div className="employee-hero-copy">
          <span className="employee-trust-pill"><Icon name="briefcase-business" size={14} /> Employee Operations Workspace</span>
          <h1>Good afternoon, Asif.</h1>
          <p>Your verification queue, daily workload, task status, shift state, and team updates are ready for today.</p>
          <div className="employee-hero-actions">
            <button className="btn btn-primary" type="button" onClick={() => setActiveTab('verification')}>
              <Icon name="scan-search" size={15} /> Start Verification
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => setActiveTab('tasks')}>
              <Icon name="list-checks" size={15} /> Review Tasks
            </button>
          </div>
        </div>
        <div className="employee-shift-card">
          <span className={checkedIn ? 'online' : ''}>
            <Icon name={checkedIn ? 'check' : 'clock'} size={20} style={{ color: checkedIn ? '#166534' : 'rgba(255,255,255,0.85)' }} />
          </span>
          <strong>{checkedIn ? 'Shift active' : 'Ready to check in'}</strong>
          <p>Regular shift: 09:00 AM - 06:00 PM</p>
          <div>
            <Badge type="success">Role: Senior Operator</Badge>
            <Badge type="info">KYC Level 3</Badge>
          </div>
        </div>
      </section>

      <section className="employee-metric-grid">
        <MetricCard icon="target" label="Daily score" value="94" meta="Quality adjusted productivity" />
        <MetricCard icon="inbox" label="Today's workload" value={tasks.length} meta="Assigned verification items" tone="gold" />
        <MetricCard icon="alert-triangle" label="Pending verifications" value={pending} meta={`${critical} critical SLA item`} tone="rose" />
        <MetricCard icon="check-circle-2" label="Completed" value={completed} meta="Approved today" tone="green" />
        <MetricCard icon="gauge" label="SLA compliance" value={`${workloadValue}%`} meta="Live operations score" tone="violet" />
      </section>

      <section className="employee-overview-grid">
        <div className="employee-card employee-span-2">
          <SectionHeader eyebrow="Assigned Queue" title="Priority worklist" text="Highest urgency items are surfaced first." />
          <div className="employee-queue-list">
            {tasks.slice(0, 4).map(task => (
              <div key={task.id}>
                <QueueRow
                  task={task}
                  active={selectedTask.id === task.id}
                  selected={false}
                  onOpen={() => {
                    setSelectedTaskId(task.id);
                    setActiveTab('verification');
                  }}
                  onSelect={() => {}}
                />
              </div>
            ))}
          </div>
        </div>
        <div className="employee-card">
          <SectionHeader eyebrow="Quick Actions" title="Operator shortcuts" />
          <div className="employee-shortcut-list">
            {[
              ['file-check-2', 'Verify next document', 'Open split verification workspace', 'verification'],
              ['clock-4', 'Manage shift', 'Check in, break, and attendance', 'attendance'],
              ['book-open', 'Open SOP library', 'Guidelines and government rules', 'knowledge'],
              ['line-chart', 'View performance', 'Daily score and SLA trend', 'performance'],
            ].map(([icon, title, text, tab]) => (
              <button key={title} type="button" onClick={() => setActiveTab(tab as EmployeeTab)}>
                <Icon name={icon} size={17} />
                <span><strong>{title}</strong><small>{text}</small></span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

const VerificationWorkspace = ({
  tasks,
  filteredTasks,
  selectedTask,
  selectedIds,
  checklist,
  note,
  setNote,
  setChecklist,
  setSelectedIds,
  setSelectedTaskId,
  onApprove,
  onReturn,
  onReject,
}: {
  tasks: EmployeeTask[];
  filteredTasks: EmployeeTask[];
  selectedTask: EmployeeTask;
  selectedIds: string[];
  checklist: Record<string, boolean>;
  note: string;
  setNote: (value: string) => void;
  setChecklist: (value: Record<string, boolean>) => void;
  setSelectedIds: (ids: string[]) => void;
  setSelectedTaskId: (id: string) => void;
  onApprove: () => void;
  onReturn: () => void;
  onReject: () => void;
}) => (
  <div className="employee-view">
    <SectionHeader
      eyebrow="Verification Workspace"
      title="Split review queue"
      text="Review documents, complete the checklist, and decide approval, rejection, or correction return."
      action={<Badge type="info">{filteredTasks.length} in filtered queue</Badge>}
    />
    <div className="employee-verification-grid">
      <div className="employee-card employee-queue-panel">
        <div className="employee-mini-header">
          <strong>Queue list</strong>
          <button
            className="btn btn-ghost btn-xs"
            type="button"
            onClick={() => setSelectedIds(selectedIds.length ? [] : tasks.map(task => task.id))}
          >
            {selectedIds.length ? 'Clear' : 'Select all'}
          </button>
        </div>
        <div className="employee-queue-list compact">
          {filteredTasks.map(task => (
            <div key={task.id}>
              <QueueRow
                task={task}
                active={selectedTask.id === task.id}
                selected={selectedIds.includes(task.id)}
                onOpen={() => setSelectedTaskId(task.id)}
                onSelect={(checked) => {
                  setSelectedIds(checked ? [...selectedIds, task.id] : selectedIds.filter(id => id !== task.id));
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <DocumentPreview task={selectedTask} />

      <aside className="employee-card employee-review-panel">
        <SectionHeader eyebrow={selectedTask.id} title={selectedTask.serviceName} text={`${selectedTask.customerName} / ${selectedTask.applicationId}`} />
        <div className="employee-review-meta">
          <Badge type={priorityType(selectedTask.priority)}>{selectedTask.priority}</Badge>
          <Badge type={statusType(selectedTask.status)}>{selectedTask.status}</Badge>
          <span>{selectedTask.slaHoursLeft.toFixed(1)}h SLA left</span>
        </div>
        <div className="employee-checklist">
          {selectedTask.checklist.map(item => (
            <label key={item}>
              <input
                type="checkbox"
                checked={Boolean(checklist[item])}
                onChange={event => setChecklist({ ...checklist, [item]: event.target.checked })}
              />
              <span>{item}</span>
            </label>
          ))}
        </div>
        <label className="employee-note-field">
          <span>Internal note</span>
          <textarea value={note} onChange={event => setNote(event.target.value)} placeholder="Add review note for the operator timeline" />
        </label>
        <div className="employee-decision-actions">
          <button className="btn btn-primary" type="button" onClick={onApprove}><Icon name="check-circle-2" size={15} /> Approve</button>
          <button className="btn btn-ghost" type="button" onClick={onReturn}><Icon name="undo-2" size={15} /> Return</button>
          <button className="btn btn-danger" type="button" onClick={onReject}><Icon name="x-circle" size={15} /> Reject</button>
        </div>
      </aside>
    </div>
  </div>
);

const TaskManagement = ({
  tasks,
  filteredTasks,
  query,
  filter,
  selectedIds,
  setQuery,
  setFilter,
  setSelectedIds,
  onBulkComplete,
}: {
  tasks: EmployeeTask[];
  filteredTasks: EmployeeTask[];
  query: string;
  filter: string;
  selectedIds: string[];
  setQuery: (value: string) => void;
  setFilter: (value: string) => void;
  setSelectedIds: (ids: string[]) => void;
  onBulkComplete: () => void;
}) => (
  <div className="employee-view">
    <SectionHeader
      eyebrow="Task Management"
      title="Assigned work board"
      text="Search, filter, bulk-select, and move work across the daily queue."
      action={selectedIds.length ? <button className="btn btn-primary btn-sm" type="button" onClick={onBulkComplete}>Complete {selectedIds.length}</button> : null}
    />
    <div className="employee-toolbar">
      <label>
        <Icon name="search" size={15} />
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search by customer, service, task ID" />
      </label>
      <div>
        {['All', 'Assigned', 'In Progress', 'Waiting', 'Completed'].map(item => (
          <button key={item} className={filter === item ? 'active' : ''} type="button" onClick={() => setFilter(item)}>{item}</button>
        ))}
      </div>
    </div>
    <div className="employee-task-columns">
      {['Assigned', 'In Progress', 'Waiting', 'Completed'].map(status => (
        <section key={status} className="employee-task-column">
          <div><strong>{status}</strong><span>{tasks.filter(task => task.status === status).length}</span></div>
          {filteredTasks.filter(task => task.status === status).map(task => (
            <article key={task.id} className="employee-task-card">
              <label onClick={event => event.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(task.id)}
                  onChange={event => setSelectedIds(event.target.checked ? [...selectedIds, task.id] : selectedIds.filter(id => id !== task.id))}
                />
                <span>{task.id}</span>
              </label>
              <strong>{task.serviceName}</strong>
              <p>{task.customerName} / {task.applicationId}</p>
              <div>
                <Badge type={priorityType(task.priority)}>{task.priority}</Badge>
                <small>{task.slaHoursLeft.toFixed(1)}h left</small>
              </div>
            </article>
          ))}
        </section>
      ))}
    </div>
  </div>
);

const AttendanceShift = ({
  checkedIn,
  breakActive,
  setCheckedIn,
  setBreakActive,
}: {
  checkedIn: boolean;
  breakActive: boolean;
  setCheckedIn: (value: boolean) => void;
  setBreakActive: (value: boolean) => void;
}) => (
  <div className="employee-view">
    <SectionHeader eyebrow="Attendance and Shift" title="Shift control center" text="Check in, manage breaks, review shift schedule, and track leave balance." />
    <div className="employee-attendance-grid">
      <div className="employee-card employee-attendance-primary">
        <span><Icon name="fingerprint" size={24} /></span>
        <strong>{checkedIn ? (breakActive ? 'Break timer active' : 'You are checked in') : 'Start your shift'}</strong>
        <p>Regular Shift / 09:00 AM - 06:00 PM / Balaghat service desk</p>
        <div className="employee-hero-actions">
          <button className="btn btn-primary" type="button" onClick={() => { setCheckedIn(!checkedIn); if (breakActive) setBreakActive(false); }}>
            <Icon name={checkedIn ? 'log-out' : 'log-in'} size={15} /> {checkedIn ? 'Check Out' : 'Check In'}
          </button>
          <button className="btn btn-ghost" type="button" disabled={!checkedIn} onClick={() => setBreakActive(!breakActive)}>
            <Icon name="coffee" size={15} /> {breakActive ? 'Resume Work' : 'Start Break'}
          </button>
        </div>
      </div>
      <div className="employee-card">
        <SectionHeader eyebrow="Schedule" title="This week" />
        <div className="employee-schedule-list">
          {[
            ['Today', 'Regular shift', '09:00 - 18:00'],
            ['Thu', 'Regular shift', '09:00 - 18:00'],
            ['Fri', 'Verification desk', '10:00 - 19:00'],
            ['Sat', 'Half day support', '10:00 - 14:00'],
          ].map(([day, title, time]) => (
            <div key={day}><strong>{day}</strong><span>{title}</span><small>{time}</small></div>
          ))}
        </div>
      </div>
      <div className="employee-card">
        <SectionHeader eyebrow="Leave Summary" title="Balance" />
        <div className="employee-leave-grid">
          <MetricCard icon="calendar-check" label="Casual" value="6" meta="Days remaining" />
          <MetricCard icon="heart-pulse" label="Medical" value="4" meta="Days remaining" tone="green" />
        </div>
      </div>
    </div>
  </div>
);

const KnowledgeCenter = ({ setActivePanel }: { setActivePanel: (panel: string) => void }) => (
  <div className="employee-view">
    <SectionHeader eyebrow="Knowledge Center" title="SOPs, rules, and guided help" text="Fast access to operating procedures, university guidelines, government rules, and AI assistance." />
    <div className="employee-knowledge-grid">
      {[
        ['book-open-check', 'SOP Library', 'Document verification, payment exception, and customer correction SOPs.', '14 updated articles'],
        ['graduation-cap', 'University Guidelines', 'Scholarship, admission, certificate, and student-service rulebooks.', '8 active notices'],
        ['landmark', 'Government Rules', 'PAN, income, caste, domicile, police verification, and local certificates.', '21 references'],
        ['sparkles', 'AI Assistant Shortcut', 'Ask for policy summaries, rejection language, and verification guidance.', 'Open command center'],
      ].map(([icon, title, text, meta]) => (
        <article className="employee-knowledge-card" key={title}>
          <span><Icon name={icon} size={22} /></span>
          <strong>{title}</strong>
          <p>{text}</p>
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => title.includes('AI') ? setActivePanel('ai-agents') : undefined}>{meta}</button>
        </article>
      ))}
    </div>
  </div>
);

const PerformanceDashboard = ({ tasks }: { tasks: EmployeeTask[] }) => {
  const completeRate = Math.round((tasks.filter(task => task.status === 'Completed').length / Math.max(tasks.length, 1)) * 100);
  return (
    <div className="employee-view">
      <SectionHeader eyebrow="Performance" title="Daily quality dashboard" text="Track productivity, quality, SLA compliance, and recognition signals." />
      <div className="employee-performance-grid">
        <MetricCard icon="award" label="Daily Score" value="94" meta="Top 12 percent today" />
        <MetricCard icon="sparkles" label="Quality Score" value="99.2%" meta="Document accuracy" tone="green" />
        <MetricCard icon="timer-reset" label="SLA Compliance" value="96%" meta="Within target window" tone="gold" />
        <MetricCard icon="trophy" label="Achievements" value="3" meta="This week" tone="violet" />
      </div>
      <div className="employee-card">
        <SectionHeader eyebrow="Weekly Trend" title="Cases verified per day" action={<Badge type="success">{completeRate}% completed in current queue</Badge>} />
        <div className="employee-trend-chart" aria-label="Weekly productivity chart">
          {[18, 22, 16, 26, 24, 14, 8].map((value, index) => (
            <div key={index}>
              <span>{value}</span>
              <i style={{ height: `${value * 5}px` }} />
              <small>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index]}</small>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const CommunicationCenter = ({
  messages,
  chatInput,
  setChatInput,
  sendMessage,
}: {
  messages: Array<{ sender: string; text: string; time: string }>;
  chatInput: string;
  setChatInput: (value: string) => void;
  sendMessage: () => void;
}) => (
  <div className="employee-view">
    <SectionHeader eyebrow="Communication" title="Team activity and internal notes" text="Review comments, internal notes, team notifications, and operational updates." />
    <div className="employee-comms-grid">
      <div className="employee-card">
        <SectionHeader eyebrow="Team Room" title="Operations comments" />
        <div className="employee-message-list">
          {messages.map((message, index) => (
            <div key={`${message.sender}-${index}`}>
              <strong>{message.sender}</strong>
              <p>{message.text}</p>
              <small>{message.time}</small>
            </div>
          ))}
        </div>
        <div className="employee-message-composer">
          <input value={chatInput} onChange={event => setChatInput(event.target.value)} placeholder="Write an internal note" />
          <button className="btn btn-primary" type="button" onClick={sendMessage}><Icon name="send" size={14} /> Send</button>
        </div>
      </div>
      <div className="employee-card">
        <SectionHeader eyebrow="Notifications" title="Operations alerts" />
        <div className="employee-alert-list">
          {[
            ['SLA warning', 'PAN correction queue has one critical case approaching the deadline.'],
            ['Supervisor note', 'Use correction code CR-02 for metadata mismatch returns.'],
            ['System update', 'Document intelligence confidence visible in preview panel.'],
          ].map(([title, text]) => (
            <div key={title}><Icon name="bell" size={15} /><span><strong>{title}</strong><p>{text}</p></span></div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const SecurityCenter = () => (
  <div className="employee-view">
    <SectionHeader eyebrow="Security" title="Role, permissions, and session overview" text="Understand current access boundaries and recent account activity." />
    <div className="employee-security-grid">
      <div className="employee-card employee-role-card">
        <span><Icon name="badge-check" size={24} /></span>
        <strong>Senior Operator</strong>
        <p>Verification desk access for government services, document review, customer correction, and internal notes.</p>
        <div>
          <Badge type="success">Authenticated</Badge>
          <Badge type="info">Least privilege</Badge>
        </div>
      </div>
      {[
        ['Permissions', ['View assigned orders', 'Approve standard documents', 'Return correction requests', 'Create internal notes']],
        ['Recent Activity', ['Checked dashboard at 13:42', 'Opened PAN verification', 'Updated task note', 'Reviewed SOP article']],
        ['Device Sessions', ['Windows desktop / Current', 'Last login: Today 09:04', 'Location: Balaghat desk', '2FA placeholder ready']],
      ].map(([title, items]) => (
        <div className="employee-card" key={title as string}>
          <SectionHeader eyebrow="Access" title={title as string} />
          <div className="employee-permission-list">
            {(items as string[]).map(item => <div key={item}><Icon name="check-circle-2" size={14} /><span>{item}</span></div>)}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const EmployeeMobileNav = ({ activeTab, setActiveTab }: { activeTab: EmployeeTab; setActiveTab: (tab: EmployeeTab) => void }) => {
  const mobileTabs = tabs.filter(tab => ['overview', 'verification', 'tasks', 'attendance', 'performance'].includes(tab.id));
  return (
    <nav className="employee-mobile-nav" aria-label="Employee portal quick navigation">
      {mobileTabs.map(tab => (
        <button key={tab.id} className={activeTab === tab.id ? 'active' : ''} type="button" onClick={() => setActiveTab(tab.id)}>
          <Icon name={tab.icon} size={17} />
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
};

export default function EmployeePortalPanel() {
  const { allOrders, activities, notifications, addActivity, addNotification, setActivePanel } = useApp();

  const [activeTab, setActiveTabState] = useState<EmployeeTab>(() => tabMap[localStorage.getItem(STORAGE_KEY) || ''] || 'overview');
  const [presenceStatus, setPresenceStatus] = useState<'Available' | 'Focus' | 'Break' | 'Offline'>('Available');
  const [tasks, setTasks] = useState<EmployeeTask[]>(employeeTasksSeed);
  const [selectedTaskId, setSelectedTaskId] = useState(employeeTasksSeed[0].id);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [taskQuery, setTaskQuery] = useState('');
  const [taskFilter, setTaskFilter] = useState('All');
  const [checkedIn, setCheckedIn] = useState(false);
  const [breakActive, setBreakActive] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([
    { sender: 'Supervisor Vinod', text: 'Critical SLA queue should be cleared before 4 PM.', time: '13:10' },
    { sender: 'AI Assistant', text: 'PAN correction task EVQ-2407-018 has four readable documents.', time: '13:42' },
  ]);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});

  const setActiveTab = (tab: EmployeeTab) => {
    setActiveTabState(tab);
    localStorage.setItem(STORAGE_KEY, tab);
  };

  useEffect(() => {
    document.body.classList.add('employee-portal-mode');
    return () => document.body.classList.remove('employee-portal-mode');
  }, []);

  const selectedTask = useMemo(() => tasks.find(task => task.id === selectedTaskId) || tasks[0], [tasks, selectedTaskId]);

  useEffect(() => {
    const nextChecklist = Object.fromEntries(selectedTask.checklist.map(item => [item, false]));
    setChecklist(nextChecklist);
    setReviewNote(selectedTask.note);
  }, [selectedTask.id]);

  const filteredTasks = useMemo(() => {
    const query = taskQuery.trim().toLowerCase();
    return tasks
      .filter(task => taskFilter === 'All' || task.status === taskFilter)
      .filter(task => !query || `${task.id} ${task.applicationId} ${task.customerName} ${task.serviceName}`.toLowerCase().includes(query))
      .sort((a, b) => a.slaHoursLeft - b.slaHoursLeft);
  }, [tasks, taskQuery, taskFilter]);

  const liveWorkload = allOrders.length || tasks.length;
  const workloadValue = Math.min(99, 86 + Math.max(0, tasks.filter(task => task.status === 'Completed').length * 2));
  const totalRevenueTouched = allOrders.reduce((sum, order) => sum + Number(order.amount || 0), 0);

  const updateTaskStatus = (status: EmployeeTask['status'], activityText: string) => {
    if (!selectedTask) return;
    setTasks(previous => previous.map(task => task.id === selectedTask.id ? { ...task, status, note: reviewNote || task.note } : task));
    addActivity({
      text: `${activityText}: ${selectedTask.customerName} / ${selectedTask.serviceName}`,
      color: status === 'Completed' ? 'var(--emerald)' : status === 'Returned' ? 'var(--rose)' : 'var(--amber)',
      bg: status === 'Completed' ? 'var(--emerald-dim)' : status === 'Returned' ? 'var(--rose-dim)' : 'var(--amber-dim)',
      icon: status === 'Completed' ? 'check-circle' : 'undo-2',
    });
    addNotification({
      title: `Employee task ${status}`,
      sub: `${selectedTask.id} / ${selectedTask.customerName}`,
      time: 'just now',
      color: status === 'Completed' ? 'var(--emerald)' : 'var(--amber)',
      icon: status === 'Completed' ? 'check-circle' : 'alert-circle',
      panelTarget: 'employee-portal',
    });
  };

  const handleBulkComplete = () => {
    if (!selectedIds.length) return;
    setTasks(previous => previous.map(task => selectedIds.includes(task.id) ? { ...task, status: 'Completed' } : task));
    addActivity({ text: `Employee bulk completed ${selectedIds.length} tasks`, color: 'var(--emerald)', bg: 'var(--emerald-dim)', icon: 'check-square' });
    setSelectedIds([]);
  };

  const sendMessage = () => {
    if (!chatInput.trim()) return;
    setMessages(previous => [...previous, { sender: 'You', text: chatInput.trim(), time: 'Now' }]);
    setChatInput('');
  };

  return (
    <section className="employee-portal-enterprise" aria-label="One Point employee operations portal">
      <header className="employee-command-bar">
        <div>
          <span>One Point Employee OS</span>
          <strong>Operations Workspace</strong>
        </div>
        <div className="employee-command-controls">
          <span className={`employee-presence ${presenceStatus.toLowerCase()}`} />
          <select value={presenceStatus} onChange={event => setPresenceStatus(event.target.value as any)} aria-label="Presence status">
            <option value="Available">Available</option>
            <option value="Focus">Focus mode</option>
            <option value="Break">Break</option>
            <option value="Offline">Offline</option>
          </select>
          <Badge type="info">{liveWorkload} live workload</Badge>
          <Badge type="success">{money(totalRevenueTouched)} handled</Badge>
        </div>
      </header>

      <nav className="employee-tabs" aria-label="Employee portal sections">
        {tabs.map(tab => (
          <div key={tab.id}>
            <TabButton tab={tab} active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} />
          </div>
        ))}
      </nav>

      {activeTab === 'overview' && (
        <OperationsOverview
          tasks={tasks}
          selectedTask={selectedTask}
          setActiveTab={setActiveTab}
          setSelectedTaskId={setSelectedTaskId}
          checkedIn={checkedIn}
          workloadValue={workloadValue}
        />
      )}
      {activeTab === 'verification' && (
        <VerificationWorkspace
          tasks={tasks}
          filteredTasks={filteredTasks}
          selectedTask={selectedTask}
          selectedIds={selectedIds}
          checklist={checklist}
          note={reviewNote}
          setNote={setReviewNote}
          setChecklist={setChecklist}
          setSelectedIds={setSelectedIds}
          setSelectedTaskId={setSelectedTaskId}
          onApprove={() => updateTaskStatus('Completed', 'Approved verification')}
          onReturn={() => updateTaskStatus('Waiting', 'Returned for correction')}
          onReject={() => updateTaskStatus('Returned', 'Rejected verification')}
        />
      )}
      {activeTab === 'tasks' && (
        <TaskManagement
          tasks={tasks}
          filteredTasks={filteredTasks}
          query={taskQuery}
          filter={taskFilter}
          selectedIds={selectedIds}
          setQuery={setTaskQuery}
          setFilter={setTaskFilter}
          setSelectedIds={setSelectedIds}
          onBulkComplete={handleBulkComplete}
        />
      )}
      {activeTab === 'attendance' && (
        <AttendanceShift checkedIn={checkedIn} breakActive={breakActive} setCheckedIn={setCheckedIn} setBreakActive={setBreakActive} />
      )}
      {activeTab === 'knowledge' && <KnowledgeCenter setActivePanel={setActivePanel} />}
      {activeTab === 'performance' && <PerformanceDashboard tasks={tasks} />}
      {activeTab === 'communication' && (
        <CommunicationCenter messages={[...messages, ...activities.slice(0, 2).map(activity => ({ sender: 'Activity', text: activity.text, time: activity.time }))]} chatInput={chatInput} setChatInput={setChatInput} sendMessage={sendMessage} />
      )}
      {activeTab === 'security' && <SecurityCenter />}

      {notifications.length > 0 && (
        <aside className="employee-floating-alert" aria-label="Latest dashboard notification">
          <Icon name={notifications[0].icon || 'bell'} size={15} />
          <span><strong>{notifications[0].title}</strong><small>{notifications[0].sub}</small></span>
        </aside>
      )}

      <EmployeeMobileNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </section>
  );
}
