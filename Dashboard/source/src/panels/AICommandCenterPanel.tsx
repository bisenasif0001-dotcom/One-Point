import React, { useEffect, useMemo, useState } from 'react';
import { Badge, Icon } from '../Shared';
import { useApp } from '../AppContext';

type AgentStatus = 'Running' | 'Reasoning' | 'Handoff' | 'Idle' | 'Offline';
type AgentHealth = 'Healthy' | 'Watch' | 'Critical';
type ReviewStatus = 'Needs Approval' | 'Rejected' | 'Escalated' | 'Retry' | 'Resolved';

type AIAgent = {
  id: string;
  name: string;
  role: string;
  status: AgentStatus;
  health: AgentHealth;
  model: string;
  latencyMs: number;
  confidence: number;
  tokenCount: number;
  memory: string;
  queue: number;
  executionTime: string;
  costToday: string;
  currentTask: string;
  recentPrompt: string;
  reasoningSteps: string[];
};

type FallbackChain = {
  id: string;
  trigger: string;
  primary: string;
  fallback: string;
  status: 'Active' | 'Triggered' | 'Disabled';
};

type ReviewItem = {
  id: string;
  agent: string;
  task: string;
  reason: string;
  confidence: number;
  status: ReviewStatus;
  priority: 'Critical' | 'High' | 'Medium';
  service: string;
  submittedAt: string;
};

type PromptAsset = {
  name: string;
  version: string;
  owner: string;
  status: 'Production' | 'Review' | 'Draft';
  updated: string;
  quality: string;
};

type ProviderHealth = {
  provider: string;
  model: string;
  health: string;
  latency: string;
  cost: string;
  usage: string;
  quality: string;
  fallback: string;
};

type WorkflowRun = {
  name: string;
  status: 'Running' | 'Completed' | 'Scheduled' | 'Paused' | 'Error';
  owner: string;
  volume: string;
  nextRun: string;
};

const tabs = [
  { id: 'dashboard', label: 'Overview Desk', icon: 'layout-dashboard' },
  { id: 'workforce', label: 'AI Employees & Bots', icon: 'bot' },
  { id: 'reasoning', label: 'Reasoning Trace', icon: 'brain-circuit' },
  { id: 'review', label: 'Review Queue', icon: 'user-check', badge: 4 },
  { id: 'prompts', label: 'Prompt Sandbox', icon: 'file-code-2' },
  { id: 'models', label: 'Multi-Model Engine', icon: 'activity' },
  { id: 'automation', label: 'Automation Center', icon: 'workflow' },
  { id: 'governance', label: 'Governance & Audit', icon: 'shield-check' }
];

const statusColor: Record<string, { bg: string; text: string; border: string }> = {
  Running: { bg: 'rgba(22, 163, 74, 0.1)', text: '#16a34a', border: 'rgba(22, 163, 74, 0.25)' },
  Reasoning: { bg: 'rgba(18, 86, 150, 0.1)', text: '#125696', border: 'rgba(18, 86, 150, 0.25)' },
  Handoff: { bg: 'rgba(201, 146, 26, 0.12)', text: '#b45309', border: 'rgba(201, 146, 26, 0.3)' },
  Idle: { bg: 'rgba(100, 116, 139, 0.1)', text: '#64748b', border: 'rgba(100, 116, 139, 0.25)' },
  Offline: { bg: 'rgba(220, 38, 38, 0.1)', text: '#dc2626', border: 'rgba(220, 38, 38, 0.25)' },
  Healthy: { bg: 'rgba(22, 163, 74, 0.1)', text: '#16a34a', border: 'rgba(22, 163, 74, 0.25)' },
  Watch: { bg: 'rgba(201, 146, 26, 0.12)', text: '#b45309', border: 'rgba(201, 146, 26, 0.3)' },
  Critical: { bg: 'rgba(220, 38, 38, 0.1)', text: '#dc2626', border: 'rgba(220, 38, 38, 0.25)' },
  Active: { bg: 'rgba(22, 163, 74, 0.1)', text: '#16a34a', border: 'rgba(22, 163, 74, 0.25)' },
  Triggered: { bg: 'rgba(220, 38, 38, 0.1)', text: '#dc2626', border: 'rgba(220, 38, 38, 0.25)' },
  Disabled: { bg: 'rgba(100, 116, 139, 0.1)', text: '#64748b', border: 'rgba(100, 116, 139, 0.25)' },
  Production: { bg: 'rgba(22, 163, 74, 0.1)', text: '#16a34a', border: 'rgba(22, 163, 74, 0.25)' },
  Review: { bg: 'rgba(201, 146, 26, 0.12)', text: '#b45309', border: 'rgba(201, 146, 26, 0.3)' },
  Draft: { bg: 'rgba(100, 116, 139, 0.1)', text: '#64748b', border: 'rgba(100, 116, 139, 0.25)' },
  Completed: { bg: 'rgba(22, 163, 74, 0.1)', text: '#16a34a', border: 'rgba(22, 163, 74, 0.25)' },
  Scheduled: { bg: 'rgba(18, 86, 150, 0.1)', text: '#125696', border: 'rgba(18, 86, 150, 0.25)' },
  Paused: { bg: 'rgba(201, 146, 26, 0.12)', text: '#b45309', border: 'rgba(201, 146, 26, 0.3)' },
  Error: { bg: 'rgba(220, 38, 38, 0.1)', text: '#dc2626', border: 'rgba(220, 38, 38, 0.25)' },
  'Needs Approval': { bg: 'rgba(201, 146, 26, 0.12)', text: '#b45309', border: 'rgba(201, 146, 26, 0.3)' },
  Rejected: { bg: 'rgba(220, 38, 38, 0.1)', text: '#dc2626', border: 'rgba(220, 38, 38, 0.25)' },
  Escalated: { bg: 'rgba(220, 38, 38, 0.1)', text: '#dc2626', border: 'rgba(220, 38, 38, 0.25)' },
  Retry: { bg: 'rgba(18, 86, 150, 0.1)', text: '#125696', border: 'rgba(18, 86, 150, 0.25)' },
  Resolved: { bg: 'rgba(22, 163, 74, 0.1)', text: '#16a34a', border: 'rgba(22, 163, 74, 0.25)' },
};

const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

const StatusPill = ({ value }: { value: string }) => {
  const c = statusColor[value] || { bg: 'rgba(100, 116, 139, 0.1)', text: '#64748b', border: 'rgba(100, 116, 139, 0.25)' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700,
      background: c.bg, color: c.text, border: `1px solid ${c.border}`
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.text }} />
      {value}
    </span>
  );
};

export default function AICommandCenterPanel() {
  const { addActivity, addNotification } = useApp();

  const [activeTab, setActiveTab] = useState<string>(() => {
    return localStorage.getItem('opds_ai_active_tab') || 'dashboard';
  });

  useEffect(() => {
    localStorage.setItem('opds_ai_active_tab', activeTab);
  }, [activeTab]);

  const [agents, setAgents] = useState<AIAgent[]>([
    {
      id: 'OPAI-KABIR-108',
      name: 'Kabir (OCR Specialist)',
      role: 'Document classification, Aadhaar/PAN OCR & autofill parsing',
      status: 'Reasoning',
      health: 'Healthy',
      model: 'Gemini 2.5 Pro (Multimodal Core)',
      latencyMs: 210,
      confidence: 0.99,
      tokenCount: 4210,
      memory: '42.8 MB',
      queue: 18,
      executionTime: '00:38',
      costToday: 'Rs. 412',
      currentTask: 'PAN applicant Aadhaar OCR & Name-match verification',
      recentPrompt: 'Validate Aadhaar OCR fields against PAN registration payload and confidence threshold.',
      reasoningSteps: [
        'Received OPDS-PAN-260708-0048 from document verification queue',
        'Extracted Aadhaar fields with Gemini 2.5 Pro OCR confidence 99.1%',
        'Matched profile name, date of birth, and masked Aadhaar suffix',
        'Decision: Auto-approve document and assign operator verification'
      ]
    },
    {
      id: 'OPAI-SANA-109',
      name: 'Sana (Comms & WhatsApp)',
      role: 'Omnichannel WhatsApp reminders, payment nudges & tracking alerts',
      status: 'Running',
      health: 'Healthy',
      model: 'Gemini 3.7 Flash (Hybrid Realtime)',
      latencyMs: 68,
      confidence: 0.99,
      tokenCount: 2840,
      memory: '31.4 MB',
      queue: 9,
      executionTime: '00:12',
      costToday: 'Rs. 142',
      currentTask: 'Dispatch GST registration document reminder via WhatsApp',
      recentPrompt: 'Check payment status and generate compliant reminder text for pending GST documents.',
      reasoningSteps: [
        'Queried payment ledger for OPDS-GST-260708-0017',
        'Detected paid order with two missing documents',
        'Selected WhatsApp template GST_DOC_PENDING_V3',
        'Decision: Send reminder and schedule follow-up after 6 hours'
      ]
    },
    {
      id: 'OPAI-RIYA-110',
      name: 'Riya (Support & Refunds)',
      role: 'Citizen support triage, refund resolution & grievance escalation',
      status: 'Handoff',
      health: 'Watch',
      model: 'Claude 3.7 Sonnet (Hybrid Thinking)',
      latencyMs: 280,
      confidence: 0.84,
      tokenCount: 8430,
      memory: '54.6 MB',
      queue: 6,
      executionTime: '01:26',
      costToday: 'Rs. 386',
      currentTask: 'Refund ETA query for cancelled passport appointment',
      recentPrompt: 'Customer asks: "Refund kab tak aayega, direct bank account?"',
      reasoningSteps: [
        'Detected intent refund_request with partial transaction data',
        'Queried transaction and gateway settlement records',
        'Confidence below 85% because bank reference is not available',
        'Decision: Create human handoff with recommended response draft'
      ]
    },
    {
      id: 'OPAI-ARJUN-112',
      name: 'Arjun (Ledger & Audit)',
      role: 'Govt fee reconciliation, wallet anomaly detection & audit log analysis',
      status: 'Idle',
      health: 'Healthy',
      model: 'OpenAI o3-mini (Reasoning)',
      latencyMs: 195,
      confidence: 0.97,
      tokenCount: 1980,
      memory: '24.1 MB',
      queue: 3,
      executionTime: '00:08',
      costToday: 'Rs. 165',
      currentTask: 'Waiting for next payment ledger reconciliation batch event',
      recentPrompt: 'Detect mismatches between government fee ledger and service invoice totals.',
      reasoningSteps: [
        'Completed deep math reconciliation batch for 64 payments',
        'Flagged one duplicate service charge candidate',
        'Opened finance review task FIN-AI-260708-0009',
        'Decision: Hold automation until next ledger sync'
      ]
    }
  ]);

  const [fallbackChains] = useState<FallbackChain[]>([
    { id: 'FC-101', trigger: 'Gemini 3.7 Flash sub-second rate spike', primary: 'Gemini 3.7 Flash', fallback: 'Gemini 2.5 Pro', status: 'Active' },
    { id: 'FC-102', trigger: 'Refund answer confidence below 85%', primary: 'Claude 3.7 Sonnet', fallback: 'Human Review Queue', status: 'Triggered' },
    { id: 'FC-103', trigger: 'Government rules prompt risk above 0.20', primary: 'Gemini 3.7 Flash', fallback: 'OpenAI o3-mini', status: 'Active' },
    { id: 'FC-104', trigger: 'Provider rate limit 429 for 2 minutes', primary: 'OpenAI o3-mini', fallback: 'Llama 3.3 70B Turbo', status: 'Active' }
  ]);

  const [overrideQueue, setOverrideQueue] = useState<ReviewItem[]>([
    {
      id: 'HRQ-260708-017',
      agent: 'Riya (Support Bot)',
      task: 'Passport refund response needs operator approval',
      reason: 'Gateway reference missing; confidence below 85% threshold',
      confidence: 0.76,
      status: 'Needs Approval',
      priority: 'High',
      service: 'Passport Appointment',
      submittedAt: '09:42 AM'
    },
    {
      id: 'HRQ-260708-018',
      agent: 'Kabir (OCR Bot)',
      task: 'Aadhaar photo variance check in PAN application',
      reason: 'Face-match score is 81%; manual verification recommended',
      confidence: 0.81,
      status: 'Escalated',
      priority: 'Critical',
      service: 'PAN Card Correction',
      submittedAt: '10:04 AM'
    },
    {
      id: 'HRQ-260708-019',
      agent: 'Arjun (Audit Bot)',
      task: 'Duplicate service charge anomaly in GST ledger',
      reason: 'Same UTR appeared in two internal settlement rows',
      confidence: 0.88,
      status: 'Retry',
      priority: 'Medium',
      service: 'GST Registration',
      submittedAt: '10:18 AM'
    },
    {
      id: 'HRQ-260708-020',
      agent: 'Sana (Comms Bot)',
      task: 'WhatsApp template compliance & legal copy check',
      reason: 'Reminder contains fee wording that requires human sign-off',
      confidence: 0.91,
      status: 'Rejected',
      priority: 'Medium',
      service: 'MSME Certificate',
      submittedAt: '10:31 AM'
    }
  ]);

  const [promptTemplate, setPromptTemplate] = useState<string>(
    'System: You are One Point Digital Services (OPDS) AI Officer powered by Gemini 3.7 Flash & Gemini 2.5 Pro. Validate citizen documents strictly against CSC & government guidelines.\n\nUser Application: {application_payload}\nOCR Extraction: {document_ocr}\nPolicy Rules: {service_rules}'
  );
  const [showSandboxResult, setShowSandboxResult] = useState<boolean>(false);
  const [sandboxOutput, setSandboxOutput] = useState<string>('');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('OPAI-KABIR-108');

  const selectedAgent = useMemo(() => {
    return agents.find(agent => agent.id === selectedAgentId) || agents[0];
  }, [agents, selectedAgentId]);

  const metrics = useMemo(() => {
    const runningAgents = agents.filter(agent => ['Running', 'Reasoning', 'Handoff'].includes(agent.status)).length;
    const totalTokens = agents.reduce((sum, agent) => sum + agent.tokenCount, 0);
    return {
      runningAgents,
      todaysExecutions: '1,284',
      automationRate: '96.2%',
      successRate: '99.4%',
      failureRate: '0.6%',
      tokenUsage: `${(totalTokens / 1000).toFixed(1)}k`,
      costToday: 'Rs. 982',
      reviewQueue: overrideQueue.filter(item => item.status !== 'Resolved').length
    };
  }, [agents, overrideQueue]);

  const promptAssets: PromptAsset[] = [
    { name: 'Document Verification Core', version: 'v5.2.0', owner: 'Operations AI', status: 'Production', updated: 'Today, 09:18 AM', quality: '99.6%' },
    { name: 'Refund Resolution Guardrails', version: 'v3.1.0', owner: 'Support Ops', status: 'Review', updated: 'Today, 08:42 AM', quality: '97.2%' },
    { name: 'Government Fee Explainer', version: 'v4.1.0', owner: 'Finance Ops', status: 'Production', updated: 'Yesterday', quality: '99.1%' },
    { name: 'Escalation Summary Writer', version: 'v2.3.0', owner: 'Quality Team', status: 'Draft', updated: 'Jul 7, 2026', quality: '95.4%' }
  ];

  const providerHealth: ProviderHealth[] = [
    { provider: 'Google AI', model: 'Gemini 3.7 Flash', health: '99.99%', latency: '68 ms', cost: 'Rs. 0.007 / 1k', usage: '44%', quality: '99.8%', fallback: 'Gemini 2.5 Pro' },
    { provider: 'Google AI', model: 'Gemini 2.5 Pro', health: '99.98%', latency: '210 ms', cost: 'Rs. 0.045 / 1k', usage: '28%', quality: '99.4%', fallback: 'Claude 3.7 Sonnet' },
    { provider: 'Anthropic', model: 'Claude 3.7 Sonnet', health: '99.92%', latency: '280 ms', cost: 'Rs. 0.065 / 1k', usage: '14%', quality: '99.6%', fallback: 'OpenAI o3-mini' },
    { provider: 'OpenAI', model: 'OpenAI o3-mini', health: '99.95%', latency: '195 ms', cost: 'Rs. 0.038 / 1k', usage: '8%', quality: '99.1%', fallback: 'GPT-4o Omni' },
    { provider: 'OpenAI', model: 'GPT-4o (Omni Edition)', health: '99.91%', latency: '130 ms', cost: 'Rs. 0.032 / 1k', usage: '6%', quality: '98.6%', fallback: 'Queued Retry' },
    { provider: 'Meta Cloud', model: 'Llama 3.3 70B Turbo', health: '99.94%', latency: '85 ms', cost: 'Rs. 0.008 / 1k', usage: 'Failover', quality: '96.8%', fallback: 'Manual Officer' }
  ];

  const workflowRuns: WorkflowRun[] = [
    { name: 'Aadhaar / PAN OCR & Classification', status: 'Running', owner: 'Kabir Bot (Gemini 2.5 Pro)', volume: '418 today', nextRun: 'Real-time event stream' },
    { name: 'Omnichannel WhatsApp Reminders', status: 'Scheduled', owner: 'Sana Bot (Gemini 3.7 Flash)', volume: '86 queued', nextRun: '11:30 AM' },
    { name: 'Refund Handoff & Grievance Drafting', status: 'Paused', owner: 'Riya Bot (Claude 3.7)', volume: '12 pending', nextRun: 'Manual resume' },
    { name: 'Govt Fee & Wallet Reconciliation', status: 'Completed', owner: 'Arjun Bot (o3-mini)', volume: '64 matched', nextRun: '02:00 PM' },
    { name: 'Government Rules Drift Monitor', status: 'Completed', owner: 'Policy Bot (Claude 3.7)', volume: '24 checked', nextRun: '04:00 PM' }
  ];

  const handleReviewAction = (id: string, status: ReviewStatus) => {
    setOverrideQueue(prev => prev.map(item => item.id === id ? { ...item, status } : item));
    addActivity({
      text: `AI review queue ${id} marked ${status}`,
      color: status === 'Resolved' ? 'var(--emerald)' : status === 'Rejected' ? 'var(--rose)' : 'var(--blue)',
      bg: status === 'Resolved' ? 'rgba(22,163,74,0.08)' : status === 'Rejected' ? 'rgba(220,38,38,0.08)' : 'rgba(18,86,150,0.08)',
      icon: status === 'Resolved' ? 'check-circle' : status === 'Rejected' ? 'x-circle' : 'refresh-cw'
    });
    addNotification({
      title: 'AI Review Queue Updated',
      sub: `${id} is now ${status}`,
      time: 'just now',
      color: status === 'Resolved' ? '#16a34a' : status === 'Rejected' ? '#dc2626' : '#125696',
      icon: status === 'Resolved' ? 'check-circle' : status === 'Rejected' ? 'x-circle' : 'shield-check'
    });
  };

  const handleRunSandbox = () => {
    setShowSandboxResult(true);
    setSandboxOutput(
      `[AI EXECUTION REPORT - GEMINI 3.7 FLASH HYBRID REALTIME]
Timestamp: ${new Date().toLocaleTimeString('en-IN')}
Latency: 68 ms | Cost: Rs. 0.007 | Tokens: 1,420

EXTRACTED OCR & RULE PAYLOAD:
• Document Type: Income Certificate (MP Government)
• Citizen Name: Rameshwar Bisen
• Annual Income: Rs. 1,20,000/-
• Certificate No: MP/INC/2026/948301

GEMINI 3.7 FLASH HYBRID THINKING CHECK:
✓ Name match: 99.9% against Aadhaar database
✓ Issuing Authority: Tehsildar Katangi verified (Govt Portal Sync)
✓ Format validity: Approved 2048-bit Digital Signature verified
✓ Security & Redaction: Aadhaar first 8 digits masked automatically

DECISION: AUTO-VERIFY & MOVE TO FINAL APPROVAL DESK
Confidence Score: 99.8%`
    );
  };

  return (
    <div className="panel active" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 24px', overflowY: 'auto' }}>
      
      {/* ─── Executive Brand Hero ─────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #082f61 0%, #125696 100%)',
        borderRadius: 20,
        padding: '24px 28px',
        color: '#ffffff',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 24,
        alignItems: 'center',
        boxShadow: '0 8px 24px rgba(8, 47, 97, 0.18)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(34, 197, 94, 0.2)', border: '1px solid rgba(34, 197, 94, 0.4)',
              color: '#4ade80', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
              letterSpacing: '0.04em', textTransform: 'uppercase'
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', animation: 'pulse 2s infinite' }} />
              Live AI Workforce
            </span>
            <span style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.75)', fontWeight: 600 }}>
              One Point AI Operations OS
            </span>
          </div>

          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', margin: 0, lineHeight: 1.2, color: '#ffffff' }}>
            Enterprise AI Command Center
          </h1>
          <p style={{ fontSize: 13.5, color: 'rgba(255, 255, 255, 0.85)', margin: 0, lineHeight: 1.5, maxWidth: 540 }}>
            Monitor real-time bots, prompt governance, model latency, human-in-the-loop verification, and automated workflows in one unified control desk.
          </p>

          <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setActiveTab('review')}
              style={{ background: '#c9921a', color: '#ffffff', border: 'none', borderRadius: 10, fontWeight: 700, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Icon name="user-check" size={14} /> Review Approvals ({metrics.reviewQueue})
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setActiveTab('prompts')}
              style={{ background: 'rgba(255, 255, 255, 0.15)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.25)', borderRadius: 10, fontWeight: 600, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Icon name="file-code-2" size={14} /> Prompt Sandbox
            </button>
          </div>
        </div>

        {/* Right Live Telemetry Card */}
        <div style={{
          background: 'rgba(7, 17, 31, 0.65)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: 16,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 700 }}>Telemetry Stream</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#ffffff' }}>Production Cluster</div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8', background: 'rgba(56, 189, 248, 0.15)', padding: '2px 8px', borderRadius: 999, border: '1px solid rgba(56, 189, 248, 0.3)' }}>
              18 Events/min
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.06)', padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ fontSize: 10.5, color: 'rgba(255, 255, 255, 0.6)' }}>Running Bots</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#4ade80', marginTop: 2 }}>{metrics.runningAgents} / 4</div>
              <div style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.5)', marginTop: 2 }}>2 active · 1 handoff</div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.06)', padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ fontSize: 10.5, color: 'rgba(255, 255, 255, 0.6)' }}>Executions Today</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#ffffff', marginTop: 2 }}>{metrics.todaysExecutions}</div>
              <div style={{ fontSize: 10, color: '#38bdf8', marginTop: 2 }}>+14.2% vs yesterday</div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.06)', padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ fontSize: 10.5, color: 'rgba(255, 255, 255, 0.6)' }}>Accuracy Rate</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#4ade80', marginTop: 2 }}>{metrics.successRate}</div>
              <div style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.5)', marginTop: 2 }}>last 24 hours</div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.06)', padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ fontSize: 10.5, color: 'rgba(255, 255, 255, 0.6)' }}>Failure Rate</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#f87171', marginTop: 2 }}>{metrics.failureRate}</div>
              <div style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.5)', marginTop: 2 }}>34 retries captured</div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Modern Tab Navigation Strip ──────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 6, overflowX: 'auto', padding: '8px 10px',
        background: '#ffffff', borderRadius: 14, border: '1px solid rgba(8, 47, 97, 0.08)',
        boxShadow: '0 1px 4px rgba(15, 23, 42, 0.04)',
        flexShrink: 0, minHeight: 52, boxSizing: 'border-box', alignItems: 'center'
      }}>
        {tabs.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
                borderRadius: 10, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                fontSize: 12.5, fontWeight: active ? 700 : 600,
                background: active ? 'var(--blue)' : 'transparent',
                color: active ? '#ffffff' : 'var(--text-2)',
                boxShadow: active ? '0 2px 8px rgba(18, 86, 150, 0.25)' : 'none',
                transition: 'all 160ms ease',
                flexShrink: 0,
              }}
            >
              <Icon name={tab.icon} size={15} style={{ color: active ? '#ffffff' : 'var(--blue)' }} />
              {tab.label}
              {tab.badge && (
                <span style={{
                  fontSize: 10.5, fontWeight: 800, padding: '1px 6px', borderRadius: 999,
                  background: active ? '#ffffff' : 'rgba(220, 38, 38, 0.12)',
                  color: active ? 'var(--blue)' : '#dc2626'
                }}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── Metric Strip (Always visible for fast pulse) ────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, flexShrink: 0 }}>
        <div style={{ background: '#ffffff', padding: '16px 20px', borderRadius: 14, border: '1px solid rgba(8, 47, 97, 0.08)', boxShadow: '0 1px 4px rgba(15, 23, 42, 0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--violet)', textTransform: 'uppercase' }}>Automation Rate</span>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(124, 58, 237, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="cpu" size={15} style={{ color: 'var(--violet)' }} />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)', marginTop: 4 }}>{metrics.automationRate}</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-4)', marginTop: 4 }}>Human manual touch reduced</div>
        </div>

        <div style={{ background: '#ffffff', padding: '16px 20px', borderRadius: 14, border: '1px solid rgba(8, 47, 97, 0.08)', boxShadow: '0 1px 4px rgba(15, 23, 42, 0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--blue)', textTransform: 'uppercase' }}>Token Usage</span>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(18, 86, 150, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="database-zap" size={15} style={{ color: 'var(--blue)' }} />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)', marginTop: 4 }}>{metrics.tokenUsage}</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-4)', marginTop: 4 }}>Agent inference tokens today</div>
        </div>

        <div style={{ background: '#ffffff', padding: '16px 20px', borderRadius: 14, border: '1px solid rgba(8, 47, 97, 0.08)', boxShadow: '0 1px 4px rgba(15, 23, 42, 0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#b45309', textTransform: 'uppercase' }}>Daily AI Cost</span>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(201, 146, 26, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="wallet" size={15} style={{ color: '#b45309' }} />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)', marginTop: 4 }}>{metrics.costToday}</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-4)', marginTop: 4 }}>Budget: Rs. 2,000 / day</div>
        </div>

        <div style={{ background: '#ffffff', padding: '16px 20px', borderRadius: 14, border: '1px solid rgba(8, 47, 97, 0.08)', boxShadow: '0 1px 4px rgba(15, 23, 42, 0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' }}>Human Review</span>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(220, 38, 38, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="inbox" size={15} style={{ color: '#dc2626' }} />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#dc2626', marginTop: 4 }}>{metrics.reviewQueue} Pending</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-4)', marginTop: 4 }}>Needs manual officer approval</div>
        </div>
      </div>

      {/* ─── TAB 1: OVERVIEW DESK ────────────────────────────────────────── */}
      {activeTab === 'dashboard' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
          
          {/* Left Column: Live AI Employees Table */}
          <div style={{ background: '#ffffff', padding: 20, borderRadius: 16, border: '1px solid rgba(8, 47, 97, 0.08)', boxShadow: '0 1px 4px rgba(15, 23, 42, 0.04)', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1)' }}>Executive AI Workforce</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Live production agents, current tasks, queue pressure & confidence scores</div>
              </div>
              <button className="btn btn-ghost btn-xs" onClick={() => setActiveTab('workforce')}>View All Bots</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {agents.map(agent => {
                const isSelected = selectedAgent.id === agent.id;
                return (
                  <div
                    key={agent.id}
                    onClick={() => setSelectedAgentId(agent.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px',
                      borderRadius: 12, border: `1.5px solid ${isSelected ? 'var(--blue)' : 'rgba(8, 47, 97, 0.08)'}`,
                      background: isSelected ? 'rgba(18, 86, 150, 0.035)' : '#ffffff',
                      cursor: 'pointer', transition: 'all 160ms ease'
                    }}
                  >
                    <div style={{
                      width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                      background: isSelected ? 'var(--blue)' : 'rgba(8, 47, 97, 0.08)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, color: isSelected ? '#ffffff' : 'var(--blue)', fontSize: 14
                    }}>
                      {agent.name[0]}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text-1)' }}>{agent.name}</span>
                        <StatusPill value={agent.status} />
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>
                        {agent.currentTask}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-4)' }}>Queue</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{agent.queue} tasks</div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 60 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-4)' }}>Confidence</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#16a34a' }}>{formatPercent(agent.confidence)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Reasoning & Live Models */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            
            {/* Reasoning Snapshot Card */}
            <div style={{ background: '#ffffff', padding: 18, borderRadius: 16, border: '1px solid rgba(8, 47, 97, 0.08)', boxShadow: '0 1px 4px rgba(15, 23, 42, 0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="brain-circuit" size={16} style={{ color: 'var(--blue)' }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>Reasoning Trace ({selectedAgent.name.split(' ')[0]})</span>
                </div>
                <button className="btn btn-ghost btn-xs" onClick={() => setActiveTab('reasoning')}>Inspect Full</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--bg-2)', padding: 12, borderRadius: 10, border: '1px solid var(--border-1)' }}>
                {selectedAgent.reasoningSteps.map((step, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{
                      width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                      background: idx === selectedAgent.reasoningSteps.length - 1 ? 'var(--emerald)' : 'var(--blue)',
                      color: '#fff', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>{idx + 1}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.4 }}>{step}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Model Operations Matrix */}
            <div style={{ background: '#ffffff', padding: 18, borderRadius: 16, border: '1px solid rgba(8, 47, 97, 0.08)', boxShadow: '0 1px 4px rgba(15, 23, 42, 0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="activity" size={16} style={{ color: 'var(--emerald)' }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>Model Providers & Latency</span>
                </div>
                <button className="btn btn-ghost btn-xs" onClick={() => setActiveTab('models')}>Configure</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {providerHealth.slice(0, 3).map(p => (
                  <div key={p.model} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: 8, background: 'var(--bg-2)', border: '1px solid var(--border-1)' }}>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-1)' }}>{p.model}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{p.provider} · Uptime {p.health}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--blue)' }}>{p.latency}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--text-4)' }}>{p.cost}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ─── TAB 2: AI EMPLOYEES & WORKFORCE ────────────────────────────── */}
      {activeTab === 'workforce' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
          {agents.map(agent => (
            <div
              key={agent.id}
              style={{
                background: '#ffffff', borderRadius: 16, padding: 20,
                border: '1px solid rgba(8, 47, 97, 0.08)', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
                display: 'flex', flexDirection: 'column', gap: 14
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: 'linear-gradient(135deg, #082f61 0%, #125696 100%)',
                    color: '#ffffff', fontWeight: 800, fontSize: 16,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {agent.name[0]}
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-1)' }}>{agent.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-4)' }}>ID: {agent.id} · {agent.model}</div>
                  </div>
                </div>
                <StatusPill value={agent.status} />
              </div>

              <div style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.4 }}>
                {agent.role}
              </div>

              <div style={{ background: 'var(--bg-2)', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border-1)' }}>
                <div style={{ fontSize: 10.5, textTransform: 'uppercase', color: 'var(--text-4)', fontWeight: 700 }}>Current Live Task</div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-1)', marginTop: 2 }}>{agent.currentTask}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 12 }}>
                <div style={{ background: '#f8fafc', padding: 8, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 10.5, color: 'var(--text-4)' }}>Latency</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-1)', marginTop: 2 }}>{agent.latencyMs} ms</div>
                </div>
                <div style={{ background: '#f8fafc', padding: 8, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 10.5, color: 'var(--text-4)' }}>Cost Today</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-1)', marginTop: 2 }}>{agent.costToday}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: 8, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 10.5, color: 'var(--text-4)' }}>Memory</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-1)', marginTop: 2 }}>{agent.memory}</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid var(--border-1)' }}>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--text-4)' }}>Confidence: </span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#16a34a' }}>{formatPercent(agent.confidence)}</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={() => { setSelectedAgentId(agent.id); setActiveTab('reasoning'); }}
                  >
                    Inspect Reasoning
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── TAB 3: REASONING TRACE ──────────────────────────────────────── */}
      {activeTab === 'reasoning' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
          <div style={{ background: '#ffffff', borderRadius: 16, padding: 20, border: '1px solid rgba(8, 47, 97, 0.08)', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1)' }}>Step-by-Step Chain of Thought</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Inspect logical trace, intermediate thoughts, and final verification decisions</div>
              </div>
              <select
                className="input"
                style={{ width: 'auto', fontSize: 12, fontWeight: 600 }}
                value={selectedAgentId}
                onChange={e => setSelectedAgentId(e.target.value)}
              >
                {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {selectedAgent.reasoningSteps.map((step, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 14, padding: 14, borderRadius: 12, background: 'var(--bg-2)', border: '1px solid var(--border-1)' }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: idx === selectedAgent.reasoningSteps.length - 1 ? '#16a34a' : 'var(--blue)',
                    color: '#fff', fontWeight: 800, fontSize: 12,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {idx + 1}
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase' }}>
                      {idx === selectedAgent.reasoningSteps.length - 1 ? 'Final Decision' : `Step ${idx + 1} - Analysis`}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginTop: 2 }}>{step}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Decision Telemetry & Context */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: '#ffffff', borderRadius: 16, padding: 20, border: '1px solid rgba(8, 47, 97, 0.08)' }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Recent Prompt Context</div>
              <div style={{ background: '#090d16', color: '#38bdf8', padding: 14, borderRadius: 10, fontSize: 12, fontFamily: 'monospace', lineHeight: 1.4 }}>
                {selectedAgent.recentPrompt}
              </div>
            </div>

            <div style={{ background: '#ffffff', borderRadius: 16, padding: 20, border: '1px solid rgba(8, 47, 97, 0.08)' }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Agent Performance Specs</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12.5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 6, borderBottom: '1px solid var(--border-1)' }}>
                  <span style={{ color: 'var(--text-3)' }}>Model Engine:</span>
                  <strong>{selectedAgent.model}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 6, borderBottom: '1px solid var(--border-1)' }}>
                  <span style={{ color: 'var(--text-3)' }}>Avg Response Time:</span>
                  <strong>{selectedAgent.latencyMs} ms</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 6, borderBottom: '1px solid var(--border-1)' }}>
                  <span style={{ color: 'var(--text-3)' }}>Token Consumption:</span>
                  <strong>{selectedAgent.tokenCount} tokens</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-3)' }}>Health State:</span>
                  <StatusPill value={selectedAgent.health} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 4: HUMAN REVIEW QUEUE ───────────────────────────────────── */}
      {activeTab === 'review' && (
        <div style={{ background: '#ffffff', borderRadius: 16, padding: 20, border: '1px solid rgba(8, 47, 97, 0.08)', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1)' }}>Human-in-the-Loop Review Queue</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Decisions requiring officer sign-off or verification override</div>
            </div>
            <span style={{ background: 'rgba(201, 146, 26, 0.12)', color: '#b45309', padding: '4px 10px', borderRadius: 999, fontWeight: 700, fontSize: 12 }}>
              {metrics.reviewQueue} Open Actions
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
            {overrideQueue.map(item => (
              <div
                key={item.id}
                style={{
                  background: 'var(--bg-1)', borderRadius: 14, padding: 18,
                  border: '1px solid var(--border-1)', display: 'flex', flexDirection: 'column', gap: 12
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--blue)' }}>{item.id}</span>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-1)', marginTop: 2 }}>{item.task}</div>
                  </div>
                  <StatusPill value={item.status} />
                </div>

                <div style={{ fontSize: 12, color: 'var(--text-3)', background: 'var(--bg-2)', padding: 10, borderRadius: 8, border: '1px solid var(--border-1)' }}>
                  <strong>Trigger Reason: </strong>{item.reason}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11.5, color: 'var(--text-4)' }}>
                  <span>Agent: <strong>{item.agent}</strong></span>
                  <span>Confidence: <strong style={{ color: item.confidence < 0.8 ? '#dc2626' : '#16a34a' }}>{formatPercent(item.confidence)}</strong></span>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button
                    className="btn btn-sm"
                    onClick={() => handleReviewAction(item.id, 'Resolved')}
                    style={{ flex: 1, background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600 }}
                  >
                    <Icon name="check" size={13} /> Approve
                  </button>
                  <button
                    className="btn btn-sm"
                    onClick={() => handleReviewAction(item.id, 'Retry')}
                    style={{ background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600 }}
                  >
                    <Icon name="refresh-cw" size={13} /> Retry
                  </button>
                  <button
                    className="btn btn-sm"
                    onClick={() => handleReviewAction(item.id, 'Rejected')}
                    style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600 }}
                  >
                    <Icon name="x" size={13} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB 5: PROMPT SANDBOX ───────────────────────────────────────── */}
      {activeTab === 'prompts' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
          <div style={{ background: '#ffffff', borderRadius: 16, padding: 20, border: '1px solid rgba(8, 47, 97, 0.08)', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1)' }}>Interactive Prompt Sandbox</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Test and simulate AI extraction prompts without affecting live customer orders</div>

            <textarea
              className="input"
              rows={8}
              value={promptTemplate}
              onChange={e => setPromptTemplate(e.target.value)}
              style={{ fontFamily: 'monospace', fontSize: 12, lineHeight: 1.5, resize: 'vertical' }}
            />

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <select className="input" defaultValue="Gemini 3.7 Flash (Hybrid Realtime)" style={{ width: 'auto', fontSize: 12 }}>
                <option>Gemini 3.7 Flash (Hybrid Realtime)</option>
                <option>Gemini 2.5 Pro (Multimodal Core)</option>
                <option>Claude 3.7 Sonnet (Hybrid Thinking)</option>
                <option>OpenAI o3-mini (Deep Reasoning)</option>
                <option>GPT-4o (Omni-Modal v2)</option>
                <option>Llama 3.3 70B Turbo (Local Edge)</option>
              </select>
              <button
                className="btn btn-primary"
                onClick={handleRunSandbox}
                style={{ background: 'var(--blue)', borderColor: 'var(--blue)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Icon name="play" size={14} /> Run Live Test Execution
              </button>
            </div>
          </div>

          <div style={{ background: '#ffffff', borderRadius: 16, padding: 20, border: '1px solid rgba(8, 47, 97, 0.08)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>Execution Output & Recommendation</div>
            {showSandboxResult ? (
              <pre style={{
                background: '#090d16', color: '#4ade80', padding: 14, borderRadius: 10,
                fontSize: 11.5, fontFamily: 'monospace', lineHeight: 1.4, margin: 0,
                overflowX: 'auto', maxHeight: 320
              }}>
                {sandboxOutput}
              </pre>
            ) : (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', background: 'var(--bg-2)', borderRadius: 12, border: '1px dashed var(--border-2)' }}>
                <Icon name="sparkles" size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
                <div style={{ fontWeight: 600, fontSize: 13 }}>Sandbox Ready</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-4)', marginTop: 4 }}>Click "Run Live Test Execution" to simulate OCR & rule analysis.</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 6: MULTI-MODEL ENGINE ───────────────────────────────────── */}
      {activeTab === 'models' && (
        <div style={{ background: '#ffffff', borderRadius: 16, padding: 20, border: '1px solid rgba(8, 47, 97, 0.08)', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1)' }}>Multi-Model Performance & Fallback Routing</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Provider health, latency benchmarks, cost per token, and auto-failover rules</div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid var(--border-1)', color: 'var(--text-3)' }}>
                  <th style={{ padding: '10px 12px' }}>Model & Provider</th>
                  <th style={{ padding: '10px 12px' }}>Uptime Health</th>
                  <th style={{ padding: '10px 12px' }}>Avg Latency</th>
                  <th style={{ padding: '10px 12px' }}>Cost / 1k Tokens</th>
                  <th style={{ padding: '10px 12px' }}>Cluster Share</th>
                  <th style={{ padding: '10px 12px' }}>Quality Score</th>
                  <th style={{ padding: '10px 12px' }}>Fallback Target</th>
                </tr>
              </thead>
              <tbody>
                {providerHealth.map(p => (
                  <tr key={p.model} style={{ borderBottom: '1px solid var(--border-1)' }}>
                    <td style={{ padding: '12px', fontWeight: 700, color: 'var(--text-1)' }}>
                      {p.model} <span style={{ fontSize: 11, color: 'var(--text-4)', fontWeight: 400 }}>({p.provider})</span>
                    </td>
                    <td style={{ padding: '12px' }}><span style={{ color: '#16a34a', fontWeight: 700 }}>{p.health}</span></td>
                    <td style={{ padding: '12px', fontWeight: 600, color: 'var(--blue)' }}>{p.latency}</td>
                    <td style={{ padding: '12px', color: 'var(--text-2)' }}>{p.cost}</td>
                    <td style={{ padding: '12px', fontWeight: 600 }}>{p.usage}</td>
                    <td style={{ padding: '12px', fontWeight: 700, color: '#16a34a' }}>{p.quality}</td>
                    <td style={{ padding: '12px' }}><Badge type="info">{p.fallback}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 7: AUTOMATION CENTER ────────────────────────────────────── */}
      {activeTab === 'automation' && (
        <div style={{ background: '#ffffff', borderRadius: 16, padding: 20, border: '1px solid rgba(8, 47, 97, 0.08)', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1)' }}>Automated Background Pipelines</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Cron jobs, document OCR pipelines, ledger reconciliation schedules & error catchers</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
            {workflowRuns.map(w => (
              <div key={w.name} style={{ background: 'var(--bg-1)', borderRadius: 12, padding: 16, border: '1px solid var(--border-1)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <StatusPill value={w.status} />
                  <span style={{ fontSize: 11, color: 'var(--text-4)' }}>Assigned: <strong>{w.owner}</strong></span>
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-1)' }}>{w.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Volume: {w.volume}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-4)', borderTop: '1px solid var(--border-1)', paddingTop: 8 }}>
                  Next Run: <strong>{w.nextRun}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB 8: GOVERNANCE & AUDITS ──────────────────────────────────── */}
      {activeTab === 'governance' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
          <div style={{ background: '#ffffff', borderRadius: 16, padding: 20, border: '1px solid rgba(8, 47, 97, 0.08)', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1)' }}>Security & Data Protection Standards</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Compliance with UIDAI, CSC e-Governance, and IT Act data privacy standards</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { title: 'PII Aadhaar Masking', desc: 'Aadhaar first 8 digits automatically redacted before LLM prompt submission.', active: true },
                { title: 'Prompt Injection Firewall', desc: 'Active regex & classifier filter blocking malicious system prompt overrides.', active: true },
                { title: 'Citizen Consent Verification', desc: 'Mandatory checkbox capture before triggering automated WhatsApp alerts.', active: true },
                { title: 'Strict Role-Based Prompt Execution', desc: 'Only Level-2 Admin can alter production prompt schemas.', active: true }
              ].map(item => (
                <div key={item.title} style={{ display: 'flex', gap: 12, padding: 12, borderRadius: 10, background: 'var(--bg-2)', border: '1px solid var(--border-1)', alignItems: 'center' }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                    <Icon name="check" size={14} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{item.title}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: '#ffffff', borderRadius: 16, padding: 20, border: '1px solid rgba(8, 47, 97, 0.08)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>Live AI Audit Trail</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { time: '10:34 AM', text: 'Kabir Bot: Auto-verified PAN Aadhaar OCR (OPDS-PAN-260708-0048)' },
                { time: '10:31 AM', text: 'Human Officer: Rejected reminder copy HRQ-260708-020' },
                { time: '10:18 AM', text: 'Arjun Bot: Flagged duplicate UTR anomaly in GST ledger' },
                { time: '09:42 AM', text: 'Riya Bot: Escalated passport refund query to human officer' }
              ].map((log, idx) => (
                <div key={idx} style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--bg-2)', border: '1px solid var(--border-1)', fontSize: 11.5 }}>
                  <span style={{ fontWeight: 700, color: 'var(--blue)' }}>{log.time}</span> · <span style={{ color: 'var(--text-2)' }}>{log.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

