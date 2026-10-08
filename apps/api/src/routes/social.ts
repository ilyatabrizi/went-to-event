import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { AuthService } from '../auth/service.js'
import { SocialError, type SocialService } from '../social/service.js'

function bearerToken(value: string | undefined) {
  if (!value?.startsWith('Bearer ')) return null
  return value.slice('Bearer '.length).trim() || null
}

async function currentUser(request: FastifyRequest, authService: AuthService | null) {
  const token = bearerToken(request.headers.authorization)
  return token && authService ? authService.getUser(token) : null
}

export async function socialRoutes(
  app: FastifyInstance,
  options: { authService: AuthService | null; socialService: SocialService | null },
) {
  app.post<{ Body: { endpoint?: string; keys?: { p256dh?: string; auth?: string } } }>('/notifications/push-subscription', async (request, reply) => {
    const user = await currentUser(request, options.authService)
    if (!user) return reply.code(401).send({ error: 'Authentication required' })
    if (!options.socialService) return reply.code(503).send({ error: 'Notifications are not configured' })
    const subscription = request.body
    if (typeof subscription?.endpoint !== 'string' || typeof subscription.keys?.p256dh !== 'string' || typeof subscription.keys?.auth !== 'string') {
      return reply.code(400).send({ error: 'A valid push subscription is required' })
    }
    try {
      return await options.socialService.subscribeToPush(user.id, { endpoint: subscription.endpoint, keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth } })
    } catch (error) {
      request.log.error({ error }, 'Could not save push subscription')
      return reply.code(400).send({ error: 'Could not enable notifications' })
    }
  })

  app.delete<{ Body: { endpoint?: string } }>('/notifications/push-subscription', async (request, reply) => {
    const user = await currentUser(request, options.authService)
    if (!user) return reply.code(401).send({ error: 'Authentication required' })
    if (!options.socialService || typeof request.body?.endpoint !== 'string') return reply.code(400).send({ error: 'A subscription endpoint is required' })
    try {
      return await options.socialService.unsubscribeFromPush(user.id, request.body.endpoint)
    } catch (error) {
      request.log.error({ error }, 'Could not remove push subscription')
      return reply.code(400).send({ error: 'Could not disable notifications' })
    }
  })

  app.get('/social', async (request, reply) => {
    const startedAt = performance.now()
    const user = await currentUser(request, options.authService)
    if (!user) return reply.code(401).send({ error: 'Authentication required' })
    if (!options.socialService) return reply.code(503).send({ error: 'Social features are not configured' })
    try {
      const overview = await options.socialService.overview(user.id)
      reply.header('Server-Timing', `social;dur=${Math.round(performance.now() - startedAt)}`)
      return overview
    } catch (error) {
      request.log.error({ error }, 'Could not load social overview')
      return reply.code(500).send({ error: 'Could not load friends and conversations' })
    }
  })

  app.get('/social/conversations', async (request, reply) => {
    const startedAt = performance.now()
    const user = await currentUser(request, options.authService)
    if (!user) return reply.code(401).send({ error: 'Authentication required' })
    if (!options.socialService) return reply.code(503).send({ error: 'Social features are not configured' })
    try {
      const conversations = await options.socialService.conversations(user.id)
      reply.header('Server-Timing', `social;dur=${Math.round(performance.now() - startedAt)}`)
      return { conversations }
    } catch (error) {
      request.log.error({ error }, 'Could not load conversations')
      return reply.code(500).send({ error: 'Could not load conversations' })
    }
  })

  app.get<{ Querystring: { q?: string } }>('/social/users', async (request, reply) => {
    const user = await currentUser(request, options.authService)
    if (!user) return reply.code(401).send({ error: 'Authentication required' })
    if (!options.socialService) return reply.code(503).send({ error: 'Social features are not configured' })
    try {
      return { users: await options.socialService.searchUsers(user.id, request.query.q ?? '') }
    } catch (error) {
      request.log.error({ error }, 'Could not search social users')
      return reply.code(500).send({ error: 'Could not search users' })
    }
  })

  app.post<{ Body: { recipientId?: string } }>('/social/requests', async (request, reply) => {
    const user = await currentUser(request, options.authService)
    if (!user) return reply.code(401).send({ error: 'Authentication required' })
    if (!options.socialService) return reply.code(503).send({ error: 'Social features are not configured' })
    if (typeof request.body?.recipientId !== 'string') return reply.code(400).send({ error: 'recipientId is required' })
    try {
      return await options.socialService.sendRequest(user.id, request.body.recipientId)
    } catch (error) {
      return handleSocialError(reply, error)
    }
  })

  app.patch<{ Params: { id: string }; Body: { action?: string } }>('/social/requests/:id', async (request, reply) => {
    const user = await currentUser(request, options.authService)
    if (!user) return reply.code(401).send({ error: 'Authentication required' })
    if (!options.socialService) return reply.code(503).send({ error: 'Social features are not configured' })
    if (request.body?.action !== 'accept' && request.body?.action !== 'decline') return reply.code(400).send({ error: 'action must be accept or decline' })
    try {
      return await options.socialService.respondToRequest(user.id, request.params.id, request.body.action)
    } catch (error) {
      return handleSocialError(reply, error)
    }
  })

  app.delete<{ Params: { friendId: string } }>('/social/friends/:friendId', async (request, reply) => {
    const user = await currentUser(request, options.authService)
    if (!user) return reply.code(401).send({ error: 'Authentication required' })
    if (!options.socialService) return reply.code(503).send({ error: 'Social features are not configured' })
    try {
      return await options.socialService.removeFriend(user.id, request.params.friendId)
    } catch (error) {
      return handleSocialError(reply, error)
    }
  })

  app.post<{ Body: { friendId?: string } }>('/social/conversations', async (request, reply) => {
    const user = await currentUser(request, options.authService)
    if (!user) return reply.code(401).send({ error: 'Authentication required' })
    if (!options.socialService) return reply.code(503).send({ error: 'Social features are not configured' })
    if (typeof request.body?.friendId !== 'string') return reply.code(400).send({ error: 'friendId is required' })
    try {
      return await options.socialService.createConversation(user.id, request.body.friendId)
    } catch (error) {
      return handleSocialError(reply, error)
    }
  })

  app.get<{ Params: { id: string }; Querystring: { before?: string } }>('/social/conversations/:id/messages', async (request, reply) => {
    const user = await currentUser(request, options.authService)
    if (!user) return reply.code(401).send({ error: 'Authentication required' })
    if (!options.socialService) return reply.code(503).send({ error: 'Social features are not configured' })
    try {
      return await options.socialService.listMessages(user.id, request.params.id, request.query.before)
    } catch (error) {
      return handleSocialError(reply, error)
    }
  })

  app.post<{ Params: { id: string }; Body: { body?: string } }>('/social/conversations/:id/messages', async (request, reply) => {
    const user = await currentUser(request, options.authService)
    if (!user) return reply.code(401).send({ error: 'Authentication required' })
    if (!options.socialService) return reply.code(503).send({ error: 'Social features are not configured' })
    if (typeof request.body?.body !== 'string') return reply.code(400).send({ error: 'Message body is required' })
    try {
      return await options.socialService.sendMessage(user.id, request.params.id, request.body.body)
    } catch (error) {
      return handleSocialError(reply, error)
    }
  })
}

function handleSocialError(reply: FastifyReply, error: unknown) {
  if (error instanceof SocialError) return reply.code(error.statusCode).send({ error: error.message })
  return reply.code(500).send({ error: 'Could not complete the request' })
}
