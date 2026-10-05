import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in apps/api/.env first.')
}

const columns = [
  ['Company', 'business_name'],
  ['Contact first name', 'first_name'],
  ['Contact last name', 'last_name'],
  ['Category', 'niche'],
  ['City', 'city'],
  ['Phone', 'phone'],
  ['Email', 'email'],
  ['Submitted at (UTC)', 'created_at'],
  ['Status', 'status'],
]
const client = createClient(supabaseUrl, serviceRoleKey)
const records = []
const pageSize = 1000

for (let offset = 0; ; offset += pageSize) {
  const { data, error } = await client.from('business_leads')
    .select(columns.map(([, field]) => field).join(','))
    .order('created_at', { ascending: true })
    .range(offset, offset + pageSize - 1)

  if (error) throw new Error(`Could not export business leads: ${error.message}`)
  records.push(...(data ?? []))
  if (!data || data.length < pageSize) break
}

const csvValue = (value) => {
  let text = value == null ? '' : String(value)
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`
  return `"${text.replaceAll('"', '""')}"`
}
const rows = [
  columns.map(([label]) => csvValue(label)).join(','),
  ...records.map((record) => columns.map(([, field]) => csvValue(record[field])).join(',')),
]

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const apiDirectory = path.resolve(scriptDirectory, '..')
const outputDirectory = path.join(apiDirectory, 'exports')
const date = new Date().toISOString().slice(0, 10)
const outputPath = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : path.join(outputDirectory, `business-leads-${date}.csv`)

await mkdir(path.dirname(outputPath), { recursive: true })
await writeFile(outputPath, `\uFEFF${rows.join('\r\n')}\r\n`, 'utf8')
process.stdout.write(`Exported ${records.length} companies to ${outputPath}\n`)
