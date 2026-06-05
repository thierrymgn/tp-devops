import { mockVMs, mockNodes } from '../data/mock.js';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

const capitalizeStatus = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

function normalizeVM(vm) {
  return {
    cpuUsage: 0,
    ramUsage: 0,
    diskUsage: 0,
    activity: [],
    ...vm,
    status: capitalizeStatus(vm.status),
  };
}

const http = {
  async get(path) {
    const res = await fetch(`${BASE_URL}${path}`);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `GET ${path} échoué : ${res.status}`);
    }
    return res.json();
  },
  async post(path, body) {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `POST ${path} échoué : ${res.status}`);
    }
    return res.json();
  },
  async patch(path, body) {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `PATCH ${path} échoué : ${res.status}`);
    }
    return res.json();
  },
  async del(path) {
    const res = await fetch(`${BASE_URL}${path}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `DELETE ${path} échoué : ${res.status}`);
    }
    return res.json();
  },
};

const mockClient = {
  async getVMs()         { await delay(300); return [...mockVMs]; },
  async getVM(id)        { await delay(200); const vm = mockVMs.find((v) => v.id === id); if (!vm) throw new Error(`VM ${id} introuvable`); return { ...vm }; },
  async getNodes()       { await delay(200); return [...mockNodes]; },
  async createVM(payload){ await delay(1000); return { id: `vm-${Date.now()}`, ...payload, status: 'Provisioning' }; },
  async actionVM(id, action) { await delay(500); return { id, action, success: true }; },
  async deleteVM(id)     { await delay(600); return { id, deleted: true }; },
  async getVMStats()     {
    await delay(150);
    return {
      cpuUsage:  Math.floor(Math.random() * 40) + 5,
      ramUsage:  Math.floor(Math.random() * 50) + 20,
      diskUsage: Math.floor(Math.random() * 30) + 10,
    };
  },
};

const realClient = {
  async getVMs() {
    const res = await http.get('/vms');
    return res.data.map(normalizeVM);
  },
  async getVM(id) {
    const res = await http.get(`/vms/${id}`);
    return normalizeVM(res.data);
  },
  async getNodes() {
    const res = await http.get('/nodes');
    return res.data;
  },
  async createVM(payload) {
    const res = await http.post('/vms', payload);
    return normalizeVM(res.data);
  },
  async actionVM(id, action) {
    const res = await http.post(`/vms/${id}/${action}`);
    return res.data;
  },
  async deleteVM(id) {
    const res = await http.del(`/vms/${id}?force=true`);
    return res.data;
  },
  async getVMStats(id) {
    const res = await http.get(`/vms/${id}/stats`);
    return res.data;
  },
  async sendToEsp32(id) {
    const res = await http.post(`/vms/${id}/send-to-esp32`);
    return res;
  },
};

export const api = USE_MOCK ? mockClient : realClient;
