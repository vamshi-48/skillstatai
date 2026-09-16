import http from 'node:http'
import path from 'node:path'
import fsSync from 'node:fs'
import handler from './api/index.js'

// Load .env variables for local development
try {
  const envPath = path.join(process.cwd(), '.env')
  if (fsSync.existsSync(envPath)) {
    const envContent = fsSync.readFileSync(envPath, 'utf8')
    for (const line of envContent.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim()
        let val = trimmed.slice(eqIdx + 1).trim()
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1)
        }
        if (!process.env[key]) {
          process.env[key] = val
        }
      }
    }
  }
} catch {}

const port = Number(process.env.API_PORT || 8787)
const server = http.createServer(handler)

server.listen(port, () => {
  console.log(`Skillstat AI API server listening on http://localhost:${port}`)
})
