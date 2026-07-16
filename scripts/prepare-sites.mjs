import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const outputDirectory = resolve('dist', 'server')
const workerPath = resolve(outputDirectory, 'index.js')

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
