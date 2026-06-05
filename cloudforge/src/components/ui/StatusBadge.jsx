export default function StatusBadge({ status, size = 'sm' }) {
  const map = {
    Running:      { dot: '#22c55e', label: 'Running',      pulse: true  },
    Stopped:      { dot: '#ef4444', label: 'Stopped',      pulse: false },
    Provisioning: { dot: '#f59e0b', label: 'Provisioning', pulse: false },
    Deleting:     { dot: '#ef4444', label: 'Deleting…',    pulse: false },
    Error:        { dot: '#ef4444', label: 'Error',        pulse: false },
    Online:       { dot: '#22c55e', label: 'Online',       pulse: true  },
    Offline:      { dot: '#ef4444', label: 'Offline',      pulse: false },
  };

  const cfg = map[status] || { dot: '#4a5a78', label: status, pulse: false };
  const fontSize = size === 'lg' ? '0.8125rem' : '0.6875rem';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.375rem',
        padding: '0.2rem 0.6rem',
        background: `${cfg.dot}18`,
        border: `1px solid ${cfg.dot}40`,
        fontSize,
        fontWeight: 500,
        letterSpacing: '0.04em',
        color: cfg.dot,
        fontFamily: 'var(--font-ui)',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: cfg.dot,
          flexShrink: 0,
          boxShadow: `0 0 6px ${cfg.dot}`,
        }}
        className={cfg.pulse ? 'status-pulse' : ''}
      />
      {cfg.label}
    </span>
  );
}
