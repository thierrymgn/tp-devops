/**
 * @param {object} config
 * @param {string} config.name
 * @param {number} config.ram 
 * @param {number} config.cpu
 * @param {number} config.disk
 * @param {number} config.sshPort
 * @param {number} [config.appPort]
 * @param {string} [config.multisiteHost]
 * @param {string} type                  
 * @returns {string} contenu HCL du fichier .tfvars
 */
export function buildTfvarsContent(config, type) {
  const { name, ram, cpu, disk, sshPort, appPort, multisiteHost } = config

  if (!name || !/^[a-z0-9-]+$/.test(name)) {
    throw new Error(
      'le nom de la VM doit être en minuscules avec des tirets uniquement (ex: "blog-prod")'
    )
  }

  const lines = [
    `vm_name   = "${name}"`,
    `ram       = ${ram}`,
    `cpu       = ${cpu}`,
    `disk_size = ${disk}`,
  ]

  if (type === 'debian') {
    lines.push(`ssh_port  = ${sshPort}`)
  } else if (type === 'node') {
    lines.push(`ssh_port  = ${sshPort}`)
    lines.push(`app_port  = ${appPort}`)
  } else if (type === 'wordpress') {
    lines.push(`http_port = ${appPort}`)
    lines.push(`ssh_port  = ${sshPort}`)
  } else if (type === 'wordpress-multisite') {
    lines.push(`http_port      = ${appPort}`)
    lines.push(`ssh_port       = ${sshPort}`)
    lines.push(`multisite_host = "${multisiteHost || 'localhost'}"`)
  }

  return lines.join('\n') + '\n'
}

export function tfvarsFilename(vmName) {
  return `${vmName}.tfvars`
}
