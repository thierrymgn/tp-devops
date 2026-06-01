import { useEffect, useState } from 'react';

function RingGauge({ value, color, size = 90, label, sublabel }) {
  const [animated, setAnimated] = useState(0);
  const r = 40;
  const circ = 2 * Math.PI * r;
  const offset = circ - (animated / 100) * circ;

  useEffect(() => {
    const t = setTimeout(() => setAnimated(value), 100);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox="0 0 90 90" className="ring-gauge">
          <circle className="track" cx="45" cy="45" r={r} strokeWidth="6" />
          <circle
            className="fill"
            cx="45"
            cy="45"
            r={r}
            strokeWidth="6"
            stroke={color}
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ filter: `drop-shadow(0 0 4px ${color}80)` }}
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {value}%
          </span>
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </div>
        {sublabel && (
          <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.1rem', fontFamily: 'var(--font-mono)' }}>
            {sublabel}
          </div>
        )}
      </div>
    </div>
  );
}

function BarGauge({ value, color, label, sublabel }) {
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(value), 100);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </span>
        <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 500 }}>
          {value}%
        </span>
      </div>
      <div
        style={{
          height: 6,
          background: 'var(--border-bright)',
          borderRadius: 0,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${animated}%`,
            background: color,
            boxShadow: `0 0 8px ${color}60`,
            transition: 'width 1.2s ease',
          }}
        />
      </div>
      {sublabel && (
        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.25rem', fontFamily: 'var(--font-mono)' }}>
          {sublabel}
        </div>
      )}
    </div>
  );
}

export { RingGauge, BarGauge };
export default RingGauge;
