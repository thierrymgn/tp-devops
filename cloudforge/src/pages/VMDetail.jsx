import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Globe, Zap, Layout, Terminal, Play, Square, RotateCcw,
  Trash2, Copy, Check, ArrowLeft, Activity, Clock,
} from 'lucide-react';
import { api } from '../api/client.js';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import { RingGauge, BarGauge } from '../components/ui/ResourceGauge.jsx';

const TYPE_ICONS = { 'wordpress-multisite': Globe, nodejs: Zap, wordpress: Layout, 'debian-vps': Terminal };
const TYPE_COLORS = { 'wordpress-multisite': '#00d4ff', nodejs: '#a3e635', wordpress: '#818cf8', 'debian-vps': '#f59e0b' };

const LEVEL_COLORS = { info: 'var(--text-muted)', warn: 'var(--status-provisioning)', error: 'var(--status-stopped)' };

function CopyButton({ text, style }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      title="Copy"
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: copied ? 'var(--status-running)' : 'var(--text-muted)',
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.2rem',
        transition: 'color 0.2s',
        ...style,
      }}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(10, 14, 26, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        className="card animate-fade-in"
        style={{ padding: '2rem', maxWidth: 400, width: '90%', border: '1px solid var(--border-bright)' }}
      >
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Confirm action
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{message}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button className="btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn-danger" onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

export default function VMDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vm, setVM] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(null);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    api.getVM(id)
      .then(setVM)
      .catch(() => navigate('/dashboard'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const doAction = useCallback(async (action) => {
    setActionBusy(action);
    try {
      await api.actionVM(id, action);
      setVM((prev) => {
        if (!prev) return prev;
        const status = action === 'start' ? 'Running' : action === 'stop' ? 'Stopped' : prev.status;
        return { ...prev, status };
      });
    } catch (e) {
      console.error(e);
    } finally {
      setActionBusy(null);
    }
  }, [id]);

  const doDelete = useCallback(async () => {
    setConfirm(null);
    setActionBusy('delete');
    try {
      await api.deleteVM(id);
      navigate('/dashboard');
    } catch (e) {
      console.error(e);
      setActionBusy(null);
    }
  }, [id, navigate]);

  if (loading) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading...
      </div>
    );
  }

  if (!vm) return null;

  const Icon = TYPE_ICONS[vm.type] || Terminal;
  const color = TYPE_COLORS[vm.type] || 'var(--text-muted)';
  const sshCmd = `ssh debian@${vm.ip}`;

  return (
    <div style={{ padding: '2rem', maxWidth: 1100, margin: '0 auto' }}>
      {confirm && (
        <ConfirmModal
          message={confirm.message}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* Back */}
      <Link
        to="/dashboard"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.8125rem', marginBottom: '1.5rem' }}
      >
        <ArrowLeft size={13} />
        Dashboard
      </Link>

      {/* VM Header */}
      <div
        className="card animate-fade-in"
        style={{ padding: '1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            background: `${color}18`,
            border: `1px solid ${color}40`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={22} color={color} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              {vm.name}
            </h1>
            <StatusBadge status={vm.status} size="lg" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            <span>{vm.typeLabel}</span>
            <span style={{ color: 'var(--border-bright)' }}>·</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              {vm.ip}
              <CopyButton text={vm.ip} />
            </span>
            <span style={{ color: 'var(--border-bright)' }}>·</span>
            <span style={{ color: 'var(--text-muted)' }}>Node: {vm.node}</span>
          </div>
        </div>

        {/* Quick actions */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {vm.status !== 'Running' && (
            <button className="btn-ghost" onClick={() => doAction('start')} disabled={!!actionBusy}>
              <Play size={13} />
              Start
            </button>
          )}
          {vm.status === 'Running' && (
            <button className="btn-ghost" onClick={() => doAction('stop')} disabled={!!actionBusy}>
              <Square size={13} />
              Stop
            </button>
          )}
          <button
            className="btn-ghost"
            onClick={() =>
              setConfirm({ message: `Reboot VM "${vm.name}"?`, onConfirm: () => doAction('reboot') })
            }
            disabled={!!actionBusy}
          >
            <RotateCcw size={13} />
            Reboot
          </button>
          <button
            className="btn-danger"
            onClick={() =>
              setConfirm({
                message: `Permanently delete "${vm.name}"? All data will be lost.`,
                onConfirm: doDelete,
              })
            }
            disabled={!!actionBusy}
          >
            <Trash2 size={13} />
            Delete
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        {/* Resource gauges */}
        <div className="card animate-fade-in" style={{ padding: '1.5rem', animationDelay: '0.05s' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={12} />
            Resource Usage
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '1.5rem' }}>
            <RingGauge
              value={vm.cpuUsage}
              color="var(--accent-cyan)"
              label="CPU"
              sublabel={`${vm.cpu} vCPU`}
            />
            <RingGauge
              value={vm.ramUsage}
              color="#818cf8"
              label="RAM"
              sublabel={vm.ram >= 1024 ? `${vm.ram / 1024}GB` : `${vm.ram}MB`}
            />
          </div>
          <BarGauge
            value={vm.diskUsage}
            color="#a3e635"
            label="Disk"
            sublabel={`${vm.disk}GB provisioned`}
          />
        </div>

        {/* SSH + specs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* SSH */}
          <div className="card animate-fade-in" style={{ padding: '1.25rem', animationDelay: '0.1s' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.875rem' }}>
              SSH Access
            </div>
            <div
              style={{
                background: '#050810',
                border: '1px solid var(--border)',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem',
              }}
            >
              <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: '#a3e635', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {sshCmd}
              </code>
              <CopyButton text={sshCmd} />
            </div>
          </div>

          {/* Specs */}
          <div className="card animate-fade-in" style={{ padding: '1.25rem', animationDelay: '0.12s' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.875rem' }}>
              Specifications
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
              {[
                { label: 'vCPU', value: `${vm.cpu} cores` },
                { label: 'RAM', value: vm.ram >= 1024 ? `${vm.ram / 1024} GB` : `${vm.ram} MB` },
                { label: 'Disk', value: `${vm.disk} GB` },
                { label: 'Node', value: vm.node },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>
                    {label}
                  </div>
                  <div style={{ fontSize: '0.875rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Activity log */}
      <div className="card animate-fade-in" style={{ padding: '1.5rem', animationDelay: '0.15s' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock size={12} />
          Activity Log
        </div>
        <div>
          {(vm.activity || []).map((entry, i) => (
            <div
              key={entry.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '0.625rem 0',
                borderBottom: i < vm.activity.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: LEVEL_COLORS[entry.level] || 'var(--text-muted)',
                  flexShrink: 0,
                }}
              />
              <span style={{ flex: 1, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                {entry.event}
              </span>
              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {entry.time}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
