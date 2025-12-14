import { Hono } from 'hono'
import { prisma } from '../lib/prisma'
import { hashPassword, verifyPassword } from '../utils/password'
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt'
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  refreshTokenSchema,
} from '../validators/auth'
import { authMiddleware } from '../middleware/auth'

const auth = new Hono()

// Setup First Admin (hanya bisa digunakan jika belum ada admin)
auth.post('/setup-admin', async (c) => {
  try {
    const body = await c.req.json()
    const validatedData = registerSchema.parse(body)

    // Check if admin already exists
    const adminExists = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    })

    if (adminExists) {
      return c.json({ error: 'Admin already exists. Use /api/users endpoint to create more admins.' }, 403)
    }

    // Check if email already registered
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    })

    if (existingUser) {
      return c.json({ error: 'Email already registered' }, 400)
    }

    // Hash password
    const hashedPassword = await hashPassword(validatedData.password)

    // Create first admin
    const admin = await prisma.user.create({
      data: {
        email: validatedData.email,
        password: hashedPassword,
        name: validatedData.name,
        phone: validatedData.phone,
        birthDate: validatedData.birthDate ? new Date(validatedData.birthDate) : null,
        role: 'ADMIN',
        status: 'ACTIVE',
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        birthDate: true,
        role: true,
        status: true,
        createdAt: true,
      },
    })

    return c.json(
      {
        message: 'First admin created successfully',
        data: admin,
      },
      201
    )
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return c.json({ error: 'Validation failed', details: error.errors }, 400)
    }
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Register
auth.post('/register', async (c) => {
  try {
    const body = await c.req.json()
    const validatedData = registerSchema.parse(body)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    })

    if (existingUser) {
      return c.json({ error: 'Email already registered' }, 400)
    }

    // Hash password
    const hashedPassword = await hashPassword(validatedData.password)

    // Create user with USER role
    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        password: hashedPassword,
        name: validatedData.name,
        phone: validatedData.phone,
        birthDate: validatedData.birthDate ? new Date(validatedData.birthDate) : null,
        role: 'USER',
        status: 'ACTIVE',
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        birthDate: true,
        role: true,
        status: true,
        createdAt: true,
      },
    })

    return c.json(
      {
        message: 'User registered successfully',
        data: user,
      },
      201
    )
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return c.json({ error: 'Validation failed', details: error.errors }, 400)
    }
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Login
auth.post('/login', async (c) => {
  try {
    const body = await c.req.json()
    const validatedData = loginSchema.parse(body)

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: validatedData.email },
    })

    if (!user) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }

    // Check if user is active
    if (user.status !== 'ACTIVE') {
      return c.json({ error: 'Account is inactive' }, 403)
    }

    // Verify password
    const isPasswordValid = await verifyPassword(validatedData.password, user.password)

    if (!isPasswordValid) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }

    // Generate tokens
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    }

    const accessToken = await generateAccessToken(payload)
    const refreshToken = await generateRefreshToken(payload)

    // Save refresh token
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    })

    return c.json({
      message: 'Login successful',
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
        },
      },
    })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return c.json({ error: 'Validation failed', details: error.errors }, 400)
    }
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Refresh Token
auth.post('/refresh', async (c) => {
  try {
    const body = await c.req.json()
    const validatedData = refreshTokenSchema.parse(body)

    // Verify refresh token
    const payload = await verifyRefreshToken(validatedData.refreshToken)

    if (!payload) {
      return c.json({ error: 'Invalid refresh token' }, 401)
    }

    // Find user and verify refresh token
    const user = await prisma.user.findUnique({
      where: { id: payload.userId as string },
    })

    if (!user || user.refreshToken !== validatedData.refreshToken) {
      return c.json({ error: 'Invalid refresh token' }, 401)
    }

    if (user.status !== 'ACTIVE') {
      return c.json({ error: 'Account is inactive' }, 403)
    }

    // Generate new tokens
    const newPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    }

    const accessToken = await generateAccessToken(newPayload)
    const refreshToken = await generateRefreshToken(newPayload)

    // Update refresh token
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    })

    return c.json({
      message: 'Token refreshed successfully',
      data: {
        accessToken,
        refreshToken,
      },
    })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return c.json({ error: 'Validation failed', details: error.errors }, 400)
    }
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Logout
auth.post('/logout', authMiddleware, async (c) => {
  try {
    const user = c.get('user')

    // Clear refresh token
    await prisma.user.update({
      where: { id: user.userId },
      data: { refreshToken: null },
    })

    return c.json({ message: 'Logout successful' })
  } catch (error) {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get Profile
auth.get('/profile', authMiddleware, async (c) => {
  try {
    const user = c.get('user')

    const profile = await prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        birthDate: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!profile) {
      return c.json({ error: 'User not found' }, 404)
    }

    return c.json({ data: profile })
  } catch (error) {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Update Profile
auth.put('/profile', authMiddleware, async (c) => {
  try {
    const user = c.get('user')
    const body = await c.req.json()
    const validatedData = updateProfileSchema.parse(body)

    const updatedUser = await prisma.user.update({
      where: { id: user.userId },
      data: {
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.phone !== undefined && { phone: validatedData.phone }),
        ...(validatedData.birthDate && { birthDate: new Date(validatedData.birthDate) }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        birthDate: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    })

    return c.json({
      message: 'Profile updated successfully',
      data: updatedUser,
    })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return c.json({ error: 'Validation failed', details: error.errors }, 400)
    }
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Change Password
auth.post('/change-password', authMiddleware, async (c) => {
  try {
    const user = c.get('user')
    const body = await c.req.json()
    const validatedData = changePasswordSchema.parse(body)

    // Get user with password
    const currentUser = await prisma.user.findUnique({
      where: { id: user.userId },
    })

    if (!currentUser) {
      return c.json({ error: 'User not found' }, 404)
    }

    // Verify current password
    const isPasswordValid = await verifyPassword(
      validatedData.currentPassword,
      currentUser.password
    )

    if (!isPasswordValid) {
      return c.json({ error: 'Current password is incorrect' }, 400)
    }

    // Hash new password
    const hashedPassword = await hashPassword(validatedData.newPassword)

    // Update password
    await prisma.user.update({
      where: { id: user.userId },
      data: { password: hashedPassword },
    })

    return c.json({ message: 'Password changed successfully' })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return c.json({ error: 'Validation failed', details: error.errors }, 400)
    }
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default auth
