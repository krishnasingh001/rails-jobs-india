import { spawn } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptPath = fileURLToPath(import.meta.url)
const projectRoot = join(scriptPath, '..', '..')
const viteBin = join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js')
const tscBin = join(projectRoot, 'node_modules', 'typescript', 'bin', 'tsc')

function versionParts(version) {
  return version.replace(/^v/, '').split('.').map((part) => Number(part))
}

function versionOk(version) {
  const [major, minor] = versionParts(version)
  if (major > 22) return true
  if (major === 22) return minor >= 12
  if (major === 20) return minor >= 19
  return false
}

function compareVersions(left, right) {
  const a = versionParts(left)
  const b = versionParts(right)
  for (let index = 0; index < 3; index += 1) {
    const delta = (a[index] ?? 0) - (b[index] ?? 0)
    if (delta !== 0) return delta
  }
  return 0
}

function candidateNodes() {
  const home = homedir()
  const roots = [
    join(home, '.nvm', 'versions', 'node'),
    join(home, '.local', 'share', 'mise', 'installs', 'node'),
  ]
  const bins = []
  for (const root of roots) {
    if (!existsSync(root)) continue
    for (const entry of readdirSync(root)) {
      const bin = join(root, entry, 'bin', 'node')
      if (existsSync(bin)) bins.push(bin)
    }
  }
  return bins
}

function nodeVersion(bin) {
  return new Promise((resolve) => {
    const child = spawn(bin, ['-p', 'process.version'], { stdio: ['ignore', 'pipe', 'ignore'] })
    let output = ''
    child.stdout.on('data', (chunk) => {
      output += chunk
    })
    child.on('exit', (code) => {
      resolve(code === 0 ? output.trim() : null)
    })
    child.on('error', () => resolve(null))
  })
}

async function findCompatibleNode() {
  const found = []
  for (const bin of candidateNodes()) {
    const version = await nodeVersion(bin)
    if (version && versionOk(version)) found.push({ bin, version })
  }
  found.sort((left, right) => compareVersions(right.version, left.version))
  return found[0] ?? null
}

function run(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd: projectRoot, stdio: 'inherit' })
    child.on('exit', (code) => resolve(code ?? 1))
    child.on('error', () => resolve(1))
  })
}

async function main() {
  const task = process.argv[2]
  if (!versionOk(process.version)) {
    const compatible = await findCompatibleNode()
    if (!compatible) {
      console.error('This app needs Node.js 20.19+ or 22.12+.')
      console.error(`The current Node is ${process.version}. Install Node 22, then run npm run dev again.`)
      process.exit(1)
    }
    const code = await run(compatible.bin, [scriptPath, ...process.argv.slice(2)])
    process.exit(code)
  }

  if (task === 'dev') process.exit(await run(process.execPath, [viteBin]))
  if (task === 'preview') process.exit(await run(process.execPath, [viteBin, 'preview']))
  if (task === 'build') {
    const typecheck = await run(process.execPath, [tscBin, '-b'])
    if (typecheck !== 0) process.exit(typecheck)
    process.exit(await run(process.execPath, [viteBin, 'build']))
  }

  console.error('Usage: node scripts/run.mjs <dev|build|preview>')
  process.exit(1)
}

await main()
