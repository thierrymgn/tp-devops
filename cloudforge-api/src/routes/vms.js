import { Router } from 'express'
import { EventEmitter } from 'events'
import path from 'path'
import fs from 'fs/promises'
import { v4 as uuidv4 } from 'uuid'

import { AppError } from '../middleware/errorHandler.js'
import { buildTfvarsContent, tfvarsFilename } from '../utils/tfvars.js'
import { getContainerStats } from '../services/docker.js'
import { sendCredentials } from '../services/esp32.js'
import {
  terraformApply,
  terraformDestroy,
  terraformRefresh,
  terraformOutput,
  VALID_TYPES,
} from '../services/terraform.js'
import {
  addVM,
  readVMs,
  findVM,
  updateVM,
  removeVM,
  claimNextSshPort,
  claimNextAppPort,
} from '../services/state.js'

const router = Router()

// Active terraform runs initiated by PATCH (reconfiguration).
// vmId → { emitter: EventEmitter, lines: string[], done: boolean }
// The /logs SSE endpoint attaches to this instead of spawning a second terraform process.
const activeRuns = new Map()

const TFVARS_DIR = path.resolve(process.env.TFVARS_PATH || './terraform/envs')


async function writeTfvars(config, type) {
  await fs.mkdir(TFVARS_DIR, { recursive: true })
  const filePath = path.join(TFVARS_DIR, tfvarsFilename(config.name))
  await fs.writeFile(filePath, buildTfvarsContent(config, type), 'utf8')
  return filePath
}

async function cleanupTfvars(tfvarsPath) {
  try { await fs.unlink(tfvarsPath) } catch { }
}

function applyOutputs(vm, outputs) {
  const updated = {
    ...vm,
    status:        'running',
    errorMessage:  undefined,   // on efface l'éventuelle erreur précédente
    ip:            outputs.vm_ip          ?? vm.ip,
    containerId:   outputs.vm_id          ?? vm.containerId,
    containerName: outputs.vm_name        ?? vm.containerName,
    sshPort:       outputs.ssh_port       ?? vm.sshPort,
    sshUser:       outputs.ssh_user       ?? vm.sshUser,
    sshPassword:   outputs.ssh_password   ?? vm.sshPassword,
  }

  if (outputs.http_port !== undefined) updated.httpPort = outputs.http_port
  if (outputs.app_port  !== undefined) updated.appPort  = outputs.app_port

  if (outputs.wp_admin_user     !== undefined) updated.wpAdminUser     = outputs.wp_admin_user
  if (outputs.wp_admin_password !== undefined) updated.wpAdminPassword = outputs.wp_admin_password

  return updated
}

router.post('/', async (req, res) => {
  const {
    name,
    type,
    ram  = 1024,
    cpu  = 1,
    disk = 10,
    multisiteHost,
  } = req.body

  if (!name) throw new AppError('le champ "name" est obligatoire', 400)
  if (!type) throw new AppError('le champ "type" est obligatoire', 400)
  if (!VALID_TYPES.includes(type)) {
    throw new AppError(
      `type "${type}" invalide. Types acceptés : ${VALID_TYPES.join(', ')}`,
      400
    )
  }
  if (!/^[a-z0-9-]+$/.test(name)) {
    throw new AppError('le nom doit être en minuscules, chiffres et tirets uniquement', 400)
  }

  const existing = await readVMs()
  if (existing.some((v) => v.name === name)) {
    throw new AppError(`une VM nommée "${name}" existe déjà`, 409)
  }

  const sshPort = await claimNextSshPort()
  const appPort = await claimNextAppPort()

  const tfvarsPath = await writeTfvars({ name, ram, cpu, disk, sshPort, appPort, multisiteHost }, type)

  const vm = {
    id: uuidv4(),
    name,
    type,
    status: 'provisioning',
    ip: null,
    sshPort,
    sshUser: null,
    sshPassword: null,
    httpPort: ['wordpress', 'wordpress-multisite'].includes(type) ? appPort : null,
    appPort:  type === 'node' ? appPort : null,
    wpAdminUser:     null,
    wpAdminPassword: null,
    ram,
    cpu,
    disk,
    createdAt: new Date().toISOString(),
    tfvarsPath,
    containerId: null,
    containerName: null,
  }

  await addVM(vm)

  res.status(202).json({
    success: true,
    data: vm,
    message: `provisionnement démarré — suivez les logs sur GET /api/vms/${vm.id}/logs`,
  })

  ;(async () => {
    try {
      await terraformApply({ type, tfvarsPath })

      let outputs = {}
      try {
        outputs = await terraformOutput(type)
      } catch (e) {
        console.warn(`[terraform] outputs indisponibles pour ${vm.id} :`, e.message)
      }

      await updateVM(vm.id, applyOutputs(vm, outputs))

      sendCredentials(vm, outputs).catch((e) =>
        console.warn('[esp32] envoi échoué :', e.message)
      )
    } catch (err) {
      console.error(`[terraform] apply échoué pour ${vm.id} :`, err.message)
      await updateVM(vm.id, { status: 'error', errorMessage: err.message })
    }
  })()
})

router.get('/', async (_req, res) => {
  const vms = await readVMs()
  res.json({ success: true, data: vms })
})

router.get('/:id/stats', async (req, res) => {
  const vm = await findVM(req.params.id)
  if (!vm) throw new AppError(`VM "${req.params.id}" introuvable`, 404)

  if (!vm.containerId || vm.status !== 'running') {
    return res.json({ success: true, data: { cpuUsage: 0, ramUsage: 0, diskUsage: 0 } })
  }

  const stats = await getContainerStats(vm.containerName || vm.containerId)
  res.json({ success: true, data: stats })
})

router.get('/:id', async (req, res) => {
  const vm = await findVM(req.params.id)
  if (!vm) throw new AppError(`VM "${req.params.id}" introuvable`, 404)
  res.json({ success: true, data: vm })
})

router.patch('/:id', async (req, res) => {
  const vm = await findVM(req.params.id)
  if (!vm) throw new AppError(`VM "${req.params.id}" introuvable`, 404)

  if (vm.status === 'provisioning') {
    throw new AppError('impossible de modifier une VM en cours de provisionnement', 409)
  }

  const newConfig = {
    name: vm.name,
    ram:  req.body.ram  ?? vm.ram,
    cpu:  req.body.cpu  ?? vm.cpu,
    disk: req.body.disk ?? vm.disk,
    sshPort: vm.sshPort,
    appPort: vm.httpPort ?? vm.appPort,
  }

  const tfvarsPath = await writeTfvars(newConfig, vm.type)
  await updateVM(vm.id, { ...newConfig, status: 'provisioning', tfvarsPath })

  res.json({
    success: true,
    data: { ...vm, ...newConfig, status: 'provisioning' },
    message: 'mise à jour démarrée, terraform re-applique la configuration',
  })

  ;(async () => {
    const run = { emitter: new EventEmitter(), lines: [], done: false }
    activeRuns.set(vm.id, run)

    const pushLine = (line) => {
      run.lines.push(line)
      run.emitter.emit('line', line)
    }

    try {
      try {
        await terraformRefresh({ type: vm.type, tfvarsPath, onLine: pushLine })
      } catch (firstErr) {
        // Docker sometimes rejects an in-place container update on the first attempt
        // (e.g. container recreation timing on Docker Desktop). Retry once after a short delay.
        pushLine(`⚠ première tentative échouée, retry dans 4s…`)
        await new Promise(r => setTimeout(r, 4000))
        await terraformRefresh({ type: vm.type, tfvarsPath, onLine: pushLine })
      }

      let outputs = {}
      try { outputs = await terraformOutput(vm.type) } catch { /* non bloquant */ }

      await updateVM(vm.id, applyOutputs({ ...vm, ...newConfig }, outputs))
      pushLine('✓ configuration mise à jour avec succès')
    } catch (err) {
      console.error(`[terraform] refresh échoué pour ${vm.id} :`, err.message)
      await updateVM(vm.id, { status: 'error', errorMessage: err.message })
      pushLine(`✗ erreur : ${err.message}`)
    } finally {
      run.done = true
      run.emitter.emit('done')
      activeRuns.delete(vm.id)
    }
  })()
})

router.delete('/:id', async (req, res) => {
  const vm = await findVM(req.params.id)
  if (!vm) throw new AppError(`VM "${req.params.id}" introuvable`, 404)

  const force = req.query.force === 'true'

  if (vm.status === 'provisioning' && !force) {
    throw new AppError(
      'VM en cours de provisionnement — ajoutez ?force=true pour forcer la suppression',
      409
    )
  }

  if (!vm.containerId) {
    await removeVM(vm.id)
    await cleanupTfvars(vm.tfvarsPath)
    return res.json({ success: true, data: { id: vm.id }, message: 'VM supprimée' })
  }

  await updateVM(vm.id, { status: 'provisioning' })

  try {
    await terraformDestroy({ type: vm.type, tfvarsPath: vm.tfvarsPath })
  } catch (err) {
    console.error(`[terraform] destroy échoué pour ${vm.id} :`, err.message)

    if (!force) {
      await updateVM(vm.id, { status: 'error', errorMessage: err.message })
      throw new AppError(
        `terraform destroy a échoué — relancez avec ?force=true pour supprimer quand même`,
        500,
        err.message
      )
    }

    console.warn(`[terraform] force=true → suppression de l'index malgré l'échec du destroy`)
  }

  await removeVM(vm.id)
  await cleanupTfvars(vm.tfvarsPath)
  res.json({ success: true, data: { id: vm.id }, message: 'VM détruite' })
})

// POST /api/vms/:id/send-to-esp32 — renvoie manuellement les credentials à l'ESP32
router.post('/:id/send-to-esp32', async (req, res) => {
  const vm = await findVM(req.params.id)
  if (!vm) throw new AppError(`VM "${req.params.id}" introuvable`, 404)

  if (!vm.sshPassword) {
    throw new AppError('pas de credentials disponibles pour cette VM (provisioning incomplet ?)', 400)
  }

  await sendCredentials(vm, {})
  res.json({ success: true, message: `credentials envoyés à l'ESP32 pour "${vm.name}"` })
})

router.get('/:id/logs', async (req, res) => {
  const vm = await findVM(req.params.id)
  if (!vm) throw new AppError(`VM "${req.params.id}" introuvable`, 404)

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  const send = (line, stream = 'stdout') => {
    const payload = JSON.stringify({ line, stream, ts: new Date().toISOString() })
    res.write(`data: ${payload}\n\n`)
  }

  // If a PATCH reconfiguration is already running, attach to its output stream
  // instead of spawning a second conflicting terraform process.
  const activeRun = activeRuns.get(vm.id)
  if (activeRun) {
    activeRun.lines.forEach((line) => send(line))

    if (activeRun.done) {
      res.write('event: done\ndata: {}\n\n')
      return res.end()
    }

    const onLine = (line) => send(line)
    const onDone = () => {
      res.write('event: done\ndata: {}\n\n')
      res.end()
    }

    activeRun.emitter.on('line', onLine)
    activeRun.emitter.once('done', onDone)
    req.on('close', () => {
      activeRun.emitter.off('line', onLine)
      activeRun.emitter.off('done', onDone)
    })

    return
  }

  // No active run — creation flow: spawn terraform with live SSE output.
  send(`démarrage de terraform apply pour la VM "${vm.name}" (${vm.type})…`)

  try {
    await terraformApply({
      type: vm.type,
      tfvarsPath: vm.tfvarsPath,
      onLine: (line, stream) => send(line, stream),
    })

    try {
      const outputs = await terraformOutput(vm.type)
      await updateVM(vm.id, applyOutputs(vm, outputs))
      sendCredentials(vm, outputs).catch((e) =>
        console.warn('[esp32] envoi échoué (logs) :', e.message)
      )
    } catch { /* non bloquant */ }

    send('✓ VM provisionnée avec succès')
  } catch (err) {
    send(`✗ erreur : ${err.message}`, 'stderr')
    await updateVM(vm.id, { status: 'error', errorMessage: err.message })
  } finally {
    res.write('event: done\ndata: {}\n\n')
    res.end()
  }
})

export default router
