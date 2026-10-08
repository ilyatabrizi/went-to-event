import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type BusinessLeadInput = {
  firstName: string
  lastName: string
  businessName: string
  niche: string
  city: string
  phone: string
  email: string | null
  sourcePage: string
  elapsedMs: number
}

export type BusinessLeadExportRow = {
  business_name: string
  first_name: string
  last_name: string
  niche: string
  city: string
  phone: string
  email: string | null
  created_at: string
  status: string
}

export interface BusinessLeadService {
  submit(input: BusinessLeadInput): Promise<{ reference: string }>
  listForExport(): Promise<BusinessLeadExportRow[]>
}

export class SupabaseBusinessLeadService implements BusinessLeadService {
  constructor(
    private readonly database: SupabaseClient,
    private readonly emailConfig: { apiKey: string; to: string; from: string } | null,
  ) {}

  async submit(input: BusinessLeadInput) {
    const { data, error } = await this.database.from('business_leads').insert({
      first_name: input.firstName,
      last_name: input.lastName,
      business_name: input.businessName,
      niche: input.niche,
      city: input.city,
      phone: input.phone,
      email: input.email,
      source_page: input.sourcePage,
      elapsed_ms: input.elapsedMs,
    }).select('id').single()

    if (error) throw error

    if (this.emailConfig) {
      try {
        await this.sendNotification(input)
      } catch (error) {
        console.error('Business lead was saved, but its email notification failed.', error)
      }
    }

    return { reference: `WTE-${String(data.id).slice(0, 8).toUpperCase()}` }
  }

  async listForExport(): Promise<BusinessLeadExportRow[]> {
    const { data, error } = await this.database.from('business_leads')
      .select('business_name, first_name, last_name, niche, city, phone, email, created_at, status')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data as BusinessLeadExportRow[]
  }

  private async sendNotification(input: BusinessLeadInput) {
    const config = this.emailConfig!
    const lines = [
      'New Went To Event business inquiry',
      '',
      `Name: ${input.firstName} ${input.lastName}`,
      `Business: ${input.businessName}`,
      `Category: ${input.niche}`,
      `City: ${input.city}`,
      `Phone: ${input.phone}`,
      `Email: ${input.email ?? 'Not provided'}`,
      `Source: ${input.sourcePage}`,
    ]

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: config.from,
        to: [config.to],
        subject: `New business inquiry: ${input.businessName}`,
        text: lines.join('\n'),
        ...(input.email ? { reply_to: input.email } : {}),
      }),
    })

    if (!response.ok) throw new Error(`Email provider returned ${response.status}`)
  }
}

export function createBusinessLeadService() {
  const url = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) return null

  const apiKey = process.env.RESEND_API_KEY
  const to = process.env.BUSINESS_LEADS_TO_EMAIL
  const from = process.env.BUSINESS_LEADS_FROM_EMAIL ?? process.env.RESEND_FROM_EMAIL ?? process.env.INFO_FROM_EMAIL
  const emailConfig = apiKey && to && from ? { apiKey, to, from } : null
  return new SupabaseBusinessLeadService(createClient(url, serviceRoleKey), emailConfig)
}
