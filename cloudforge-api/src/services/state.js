import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const DATA_DIR   = path.join(__dirname, '..', 'data')
const VMS_FILE   = path.join(DATA_DIR, 'vms.json')
const PORTS_FILE = path.join(DATA_DIR, 'ports.json')

const SSH_PORT_START = 2222
const APP_PORT_START = 8080

export async function initStateFiles() {
  await fs.mkdir(DATA_DIR, { recursive: true })

  try {
    await fs.access(VMS_FILE)
  } catch {
    await fs.writeFile(VMS_FILE, JSON.stringify([], null, 2))
  }

  try {
    await fs.access(PORTS_FILE)
  } catch {
    await fs.writeFile(PORTS_FILE, JSON.stringify({
      nextSshPort: SSH_PORT_START,
      nextAppPort: APP_PORT_START,
    }, null, 2))
  }
}

export async function readVMs() {
  const raw = await fs.readFile(VMS_FILE, 'utf8')
  return JSON.parse(raw)
}

async function writeVMs(vms) {
  await fs.writeFile(VMS_FILE, JSON.stringify(vms, null, 2))
}

export async function addVM(vm) {
  const vms = await readVMs()
  vms.push(vm)
  await writeVMs(vms)
}

export async function updateVM(id, patch) {
  const vms = await readVMs()
  const idx = vms.findIndex((v) => v.id === id)
  if (idx === -1) return null
  vms[idx] = { ...vms[idx], ...patch }
  await writeVMs(vms)
  return vms[idx]
}

export async function removeVM(id) {
  const vms = await readVMs()
  const filtered = vms.filter((v) => v.id !== id)
  if (filtered.length === vms.length) return false
  await writeVMs(filtered)
  return true
}

export async function findVM(id) {
  const vms = await readVMs()
  return vms.find((v) => v.id === id)
}

export async function claimNextSshPort() {
  const raw = await fs.readFile(PORTS_FILE, 'utf8')
  const registry = JSON.parse(raw)
  const port = registry.nextSshPort
  registry.nextSshPort += 1
  await fs.writeFile(PORTS_FILE, JSON.stringify(registry, null, 2))
  return port
}

export async function claimNextAppPort() {
  const raw = await fs.readFile(PORTS_FILE, 'utf8')
  const registry = JSON.parse(raw)
  const port = registry.nextAppPort
  registry.nextAppPort += 1
  await fs.writeFile(PORTS_FILE, JSON.stringify(registry, null, 2))
  return port
}
