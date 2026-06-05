import { Router } from 'express'
import path from 'path'
import fs from 'fs/promises'
import { v4 as uuidv4 } from 'uuid'

import { AppError } from '../middleware/errorHandler.js'
import { buildTfvarsContent, tfvarsFilename } from '../utils/tfvars.js'
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
    try {
      await terraformRefresh({ type: vm.type, tfvarsPath })

      let outputs = {}
      try { outputs = await terraformOutput(vm.type) } catch { /* non bloquant */ }

      await updateVM(vm.id, applyOutputs({ ...vm, ...newConfig }, outputs))
    } catch (err) {
      console.error(`[terraform] refresh échoué pour ${vm.id} :`, err.message)
      await updateVM(vm.id, { status: 'error', errorMessage: err.message })
    }
  })()
})

router.delete('/:id', async (req, res) => {
  const vm = await findVM(req.params.id)
  if (!vm) throw new AppError(`VM "${req.params.id}" introuvable`, 404)

  if (vm.status === 'provisioning') {
    throw new AppError('impossible de détruire une VM en cours de provisionnement', 409)
  }

  await updateVM(vm.id, { status: 'provisioning' })

  res.json({
    success: true,
    data: { id: vm.id },
    message: 'destruction en cours...',
  })

  ;(async () => {
    try {
      await terraformDestroy({ type: vm.type, tfvarsPath: vm.tfvarsPath })
      await removeVM(vm.id)
      await cleanupTfvars(vm.tfvarsPath)
    } catch (err) {
      console.error(`[terraform] destroy échoué pour ${vm.id} :`, err.message)
      await updateVM(vm.id, { status: 'error', errorMessage: err.message })
    }
  })()
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
