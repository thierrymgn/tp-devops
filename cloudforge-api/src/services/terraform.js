import { spawn } from 'child_process'
import fs from 'fs/promises'
import path from 'path'
import { AppError } from '../middleware/errorHandler.js'

export const VALID_TYPES = [
  'wordpress-multisite',
  'node',
  'wordpress',
  'debian',
]

export async function resolveModulePath(type) {
  if (!VALID_TYPES.includes(type)) {
    throw new AppError(
      `type "${type}" inconnu. Types valides : ${VALID_TYPES.join(', ')}`,
      400
    )
  }

  const basePath = process.env.TERRAFORM_BASE_PATH || '../terraform/modules'
  const modulePath = path.resolve(basePath, type)

  try {
    await fs.access(modulePath)
  } catch {
    throw new AppError(
      `dossier du module terraform introuvable : ${modulePath}\n` +
      `vérifiez que les modules de votre coéquipier sont bien dans ${basePath}/`,
      400
    )
  }

  return modulePath
}

function runTerraform(args, { onLine } = {}) {
  return new Promise((resolve, reject) => {
    let stdout = ''
    let stderr = ''

    const proc = spawn('terraform', args, {
      env: { ...process.env, TF_IN_AUTOMATION: '1' },
    })

    proc.stdout.setEncoding('utf8')
    proc.stderr.setEncoding('utf8')

    proc.stdout.on('data', (chunk) => {
      stdout += chunk
      if (onLine) {
        chunk.split('\n').filter(Boolean).forEach((line) => onLine(line, 'stdout'))
      }
    })

    proc.stderr.on('data', (chunk) => {
      stderr += chunk
      if (onLine) {
        chunk.split('\n').filter(Boolean).forEach((line) => onLine(line, 'stderr'))
      }
    })

    proc.on('error', (err) => {
      if (err.code === 'ENOENT') {
        reject(new AppError(
          "binaire terraform introuvable. Installez terraform et vérifiez qu'il est dans votre $PATH",
          503
        ))
      } else {
        reject(err)
      }
    })

    proc.on('close', (code) => resolve({ stdout, stderr, code }))
  })
}

export async function terraformApply({ type, tfvarsPath, onLine }) {
  const modulePath = await resolveModulePath(type)

  const args = [
    `-chdir=${modulePath}`,
    'apply',
    `-var-file=${tfvarsPath}`,
    '-auto-approve',
  ]

  const { stderr, code } = await runTerraform(args, { onLine })

  if (code !== 0) {
    throw new AppError('terraform apply a échoué', 500, stderr)
  }
}

export async function terraformDestroy({ type, tfvarsPath, onLine }) {
  const modulePath = await resolveModulePath(type)

  const args = [
    `-chdir=${modulePath}`,
    'destroy',
    `-var-file=${tfvarsPath}`,
    '-auto-approve',
  ]

  const { stderr, code } = await runTerraform(args, { onLine })

  if (code !== 0) {
    throw new AppError('terraform destroy a échoué', 500, stderr)
  }
}

export async function terraformRefresh({ type, tfvarsPath, onLine }) {
  return terraformApply({ type, tfvarsPath, onLine })
}

export async function terraformOutput(type) {
  const modulePath = await resolveModulePath(type)

  const { stdout, stderr, code } = await runTerraform([
    `-chdir=${modulePath}`,
    'output',
    '-json',
  ])

  if (code !== 0) {
    throw new AppError('terraform output a échoué', 500, stderr)
  }

  try {
    const raw = JSON.parse(stdout)
    return Object.fromEntries(
      Object.entries(raw).map(([k, v]) => [k, v.value ?? v])
    )
  } catch {
    throw new AppError('impossible de parser le JSON retourné par terraform output', 500, stdout)
  }
}

export async function terraformStateList(type) {
  const modulePath = await resolveModulePath(type)

  const { stdout, code } = await runTerraform([
    `-chdir=${modulePath}`,
    'state',
    'list',
  ])

  if (code !== 0 && stdout.trim() === '') return []
  if (code !== 0) {
    throw new AppError('terraform state list a échoué', 500, stdout)
  }

  return stdout.split('\n').filter(Boolean)
}
