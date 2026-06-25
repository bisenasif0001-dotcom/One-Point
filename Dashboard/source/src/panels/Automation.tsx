import React, { useState, useEffect } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay, useDraggable, useDroppable } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PanelHeader, Card, Badge, Icon } from '../Shared';

const TOKEN = localStorage.getItem('opds_admin_token') || '';
const ADMIN_HEADERS = { 'X-Admin-Token': TOKEN, 'Content-Type': 'application/json' };

// Blocks available to add
const AVAILABLE_BLOCKS = [
  { id: 'trigger_service', type: 'trigger', label: 'Service Requested', icon: 'zap', color: 'var(--amber)' },
  { id: 'trigger_payment', type: 'trigger', label: 'Payment Received', icon: 'credit-card', color: 'var(--emerald)' },
  { id: 'cond_docs', type: 'condition', label: 'Wait: Documents Upload', icon: 'clock', color: 'var(--violet)' },
  { id: 'action_verify', type: 'action', label: 'Start Verification', icon: 'file-search', color: 'var(--blue)' },
  { id: 'action_invoice', type: 'action', label: 'Generate PDF Invoice', icon: 'file-text', color: 'var(--blue)', config: [{ l: 'Format', v: 'A4 PDF Template' }, { l: 'Database', v: 'Save Record' }, { l: 'Action', v: 'Prepare for Email/WhatsApp' }] },
  { id: 'action_whatsapp', type: 'action', label: 'Send WhatsApp + Invoice', icon: 'message-circle', color: 'var(--emerald)' },
  { id: 'action_wa_payment', type: 'action', label: 'Send WhatsApp on Payment', icon: 'message-circle', color: 'var(--emerald)', config: [{ l: 'Timing', v: 'Instantly after confirmation' }, { l: 'Content', v: 'Order Details + PDF Invoice' }] },
  { id: 'action_tracking', type: 'action', label: 'Send Tracking Link', icon: 'truck', color: 'var(--blue)' },
  { id: 'action_human', type: 'action', label: 'Human Takeover (Complex)', icon: 'user', color: 'var(--rose)' },
];

const SortableNode = ({ node, onRemove, onChangeConfig }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: node.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  return (
    <div ref={setNodeRef} style={style} className={`workflow-node ${node.type}`}>
      <div className="node-handle" {...attributes} {...listeners}>
        <Icon name="grip-vertical" size={16} />
      </div>
      <div className="node-icon" style={{ background: `${node.color}22`, color: node.color }}>
        <Icon name={node.icon} size={16} />
      </div>
      <div className="node-content">
        <div className="node-type">{node.type.toUpperCase()}</div>
        <div className="node-label">{node.label}</div>
        {node.config && (
          <div style={{ marginTop: 8, fontSize: 'var(--fs-xs)', background: 'var(--bg-2)', padding: '6px 8px', borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 4, border: '1px solid var(--border-1)' }}>
            {node.config.map((c: any, i: number) => (
              <div key={i}><span style={{ color: 'var(--text-3)' }}>{c.l}:</span> <strong>{c.v}</strong></div>
            ))}
          </div>
        )}
      </div>
      <button className="btn-icon-sm" onClick={() => onRemove(node.id)}>
        <Icon name="x" size={16} />
      </button>
    </div>
  );
};

const DraggablePaletteBlock = ({ block, onAdd }: any) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${block.id}`,
    data: { type: 'palette', block }
  });

  return (
    <div 
      ref={setNodeRef}
      className="palette-block" 
      onClick={() => onAdd(block)}
      style={{ opacity: isDragging ? 0.5 : 1, cursor: 'grab' }}
      {...listeners}
      {...attributes}
    >
      <div className="palette-icon" style={{ color: block.color }}><Icon name={block.icon} size={14} /></div>
      <div style={{ fontSize: '12px', fontWeight: 'var(--fw-medium)' }}>{block.label}</div>
      <Icon name="plus" size={14} className="add-icon" />
    </div>
  );
};

const WorkflowCanvasDroppable = ({ children }: any) => {
  const { setNodeRef, isOver } = useDroppable({ id: 'canvas' });
  return (
    <div 
      ref={setNodeRef} 
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 16, 
        alignItems: 'center', 
        minHeight: '100%', 
        padding: 8,
        borderRadius: 8,
        backgroundColor: isOver ? 'var(--bg-3)' : 'transparent',
        transition: 'var(--fast)'
      }}
    >
      {children}
    </div>
  );
};

export const AutomationPanel = () => {
  const [nodes, setNodes] = useState([
    { id: 'node_1', type: 'trigger', label: 'Payment Received', icon: 'credit-card', color: 'var(--emerald)', config: [{ l: 'Event', v: 'Payment Status: Success' }] },
    { id: 'node_2', type: 'action', label: 'Send WhatsApp on Payment', icon: 'message-circle', color: 'var(--emerald)', config: [{ l: 'Timing', v: 'Instantly after confirmation' }, { l: 'Attachment', v: 'PDF Invoice' }, { l: 'Message', v: 'Includes Order Details' }] },
  ]);
  const [activeId, setActiveId]     = useState(null);
  const [saving, setSaving]         = useState(false);
  const [saveMsg, setSaveMsg]       = useState('');
  const [savedRules, setSavedRules] = useState<any[]>([]);

  // Load saved automation rules from backend on mount
  useEffect(() => {
    fetch('/api/admin/automation-rules', { headers: ADMIN_HEADERS })
      .then(r => r.json())
      .then(d => setSavedRules(d.rules || []))
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    if (nodes.length === 0) { setSaveMsg('Add at least one block first.'); return; }
    setSaving(true);
    setSaveMsg('');
    const triggerBlock = nodes.find(n => n.type === 'trigger');
    const actionBlocks = nodes.filter(n => n.type !== 'trigger');
    const ruleName     = triggerBlock ? `${triggerBlock.label} → ${actionBlocks.map(a => a.label).join(', ')}` : 'Custom Rule';
    const trigger      = triggerBlock?.label === 'Payment Received' ? 'payment.captured'
                       : triggerBlock?.label === 'Service Requested' ? 'order.created' : 'order.created';
    const actions      = actionBlocks.map(b => ({ type: b.id, label: b.label, config: b.config || [] }));
    try {
      const csrf = document.cookie.split(';').find(c => c.trim().startsWith('opds_csrf='))?.split('=')[1] || '';
      await fetch('/api/admin/automation-rules', {
        method: 'POST',
        headers: { ...ADMIN_HEADERS, 'X-CSRF-Token': csrf },
        body: JSON.stringify({ name: ruleName, trigger, conditions: {}, actions, is_active: 1 }),
      });
      const r = await fetch('/api/admin/automation-rules', { headers: ADMIN_HEADERS });
      const d = await r.json();
      setSavedRules(d.rules || []);
      setSaveMsg('✓ Workflow saved successfully!');
    } catch { setSaveMsg('✗ Failed to save. Try again.'); }
    setSaving(false);
    setTimeout(() => setSaveMsg(''), 3000);
  };

  const toggleRule = async (ruleId: number, currentActive: number) => {
    const csrf = document.cookie.split(';').find(c => c.trim().startsWith('opds_csrf='))?.split('=')[1] || '';
    await fetch(`/api/admin/automation-rules/${ruleId}`, {
      method: 'PATCH',
      headers: { ...ADMIN_HEADERS, 'X-CSRF-Token': csrf },
      body: JSON.stringify({ is_active: currentActive ? 0 : 1 }),
    });
    const r = await fetch('/api/admin/automation-rules', { headers: ADMIN_HEADERS });
    const d = await r.json();
    setSavedRules(d.rules || []);
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: any) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    if (String(active.id).startsWith('palette-')) {
      const blockId = String(active.id).replace('palette-', '');
      const block = AVAILABLE_BLOCKS.find(b => b.id === blockId);
      if (block) {
        setNodes((items) => {
          const newBlock = { ...block, id: `node_${Date.now()}` };
          if (over.id === 'canvas') {
            return [...items, newBlock];
          } else {
            const overIndex = items.findIndex((i) => i.id === over.id);
            if (overIndex >= 0) {
              const newItems = [...items];
              newItems.splice(overIndex, 0, newBlock);
              return newItems;
            }
          }
          return [...items, newBlock];
        });
      }
      return;
    }

    if (active.id !== over.id && over.id !== 'canvas') {
      setNodes((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);

        if (oldIndex === -1 || newIndex === -1) {
          return items; 
        }

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const addBlock = (block: any) => {
    setNodes([...nodes, { ...block, id: `node_${Date.now()}` }]);
  };

  const removeBlock = (id: string) => {
    setNodes(nodes.filter(n => n.id !== id));
  };

  const activeNode = nodes.find(n => n.id === activeId) || (activeId && String(activeId).startsWith('palette-') ? AVAILABLE_BLOCKS.find(b => `palette-${b.id}` === activeId) : null);

  const loadTemplate = (type: string) => {
    if (type === 'payment-whatsapp') {
      setNodes([
        { id: 'node_t1', type: 'trigger', label: 'Payment Received', icon: 'credit-card', color: 'var(--emerald)' },
        { id: 'node_t2', type: 'action', label: 'Generate PDF Invoice', icon: 'file-text', color: 'var(--blue)', config: [{ l: 'Format', v: 'A4 PDF Template' }, { l: 'Action', v: 'Attach to Communications' }] },
        { id: 'node_t3', type: 'action', label: 'Send WhatsApp on Payment', icon: 'message-circle', color: 'var(--emerald)', config: [{ l: 'Timing', v: 'Instant' }, { l: 'Includes', v: 'Order Details, PDF Invoice' }] }
      ]);
    }
  };

  return (
    <div className="panel active">
      <PanelHeader 
        title="Visual Rule Builder" 
        sub="Create automation workflows with drag and drop" 
        actions={
          <>
            <button className="btn btn-ghost btn-sm" onClick={() => loadTemplate('payment-whatsapp')} style={{ color: 'var(--emerald)', border: '1px solid var(--emerald-border)' }}>
              <Icon name="zap" size={14} /> Auto-Invoice WA Template
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setNodes([])}>Clear All</button>
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving} style={{ opacity: saving ? 0.6 : 1 }}>
              {saving ? <Icon name="loader-2" size={14} className="spin" /> : <Icon name="save" size={14} />} Save Workflow
            </button>
          </>
        } 
      />
      
      <DndContext 
        sensors={sensors} 
        collisionDetection={closestCenter} 
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="panels" style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          {/* Left Palette */}
          <div style={{ width: 280, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Card title="Available Blocks" sub="Drag or click to add" bodyClass="card-body-flush" style={{ padding: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12 }}>
                {AVAILABLE_BLOCKS.map(b => (
                  <DraggablePaletteBlock key={b.id} block={b} onAdd={addBlock} />
                ))}
              </div>
            </Card>
          </div>

          {/* Right Canvas */}
          <div style={{ flex: 1 }}>
            <Card title="Workflow Canvas" sub="Drag blocks to reorder or drop new blocks">
              <div className="workflow-canvas">
                <WorkflowCanvasDroppable>
                  <SortableContext items={nodes} strategy={verticalListSortingStrategy}>
                    {nodes.length === 0 && (
                      <div className="empty-state">
                        <Icon name="git-branch" size={32} />
                        <p>No blocks in this workflow. Drag blocks from the left to add them.</p>
                      </div>
                    )}
                    {nodes.map((node, index) => (
                      <React.Fragment key={node.id}>
                        <SortableNode node={node} onRemove={removeBlock} />
                        {index < nodes.length - 1 && (
                          <div className="workflow-arrow"><Icon name="arrow-down" size={16} /></div>
                        )}
                      </React.Fragment>
                    ))}
                  </SortableContext>
                </WorkflowCanvasDroppable>
              </div>
            </Card>
            
            {nodes.length > 0 && (
               <div style={{ marginTop: 16, padding: 16, background: 'var(--bg-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-1)' }}>
                 <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-semibold)', marginBottom: 8 }}>Workflow Summary</div>
                 <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', lineHeight: 1.5 }}>
                   {nodes.map((n, i) => (
                     <span key={i}>
                       {i > 0 && ' → '}
                       <strong style={{ color: n.color }}>[{n.type.toUpperCase()}]</strong> {n.label}
                     </span>
                   ))}
                 </div>
               </div>
            )}
            {saveMsg && (
              <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-semibold)',
                background: saveMsg.startsWith('✓') ? 'var(--emerald-dim)' : 'var(--rose-dim)',
                color: saveMsg.startsWith('✓') ? 'var(--emerald)' : 'var(--rose)',
                border: `1px solid ${saveMsg.startsWith('✓') ? 'var(--emerald-border)' : 'var(--rose-dim)'}`,
              }}>{saveMsg}</div>
            )}
          </div>
        </div>

        {/* Saved Rules Table */}
        {savedRules.length > 0 && (
          <div style={{ padding: '0 24px 24px' }}>
            <Card title="Saved Automation Rules" sub="All active workflows. Toggle on/off anytime.">
              <table className="data-table">
                <thead><tr><th>Rule Name</th><th>Trigger</th><th>Actions</th><th>Status</th><th>Toggle</th></tr></thead>
                <tbody>
                  {savedRules.map((r: any) => (
                    <tr key={r.id}>
                      <td><strong style={{ fontSize: 'var(--fs-sm)' }}>{r.name}</strong></td>
                      <td><code style={{ fontSize: 'var(--fs-xs)', background: 'var(--bg-3)', padding: '2px 6px', borderRadius: 4 }}>{r.trigger}</code></td>
                      <td style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>
                        {Array.isArray(r.actions) ? r.actions.map((a: any) => a.label || a.type).join(' → ') : JSON.stringify(r.actions).slice(0, 60)}
                      </td>
                      <td>
                        <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', padding: '2px 8px', borderRadius: 20,
                          background: r.is_active ? 'var(--emerald-dim)' : 'var(--bg-3)',
                          color: r.is_active ? 'var(--emerald)' : 'var(--text-3)',
                        }}>{r.is_active ? 'Active' : 'Disabled'}</span>
                      </td>
                      <td>
                        <button className="btn btn-ghost btn-xs" onClick={() => toggleRule(r.id, r.is_active)}>
                          <Icon name={r.is_active ? 'toggle-right' : 'toggle-left'} size={16}
                            style={{ color: r.is_active ? 'var(--emerald)' : 'var(--text-3)' }} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        )}

        <DragOverlay>
          {activeNode ? (
            <div className={`workflow-node ${activeNode.type}`} style={{ opacity: 0.8, cursor: 'grabbing', width: 480, margin: 0 }}>
              <div className="node-handle"><Icon name="grip-vertical" size={16} /></div>
              <div className="node-icon" style={{ background: `${activeNode.color}22`, color: activeNode.color }}>
                <Icon name={activeNode.icon} size={16} />
              </div>
              <div className="node-content">
                <div className="node-type">{activeNode.type.toUpperCase()}</div>
                <div className="node-label">{activeNode.label}</div>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};
