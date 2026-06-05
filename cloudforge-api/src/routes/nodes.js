import { Router } from 'express'
import os from 'os'

const router = Router()

function getCpuUsage() {
  return new Promise((resolve) => {
    const start = os.cpus()

    setTimeout(() => {
      const end = os.cpus()
      let idleDelta = 0
      let totalDelta = 0

      for (let i = 0; i < start.length; i++) {
        const s = start[i].times
        const e = end[i].times

        const startTotal = s.user + s.nice + s.sys + s.idle + s.irq
        const endTotal   = e.user + e.nice + e.sys + e.idle + e.irq

        idleDelta  += e.idle - s.idle
        totalDelta += endTotal - startTotal
      }

      const usage = totalDelta === 0 ? 0 : (1 - idleDelta / totalDelta) * 100
      resolve(Math.round(usage))
    }, 100)
  })
}

function getRamUsage() {
  const total = os.totalmem()
  const free  = os.freemem()
  return Math.round(((total - free) / total) * 100)
}

router.get('/', async (_req, res) => {
  const cpuUsage = await getCpuUsage()
  const ramUsage = getRamUsage()

  const nodes = [
    {
      id:     'node-host',
      name:   os.hostname(),
      role:   'host',
      status: 'Online',
      cpu:    cpuUsage,
      ram:    ramUsage,
    },
  ]

  res.json({ success: true, data: nodes })
})

export default router
