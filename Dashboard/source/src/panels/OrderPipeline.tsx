import React, { useState, useEffect } from 'react';
import { PanelHeader, Badge, Icon } from '../Shared';
import { useApp } from '../AppContext';
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor, DragOverlay } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const COLUMNS = [
  { id: 'lead',      title: 'Lead',              color: 'var(--blue)' },
  { id: 'interest',  title: 'Interested',        color: 'var(--violet)' },
  { id: 'docs_pend', title: 'Documents Pending', color: 'var(--amber)' },
  { id: 'pay_pend',  title: 'Payment Pending',   color: 'var(--rose)' },
  { id: 'process',   title: 'Processing',        color: 'var(--blue)' },
  { id: 'done',      title: 'Completed',         color: 'var(--emerald)' },
];

// Map real order status → pipeline column
function statusToColumn(status = '', payStatus = '') {
  const s = status.toLowerCase();
  const p = (payStatus || '').toLowerCase();
  if (s === 'completed') return 'done';
  if (s === 'processing') return 'process';
  if (s === 'documents pending' || s === 'docs pending') return 'docs_pend';
  if (s === 'payment pending' || s === 'payment_pending' || p === 'pending') return 'pay_pend';
  if (s === 'interested') return 'interest';
  if (s === 'lead' || s === 'created' || s === 'pending') return 'lead';
  return 'lead';
}

const priorityLabel = (amount: number) => amount >= 2000 ? 'P1' : amount >= 500 ? 'P2' : 'P3';

const SortableOrderCard = ({ order, onStatusChange }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: order.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1, cursor: isDragging ? 'grabbing' : 'grab' };
  const p = priorityLabel(order.amount || 0);

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="kanban-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
        <Badge type={p === 'P1' ? 'danger' : p === 'P2' ? 'warning' : 'info'}>{p}</Badge>
        <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-4)' }}>{order.date || 'Today'}</span>
      </div>
      <div className="kanban-card-name" style={{ lineHeight: 1.3, fontSize: 'var(--fs-sm)' }}>{order.title}</div>
      <div className="kanban-card-service" style={{ marginTop: 4, fontSize: 'var(--fs-xs)' }}>{order.sub}</div>
      {order.amount > 0 && (
        <div style={{ marginTop: 8, fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', color: 'var(--emerald)' }}>
          ₹{Number(order.amount).toLocaleString('en-IN')}
        </div>
      )}
    </div>
  );
};

const TOKEN = localStorage.getItem('opds_admin_token') || '';

export const OrderPipelinePanel = () => {
  const { allOrders, customers } = useApp();
  const [orders, setOrders] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<any>(null);
  const [saving, setSaving] = useState<string | null>(null);

  // Build pipeline from real orders
  useEffect(() => {
    const real = allOrders.map((o: any, i: number) => ({
      id: o.id || `ord_${i}`,
      title: o.service || 'Service Order',
      sub: `${o.customer?.name || 'Customer'} · ${o.customer?.phone || ''}`,
      status: statusToColumn(o.status, o.payStatus),
      amount: o.amount || 0,
      date: o.date || 'Today',
      orderId: o.id,
    }));
    if (real.length > 0) {
      setOrders(real);
    } else {
      // Fallback demo cards
      setOrders([
        { id: 'ord_1', title: 'PAN Card Registration',  sub: 'Nida Begum · +91 98765 43210',  status: 'verify',  amount: 499,  date: 'Today', orderId: '' },
        { id: 'ord_2', title: 'GST Registration',       sub: 'Anil Kumar · +91 87654 32109',  status: 'new',     amount: 1200, date: 'Today', orderId: '' },
        { id: 'ord_3', title: 'Passport Application',   sub: 'Sanjay Sharma · +91 76543 21098',status: 'docs',    amount: 2000, date: 'Today', orderId: '' },
        { id: 'ord_4', title: 'FSSAI License',          sub: 'R K Traders · +91 65432 10987', status: 'payment', amount: 3400, date: 'Today', orderId: '' },
        { id: 'ord_5', title: 'Income Certificate',     sub: 'Priya Singh · +91 54321 09876', status: 'process', amount: 150,  date: 'Today', orderId: '' },
      ]);
    }
  }, [allOrders]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragStart = (e: any) => setActiveId(e.active.id);

  const handleDragEnd = async (e: any) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;

    const isCol     = COLUMNS.find(c => c.id === over.id);
    const targetCol = isCol ? over.id : orders.find(o => o.id === over.id)?.status;

    if (!targetCol || !active.id || targetCol === orders.find(o => o.id === active.id)?.status) return;

    setOrders(prev => prev.map(o => o.id === active.id ? { ...o, status: targetCol } : o));

    // Persist to backend if real order
    const movedOrder = orders.find(o => o.id === active.id);
    if (movedOrder?.orderId) {
      setSaving(active.id);
      const statusMap: Record<string, string> = {
        done: 'Completed',
        process: 'Processing',
        docs_pend: 'Documents Pending',
        pay_pend: 'Payment Pending',
        interest: 'Interested',
        lead: 'Lead'
      };
      try {
        const csrf = document.cookie.split(';').find(c => c.trim().startsWith('opds_csrf='))?.split('=')[1] || '';
        await fetch('/api/admin/orders/status', {
          method: 'POST',
          headers: { 'X-Admin-Token': TOKEN, 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
          body: JSON.stringify({ orderId: movedOrder.orderId, status: statusMap[targetCol] || 'Lead' }),
        });
      } catch { /* offline */ }
      setSaving(null);
    }
  };

  const activeOrder = orders.find(o => o.id === activeId);
  const totalOrders = orders.length;
  const completedCount = orders.filter(o => o.status === 'done').length;
  const processingCount = orders.filter(o => ['pay_pend', 'process', 'docs_pend', 'interest'].includes(o.status)).length;

  return (
    <div className="panel active">
      <PanelHeader
        title="Order Pipeline"
        sub={`${totalOrders} total · ${processingCount} active · ${completedCount} done · Drag to change status`}
        icon="git-commit"
      >
        {saving && <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="loader-2" size={12} className="spin" /> Saving...</span>}
      </PanelHeader>

      <div className="panels">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="kanban-board" style={{ height: 'calc(100vh - 160px)' }}>
            {COLUMNS.map(col => {
              const colOrders = orders.filter(o => o.status === col.id);
              return (
                <div key={col.id} className="kanban-col" id={col.id}>
                  <div className="kanban-col-header" style={{ borderTop: `3px solid ${col.color}` }}>
                    <span style={{ color: col.color, fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-xs)' }}>{col.title}</span>
                    <span style={{ opacity: 0.5, fontSize: 'var(--fs-xs)', marginLeft: 6 }}>{colOrders.length}</span>
                  </div>
                  <SortableContext items={colOrders.map(o => o.id)} strategy={verticalListSortingStrategy}>
                    <div className="kanban-col-cards" style={{ minHeight: 80 }}>
                      {colOrders.length === 0 && (
                        <div style={{ padding: '12px 8px', textAlign: 'center', color: 'var(--text-4)', fontSize: 'var(--fs-xs)', border: '1px dashed var(--border-1)', borderRadius: 8, margin: '4px 0' }}>Drop here</div>
                      )}
                      {colOrders.map(o => <SortableOrderCard key={o.id} order={o} />)}
                    </div>
                  </SortableContext>
                </div>
              );
            })}
          </div>

          <DragOverlay>
            {activeOrder && (
              <div className="kanban-card" style={{ opacity: 0.85, cursor: 'grabbing' }}>
                <div className="kanban-card-name">{activeOrder.title}</div>
                <div className="kanban-card-service">{activeOrder.sub}</div>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
};
