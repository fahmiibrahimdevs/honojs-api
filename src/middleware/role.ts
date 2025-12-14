import { Context, Next } from 'hono'

export const roleMiddleware = (allowedRoles: string[]) => {
  return async (c: Context, next: Next) => {
    const user = c.get('user')

    if (!user) {
      return c.json({ error: 'Unauthorized - User not authenticated' }, 401)
    }

    if (!allowedRoles.includes(user.role)) {
      return c.json({ error: 'Forbidden - Insufficient permissions' }, 403)
    }

    await next()
  }
}

export const adminOnly = roleMiddleware(['ADMIN'])
export const adminOrModerator = roleMiddleware(['ADMIN', 'MODERATOR'])
