import { hostDashboardRoutes } from './routes/host-dashboard.js'
import { createHostDashboardService, type HostDashboardService } from './bookings/host-dashboard.js'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { EventRepository } from './contracts/events.js'
import type { AuthService } from './auth/service.js'
import { createAuthService } from './auth/service.js'
import type { BookingService } from './bookings/service.js'
import { createBookingService } from './bookings/service.js'
import { createEventRepository } from './repositories/factory.js'
import { bookingRoutes } from './routes/bookings.js'
import { meRoutes } from './routes/me.js'
import { eventsRoutes } from './routes/events.js'
import { socialRoutes } from './routes/social.js'
import { createSocialService, type SocialService } from './social/service.js'
import { verificationRoutes } from './routes/verification.js'
import { createAccountVerificationService, type AccountVerificationService } from './verification/service.js'
import { leadRoutes } from './routes/leads.js'
import { createBusinessLeadService, type BusinessLeadService } from './leads/service.js'
import { createEmailService, type EmailService } from './email/service.js'

export function buildApp(
  repository: EventRepository = createEventRepository(),
  authService: AuthService | null = createAuthService(),
  bookingService: BookingService | null = createBookingService(),
  socialService: SocialService | null = createSocialService(),
  verificationService: AccountVerificationService | null = createAccountVerificationService(),
  businessLeadService: BusinessLeadService | null = createBusinessLeadService(),
  emailService: EmailService | null = createEmailService(),
  hostDashboardService: HostDashboardService | null = createHostDashboardService(),
) {
  const app = Fastify({
    logger: process.env.NODE_ENV !== 'test',
  })

  const allowedOrigins = (process.env.WEB_ORIGINS ?? [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://web-sigma-roan-83.vercel.app',
    'https://wenttoevent.com',
    'https://www.wenttoevent.com',
    'http://wenttoevent.com',
    'http://www.wenttoevent.com',
  ].join(','))
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

  app.register(cors, {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })

  app.get('/health', async () => ({
    status: 'ok',
    service: 'went-to-event-api',
  }))

  app.register(eventsRoutes, { repository, authService, verificationService })
  app.register(meRoutes, { authService })
  app.register(hostDashboardRoutes, { authService, verificationService, hostDashboardService })
  app.register(bookingRoutes, { authService, bookingService, emailService })
  app.register(socialRoutes, { authService, socialService })
  app.register(verificationRoutes, { authService, verificationService })
  app.register(leadRoutes, { leadService: businessLeadService, authService, verificationService })

  return app
}

// Vercel's native adapter invokes the default export as the server entrypoint.
const vercelApp = buildApp()
const vercelReady = vercelApp.ready()

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  await vercelReady
  if (request.url) request.url = request.url.replace(/^\/api(?:\/api)?(?=\/|$)/, '') || '/'
  vercelApp.server.emit('request', request, response)
}
