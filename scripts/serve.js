import http from 'node:http'
import os from 'node:os'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = normalize(fileURLToPath(new URL('../www/', import.meta.url)))
const port = Number(process.argv[2] || process.env.PORT || 8080)

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
}

const server = http.createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
  if (path.endsWith('/')) path += 'index.html'
  const file = normalize(join(root, path))
  if (!file.startsWith(root)) {
    res.writeHead(403)
    res.end()
    return
  }
  try {
    const data = await readFile(file)
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' })
    res.end(data)
  } catch {
    res.writeHead(404)
    res.end('Not found')
  }
})

server.listen(port, () => {
  console.log(`Питомец Финни: http://localhost:${port}`)
  for (const list of Object.values(os.networkInterfaces())) {
    for (const a of list) {
      if (a.family === 'IPv4' && !a.internal) console.log(`С телефона в той же Wi-Fi сети: http://${a.address}:${port}`)
    }
  }
})
