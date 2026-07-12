import http from 'http'

const options = { host: 'localhost', port: 3000, path: '/', timeout: 3000 }

const req = http.request(options, res => {
  process.exit(res.statusCode === 200 || res.statusCode === 307 || res.statusCode === 308 ? 0 : 1)
})
req.on('error', () => process.exit(1))
req.on('timeout', () => { req.destroy(); process.exit(1) })
req.end()
