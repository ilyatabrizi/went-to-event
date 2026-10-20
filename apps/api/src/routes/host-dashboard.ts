import type { FastifyInstance } from 'fastify'
import type { AuthService } from '../auth/service.js'
import type { AccountVerificationService } from '../verification/service.js'
import type { HostDashboardService } from '../bookings/host-dashboard.js'

export async function hostDashboardRoutes(app: FastifyInstance, options: {
  authService: AuthService | null; verificationService: AccountVerificationService | null; hostDashboardService: HostDashboardService | null
}) {
  app.get('/host-dashboard', async (request, reply) => {
    reply.header('Cache-Control', 'private, no-store')
    if (!options.authService || !options.verificationService || !options.hostDashboardService) {
      return reply.code(503).send({ error: 'Host analytics are not configured' })
    }
    const authorization = request.headers.authorization
    const user = authorization?.startsWith('Bearer ') ? await options.authService.getUser(authorization.slice(7).trim()) : null
    if (!user) return reply.code(401).send({ error: 'Authentication required' })
    if ((await options.verificationService.status(user.id)).status !== 'verified') {
      return reply.code(403).send({ error: 'A verified host account is required' })
    }
    return { data: await options.hostDashboardService.overview(user.id) }
  })
}
