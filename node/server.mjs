// Receives HuddleWatch webhooks: new Facebook group posts and comments.
//   HUDDLEWATCH_SECRET=whsec_... node server.mjs
import { createServer } from 'node:http'
import { createHmac, timingSafeEqual } from 'node:crypto'

const SECRET = process.env.HUDDLEWATCH_SECRET ?? ''
const PORT = Number(process.env.PORT ?? 8787)
const seen = new Set() // use a database in production; retries resend the same id

function verified(raw, header) {
  if (!SECRET) return true
  const expected = 'sha256=' + createHmac('sha256', SECRET).update(raw).digest('hex')
  const got = Buffer.from(header ?? '')
  return got.length === expected.length && timingSafeEqual(got, Buffer.from(expected))
}

createServer((req, res) => {
  if (req.method !== 'POST') return res.writeHead(405).end()
  const chunks = []
  req.on('data', (c) => chunks.push(c))
  req.on('end', () => {
    const raw = Buffer.concat(chunks)
    if (!verified(raw, req.headers['x-huddlewatch-signature'])) return res.writeHead(401).end('bad signature')
    res.writeHead(200).end('ok') // answer fast, work after

    const event = JSON.parse(raw.toString('utf8'))
    if (seen.has(event.id)) return
    seen.add(event.id)

    if (event.type === 'comment') {
      console.log(`[comment] ${event.group} · ${event.author}: ${event.body}\n  ${event.permalink}\n  on post ${event.post_permalink}`)
    } else {
      console.log(`[post] ${event.group} · ${event.author} (score ${event.score}): ${event.body}\n  ${event.permalink}`)
    }
  })
}).listen(PORT, () => console.log(`listening on :${PORT}`))
