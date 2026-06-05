import { encryptForEsp32 } from '../utils/crypto.js'

const ESP32_URL = 'http://192.168.190.152/message'
const TIMEOUT_MS = 5000

function buildMessage(vmName, type, outputs) {
  const sshUser = outputs.ssh_user || 'debian'
  const sshPw   = outputs.ssh_password || '?'

  const lines = [
    `[${vmName}]`,
    `SSH: ${sshUser}`,
    `PW: ${sshPw}`,
  ]

  if (type === 'wordpress' || type === 'wordpress-multisite') {
    const wpUser = outputs.wp_admin_user || 'admin'
    const wpPw   = outputs.wp_admin_password || '?'
    lines.push(`WP: ${wpUser}`)
    lines.push(`WP-PW: ${wpPw}`)
  }

  return lines.join('\n')
}

export async function sendCredentials(vm, outputs = {}) {
  const merged = {
    ssh_user:          outputs.ssh_user          || vm.sshUser,
    ssh_password:      outputs.ssh_password      || vm.sshPassword,
    wp_admin_user:     outputs.wp_admin_user     || vm.wpAdminUser,
    wp_admin_password: outputs.wp_admin_password || vm.wpAdminPassword,
  }

  if (!merged.ssh_password) {
    console.warn('[esp32] pas de credentials disponibles pour', vm.name)
    return
  }

  const message   = buildMessage(vm.name, vm.type, merged)
  const encrypted = encryptForEsp32(message)
  const body      = `msg=${encodeURIComponent(encrypted)}`

  console.log(`[esp32] envoi credentials pour "${vm.name}" → ${ESP32_URL}`)

  const controller = new AbortController()
  const timeout    = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(ESP32_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: controller.signal,
    })

    if (response.ok) {
      console.log(`[esp32] credentials envoyés avec succès pour "${vm.name}"`)
    } else {
      console.warn(`[esp32] réponse inattendue : ${response.status}`)
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      console.warn(`[esp32] timeout — ESP32 injoignable (${ESP32_URL})`)
    } else {
      console.warn(`[esp32] erreur réseau :`, err.message)
    }
  } finally {
    clearTimeout(timeout)
  }
}
