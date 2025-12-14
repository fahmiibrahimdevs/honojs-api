import { z } from 'zod'

export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  passwordConfirmation: z.string(),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
}).refine((data) => data.password === data.passwordConfirmation, {
  message: "Passwords don't match",
  path: ['passwordConfirmation'],
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
})

export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  passwordConfirmation: z.string(),
}).refine((data) => data.newPassword === data.passwordConfirmation, {
  message: "Passwords don't match",
  path: ['passwordConfirmation'],
})

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
})
