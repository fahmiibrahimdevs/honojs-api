import { Context, Next } from 'hono'
import { verifyAccessToken } from '../utils/jwt'
import { prisma } from '../lib/prisma'

export const authMiddleware = async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized - No token provided' }, 401)
  }

  const token = authHeader.substring(7)
  const payload = await verifyAccessToken(token)

  if (!payload) {
    return c.json({ error: 'Unauthorized - Invalid token' }, 401)
  }

  // Check if user exists and is active
  const user = await prisma.user.findUnique({
    where: { id: payload.userId as string },
  })

  if (!user) {
    return c.json({ error: 'Unauthorized - User not found' }, 401)
  }

  if (user.status !== 'ACTIVE') {
    return c.json({ error: 'Unauthorized - User account is inactive' }, 401)
  }

  // Set user in context
  c.set('user', {
    userId: user.id,
    email: user.email,
    role: user.role,
  })

  await next()
}
