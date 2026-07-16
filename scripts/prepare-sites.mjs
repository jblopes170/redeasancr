import { cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const distDirectory = resolve('dist')
const clientDirectory = resolve(distDirectory, 'client')
const outputDirectory = resolve('dist', 'server')
const workerPath = resolve(outputDirectory, 'index.js')
const hostingOutputDirectory = resolve(distDirectory, '.openai')

// Sites serves static assets from dist/client, while Netlify uses dist directly.
// Keep both layouts so one build configuration can support both hosts.
await rm(clientDirectory, { recursive: true, force: true })
await mkdir(clientDirectory, { recursive: true })

const distEntries = await readdir(distDirectory, { withFileTypes: true })
for (const entry of distEntries) {
  if (['client', 'server', '.openai'].includes(entry.name)) continue

  await cp(resolve(distDirectory, entry.name), resolve(clientDirectory, entry.name), {
    recursive: entry.isDirectory(),
  })
}

await mkdir(hostingOutputDirectory, { recursive: true })
await cp(
  resolve('.openai', 'hosting.json'),
  resolve(hostingOutputDirectory, 'hosting.json'),
)

const workerSource = `const worker = {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request)

    if (response.status !== 404 || request.method !== 'GET') {
      return response
    }

    const url = new URL(request.url)
    url.pathname = '/index.html'
    url.search = ''

    return env.ASSETS.fetch(new Request(url, request))
  },
}

export default worker
`

await mkdir(outputDirectory, { recursive: true })
await writeFile(workerPath, workerSource, 'utf8')

console.log('Saida do Sites preparada em dist/server/index.js')
