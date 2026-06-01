import { mockVMs, mockNodes } from '../data/mock.js';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

const realClient = {
  async get(path) {
    const res = await fetch(`${BASE_URL}${path}`);
    if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
    return res.json();
  },
  async post(path, body) {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
    return res.json();
  },
  async del(path) {
    const res = await fetch(`${BASE_URL}${path}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`);
    return res.json();
  },
};

const mockClient = {
  async getVMs() {
    await delay(300);
    return [...mockVMs];
  },
  async getVM(id) {
    await delay(200);
    const vm = mockVMs.find((v) => v.id === id);
    if (!vm) throw new Error(`VM ${id} not found`);
    return { ...vm };
  },
  async getNodes() {
    await delay(200);
    return [...mockNodes];
  },
  async createVM(payload) {
    await delay(4000);
    return { id: `vm-${Date.now()}`, ...payload, status: 'Running' };
  },
  async actionVM(id, action) {
    await delay(500);
    return { id, action, success: true };
  },
  async deleteVM(id) {
    await delay(600);
    return { id, deleted: true };
  },
};

export const api = USE_MOCK
  ? mockClient
  : {
      getVMs: () => realClient.get('/vms'),
      getVM: (id) => realClient.get(`/vms/${id}`),
      getNodes: () => realClient.get('/nodes'),
      createVM: (payload) => realClient.post('/vms', payload),
      actionVM: (id, action) => realClient.post(`/vms/${id}/${action}`),
      deleteVM: (id) => realClient.del(`/vms/${id}`),
    };
