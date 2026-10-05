import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { AuthService } from '../auth/service.js'
import { VerificationError, type AccountVerificationService } from '../verification/service.js'

function bearerToken(value: string | undefined) {
  if (!value?.startsWith('Bearer ')) return null
  return value.slice('Bearer '.length).trim() || null
}

async function currentUser(request: FastifyRequest, authService: AuthService | null) {
  const token = bearerToken(request.headers.authorization)
  return token && authService ? authService.getUser(token) : null
}

function primaryAdminIds() {
  return (process.env.ADMIN_CLERK_USER_IDS ?? '').split(',').map((value) => value.trim()).filter(Boolean)
}

function canManageAdmins(userId: string | undefined) {
  return Boolean(userId && primaryAdminIds().includes(userId))
}

async function canReviewVerifications(userId: string | undefined, service: AccountVerificationService) {
  return Boolean(userId && (canManageAdmins(userId) || await service.isAdmin(userId)))
}

export async function verificationRoutes(
  app: FastifyInstance,
  options: { authService: AuthService | null; verificationService: AccountVerificationService | null },
) {
  app.get('/verification', async (request, reply) => {
    const user = await currentUser(request, options.authService)
    if (!user) return reply.code(401).send({ error: 'Authentication required' })
    if (!options.verificationService) return reply.code(503).send({ error: 'Verification is not configured' })
    try {
      return await options.verificationService.status(user.id)
    } catch {
      return reply.code(500).send({ error: 'Could not load verification status' })
    }
  })

  app.post<{ Body: { message?: string; referenceUrl?: string } }>('/verification', async (request, reply) => {
    const user = await currentUser(request, options.authService)
    if (!user) return reply.code(401).send({ error: 'Authentication required' })
    if (!options.verificationService) return reply.code(503).send({ error: 'Verification is not configured' })
    const message = typeof request.body?.message === 'string' ? request.body.message.trim() : ''
    const referenceUrl = typeof request.body?.referenceUrl === 'string' ? request.body.referenceUrl.trim() : ''
    if (message.length < 20 || message.length > 1000) return reply.code(400).send({ error: 'Tell us about your event-hosting plans in 20–1,000 characters.' })
    if (referenceUrl && (referenceUrl.length > 500 || !isHttpUrl(referenceUrl))) return reply.code(400).send({ error: 'Provide a valid http(s) reference link.' })
    try {
      return await options.verificationService.submit(user.id, { message, referenceUrl: referenceUrl || null })
    } catch (error) {
      return handleVerificationError(reply, error)
    }
  })

  app.get('/admin-verification', async (request, reply) => {
    const user = await currentUser(request, options.authService)
    if (!user) return reply.code(401).send({ error: 'Authentication required' })
    if (!options.verificationService) return reply.code(503).send({ error: 'Verification is not configured' })
    try {
      if (!await canReviewVerifications(user.authId, options.verificationService)) return reply.code(403).send({ error: 'Admin access required' })
      return {
        requests: await options.verificationService.pendingRequests(),
        canManageAdmins: canManageAdmins(user.authId),
      }
    } catch {
      return reply.code(500).send({ error: 'Could not load verification requests' })
    }
  })

  app.patch<{ Body: { requestId?: string; decision?: string; note?: string } }>('/admin-verification', async (request, reply) => {
    const user = await currentUser(request, options.authService)
    if (!user) return reply.code(401).send({ error: 'Authentication required' })
    const reviewerId = user.authId
    if (!reviewerId) return reply.code(403).send({ error: 'Admin access required' })
    if (!options.verificationService) return reply.code(503).send({ error: 'Verification is not configured' })
    const { requestId, decision, note } = request.body ?? {}
    try {
      if (!await canReviewVerifications(reviewerId, options.verificationService)) return reply.code(403).send({ error: 'Admin access required' })
    } catch {
      return reply.code(500).send({ error: 'Could not verify admin access' })
    }
    if (typeof requestId !== 'string' || !/^[0-9a-f-]{36}$/i.test(requestId)) return reply.code(400).send({ error: 'A valid requestId is required.' })
    if (decision !== 'approve' && decision !== 'reject') return reply.code(400).send({ error: 'decision must be approve or reject.' })
    if (note !== undefined && (typeof note !== 'string' || note.trim().length > 500)) return reply.code(400).send({ error: 'Review notes must be 500 characters or fewer.' })
    try {
      return await options.verificationService.review(requestId, reviewerId, decision, typeof note === 'string' ? note.trim() || null : null)
    } catch (error) {
      return handleVerificationError(reply, error)
    }
  })

  app.get<{ Querystring: { q?: string } }>('/admin-users/search', async (request, reply) => {
    const user = await currentUser(request, options.authService)
    if (!user) return reply.code(401).send({ error: 'Authentication required' })
    if (!canManageAdmins(user.authId)) return reply.code(403).send({ error: 'Primary admin access required' })
    if (!options.verificationService) return reply.code(503).send({ error: 'Verification is not configured' })
    try {
      return { users: await options.verificationService.searchAdminCandidates(request.query.q ?? '') }
    } catch {
      return reply.code(500).send({ error: 'Could not search users' })
    }
  })

  app.get('/admin-users', async (request, reply) => {
    const user = await currentUser(request, options.authService)
    if (!user) return reply.code(401).send({ error: 'Authentication required' })
    if (!canManageAdmins(user.authId)) return reply.code(403).send({ error: 'Primary admin access required' })
    if (!options.verificationService) return reply.code(503).send({ error: 'Verification is not configured' })
    try {
      return { admins: await options.verificationService.listAdmins() }
    } catch {
      return reply.code(500).send({ error: 'Could not load admins' })
    }
  })

  app.post<{ Body: { userId?: string } }>('/admin-users', async (request, reply) => {
    const user = await currentUser(request, options.authService)
    if (!user) return reply.code(401).send({ error: 'Authentication required' })
    if (!canManageAdmins(user.authId)) return reply.code(403).send({ error: 'Primary admin access required' })
    if (!options.verificationService) return reply.code(503).send({ error: 'Verification is not configured' })
    if (typeof request.body?.userId !== 'string' || request.body.userId.length > 200) return reply.code(400).send({ error: 'A valid userId is required.' })
    try {
      return await options.verificationService.grantAdmin(request.body.userId, user.authId!)
    } catch (error) {
      return handleVerificationError(reply, error)
    }
  })

  app.delete<{ Params: { userId: string } }>('/admin-users/:userId', async (request, reply) => {
    const user = await currentUser(request, options.authService)
    if (!user) return reply.code(401).send({ error: 'Authentication required' })
    if (!canManageAdmins(user.authId)) return reply.code(403).send({ error: 'Primary admin access required' })
    if (!options.verificationService) return reply.code(503).send({ error: 'Verification is not configured' })
    if (request.params.userId.length > 200) return reply.code(400).send({ error: 'A valid userId is required.' })
    try {
      return await options.verificationService.revokeAdmin(request.params.userId)
    } catch (error) {
      return handleVerificationError(reply, error)
    }
  })
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

function handleVerificationError(reply: FastifyReply, error: unknown) {
  if (error instanceof VerificationError) return reply.code(error.statusCode).send({ error: error.message })
  return reply.code(500).send({ error: 'Could not complete verification request' })
}
