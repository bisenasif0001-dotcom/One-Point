import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Icon } from './Shared';
import { useApp } from './AppContext';

// ─── Searchable Items ─────────────────────────────────────────────────────────
const PANEL_LINKS = [
  { label: 'Dashboard', panel: 'home', icon: 'layout-dashboard', group: 'Navigation' },
  { label: 'Order Pipeline', panel: 'kanban', icon: 'git-commit', group: 'Navigation' },
  { label: 'Verify Queue', panel: 'documents', icon: 'file-check-2', group: 'Navigation' },
  { label: 'All Applications', panel: 'orders', icon: 'list-ordered', group: 'Navigation' },
  { label: 'Tasks & Follow-ups', panel: 'tasks', icon: 'check-square', group: 'Navigation' },
  { label: 'CRM Profiles', panel: 'crm', icon: 'users', group: 'Navigation' },
  { label: 'WhatsApp Center', panel: 'whatsapp', icon: 'message-circle', group: 'Navigation' },
  { label: 'SMS Notifications', panel: 'sms', icon: 'smartphone', group: 'Navigation' },
  { label: 'Support Tickets', panel: 'support', icon: 'life-buoy', group: 'Navigation' },
  { label: 'Payment Ledger', panel: 'finance', icon: 'indian-rupee', group: 'Navigation' },
  { label: 'Refunds', panel: 'refunds', icon: 'rotate-ccw', group: 'Navigation' },
  { label: 'Franchise Network', panel: 'franchise', icon: 'store', group: 'Navigation' },
  { label: 'Analytics & Reports', panel: 'analytics', icon: 'pie-chart', group: 'Navigation' },
  { label: 'Rule Builder / Automation', panel: 'automation', icon: 'zap', group: 'Navigation' },
  { label: 'AI Agents / Employees', panel: 'ai-agents', icon: 'bot', group: 'Navigation' },
  { label: 'Service Templates', panel: 'services', icon: 'grid-3x3', group: 'Navigation' },
  { label: 'OneMart Store', panel: 'onemart', icon: 'shopping-cart', group: 'Navigation' },
  { label: 'Platform Settings', panel: 'settings', icon: 'settings', group: 'Navigation' },
];

const CUSTOMER_PANEL_LINKS = [
  { label: 'My Profile & KYC', panel: 'crm', icon: 'user', group: 'Navigation' },
  { label: 'My Orders & Track', panel: 'orders', icon: 'package', group: 'Navigation' },
  { label: 'My Digital Locker', panel: 'documents', icon: 'folder', group: 'Navigation' },
  { label: 'Help & Tickets', panel: 'support', icon: 'life-buoy', group: 'Navigation' },
  { label: 'WhatsApp Support', panel: 'whatsapp', icon: 'message-circle', group: 'Navigation' },
];

type SearchResult = {
  id: string;
  label: string;
  sub: string;
  icon: string;
  group: string;
  action: () => void;
  color?: string;
};

export const SearchModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { customers, allOrders, tasks, role, setActivePanel } = useApp();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Build results based on query
  const results: SearchResult[] = React.useMemo(() => {
    const q = query.toLowerCase().trim();
    const panelLinks = role === 'customer' ? CUSTOMER_PANEL_LINKS : PANEL_LINKS;
    if (!q) {
      // Show default panel shortcuts
      return panelLinks.slice(0, 8).map(p => ({
        id: p.panel,
        label: p.label,
        sub: 'Go to panel',
        icon: p.icon,
        group: 'Quick Navigate',
        action: () => { setActivePanel(p.panel); onClose(); }
      }));
    }

    const out: SearchResult[] = [];

    // Search panels
    panelLinks.filter(p => p.label.toLowerCase().includes(q)).forEach(p => {
      out.push({
        id: `panel-${p.panel}`,
        label: p.label,
        sub: 'Panel',
        icon: p.icon,
        group: 'Navigation',
        action: () => { setActivePanel(p.panel); onClose(); }
      });
    });

    // Search customers
    customers
      .filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q)
      )
      .slice(0, 5)
      .forEach(c => {
        out.push({
          id: `cust-${c.id}`,
          label: c.name,
          sub: `${c.phone} · ${c.city} · ${c.tier}`,
          icon: 'user',
          group: 'Customers',
          color: c.color,
          action: () => { setActivePanel('crm'); onClose(); }
        });
      });

    // Search orders
    allOrders
      .filter(o =>
        o.id.toLowerCase().includes(q) ||
        o.service.toLowerCase().includes(q) ||
        o.status.toLowerCase().includes(q)
      )
      .slice(0, 5)
      .forEach(o => {
        out.push({
          id: `order-${o.id}`,
          label: `${o.id} — ${o.service}`,
          sub: `₹${o.amount} · ${o.status} · ${(o as any).customer?.name || ''}`,
          icon: 'package',
          group: 'Orders',
          action: () => { setActivePanel('orders'); onClose(); }
        });
      });

    // Search tasks
    tasks
      .filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.sub.toLowerCase().includes(q)
      )
      .slice(0, 3)
      .forEach(t => {
        out.push({
          id: `task-${t.id}`,
          label: t.title,
          sub: `${t.priority} · ${t.status}`,
          icon: 'check-square',
          group: 'Tasks',
          action: () => { setActivePanel('tasks'); onClose(); }
        });
      });

    return out;
  }, [query, customers, allOrders, tasks, role, setActivePanel, onClose]);

  // Group results
  const grouped: Record<string, SearchResult[]> = {};
  results.forEach(r => {
    if (!grouped[r.group]) grouped[r.group] = [];
    grouped[r.group].push(r);
  });

  const flatResults = results;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, flatResults.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    if (e.key === 'Enter') { e.preventDefault(); flatResults[selected]?.action(); }
  };

  // Reset selection when results change
  useEffect(() => { setSelected(0); }, [query]);

  let globalIndex = 0;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
        display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
        paddingTop: '12vh',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxWidth: 600, background: 'var(--bg-1)',
          border: '1px solid var(--border-2)', borderRadius: 'var(--radius-xl)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          overflow: 'hidden',
          animation: 'spotlightIn 0.18s var(--ease)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: '1px solid var(--border-1)' }}>
          <Icon name="search" size={18} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={role === 'customer' ? 'Search my orders, documents, support...' : 'Search customers, orders, panels, tasks...'}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--text-1)', fontSize: 'var(--fs-base)', fontFamily: 'var(--font)',
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{ background: 'var(--bg-3)', border: 'none', borderRadius: 6, padding: '2px 8px', color: 'var(--text-3)', fontSize: 'var(--fs-xs)', cursor: 'pointer' }}
            >
              Clear
            </button>
          )}
          <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-4)', background: 'var(--bg-3)', border: '1px solid var(--border-1)', borderRadius: 4, padding: '2px 6px' }}>ESC</span>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 440, overflowY: 'auto', padding: '8px 0' }}>
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group}>
              <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '8px 18px 4px' }}>
                {group}
              </div>
              {items.map(item => {
                const idx = globalIndex++;
                const isSelected = idx === selected;
                return (
                  <div
                    key={item.id}
                    onClick={item.action}
                    onMouseEnter={() => setSelected(idx)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 18px', cursor: 'pointer',
                      background: isSelected ? 'var(--blue-dim)' : 'transparent',
                      borderLeft: isSelected ? '3px solid var(--blue)' : '3px solid transparent',
                      transition: 'all 0.1s',
                    }}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: item.color ? `${item.color}22` : 'var(--bg-3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {item.color && item.group === 'Customers' ? (
                        <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', color: item.color }}>
                          {item.label.slice(0, 2).toUpperCase()}
                        </span>
                      ) : (
                        <Icon name={item.icon} size={15} style={{ color: isSelected ? 'var(--blue)' : 'var(--text-2)' }} />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-semibold)', color: isSelected ? 'var(--blue)' : 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.sub}
                      </div>
                    </div>
                    {isSelected && (
                      <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-4)', background: 'var(--bg-3)', border: '1px solid var(--border-1)', borderRadius: 4, padding: '2px 6px' }}>↵</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
          {results.length === 0 && (
            <div style={{ padding: '32px 18px', textAlign: 'center', color: 'var(--text-3)' }}>
              <Icon name="search" size={32} style={{ marginBottom: 8, opacity: 0.3 }} />
              <div style={{ fontSize: 'var(--fs-sm)' }}>No results for "<strong style={{ color: 'var(--text-2)' }}>{query}</strong>"</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '8px 18px', borderTop: '1px solid var(--border-1)', background: 'var(--bg-2)', display: 'flex', gap: 16, fontSize: 'var(--fs-xs)', color: 'var(--text-4)' }}>
          <span>↑↓ Navigate</span>
          <span>↵ Select</span>
          <span>ESC Close</span>
        </div>
      </div>
    </div>
  );
};

// ─── Hook for global shortcut ─────────────────────────────────────────────────
export const useSearchShortcut = (onOpen: () => void) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpen();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onOpen]);
};
