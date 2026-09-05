import React, { useEffect, useRef, useState } from 'react';
import { Icon } from './Shared';
import { useApp } from './AppContext';
import { searchDashboardRegistry } from './features/dashboard/enterprise-dashboard-registry';
import { getSearchPanelLinks } from './features/navigation/nav-config';

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

  const results: SearchResult[] = React.useMemo(() => {
    const q = query.toLowerCase().trim();
    const panelLinks = getSearchPanelLinks(role);

    if (!q) {
      return panelLinks.slice(0, 8).map((panelLink) => ({
        id: `panel-${panelLink.panel}`,
        label: panelLink.label,
        sub: 'Go to panel',
        icon: panelLink.icon,
        group: 'Quick Navigate',
        action: () => {
          setActivePanel(panelLink.panel);
          onClose();
        },
      }));
    }

    const out: SearchResult[] = [];
    const seen = new Set<string>();

    const pushResult = (result: SearchResult) => {
      if (seen.has(result.id)) return;
      seen.add(result.id);
      out.push(result);
    };

    panelLinks
      .filter((panelLink) => panelLink.label.toLowerCase().includes(q))
      .forEach((panelLink) => {
        pushResult({
          id: `panel-${panelLink.panel}`,
          label: panelLink.label,
          sub: 'Panel',
          icon: panelLink.icon,
          group: 'Navigation',
          action: () => {
            setActivePanel(panelLink.panel);
            onClose();
          },
        });
      });

    if (role !== 'customer') {
      searchDashboardRegistry(q, role).slice(0, 8).forEach((registryItem) => {
        if (registryItem.group === 'Enterprise Workspaces' && panelLinks.some((panelLink) => panelLink.panel === registryItem.panel)) {
          return;
        }
        pushResult({
          id: registryItem.id,
          label: registryItem.label,
          sub: registryItem.sub,
          icon: registryItem.icon,
          group: registryItem.group,
          action: () => {
            setActivePanel(registryItem.panel);
            onClose();
          },
        });
      });
    }

    customers
      .filter((customer) =>
        customer.name.toLowerCase().includes(q) ||
        customer.phone.includes(q) ||
        customer.email.toLowerCase().includes(q) ||
        customer.city.toLowerCase().includes(q)
      )
      .slice(0, 5)
      .forEach((customer) => {
        pushResult({
          id: `cust-${customer.id}`,
          label: customer.name,
          sub: `${customer.phone} | ${customer.city} | ${customer.tier}`,
          icon: 'user',
          group: 'Customers',
          color: customer.color,
          action: () => {
            setActivePanel('crm');
            onClose();
          },
        });
      });

    allOrders
      .filter((order) =>
        order.id.toLowerCase().includes(q) ||
        order.service.toLowerCase().includes(q) ||
        order.status.toLowerCase().includes(q)
      )
      .slice(0, 5)
      .forEach((order) => {
        pushResult({
          id: `order-${order.id}`,
          label: `${order.id} - ${order.service}`,
          sub: `Rs. ${order.amount} | ${order.status} | ${(order as any).customer?.name || ''}`,
          icon: 'package',
          group: 'Orders',
          action: () => {
            setActivePanel('orders');
            onClose();
          },
        });
      });

    tasks
      .filter((task) => task.title.toLowerCase().includes(q) || task.sub.toLowerCase().includes(q))
      .slice(0, 3)
      .forEach((task) => {
        pushResult({
          id: `task-${task.id}`,
          label: task.title,
          sub: `${task.priority} | ${task.status}`,
          icon: 'check-square',
          group: 'Tasks',
          action: () => {
            setActivePanel('tasks');
            onClose();
          },
        });
      });

    return out;
  }, [query, customers, allOrders, tasks, role, setActivePanel, onClose]);

  const grouped: Record<string, SearchResult[]> = {};
  results.forEach((result) => {
    if (!grouped[result.group]) grouped[result.group] = [];
    grouped[result.group].push(result);
  });

  const flatResults = results;

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelected((current) => Math.min(current + 1, flatResults.length - 1));
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelected((current) => Math.max(current - 1, 0));
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      flatResults[selected]?.action();
    }
  };

  useEffect(() => {
    setSelected(0);
  }, [query]);

  let globalIndex = 0;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingTop: '12vh',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 600,
          background: 'var(--bg-1)',
          border: '1px solid var(--border-2)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          overflow: 'hidden',
          animation: 'spotlightIn 0.18s var(--ease)',
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: '1px solid var(--border-1)' }}>
          <Icon name="search" size={18} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={role === 'customer' ? 'Search my orders, documents, support...' : 'Search customers, orders, panels, tasks...'}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-1)',
              fontSize: 'var(--fs-base)',
              fontFamily: 'var(--font)',
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

        <div style={{ maxHeight: 440, overflowY: 'auto', padding: '8px 0' }}>
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group}>
              <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '8px 18px 4px' }}>
                {group}
              </div>
              {items.map((item) => {
                const idx = globalIndex++;
                const isSelected = idx === selected;
                return (
                  <div
                    key={item.id}
                    onClick={item.action}
                    onMouseEnter={() => setSelected(idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 18px',
                      cursor: 'pointer',
                      background: isSelected ? 'var(--blue-dim)' : 'transparent',
                      borderLeft: isSelected ? '3px solid var(--blue)' : '3px solid transparent',
                      transition: 'all 0.1s',
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: item.color ? `${item.color}22` : 'var(--bg-3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
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
                      <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-4)', background: 'var(--bg-3)', border: '1px solid var(--border-1)', borderRadius: 4, padding: '2px 6px' }}>Enter</span>
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

        <div style={{ padding: '8px 18px', borderTop: '1px solid var(--border-1)', background: 'var(--bg-2)', display: 'flex', gap: 16, fontSize: 'var(--fs-xs)', color: 'var(--text-4)' }}>
          <span>Up/Down Navigate</span>
          <span>Enter Select</span>
          <span>ESC Close</span>
        </div>
      </div>
    </div>
  );
};

export const useSearchShortcut = (onOpen: () => void) => {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        onOpen();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onOpen]);
};
