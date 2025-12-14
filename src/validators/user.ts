import { z } from 'zod'

export const updateUserRoleSchema = z.object({
  role: z.enum(['USER', 'MODERATOR', 'ADMIN'], {
    errorMap: () => ({ message: 'Role must be USER, MODERATOR, or ADMIN' }),
  }),
})

export const updateUserStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE'], {
    errorMap: () => ({ message: 'Status must be ACTIVE or INACTIVE' }),
  }),
})

export const createUserByAdminSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
  role: z.enum(['USER', 'MODERATOR', 'ADMIN']).default('USER'),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
})
