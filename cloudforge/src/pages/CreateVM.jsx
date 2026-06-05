import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, Zap, Layout, Terminal, Check, ChevronRight, ChevronLeft, Server } from 'lucide-react';
import { api, USE_MOCK } from '../api/client.js';
import { vmTemplates } from '../data/mock.js';

const ICON_MAP = { Globe, Zap, Layout, Terminal };

const LOG_LINES = [
  'Initializing Terraform workspace...',
  'Planning infrastructure changes...',
  'Creating network namespace...',
  'Pulling container image...',
  'Applying module: vm-base...',
  'Configuring storage volume...',
  'Setting up network interfaces...',
  'Running provisioning scripts...',
  'Waiting for SSH daemon...',
  'Installing packages...',
  'Finalizing configuration...',
  'VM created successfully ✓',
];

function StepIndicator({ step, total }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0', marginBottom: '2.5rem' }}>
      {Array.from({ length: total }).map((_, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < total - 1 ? 1 : 'none' }}>
            <div
              style={{
                width: 28,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: done ? 'var(--accent-cyan)' : active ? 'var(--bg-elevated)' : 'var(--bg-surface)',
                border: `1px solid ${done ? 'var(--accent-cyan)' : active ? 'var(--accent-cyan)' : 'var(--border)'}`,
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                color: done ? '#0a0e1a' : active ? 'var(--accent-cyan)' : 'var(--text-muted)',
                flexShrink: 0,
                transition: 'all 0.2s',
              }}
            >
              {done ? <Check size={13} strokeWidth={3} /> : i + 1}
            </div>
            {i < total - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 1,
                  background: done ? 'var(--accent-cyan)' : 'var(--border)',
                  transition: 'background 0.3s',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Step1({ selected, onSelect }) {
  return (
    <div>
      <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
        Choose a template
      </h2>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        Select the operating environment for your VM.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
        {vmTemplates.map((tpl) => {
          const Icon = ICON_MAP[tpl.icon] || Terminal;
          const active = selected?.id === tpl.id;
          return (
            <button
              key={tpl.id}
              onClick={() => onSelect(tpl)}
              style={{
                background: active ? `${tpl.color}0f` : 'var(--bg-elevated)',
                border: `1px solid ${active ? tpl.color : 'var(--border)'}`,
                padding: '1.25rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s',
                position: 'relative',
              }}
            >
              {active && (
                <Check
                  size={14}
                  strokeWidth={2.5}
                  color={tpl.color}
                  style={{ position: 'absolute', top: '0.75rem', right: '0.75rem' }}
                />
              )}
              <div
                style={{
                  width: 36,
                  height: 36,
                  background: `${tpl.color}18`,
                  border: `1px solid ${tpl.color}40`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '0.875rem',
                }}
              >
                <Icon size={17} color={tpl.color} />
              </div>
              <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.375rem' }}>
                {tpl.name}
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                {tpl.description}
              </div>
              <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                {tpl.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: '0.625rem',
                      padding: '0.15rem 0.5rem',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-muted)',
                      fontFamily: 'var(--font-mono)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Step2({ config, onChange }) {
  const cost = (config.ram * 0.5 + config.cpu * 2 + config.disk * 0.1).toFixed(2);

  return (
    <div>
      <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
        Configure resources
      </h2>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        Set the compute resources for your virtual machine.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        {/* Name */}
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
            VM Name
          </label>
          <input
            className="input-field"
            value={config.name}
            onChange={(e) => onChange({ ...config, name: e.target.value })}
            placeholder="e.g. prod-api-01"
          />
        </div>

        {/* RAM */}
        <SliderField
          label="RAM"
          value={config.ram}
          min={512}
          max={8192}
          step={512}
          display={config.ram >= 1024 ? `${config.ram / 1024} GB` : `${config.ram} MB`}
          onChange={(v) => onChange({ ...config, ram: v })}
          color="var(--accent-cyan)"
        />

        {/* CPU */}
        <SliderField
          label="vCPU"
          value={config.cpu}
          min={1}
          max={8}
          step={1}
          display={`${config.cpu} vCPU`}
          onChange={(v) => onChange({ ...config, cpu: v })}
          color="#818cf8"
        />

        {/* Disk */}
        <SliderField
          label="Disk"
          value={config.disk}
          min={10}
          max={100}
          step={10}
          display={`${config.disk} GB`}
          onChange={(v) => onChange({ ...config, disk: v })}
          color="#a3e635"
        />

        {/* Cost estimate */}
        <div
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-bright)',
            padding: '1rem 1.25rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Estimated cost</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
            €{cost}<span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)' }}>/mo</span>
          </span>
        </div>
      </div>
    </div>
  );
}

function SliderField({ label, value, min, max, step, display, onChange, color }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </label>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', fontWeight: 600, color }}>
          {display}
        </span>
      </div>
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 4, transform: 'translateY(-50%)', background: 'var(--border-bright)', zIndex: 0 }}>
          <div style={{ height: '100%', width: `${pct}%`, background: color, boxShadow: `0 0 8px ${color}60`, transition: 'width 0.1s' }} />
        </div>
        <input
          type="range"
          className="slider"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ position: 'relative', zIndex: 1, background: 'transparent' }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
        <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {min >= 1024 ? `${min / 1024}GB` : min < 10 ? `${min}` : `${min}${label === 'vCPU' ? '' : 'GB'}`}
        </span>
        <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {max >= 1024 ? `${max / 1024}GB` : `${max}${label === 'vCPU' ? ' vCPU' : 'GB'}`}
        </span>
      </div>
    </div>
  );
}

function Step3({ template, config, deploying, deployed, logLines, onDeploy }) {
  const cost = (config.ram * 0.5 + config.cpu * 2 + config.disk * 0.1).toFixed(2);
  const ramDisplay = config.ram >= 1024 ? `${config.ram / 1024} GB` : `${config.ram} MB`;

  if (deploying || deployed) {
    return (
      <div>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
          {deployed ? 'VM Deployed' : 'Provisioning...'}
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          {deployed ? 'Your VM is online and ready.' : 'Terraform is setting up your environment.'}
        </p>
        <div
          style={{
            background: '#050810',
            border: '1px solid var(--border)',
            padding: '1.25rem',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8125rem',
            minHeight: 240,
            overflowY: 'auto',
          }}
        >
          <div style={{ color: 'var(--text-muted)', marginBottom: '0.75rem', fontSize: '0.6875rem' }}>
            $ terraform apply -auto-approve
          </div>
          {logLines.map((line, i) => (
            <div
              key={i}
              className="animate-log"
              style={{
                animationDelay: `${i * 0.05}s`,
                color: line.includes('✓') ? 'var(--status-running)' : line.includes('Error') ? 'var(--status-stopped)' : 'var(--text-secondary)',
                marginBottom: '0.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span style={{ color: 'var(--text-muted)' }}>›</span>
              {line}
              {i === logLines.length - 1 && !deployed && (
                <span
                  style={{
                    display: 'inline-block',
                    width: 8,
                    height: 14,
                    background: 'var(--accent-cyan)',
                    marginLeft: 2,
                    animation: 'pulse-dot 1s ease-in-out infinite',
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
        Review & Deploy
      </h2>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        Confirm your configuration before provisioning.
      </p>

      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {[
            { label: 'Template', value: template?.name, mono: false },
            { label: 'VM Name', value: config.name || '(unnamed)', mono: true },
            { label: 'RAM', value: ramDisplay, mono: true },
            { label: 'vCPU', value: `${config.cpu} vCPU`, mono: true },
            { label: 'Disk', value: `${config.disk} GB`, mono: true },
            { label: 'Est. Cost', value: `€${cost}/mo`, mono: true, highlight: true },
          ].map(({ label, value, mono, highlight }) => (
            <div key={label}>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>
                {label}
              </div>
              <div style={{ fontFamily: mono ? 'var(--font-mono)' : 'var(--font-ui)', fontSize: '0.9375rem', fontWeight: 600, color: highlight ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        className="btn-primary"
        onClick={onDeploy}
        style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', fontSize: '0.9375rem' }}
      >
        <Server size={16} />
        Deploy VM
      </button>
    </div>
  );
}

export default function CreateVM() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [template, setTemplate] = useState(null);
  const [config, setConfig] = useState({ name: '', ram: 1024, cpu: 2, disk: 20 });
  const [deploying, setDeploying] = useState(false);
  const [deployed, setDeployed] = useState(false);
  const [logLines, setLogLines] = useState([]);

  const canNext = [
    !!template,
    config.name.trim().length > 0,
    true,
  ];

  const handleDeploy = async () => {
    setDeploying(true);
    setLogLines([]);

    if (USE_MOCK) {
      for (let i = 0; i < LOG_LINES.length; i++) {
        await new Promise((r) => setTimeout(r, 320 + Math.random() * 200));
        setLogLines((prev) => [...prev, LOG_LINES[i]]);
      }
      setDeploying(false);
      setDeployed(true);
      setTimeout(() => navigate('/dashboard'), 3000);
      return;
    }

    try {
      const vm = await api.createVM({
        name: config.name,
        type: template.id,
        ram:  config.ram,
        cpu:  config.cpu,
        disk: config.disk,
      });

      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const es = new EventSource(`${apiBase}/vms/${vm.id}/logs`);

      es.onmessage = (e) => {
        const { line } = JSON.parse(e.data);
        setLogLines((prev) => [...prev, line]);
      };

      const finish = () => {
        es.close();
        setDeploying(false);
        setDeployed(true);
        setTimeout(() => navigate('/dashboard'), 3000);
      };

      es.addEventListener('done', finish);
      es.onerror = finish;
    } catch (err) {
      console.error('erreur lors du déploiement :', err);
      setLogLines((prev) => [...prev, `✗ Erreur : ${err.message}`]);
      setDeploying(false);
    }
  };

  const stepLabels = ['Template', 'Resources', 'Deploy'];

  return (
    <div style={{ padding: '2rem', maxWidth: 720, margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }} className="animate-fade-in">
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>New Virtual Machine</h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Provision a VM via Terraform + Docker.
        </p>
      </div>

      <div className="card animate-fade-in" style={{ padding: '2rem' }}>
        {/* Steps header */}
        <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.25rem' }}>
          {stepLabels.map((label, i) => (
            <button
              key={i}
              onClick={() => !deploying && !deployed && i < step && setStep(i)}
              style={{
                background: 'none',
                border: 'none',
                cursor: i < step && !deploying ? 'pointer' : 'default',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: i === step ? 'var(--text-primary)' : i < step ? 'var(--accent-cyan)' : 'var(--text-muted)',
                fontSize: '0.875rem',
                fontWeight: i === step ? 600 : 400,
              }}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: i === step ? 'var(--accent-cyan)' : i < step ? 'transparent' : 'var(--bg-base)',
                  border: `1px solid ${i === step ? 'var(--accent-cyan)' : i < step ? 'var(--accent-cyan)' : 'var(--border)'}`,
                  fontSize: '0.6875rem',
                  fontFamily: 'var(--font-mono)',
                  color: i === step ? '#0a0e1a' : i < step ? 'var(--accent-cyan)' : 'var(--text-muted)',
                  flexShrink: 0,
                }}
              >
                {i < step ? <Check size={12} strokeWidth={3} /> : i + 1}
              </span>
              {label}
            </button>
          ))}
        </div>

        {/* Step content */}
        <div className="animate-fade-in" key={step}>
          {step === 0 && <Step1 selected={template} onSelect={setTemplate} />}
          {step === 1 && <Step2 config={config} onChange={setConfig} />}
          {step === 2 && (
            <Step3
              template={template}
              config={config}
              deploying={deploying}
              deployed={deployed}
              logLines={logLines}
              onDeploy={handleDeploy}
            />
          )}
        </div>

        {/* Navigation */}
        {!deploying && !deployed && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)' }}>
            <button
              className="btn-ghost"
              onClick={() => step > 0 ? setStep(step - 1) : navigate('/dashboard')}
            >
              <ChevronLeft size={14} />
              {step === 0 ? 'Cancel' : 'Back'}
            </button>
            {step < 2 && (
              <button
                className="btn-primary"
                onClick={() => setStep(step + 1)}
                disabled={!canNext[step]}
                style={{ opacity: canNext[step] ? 1 : 0.4, cursor: canNext[step] ? 'pointer' : 'not-allowed' }}
              >
                Next
                <ChevronRight size={14} />
              </button>
            )}
          </div>
        )}
        {deployed && (
          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Redirecting to dashboard...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
