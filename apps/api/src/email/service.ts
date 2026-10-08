import type { Booking } from '../contracts/bookings.js'

export interface EmailService {
  sendBookingConfirmation(to: string, booking: Booking): Promise<void>
}

export class ResendEmailService implements EmailService {
  constructor(private readonly apiKey: string, private readonly from: string) {}

  async sendBookingConfirmation(to: string, booking: Booking) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.from,
        to: [to],
        subject: `Your Went To Event booking is confirmed — ${booking.id.slice(0, 8).toUpperCase()}`,
        text: [
          'Your Went To Event booking is confirmed.',
          '',
          `Event: ${booking.eventId}`,
          `Tickets: ${booking.quantity}`,
          `Total: ${(booking.totalCents / 100).toFixed(2)}`,
          `Booking reference: ${booking.id}`,
          '',
          'Keep this email for your records.',
        ].join('\n'),
      }),
    })

    if (!response.ok) throw new Error(`Email provider returned ${response.status}`)
  }
}

export function createEmailService(): EmailService | null {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL ?? process.env.INFO_FROM_EMAIL ?? 'info@wenttoevent.com'
  return apiKey ? new ResendEmailService(apiKey, from) : null
}
