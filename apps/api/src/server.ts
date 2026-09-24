import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import { buildApp } from './app.js'

dotenv.config({
  path: fileURLToPath(new URL('../.env', import.meta.url)),
})

const port = Number(process.env.PORT ?? 3000)
const host = process.env.HOST ?? '127.0.0.1'
const app = buildApp()

try {
  await app.listen({ port, host })
} catch (error) {
  app.log.error(error)
  process.exit(1)
}
