import { Link, useLocation } from 'react-router-dom';
import { Cloud, LayoutDashboard, Plus, Activity } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge.jsx';

export default function Header({ nodes = [] }) {
  const location = useLocation();

  const allOnline = nodes.every((n) => n.status === 'Online');
  const clusterStatus = nodes.length === 0 ? 'Offline' : allOnline ? 'Online' : 'Offline';

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/create', label: 'New VM', icon: Plus, highlight: true },
  ];

  return (
    <header
      style={{
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        padding: '0 2rem',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Logo */}
      <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', textDecoration: 'none' }}>
        <div
          style={{
            width: 30,
            height: 30,
            background: 'var(--accent-cyan)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Cloud size={16} color="#0a0e1a" strokeWidth={2.5} />
        </div>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontWeight: 500,
            fontSize: '1rem',
            color: 'var(--text-primary)',
            letterSpacing: '0.04em',
          }}
        >
          Cloud<span style={{ color: 'var(--accent-cyan)' }}>Forge</span>
        </span>
      </Link>

      {/* Cluster health */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Activity size={13} color="var(--text-muted)" />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Cluster
          </span>
          <StatusBadge status={clusterStatus} />
        </div>
        {nodes.map((n) => (
          <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: n.status === 'Online' ? 'var(--status-running)' : 'var(--status-stopped)',
                display: 'inline-block',
                boxShadow: n.status === 'Online' ? '0 0 6px var(--status-running)' : 'none',
              }}
              className={n.status === 'Online' ? 'status-pulse' : ''}
            />
            <span style={{ fontSize: '0.6875rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
              {n.name}
            </span>
          </div>
        ))}
      </div>

      {/* Nav */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        {navLinks.map(({ to, label, icon: Icon, highlight }) => {
          const active = location.pathname === to;
          if (highlight) {
            return (
              <Link key={to} to={to} className="btn-primary" style={{ padding: '0.375rem 1rem', fontSize: '0.8125rem' }}>
                <Plus size={14} />
                {label}
              </Link>
            );
          }
          return (
            <Link
              key={to}
              to={to}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.375rem 0.75rem',
                fontSize: '0.8125rem',
                color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                textDecoration: 'none',
                background: active ? 'var(--bg-elevated)' : 'transparent',
                border: active ? '1px solid var(--border-bright)' : '1px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              <Icon size={14} />
              {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
