import { useState, useEffect } from 'react';
import { Icon } from '../Shared';
import { useApp } from '../AppContext';

const COLUMNS = [
  { id: 'lead',      title: 'New Leads',          color: '#125696', bg: 'rgba(18, 86, 150, 0.08)' },
  { id: 'interest',  title: 'Interested / Draft', color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.08)' },
  { id: 'docs_pend', title: 'Docs Pending',       color: '#c9921a', bg: 'rgba(201, 146, 26, 0.10)' },
  { id: 'pay_pend',  title: 'Payment Due',        color: '#dc2626', bg: 'rgba(220, 38, 38, 0.08)' },
  { id: 'process',   title: 'Processing Desk',    color: '#0284c7', bg: 'rgba(2, 132, 199, 0.08)' },
  { id: 'done',      title: 'Completed',          color: '#16a34a', bg: 'rgba(22, 163, 74, 0.08)' },
];

// Map real order status → pipeline column
function statusToColumn(status = '', payStatus = '') {
  const s = String(status || '').toLowerCase().trim();
  if (s === 'completed' || s === 'delivered' || s === 'done') return 'done';
  if (s === 'processing' || s === 'ready' || s === 'verification' || s === 'government_submission' || s === 'waiting' || s === 'in_progress') return 'process';
  if (s === 'documents pending' || s === 'docs pending' || s === 'documents_pending' || s === 'docs_pend') return 'docs_pend';
  if (s === 'payment pending' || s === 'payment_pending' || s === 'payment_due' || s === 'pay_pend' || s === 'payment') return 'pay_pend';
  if (s === 'interested' || s === 'draft' || s === 'interest') return 'interest';
  if (s === 'lead' || s === 'created' || s === 'pending' || s === 'new') return 'lead';
  return 'lead';
}

const priorityLabel = (amount: number) => amount >= 2000 ? 'P1' : amount >= 500 ? 'P2' : 'P3';
const workflowTitle = (workflow: any) => workflow?.statusLabel || workflow?.currentStage || workflow?.currentState || '';

const TOKEN = () => localStorage.getItem('opds_admin_token') || '';

export const OrderPipelinePanel = () => {
  const { allOrders, updateOrderStatus } = useApp();
  const [orders, setOrders] = useState<any[]>([]);
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [overColId, setOverColId] = useState<string | null>(null);
  const [openMoveMenuId, setOpenMoveMenuId] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Sync real orders into pipeline
  useEffect(() => {
    const real = allOrders.map((o: any, i: number) => ({
      id: o.id || `ord_${i}`,
      title: o.service || 'Service Order',
      sub: `${o.customer?.name || 'Customer'} · ${o.customer?.phone || ''}`,
      status: statusToColumn(o.workflow?.currentState || o.status, o.payStatus),
      amount: o.amount || 0,
      date: o.date || 'Today',
      orderId: o.id,
      workflow: o.workflow || null,
    }));
    setOrders(real);
  }, [allOrders]);

  // Core move action
  const moveOrderToColumn = async (cardId: string, targetColId: string) => {
    setOpenMoveMenuId(null);
    const card = orders.find(o => o.id === cardId);
    if (!card || card.status === targetColId) return;

    const previousStatus = card.status;

    // 1. Instant local update
    setOrders(prev => prev.map(o => o.id === cardId ? { ...o, status: targetColId } : o));

    // 2. Map to backend status
    const statusMap: Record<string, string> = {
      done: 'Completed',
      process: 'Processing',
      docs_pend: 'Documents Pending',
      pay_pend: 'Payment Pending',
      interest: 'Interested',
      lead: 'Lead'
    };
    const backendStatus = statusMap[targetColId] || 'Pending';

    // 3. Persist to backend
    if (card.orderId) {
      setSaving(cardId);
      try {
        if (updateOrderStatus) {
          await updateOrderStatus(card.orderId, backendStatus);
        } else {
          const csrf = document.cookie.split(';').find(c => c.trim().startsWith('opds_csrf='))?.split('=')[1] || '';
          await fetch('/api/admin/orders/status', {
            method: 'POST',
            headers: { 'X-Admin-Token': TOKEN(), 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
            body: JSON.stringify({ orderId: card.orderId, status: backendStatus, overrideReason: 'Admin Kanban move' }),
          });
        }
        setSavedId(cardId);
        setTimeout(() => setSavedId(null), 1500);
      } catch {
        // Rollback
        setOrders(prev => prev.map(o => o.id === cardId ? { ...o, status: previousStatus } : o));
      } finally {
        setSaving(null);
      }
    }
  };

  const filteredOrders = orders.filter(o => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return o.title.toLowerCase().includes(q) || o.sub.toLowerCase().includes(q) || o.orderId.toLowerCase().includes(q);
  });

  const totalOrders = orders.length;
  const completedCount = orders.filter(o => o.status === 'done').length;
  const processingCount = orders.filter(o => ['pay_pend', 'process', 'docs_pend', 'interest'].includes(o.status)).length;

  return (
    <div
      className="panel active"
      onClick={() => setOpenMoveMenuId(null)}
      style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 24px', overflowY: 'hidden', height: '100%' }}
    >
      {/* Header bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14,
        background: '#ffffff', padding: '16px 20px', borderRadius: 16, border: '1px solid rgba(8, 47, 97, 0.08)',
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--blue)', background: 'var(--blue-dim)', padding: '2px 8px', borderRadius: 6 }}>
              Visual Workflow
            </span>
            {saving && (
              <span style={{ fontSize: 11, color: 'var(--amber)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Icon name="loader-2" size={11} className="spin" /> Updating backend…
              </span>
            )}
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-0.02em', margin: 0 }}>
            Order Pipeline & Workflow Desk
          </h1>
          <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: 0 }}>
            {totalOrders} Total · {processingCount} In Pipeline · {completedCount} Completed · Drag cards between columns or use the Move button
          </p>
        </div>

        {/* Search input */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
          background: 'var(--bg-3)', border: '1px solid var(--border-1)', borderRadius: 10, width: 260
        }}>
          <Icon name="search" size={14} style={{ color: 'var(--text-4)' }} />
          <input
            type="text"
            placeholder="Search order or citizen..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 12.5, color: 'var(--text-1)' }}
          />
        </div>
      </div>

      {/* Kanban Board */}
      <div style={{ flex: 1, minHeight: 0, overflowX: 'auto', overflowY: 'hidden', paddingBottom: 4 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(220px, 1fr))', gap: 14, height: '100%', minWidth: 1360 }}>
          {COLUMNS.map(col => {
            const colOrders = filteredOrders.filter(o => o.status === col.id);
            const isDropActive = overColId === col.id;

            return (
              <div
                key={col.id}
                onDragOver={e => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (overColId !== col.id) setOverColId(col.id);
                }}
                onDragLeave={e => {
                  if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                  if (overColId === col.id) setOverColId(null);
                }}
                onDrop={e => {
                  e.preventDefault();
                  const cardId = e.dataTransfer.getData('text/plain') || draggedCardId;
                  setOverColId(null);
                  setDraggedCardId(null);
                  if (cardId) {
                    moveOrderToColumn(cardId, col.id);
                  }
                }}
                style={{
                  background: isDropActive ? 'rgba(18, 86, 150, 0.08)' : 'var(--bg-2)',
                  borderRadius: 14,
                  border: isDropActive ? `2px dashed ${col.color}` : '1px solid rgba(8, 47, 97, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  height: '100%',
                  transition: 'background 0.15s, border-color 0.15s, transform 0.15s',
                  transform: isDropActive ? 'scale(1.008)' : 'none',
                }}
              >
                {/* Column Header */}
                <div style={{
                  padding: '12px 14px',
                  background: '#ffffff',
                  borderBottom: '1px solid var(--border-1)',
                  borderTop: `3px solid ${col.color}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ color: 'var(--text-1)', fontWeight: 700, fontSize: 12.5 }}>{col.title}</span>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: col.color,
                    background: col.bg,
                    padding: '2px 7px',
                    borderRadius: 12
                  }}>
                    {colOrders.length}
                  </span>
                </div>

                {/* Column Cards List */}
                <div style={{ flex: 1, overflowY: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 120 }}>
                  {colOrders.map(order => {
                    const p = priorityLabel(order.amount || 0);
                    const isBeingDragged = draggedCardId === order.id;
                    const isMenuOpen = openMoveMenuId === order.id;

                    return (
                      <div
                        key={order.id}
                        draggable
                        onDragStart={e => {
                          e.dataTransfer.setData('text/plain', order.id);
                          e.dataTransfer.effectAllowed = 'move';
                          setDraggedCardId(order.id);
                        }}
                        onDragEnd={() => {
                          setDraggedCardId(null);
                          setOverColId(null);
                        }}
                        style={{
                          background: '#ffffff',
                          borderRadius: 12,
                          padding: '12px 14px',
                          boxShadow: isBeingDragged ? '0 8px 20px rgba(0,0,0,0.12)' : '0 2px 6px rgba(15, 23, 42, 0.04)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                          userSelect: 'none',
                          cursor: 'grab',
                          opacity: isBeingDragged ? 0.35 : 1,
                          border: savedId === order.id ? '2px solid #16a34a' : '1px solid rgba(8, 47, 97, 0.08)',
                          position: 'relative',
                          transition: 'box-shadow 0.15s, border-color 0.15s',
                        }}
                      >
                        {/* Top info strip */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: p === 'P1' ? 'rgba(220, 38, 38, 0.1)' : p === 'P2' ? 'rgba(201, 146, 26, 0.12)' : 'rgba(18, 86, 150, 0.1)',
                            color: p === 'P1' ? '#dc2626' : p === 'P2' ? '#c9921a' : '#125696'
                          }}>
                            {p}
                          </span>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 11, color: 'var(--text-4)' }}>{order.date || 'Today'}</span>
                            
                            {/* Quick Move Trigger */}
                            <button
                              type="button"
                              title="Move card"
                              onClick={e => {
                                e.stopPropagation();
                                setOpenMoveMenuId(isMenuOpen ? null : order.id);
                              }}
                              style={{
                                border: 'none',
                                background: isMenuOpen ? 'var(--blue)' : 'var(--bg-3)',
                                color: isMenuOpen ? '#ffffff' : 'var(--text-3)',
                                borderRadius: 6,
                                padding: '2px 6px',
                                cursor: 'pointer',
                                fontSize: 10,
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2,
                              }}
                            >
                              Move ▾
                            </button>
                          </div>
                        </div>

                        {/* Quick Move Dropdown Menu */}
                        {isMenuOpen && (
                          <div
                            onClick={e => e.stopPropagation()}
                            style={{
                              position: 'absolute',
                              top: 36,
                              right: 12,
                              zIndex: 100,
                              background: '#ffffff',
                              borderRadius: 10,
                              boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                              border: '1px solid var(--border-1)',
                              padding: 6,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 2,
                              minWidth: 160,
                            }}
                          >
                            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', padding: '4px 8px' }}>
                              Move To Column:
                            </div>
                            {COLUMNS.map(target => (
                              <button
                                key={target.id}
                                type="button"
                                disabled={target.id === col.id}
                                onClick={() => moveOrderToColumn(order.id, target.id)}
                                style={{
                                  border: 'none',
                                  background: target.id === col.id ? 'var(--bg-3)' : 'transparent',
                                  color: target.id === col.id ? 'var(--text-4)' : 'var(--text-1)',
                                  textAlign: 'left',
                                  padding: '6px 10px',
                                  borderRadius: 6,
                                  fontSize: 11.5,
                                  fontWeight: target.id === col.id ? 400 : 600,
                                  cursor: target.id === col.id ? 'default' : 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                }}
                              >
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: target.color }} />
                                {target.title}
                              </button>
                            ))}
                          </div>
                        )}

                        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-1)', lineHeight: 1.3 }}>{order.title}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.sub}</div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, paddingTop: 6, borderTop: '1px solid var(--border-1)' }}>
                          {order.amount > 0 ? (
                            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--emerald)' }}>
                              ₹{Number(order.amount).toLocaleString('en-IN')}
                            </span>
                          ) : <span />}
                          
                          {order.workflow ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--blue)', fontWeight: 600 }}>
                              <Icon name="git-branch" size={11} />
                              {workflowTitle(order.workflow)}
                            </span>
                          ) : (
                            <span style={{ fontSize: 11, color: 'var(--text-4)' }}>{order.orderId}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {colOrders.length === 0 && (
                    <div style={{
                      flex: 1, minHeight: 120, display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center', gap: 6, textAlign: 'center',
                      color: isDropActive ? col.color : 'var(--text-4)', fontSize: 11.5,
                      border: `2px dashed ${isDropActive ? col.color : 'var(--border-2)'}`,
                      borderRadius: 10,
                      background: isDropActive ? 'rgba(255,255,255,0.7)' : 'transparent'
                    }}>
                      <div style={{ fontSize: 16, opacity: 0.5 }}>↓</div>
                      Drop order here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
