import 'dotenv/config'
import express from 'express'
import cors from 'cors'

import logger from './src/middleware/logger.js'
import errorHandler from './src/middleware/errorHandler.js'
import { initStateFiles } from './src/services/state.js'
import vmsRouter from './src/routes/vms.js'
import nodesRouter from './src/routes/nodes.js'

const app = express()
const PORT = Number(process.env.PORT) || 3001

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(logger)

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'cloudforge-api',
    timestamp: new Date().toISOString(),
    node: process.version,
  })
})

app.use('/api/vms', vmsRouter)
app.use('/api/nodes', nodesRouter)

app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'route introuvable' })
})

app.use(errorHandler)

async function start() {
  try {
    await initStateFiles()
    console.log('[state] fichiers de données initialisés')

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n  ☁  CloudForge API`)
      console.log(`  ➜  http://localhost:${PORT}`)
      console.log(`  ➜  Health : http://localhost:${PORT}/health`)
      console.log(`  ➜  VMs    : http://localhost:${PORT}/api/vms`)
      console.log(`  ➜  Nodes  : http://localhost:${PORT}/api/nodes`)
      console.log(`  ENV: ${process.env.NODE_ENV || 'development'}\n`)
    })
  } catch (err) {
    console.error('[FATAL] échec au démarrage :', err)
    process.exit(1)
  }
}

start()
