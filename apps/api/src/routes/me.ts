import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { AccountUpdate, ProfilePictureUpload, ProfileUpdate } from '../contracts/auth.js'
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

  app.get('/me/profile', async (request, reply) => {
    const user = await authenticatedUser(request, reply, options.authService)
    if (!user) return
    if (!options.authService?.getProfile) return reply.code(503).send({ error: 'Profile service is not configured' })

    try {
      return { profile: await options.authService.getProfile(user.id) }
    } catch {
      return reply.code(500).send({ error: 'Could not load profile' })
    }
  })

  app.patch('/me/profile', async (request, reply) => {
    const user = await authenticatedUser(request, reply, options.authService)
    if (!user) return
    if (!options.authService?.updateProfile) return reply.code(503).send({ error: 'Profile service is not configured' })

    const body = (request.body ?? {}) as Partial<ProfileUpdate>
    const input: ProfileUpdate = {
      username: normalizeOptional(body.username)?.toLowerCase(),
      displayName: normalizeOptional(body.displayName),
      avatarUrl: normalizeOptional(body.avatarUrl),
    }

    if (input.username && !/^[a-z0-9_]{3,24}$/.test(input.username)) {
      return reply.code(400).send({ error: 'Username must be 3–24 characters using lowercase letters, numbers, or underscores.' })
    }
    if (input.displayName && input.displayName.length > 80) {
      return reply.code(400).send({ error: 'Display name must be 80 characters or fewer.' })
    }
    if (input.avatarUrl && (!/^https?:\/\//i.test(input.avatarUrl) || input.avatarUrl.length > 500)) {
      return reply.code(400).send({ error: 'Profile picture must be a valid http(s) image URL.' })
    }

    try {
      return { profile: await options.authService.updateProfile(user.id, input) }
    } catch (error) {
      if (String(error).toLowerCase().includes('duplicate') || String(error).includes('23505')) {
        return reply.code(409).send({ error: 'That username is already taken.' })
      }
      return reply.code(500).send({ error: 'Could not update profile' })
    }
  })

  app.patch('/me/account', async (request, reply) => {
    const user = await authenticatedUser(request, reply, options.authService)
    if (!user) return
    if (!options.authService?.updateAccount) return reply.code(503).send({ error: 'Account service is not configured' })

    const body = (request.body ?? {}) as Partial<AccountUpdate>
    const email = normalizeOptional(body.email)
    const password = normalizeOptional(body.password)
    if (!email && !password) return reply.code(400).send({ error: 'Provide an email or password to update.' })
    if (email && !/^\S+@\S+\.\S+$/.test(email)) return reply.code(400).send({ error: 'Enter a valid email address.' })
    if (password && password.length < 6) return reply.code(400).send({ error: 'Password must be at least 6 characters.' })

    try {
      return { user: await options.authService.updateAccount(user.id, { ...(email ? { email } : {}), ...(password ? { password } : {}) }) }
    } catch {
      return reply.code(400).send({ error: 'Could not update account. Check the values and try again.' })
    }
  })

  app.post('/me/profile-picture', async (request, reply) => {
    const user = await authenticatedUser(request, reply, options.authService)
    if (!user) return
    if (!options.authService?.uploadProfilePicture) return reply.code(503).send({ error: 'Profile picture service is not configured' })

    const body = (request.body ?? {}) as Partial<ProfilePictureUpload>
    const contentType = body.contentType
    const data = typeof body.data === 'string' ? body.data.replace(/^data:[^;]+;base64,/, '') : ''
    if (!data || !contentType || !['image/jpeg', 'image/png', 'image/webp'].includes(contentType)) {
      return reply.code(400).send({ error: 'Upload a JPEG, PNG, or WebP image.' })
    }
    if (data.length > 1_500_000) {
      return reply.code(413).send({ error: 'Profile picture must be smaller than 1 MB.' })
    }

    try {
      return { profile: await options.authService.uploadProfilePicture(user.id, { data, contentType }) }
    } catch {
      return reply.code(500).send({ error: 'Could not upload profile picture' })
    }
  })
}

async function authenticatedUser(request: FastifyRequest, reply: FastifyReply, authService: AuthService | null) {
  if (!authService) {
    reply.code(503).send({ error: 'Authentication is not configured' })
    return null
  }
  const token = bearerToken(request.headers.authorization)
  if (!token) {
    reply.code(401).send({ error: 'Authentication required' })
    return null
  }
  const user = await authService.getUser(token)
  if (!user) {
    reply.code(401).send({ error: 'Invalid or expired token' })
    return null
  }
  return user
}

function normalizeOptional(value: unknown) {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed || undefined
}
