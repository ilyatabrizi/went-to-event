import type { FastifyInstance, FastifyReply } from 'fastify'
import type { AuthService } from '../auth/service.js'
import type { AccountVerificationService } from '../verification/service.js'
import type { BusinessLeadExportRow, BusinessLeadInput, BusinessLeadService } from '../leads/service.js'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export async function leadRoutes(app: FastifyInstance, options: {
  leadService: BusinessLeadService | null
  authService: AuthService | null
  verificationService: AccountVerificationService | null
}) {
  app.get('/admin-business-leads/export.csv', async (request, reply) => {
    if (!options.leadService) return reply.code(503).send({ error: 'Lead capture is not configured.' })
    const token = bearerToken(request.headers.authorization)
    const user = token && options.authService ? await options.authService.getUser(token) : null
    if (!user) return reply.code(401).send({ error: 'Authentication required.' })
    const clerkUserId = user.authId
    const isPrimaryAdmin = Boolean(clerkUserId && primaryAdminIds().includes(clerkUserId))
    let isAdmin = isPrimaryAdmin
    if (!isAdmin && clerkUserId && options.verificationService) {
      try {
        isAdmin = await options.verificationService.isAdmin(clerkUserId)
      } catch {
        return reply.code(500).send({ error: 'Could not verify admin access.' })
      }
    }
    if (!isAdmin) return reply.code(403).send({ error: 'Admin access required.' })

    try {
      const rows = await options.leadService.listForExport()
      const date = new Date().toISOString().slice(0, 10)
      return reply
        .type('text/csv; charset=utf-8')
        .header('Content-Disposition', `attachment; filename="business-leads-${date}.csv"`)
        .send(`\uFEFF${businessLeadsCsv(rows)}`)
    } catch {
      request.log.error('Failed to export business leads')
      return reply.code(500).send({ error: 'Could not export business leads.' })
    }
  })

  app.post<{ Body: Record<string, unknown> }>('/business-leads', async (request, reply) => {
    if (!options.leadService) return reply.code(503).send({ ok: false, error: 'Lead capture is not configured.' })

    const body = request.body ?? {}
    if (typeof body.website === 'string' && body.website.trim()) return { ok: true }

    const firstName = text(body.first_name, 100)
    const lastName = text(body.last_name, 100)
    const businessName = text(body.business_name, 160)
    const niche = text(body.niche, 120)
    const city = text(body.city, 120)
    const phone = text(body.phone, 32)
    const emailValue = text(body.email, 254)

    if (!firstName || firstName.length < 2) return badRequest(reply)
    if (!lastName || lastName.length < 2) return badRequest(reply)
    if (!businessName || businessName.length < 2) return badRequest(reply)
    if (!niche || niche.length < 2) return badRequest(reply)
    if (!city || city.length < 2) return badRequest(reply)
    if (!isValidPhone(phone)) return badRequest(reply)
    if (emailValue && !emailPattern.test(emailValue)) return badRequest(reply)

    const elapsedValue = Number(body.elapsed_ms)
    const input: BusinessLeadInput = {
      firstName,
      lastName,
      businessName,
      niche,
      city,
      phone,
      email: emailValue || null,
      sourcePage: 'business-join',
      elapsedMs: Number.isFinite(elapsedValue) ? Math.max(0, Math.min(Math.trunc(elapsedValue), 86_400_000)) : 0,
    }

    try {
      const result = await options.leadService.submit(input)
      return { ok: true, reference: result.reference }
    } catch {
      request.log.error('Failed to save business lead')
      return reply.code(500).send({ ok: false, error: 'Could not save the business inquiry.' })
    }
  })
}

function bearerToken(value: string | undefined) {
  if (!value?.startsWith('Bearer ')) return null
  return value.slice('Bearer '.length).trim() || null
}

function primaryAdminIds() {
  return (process.env.ADMIN_CLERK_USER_IDS ?? '').split(',').map((value) => value.trim()).filter(Boolean)
}

function businessLeadsCsv(rows: BusinessLeadExportRow[]) {
  const columns: Array<[string, keyof BusinessLeadExportRow]> = [
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
  const cell = (value: string | null) => {
    let text = value ?? ''
    if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`
    return `"${text.replaceAll('"', '""')}"`
  }
  return [
    columns.map(([label]) => cell(label)).join(','),
    ...rows.map((row) => columns.map(([, field]) => cell(row[field])).join(',')),
  ].join('\r\n') + '\r\n'
}

function text(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function isValidPhone(value: string) {
  return /^0[1-9]\d{9}$/.test(value) || /^\+[1-9]\d{7,14}$/.test(value)
}

function badRequest(reply: FastifyReply) {
  return reply.code(400).send({ ok: false, error: 'Please check the required contact details and try again.' })
}
