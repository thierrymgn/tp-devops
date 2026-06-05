import { spawn } from 'child_process'

export async function getContainerStats(containerName) {
  return new Promise((resolve) => {
    let output = ''

    const proc = spawn('docker', [
      'stats',
      '--no-stream',
      '--format', '{{json .}}',
      containerName,
    ])

    proc.stdout.setEncoding('utf8')
    proc.stdout.on('data', (chunk) => { output += chunk })

    proc.on('error', () => {
      resolve({ cpuUsage: 0, ramUsage: 0, diskUsage: 0 })
    })

    proc.on('close', (code) => {
      if (code !== 0 || !output.trim()) {
        return resolve({ cpuUsage: 0, ramUsage: 0, diskUsage: 0 })
      }

      try {
        const stats = JSON.parse(output.trim())

        const cpuUsage  = Math.round(parseFloat(stats.CPUPerc)  || 0)
        const ramUsage  = Math.round(parseFloat(stats.MemPerc)  || 0)

        const diskUsage = 0

        resolve({ cpuUsage, ramUsage, diskUsage })
      } catch {
        resolve({ cpuUsage: 0, ramUsage: 0, diskUsage: 0 })
      }
    })
  })
}
