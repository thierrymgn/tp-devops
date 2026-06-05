import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, Globe, Zap, Layout, Terminal, Trash2,
  Monitor, Cpu, ChevronRight, RefreshCw,
} from 'lucide-react';
import { api } from '../api/client.js';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import NodeCard from '../components/ui/NodeCard.jsx';

const TYPE_ICONS = {
  'wordpress-multisite': Globe,
  node:                  Zap,
  wordpress:             Layout,
  debian:                Terminal,
};

const TYPE_COLORS = {
  'wordpress-multisite': '#00d4ff',
  node:                  '#a3e635',
  wordpress:             '#818cf8',
  debian:                '#f59e0b',
};

const TYPE_LABELS = {
  'wordpress-multisite': 'WordPress Multisite',
  node:                  'Node.js Server',
  wordpress:             'WordPress',
  debian:                'Debian VPS',
};

function formatRam(mb) {
  return mb >= 1024 ? `${mb / 1024}GB` : `${mb}MB`;
}

export default function Dashboard({ nodes }) {
  const [vms, setVMs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState({});

  const fetchVMs = useCallback(async () => {
    try {
      const data = await api.getVMs();
      setVMs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchVMs(); }, [fetchVMs]);

  const handleDelete = useCallback(async (id, name) => {
    if (!window.confirm(`Delete VM "${name}"? This action cannot be undone.`)) return;

    const originalStatus = vms.find((v) => v.id === id)?.status;

    setVMs((prev) => prev.map((v) => v.id === id ? { ...v, status: 'Deleting' } : v));
    setDeleteLoading((p) => ({ ...p, [id]: true }));

    try {
      await api.deleteVM(id);
      setVMs((prev) => prev.filter((v) => v.id !== id));
    } catch (e) {
      console.error(e);
      setVMs((prev) => prev.map((v) => v.id === id ? { ...v, status: originalStatus || 'Error' } : v));
      alert(`Erreur lors de la suppression : ${e.message}`);
    } finally {
      setDeleteLoading((p) => ({ ...p, [id]: null }));
    }
  }, [vms]);

  const running = vms.filter((v) => v.status === 'Running').length;
  const stopped = vms.filter((v) => v.status === 'Stopped').length;

  return (
    <div style={{ padding: '2rem', maxWidth: 1200, margin: '0 auto' }}>
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }} className="animate-fade-in">
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            Infrastructure
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Docker cluster — 2 machines &nbsp;·&nbsp;
            <span style={{ color: 'var(--status-running)' }}>{running} running</span>
            {stopped > 0 && <>, <span style={{ color: 'var(--status-stopped)' }}>{stopped} stopped</span></>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-ghost" onClick={fetchVMs} style={{ gap: '0.375rem' }}>
            <RefreshCw size={13} />
            Refresh
          </button>
          <Link to="/create" className="btn-primary">
            <Plus size={15} />
            New VM
          </Link>
        </div>
      </div>

      {/* Cluster nodes */}
      <section style={{ marginBottom: '2rem', animationDelay: '0.05s' }} className="animate-fade-in">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Monitor size={14} color="var(--text-muted)" />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 }}>
            Cluster Nodes
          </span>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {nodes.map((node) => (
            <NodeCard key={node.id} node={node} />
          ))}
        </div>
      </section>

      {/* VM table */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Cpu size={14} color="var(--text-muted)" />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 }}>
            Virtual Machines
          </span>
          <span
            style={{
              marginLeft: '0.25rem',
              fontSize: '0.6875rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-muted)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              padding: '0 0.375rem',
            }}
          >
            {vms.length}
          </span>
        </div>

        <div className="card" style={{ overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Loading...
            </div>
          ) : vms.length === 0 ? (
            <div style={{ padding: '4rem', textAlign: 'center' }}>
              <Terminal size={32} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
              <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>No VMs provisioned</p>
              <Link to="/create" className="btn-primary">
                <Plus size={14} /> Provision First VM
              </Link>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>IP Address</th>
                  <th>Status</th>
                  <th>CPU</th>
                  <th>RAM</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vms.map((vm, i) => {
                  const Icon = TYPE_ICONS[vm.type] || Terminal;
                  const color = TYPE_COLORS[vm.type] || 'var(--text-muted)';
                  const deleting = deleteLoading[vm.id];

                  return (
                    <tr key={vm.id} className="animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
                      <td>
                        <Link
                          to={`/vm/${vm.id}`}
                          style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.375rem' }}
                        >
                          {vm.name}
                          <ChevronRight size={12} color="var(--text-muted)" />
                        </Link>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Icon size={13} color={color} />
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>{TYPE_LABELS[vm.type] || vm.typeLabel || vm.type}</span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--accent-cyan)' }}>
                          {vm.ip}
                        </span>
                      </td>
                      <td><StatusBadge status={vm.status} /></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>{vm.cpu}</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>vCPU</span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>
                          {formatRam(vm.ram)}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.375rem' }}>
                          <Link to={`/vm/${vm.id}`} className="btn-ghost" style={{ padding: '0.3rem 0.625rem', fontSize: '0.75rem' }}>
                            Detail
                          </Link>
                          <button
                            className="btn-danger"
                            onClick={() => handleDelete(vm.id, vm.name)}
                            disabled={!!deleting}
                            style={{ padding: '0.3rem 0.625rem' }}
                            title="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
