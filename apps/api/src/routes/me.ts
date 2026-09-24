import type { FastifyInstance } from 'fastify'
import type { AuthService } from '../auth/service.js'

function bearerToken(value: string | undefined) {
  if (!value?.startsWith('Bearer ')) return null
  return value.slice('Bearer '.length).trim() || null
}

export async function meRoutes(
  app: FastifyInstance,
  options: { authService: AuthService | null },
) {
  app.get('/me', async (request, reply) => {
    if (!options.authService) {
      return reply.code(503).send({ error: 'Authentication is not configured' })
    }

    const token = bearerToken(request.headers.authorization)
    if (!token) {
      return reply.code(401).send({ error: 'Authentication required' })
    }

    const user = await options.authService.getUser(token)
    if (!user) {
      return reply.code(401).send({ error: 'Invalid or expired token' })
    }

    return { user }
  })
}
