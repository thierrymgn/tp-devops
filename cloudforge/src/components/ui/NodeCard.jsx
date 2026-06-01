import StatusBadge from './StatusBadge.jsx';

export default function NodeCard({ node }) {
  return (
    <div
      className="card"
      style={{ padding: '1.25rem', flex: 1, minWidth: 0 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>
            {node.role}
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {node.name}
          </div>
        </div>
        <StatusBadge status={node.status} />
      </div>

      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--accent-cyan)', marginBottom: '1rem', letterSpacing: '0.02em' }}>
        {node.ip}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        <ResourceBar label="CPU" value={node.cpu} color="var(--accent-cyan)" />
        <ResourceBar label="RAM" value={node.ram} color="#818cf8" />
      </div>
    </div>
  );
}

function ResourceBar({ label, value, color }) {
  const getColor = (v) => v > 80 ? 'var(--status-stopped)' : v > 60 ? 'var(--status-provisioning)' : color;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
        <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </span>
        <span style={{ fontSize: '0.6875rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
          {value}%
        </span>
      </div>
      <div style={{ height: 4, background: 'var(--border-bright)', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${value}%`,
            background: getColor(value),
            boxShadow: `0 0 6px ${getColor(value)}50`,
            transition: 'width 1s ease',
          }}
        />
      </div>
    </div>
  );
}
