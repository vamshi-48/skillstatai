import { spawn } from 'node:child_process'

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const children = [
  spawn(process.execPath, ['server.mjs'], { stdio: 'inherit' }),
  spawn(npmCommand, ['run', 'dev:client'], { stdio: 'inherit', shell: process.platform === 'win32' }),
]

function stopChildren() {
  for (const child of children) {
    if (!child.killed) child.kill()
  }
}

process.on('SIGINT', () => {
  stopChildren()
  process.exit(0)
})
process.on('SIGTERM', () => {
  stopChildren()
  process.exit(0)
})

for (const child of children) {
  child.on('exit', (code) => {
    if (code && code !== 0) {
      stopChildren()
      process.exit(code)
    }
  })
}
